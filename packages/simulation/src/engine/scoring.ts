import type { CommendationId } from '../config/campaign';
import { validateDesign } from '../design';
import { formatMet, objectiveProgress, type MissionRun, type ObjectiveProgress } from './engine';
import { secondaryProgress, type SecondaryResult } from './objectives';

/**
 * Transparent mission score. Describes how well the player's notional satellite performed in
 * the game. It does NOT describe real-world wildfire severity or response success.
 */

export interface ScoreCategory {
  id: 'observation' | 'delivery' | 'objective' | 'efficiency' | 'margin';
  label: string;
  weight: number;
  /** 0..1 achievement in this category. */
  fraction: number;
  /** Points contributed to the 0..100 total. */
  points: number;
  formula: string;
  explanation: string;
}

export type TargetOutcome =
  | 'DELIVERED'
  | 'STORED, NOT DELIVERED'
  | 'LOST (OVERWRITTEN)'
  | 'MISSED: NEVER IN REACH'
  | 'MISSED: RECORDER FULL'
  | 'MISSED: LOW ENERGY'
  | 'MISSED: IN REACH, NOT CAPTURED'
  | 'SKIPPED';

export interface TargetResult {
  targetId: string;
  callsign: string;
  priority: number;
  zone?: string;
  outcome: TargetOutcome;
  value: number;
  minDistanceKm: number;
}

export interface ScoreReport {
  total: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  success: boolean;
  objective: ObjectiveProgress;
  categories: ScoreCategory[];
  capturedValue: number;
  deliveredValue: number;
  referenceValue: number;
  targets: TargetResult[];
  counts: Record<TargetOutcome, number>;
  energy: {
    usedWh: number;
    generatedWh: number;
    curtailedWh: number;
    unmetWh: number;
    captureWh: number;
    radioWh: number;
    remainingWh: number;
    capacityWh: number;
    minFrac: number;
  };
  downlink: { contactS: number; activeS: number; sentMB: number; capacityMB: number; timeUtilization: number; capacityUtilization: number };
  storage: { capacityMB: number; peakMB: number; remainingOnBoardMB: number };
  budget: { cost: number; budget: number; marginFrac: number };
  mass: { massKg: number; capacityKg: number; marginFrac: number };
  analyst: AnalystNote[];
  secondary: SecondaryResult[];
  /** Every commendation with its explicit rule; earned ones have met = true. */
  commendations: Commendation[];
}

export interface Commendation {
  id: CommendationId;
  label: string;
  /** The rule, stated in full. */
  criterion: string;
  met: boolean;
  detail: string;
}

export interface AnalystNote {
  id: string;
  severity: 'critical' | 'warn' | 'info' | 'good';
  /** Causal chain, built from actual run state. */
  finding: string;
  /** Specific redesign suggestion. */
  suggestion: string;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function computeScore(run: MissionRun): ScoreReport {
  const { mission, spec, targets, geometry } = run.config;
  const s = run.state;
  const w = mission.scoreWeights;
  const dt = geometry.stepS;

  const captured = s.packets;
  const delivered = captured.filter((p) => p.status === 'DELIVERED');
  const capturedValue = captured.reduce((a, p) => a + p.value, 0);
  const deliveredValue = delivered.reduce((a, p) => a + p.value, 0);
  const referenceValue = [...targets]
    .map((t) => t.priority.total)
    .sort((a, b) => b - a)
    .slice(0, mission.referenceCount)
    .reduce((a, b) => a + b, 0);

  const objective = objectiveProgress(run.config, s);

  // Observation
  const obsFrac = referenceValue > 0 ? clamp01(capturedValue / referenceValue) : 0;
  // Delivery
  const delFrac = capturedValue > 0 ? clamp01(deliveredValue / capturedValue) : 0;
  // Objective
  const objFrac = objective.fraction;
  // Efficiency
  const packetYield = s.stats.capturesStarted > 0 ? delivered.length / s.stats.capturesStarted : 0;
  const safeScore = s.stats.safeModeSteps === 0 ? 1 : 0.3;
  const budgetScore = clamp01(spec.budgetMarginFrac / 0.2);
  const effFrac = 0.4 * packetYield + 0.3 * safeScore + 0.3 * budgetScore;
  // Margin
  const massScore = clamp01(spec.massMarginFrac / 0.1);
  const minBatFrac = s.stats.minBatteryWh / spec.batteryWh;
  const batScore = clamp01(minBatFrac / 0.3);
  const storageScore = s.stats.capturesRejectedStorage === 0 && s.blockedByStorage.length === 0 ? 1 : 0.3;
  const marginFrac = (massScore + batScore + storageScore) / 3;

  const cat = (
    id: ScoreCategory['id'],
    label: string,
    weight: number,
    fraction: number,
    formula: string,
    explanation: string,
  ): ScoreCategory => ({ id, label, weight, fraction, points: Math.round(weight * 100 * fraction * 10) / 10, formula, explanation });

  const categories: ScoreCategory[] = [
    cat(
      'observation',
      'Priority-weighted observations',
      w.observation,
      obsFrac,
      'captured value / value of the top reference targets',
      `Captured value ${capturedValue.toFixed(1)} vs reference ${referenceValue} (top ${mission.referenceCount} targets by GAME PRIORITY at full detail). Each capture is worth GAME PRIORITY x detail ${spec.detail}.`,
    ),
    cat(
      'delivery',
      'Data delivered',
      w.delivery,
      delFrac,
      'delivered value / captured value',
      `${delivered.length} of ${captured.length} packets reached the ground (${deliveredValue.toFixed(1)} of ${capturedValue.toFixed(1)} value).`,
    ),
    cat('objective', 'Mission objective', w.objective, objFrac, 'progress toward the mission objective', `${mission.objective.text} Result: ${objective.detail}.`),
    cat(
      'efficiency',
      'Resource efficiency',
      w.efficiency,
      effFrac,
      '0.4 x packet yield + 0.3 x no-safe-mode + 0.3 x budget margin (20% = full)',
      `Packet yield ${pct(packetYield)} (${delivered.length} delivered / ${s.stats.capturesStarted} captures started); safe mode ${s.stats.safeModeSteps === 0 ? 'never triggered' : `for ${s.stats.safeModeSteps * dt} s`}; ${spec.budget - spec.cost} credits spare (${pct(spec.budgetMarginFrac)}).`,
    ),
    cat(
      'margin',
      'Engineering margin',
      w.margin,
      marginFrac,
      'average of mass margin (10% = full), lowest battery (30% = full), recorder never full',
      `Mass margin ${pct(spec.massMarginFrac)}; lowest battery ${pct(minBatFrac)}; recorder ${storageScore === 1 ? 'never overflowed' : 'overflowed'}.`,
    ),
  ];
  const total = Math.round(categories.reduce((a, c) => a + c.points, 0));
  let grade: ScoreReport['grade'] = total >= 90 ? 'S' : total >= 80 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : 'D';
  if (!objective.met && (grade === 'S' || grade === 'A' || grade === 'B')) grade = 'C';

  // Per-target outcomes
  const nT = targets.length;
  const targetResults: TargetResult[] = targets.map((t, j) => {
    let minD = Infinity;
    for (let k = 0; k < geometry.nSteps; k++) minD = Math.min(minD, geometry.targetDist[k * nT + j]);
    const packet = captured.find((p) => p.targetId === t.id);
    let outcome: TargetOutcome;
    if (packet?.status === 'DELIVERED') outcome = 'DELIVERED';
    else if (packet?.status === 'EXPIRED/LOST') outcome = 'LOST (OVERWRITTEN)';
    else if (packet) outcome = 'STORED, NOT DELIVERED';
    else if (s.targetStatus[t.id] === 'SKIPPED') outcome = 'SKIPPED';
    else if (!s.everInReach[t.id]) outcome = 'MISSED: NEVER IN REACH';
    else if (s.blockedByStorage.includes(t.id)) outcome = 'MISSED: RECORDER FULL';
    else if (s.blockedByPower.includes(t.id)) outcome = 'MISSED: LOW ENERGY';
    else outcome = 'MISSED: IN REACH, NOT CAPTURED';
    return {
      targetId: t.id,
      callsign: t.callsign,
      priority: t.priority.total,
      zone: t.zone,
      outcome,
      value: packet && packet.status !== 'EXPIRED/LOST' ? packet.value : 0,
      minDistanceKm: Math.round(minD),
    };
  });
  const counts = {} as Record<TargetOutcome, number>;
  for (const o of [
    'DELIVERED',
    'STORED, NOT DELIVERED',
    'LOST (OVERWRITTEN)',
    'MISSED: NEVER IN REACH',
    'MISSED: RECORDER FULL',
    'MISSED: LOW ENERGY',
    'MISSED: IN REACH, NOT CAPTURED',
    'SKIPPED',
  ] as TargetOutcome[])
    counts[o] = targetResults.filter((r) => r.outcome === o).length;

  const contactS = s.stats.contactSteps * dt;
  const activeS = s.stats.downlinkSteps * dt;
  const capacityMB = (spec.downlinkMbps * contactS) / 8;
  const onBoard = captured.filter((p) => p.status === 'STORED').reduce((a, p) => a + (p.sizeMB - p.sentMB), 0);

  const report: ScoreReport = {
    total,
    grade,
    success: objective.met,
    objective,
    categories,
    capturedValue: Math.round(capturedValue * 10) / 10,
    deliveredValue: Math.round(deliveredValue * 10) / 10,
    referenceValue,
    targets: targetResults,
    counts,
    energy: {
      usedWh: s.stats.energyUsedWh,
      generatedWh: s.stats.energyGeneratedWh,
      curtailedWh: s.stats.energyCurtailedWh,
      unmetWh: s.stats.energyUnmetWh,
      captureWh: s.stats.captureEnergyWh,
      radioWh: s.stats.radioEnergyWh,
      remainingWh: s.batteryWh,
      capacityWh: spec.batteryWh,
      minFrac: minBatFrac,
    },
    downlink: {
      contactS,
      activeS,
      sentMB: s.stats.downlinkMB,
      capacityMB,
      timeUtilization: contactS > 0 ? activeS / contactS : 0,
      capacityUtilization: capacityMB > 0 ? s.stats.downlinkMB / capacityMB : 0,
    },
    storage: { capacityMB: spec.storageMB, peakMB: s.stats.peakStorageMB, remainingOnBoardMB: onBoard },
    budget: { cost: spec.cost, budget: spec.budget, marginFrac: spec.budgetMarginFrac },
    mass: { massKg: spec.massKg, capacityKg: spec.launchCapacityKg, marginFrac: spec.massMarginFrac },
    analyst: [],
    secondary: secondaryProgress(run.config, s),
    commendations: [],
  };
  report.commendations = commendations(run, report);
  report.analyst = missionAnalyst(run, report);
  return report;
}

/**
 * Commendations are optional and never gate progress. Each rule uses only run state and
 * the launched design.
 */
export function commendations(run: MissionRun, r: ScoreReport): Commendation[] {
  const { mission, loadout } = run.config;
  const s = run.state;
  const checks = validateDesign(loadout, mission).checks;
  const notPass = checks.filter((c) => c.level !== 'pass');
  const onBoard = s.packets.filter((p) => p.status === 'STORED').length;
  const opsIssues = [
    s.stats.safeModeAtStep !== undefined ? 'safe mode entered' : '',
    s.stats.packetsLost > 0 ? `${s.stats.packetsLost} packet(s) overwritten` : '',
    s.stats.capturesRejectedStorage > 0 ? 'captures rejected (recorder full)' : '',
    s.stats.capturesFailed > 0 ? `${s.stats.capturesFailed} capture(s) failed` : '',
    onBoard > 0 ? `${onBoard} packet(s) never delivered` : '',
  ].filter(Boolean);
  const sec = r.secondary;
  const science = sec.length > 0 ? sec.every((x) => x.met) : r.counts.DELIVERED >= mission.referenceCount;
  const list: Commendation[] = [
    { id: 'complete', label: 'Mission Complete', criterion: 'Meet the primary objective.', met: r.success, detail: r.objective.detail },
    {
      id: 'engineering',
      label: 'Engineering Commendation',
      criterion: 'Launch a design with every validation check at PASS (no warnings).',
      met: notPass.length === 0,
      detail: notPass.length === 0 ? 'All design checks passed.' : `Not passed: ${notPass.map((c) => c.label).join(', ')}.`,
    },
    {
      id: 'science',
      label: 'Science Commendation',
      criterion: sec.length > 0 ? 'Meet every secondary objective.' : `Deliver at least ${mission.referenceCount} target groups.`,
      met: science,
      detail: sec.length > 0 ? sec.map((x) => `${x.text} ${x.met ? 'Met' : 'Not met'} (${x.detail}).`).join(' ') : `${r.counts.DELIVERED} delivered.`,
    },
    {
      id: 'operations',
      label: 'Operations Commendation',
      criterion: 'No safe mode, no lost or rejected data, no failed captures, and every captured packet delivered.',
      met: opsIssues.length === 0 && s.packets.length > 0,
      detail: opsIssues.length === 0 ? (s.packets.length > 0 ? 'Clean operations.' : 'Nothing was captured.') : opsIssues.join('; ') + '.',
    },
  ];
  const all = list.every((c) => c.met);
  list.push({
    id: 'perfect',
    label: 'Perfect Mission',
    criterion: 'Earn all four commendations above in one run.',
    met: all,
    detail: all ? 'All four earned.' : `Missing: ${list.filter((c) => !c.met).map((c) => c.label).join(', ')}.`,
  });
  return list;
}

/**
 * Deterministic Mission Analyst: every note is derived from actual run state with an explicit rule.
 */
export function missionAnalyst(run: MissionRun, r: ScoreReport): AnalystNote[] {
  const { mission, spec, geometry } = run.config;
  const s = run.state;
  const dt = geometry.stepS;
  const notes: AnalystNote[] = [];
  const met = (step: number | undefined) => (step === undefined ? '' : ` at ${formatMet(step, dt)}`);

  // Storage saturation
  const storageBlocked = r.counts['MISSED: RECORDER FULL'];
  if (s.stats.capturesRejectedStorage > 0 || storageBlocked > 0) {
    notes.push({
      id: 'storage',
      severity: 'critical',
      finding: `${spec.detailTier} captures are ${spec.dataMBPerCapture} MB each, so the ${spec.storageMB} MB recorder holds ${spec.capturesPerFullStorage}. It filled${met(s.stats.storageFullAtStep)} and ${storageBlocked || s.stats.capturesRejectedStorage} target group(s) in reach could not be stored.`,
      suggestion: 'Fit a larger recorder, switch to a lower-data payload, or downlink before the next pass so storage frees up.',
    });
  }

  // Undelivered data
  const stored = s.packets.filter((p) => p.status === 'STORED');
  if (stored.length > 0) {
    const lastContactEnd = geometry.contacts.length ? Math.max(...geometry.contacts.map((c) => c.endStep)) : -1;
    const afterLast = stored.filter((p) => p.captureStep > lastContactEnd).length;
    if (r.downlink.contactS === 0) {
      notes.push({
        id: 'no-contact',
        severity: 'critical',
        finding: `No ground station contact occurred, so ${stored.length} captured packet(s) never reached the ground.`,
        suggestion: 'Choose an orbit or altitude whose ground track passes a station, or a higher altitude for wider station visibility.',
      });
    } else if (afterLast > 0 && afterLast === stored.length) {
      notes.push({
        id: 'after-contact',
        severity: 'warn',
        finding: `${afterLast} packet(s) were captured after the final contact window ended, so they could never be delivered.`,
        suggestion: 'Capture earlier in the mission, or skip late low-value targets to save energy.',
      });
    } else if (r.downlink.timeUtilization >= 0.85) {
      notes.push({
        id: 'radio-limit',
        severity: 'critical',
        finding: `The ${spec.downlinkMbps} Mbps radio transmitted for ${Math.round(r.downlink.activeS)} s of ${Math.round(r.downlink.contactS)} s of contact and moved ${Math.round(r.downlink.sentMB)} MB. ${Math.round(r.storage.remainingOnBoardMB)} MB (${stored.length} packet(s)) stayed on board.`,
        suggestion: 'A higher-throughput radio, a higher orbit (longer contacts) or fewer high-detail captures would deliver more.',
      });
    } else {
      notes.push({
        id: 'unused-contact',
        severity: 'warn',
        finding: `Downlink was active for only ${Math.round(r.downlink.activeS)} s of ${Math.round(r.downlink.contactS)} s of contact while ${stored.length} packet(s) waited on board${s.stats.safeModeSteps > 0 ? ' (safe mode blocked part of it)' : ''}.`,
        suggestion: 'Keep AUTO-DOWNLINK on or press BEGIN DOWNLINK whenever a station is in view.',
      });
    }
  }

  // Safe mode / energy
  if (s.stats.safeModeSteps > 0) {
    notes.push({
      id: 'power',
      severity: 'critical',
      finding: `Battery fell to ${Math.round(r.energy.minFrac * 100)}%${met(s.stats.safeModeAtStep)}, triggering SAFE MODE for ${s.stats.safeModeSteps * dt} s. Each capture costs ${spec.captureWh.toFixed(1)} Wh from a ${spec.batteryWh} Wh battery.`,
      suggestion: 'Use the extended battery or larger arrays, or capture fewer targets per pass.',
    });
  } else if (r.counts['MISSED: LOW ENERGY'] > 0) {
    notes.push({
      id: 'power-low',
      severity: 'warn',
      finding: `${r.counts['MISSED: LOW ENERGY']} target group(s) were skipped by auto-observe because the battery could not cover another ${spec.captureWh.toFixed(1)} Wh capture.`,
      suggestion: 'More battery capacity or solar generation would allow longer capture bursts.',
    });
  }

  // Coverage
  const never = r.targets.filter((t) => t.outcome === 'MISSED: NEVER IN REACH');
  if (never.length > 0) {
    const zones = mission.zones?.map((z) => z.label).filter((label) => !r.targets.some((t) => t.zone === label && t.outcome !== 'MISSED: NEVER IN REACH'));
    notes.push({
      id: 'coverage',
      severity: never.length >= r.targets.length / 2 ? 'critical' : 'warn',
      finding: `${never.length} of ${r.targets.length} target group(s) never came within the ${Math.round(spec.reachKm)} km reach of the ground track${zones && zones.length ? ` (${zones.join(', ')} was never reached)` : ''}. Closest miss: ${Math.min(...never.map((t) => t.minDistanceKm))} km.`,
      suggestion: 'A wider swath, precision pointing (+120 km), a different aim point or another orbit would bring them into reach.',
    });
  }

  // Multi-pass: which passes produced delivered data
  const failedParts = r.objective.parts.filter((p) => !p.met).map((p) => p.detail);
  const passObjective = failedParts.find((d) => d.includes('passes delivered'));
  if (passObjective) {
    const perPass = geometry.passes.map((p) => ({
      n: p.index + 1,
      captured: s.packets.filter((x) => x.passIndex === p.index).length,
      delivered: s.packets.filter((x) => x.passIndex === p.index && x.status === 'DELIVERED').length,
    }));
    notes.push({
      id: 'passes',
      severity: 'critical',
      finding: `The orbit made ${geometry.passes.length} pass(es) over the region: ${perPass.map((p) => `pass ${p.n} captured ${p.captured}, delivered ${p.delivered}`).join('; ')}. The objective needs delivered data from more than one pass.`,
      suggestion:
        geometry.passes.length < 2
          ? 'This orbit crosses the region only once in the mission window. Try another aim point or inclination so a later orbit also crosses it.'
          : 'Leave recorder space and energy for the later pass, and keep targets from it in the queue.',
    });
  }

  // Constraint objectives that broke
  if (!r.success && failedParts.some((d) => d.startsWith('lowest battery'))) {
    const d = failedParts.find((x) => x.startsWith('lowest battery'))!;
    notes.push({
      id: 'reserve',
      severity: 'critical',
      finding: `The objective sets a battery floor, and the run broke it: ${d}. Eclipse time with no generation and ${spec.captureWh.toFixed(1)} Wh per capture drew the battery down.`,
      suggestion: 'Larger arrays or the extended battery raise the floor; skipping low-value targets right after eclipse also helps.',
    });
  }

  // Contention
  const inReachNotCaptured = r.counts['MISSED: IN REACH, NOT CAPTURED'];
  if (inReachNotCaptured > 0) {
    notes.push({
      id: 'contention',
      severity: 'info',
      finding: `${inReachNotCaptured} target group(s) were in reach but never captured. Each capture occupies the payload for ${spec.captureS} s, and targets that were not queued are not captured automatically.`,
      suggestion: 'Queue the targets you want before launch and use PRIORITIZE NEXT during the pass; a faster payload profile captures more per pass.',
    });
  }

  if (s.stats.capturesFailed > 0) {
    notes.push({
      id: 'failed',
      severity: 'warn',
      finding: `${s.stats.capturesFailed} capture(s) failed because the target left reach before the ${spec.captureS} s capture finished.`,
      suggestion: 'Start captures earlier in the window; watch the window-closing warning.',
    });
  }

  if (spec.detail < 0.75 && r.capturedValue > 0) {
    notes.push({
      id: 'detail',
      severity: 'info',
      finding: `The wide-swath profile captured ${s.packets.length} target(s), but its detail tier cut each observation's value to x${spec.detail}.`,
      suggestion: 'A balanced or high-detail payload earns more per target where targets are clustered close to the ground track.',
    });
  }

  if (spec.budgetMarginFrac > 0.25) {
    notes.push({
      id: 'budget',
      severity: 'info',
      finding: `${spec.budget - spec.cost} credits (${Math.round(spec.budgetMarginFrac * 100)}%) were left unspent.`,
      suggestion: 'Spare budget could buy a larger recorder, a faster radio, or precision pointing.',
    });
  }

  if (notes.length === 0) {
    notes.push({
      id: 'clean',
      severity: 'good',
      finding: 'Every captured packet reached the ground with healthy energy and storage margins.',
      suggestion: 'Try a cheaper or lighter design to raise the efficiency and margin scores.',
    });
  }
  const order = { critical: 0, warn: 1, info: 2, good: 3 };
  return notes.sort((a, b) => order[a.severity] - order[b.severity]);
}
