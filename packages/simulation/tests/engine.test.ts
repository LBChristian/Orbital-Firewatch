import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MissionRun,
  SAFE_MODE_ENTER_FRAC,
  SAFE_MODE_EXIT_FRAC,
  buildTargetGroups,
  computeScore,
  createRun,
  evaluateCondition,
  getMission,
  missionTargetOptions,
  normalizeFirmsRecords,
  objectiveProgress,
  parseCsv,
  type Loadout,
  type MissionDef,
  type ObjectiveCondition,
  type TargetGroup,
} from '../src/index';

/** Update 1 Stage D: energy accounting, target policy, multi-pass, objectives, commendations. */

const ROOT = path.resolve(__dirname, '../../..');
const cache = new Map<string, TargetGroup[]>();
function targetsFor(m: MissionDef): TargetGroup[] {
  if (!cache.has(m.id)) {
    const csv = fs.readFileSync(path.join(ROOT, 'apps/web/public', m.firms.snapshotFile), 'utf8');
    cache.set(m.id, buildTargetGroups(normalizeFirmsRecords(parseCsv(csv), m.firms.product, 'HISTORICAL').detections, missionTargetOptions(m)));
  }
  return cache.get(m.id)!;
}
function run(m: MissionDef, loadout: Loadout = m.recommended, opts = {}): MissionRun {
  const r = createRun(m, loadout, targetsFor(m), opts);
  if ('error' in r) throw new Error(r.error);
  return r;
}
const M01 = getMission('m01-first-pass');
const M07 = getMission('m07-signal-triage');
const M08 = getMission('m08-second-look');

describe('energy accounting', () => {
  it('closes the balance: final = initial + generated - used - curtailed + unmet', () => {
    for (const m of [M01, M08]) {
      const r = run(m);
      r.runToEnd();
      const st = r.state.stats;
      expect(r.state.batteryWh, m.code).toBeCloseTo(r.config.spec.batteryWh + st.energyGeneratedWh - st.energyUsedWh - st.energyCurtailedWh + st.energyUnmetWh, 6);
      expect(st.energyUnmetWh).toBe(0);
    }
  });

  it('counts generation in full while the battery is full, and books the excess as curtailed', () => {
    const r = run(M01);
    const g = r.config.geometry;
    r.runToEnd();
    const sunlitSteps = Array.from(g.sunlit).filter((x) => x === 1).length;
    expect(r.state.stats.energyGeneratedWh).toBeCloseTo((r.config.spec.solarW * sunlitSteps * g.stepS) / 3600, 6);
    // The run starts with a full battery in sunlight, so some generation cannot be stored.
    expect(g.sunlit[0]).toBe(1);
    expect(r.state.stats.energyCurtailedWh).toBeGreaterThan(0);
  });

  it('consumed energy equals the modelled loads', () => {
    const r = run(M01);
    r.runToEnd();
    const { spec, geometry: g } = r.config;
    const st = r.state.stats;
    const housekeeping = ((spec.busLoadW + spec.pointingLoadW) * g.nSteps * g.stepS) / 3600;
    const radio = (spec.radioPowerW * st.downlinkSteps * g.stepS) / 3600;
    expect(st.radioEnergyWh).toBeCloseTo(radio, 6);
    expect(st.captureEnergyWh).toBeCloseTo(spec.captureWh * st.capturesStarted, 6);
    expect(st.energyUsedWh).toBeCloseTo(housekeeping + radio + st.captureEnergyWh, 6);
  });

  it('keeps the battery within [0, capacity] and safe mode follows its hysteresis', () => {
    const base = run(M01);
    // A deliberately undersized battery forces safe mode; this tests the mechanic, not a mission.
    const spec = { ...base.config.spec, batteryWh: 30, solarW: 40 };
    const r = new MissionRun({ ...base.config, spec });
    r.state.batteryWh = spec.batteryWh;
    r.state.stats.minBatteryWh = spec.batteryWh;
    let inSafe = false;
    let transitions = 0;
    while (!r.state.ended) {
      r.advance(1);
      const frac = r.state.batteryWh / spec.batteryWh;
      expect(frac).toBeGreaterThanOrEqual(0);
      expect(frac).toBeLessThanOrEqual(1);
      if (r.state.safeMode !== inSafe) {
        transitions++;
        // Enter only below the entry threshold; leave only at or above the exit threshold.
        if (r.state.safeMode) expect(frac).toBeLessThan(SAFE_MODE_ENTER_FRAC);
        else expect(frac).toBeGreaterThanOrEqual(SAFE_MODE_EXIT_FRAC);
        inSafe = r.state.safeMode;
      }
    }
    expect(transitions).toBeGreaterThan(0);
    const events = r.state.events.filter((e) => e.type === 'safe-mode' || e.type === 'safe-mode-exit').map((e) => e.type);
    events.forEach((t, i) => expect(t).toBe(i % 2 === 0 ? 'safe-mode' : 'safe-mode-exit'));
  });
});

describe('target policy', () => {
  it('Chapter I missions still exclude groups whose best confidence is low', () => {
    for (const id of ['m01-first-pass', 'm02-split-front', 'm03-data-bottleneck']) {
      const m = getMission(id);
      expect(m.targetPolicy).toBeUndefined();
      expect(targetsFor(m).some((t) => t.bestConfidence === 'low'), id).toBe(false);
    }
  });

  it('M07 includes low-confidence groups through its quota, in priority order', () => {
    const t = targetsFor(M07);
    expect(t.length).toBe(M07.maxTargets);
    expect(t.filter((x) => x.bestConfidence === 'low').length).toBeGreaterThanOrEqual(2);
    // The 16 Nov snapshot has exactly one group whose best confidence is high.
    expect(t.filter((x) => x.bestConfidence === 'high').length).toBe(1);
    for (let i = 1; i < t.length; i++) expect(t[i - 1].priority.total).toBeGreaterThanOrEqual(t[i].priority.total);
    expect(t.map((x) => x.callsign)).toEqual(t.map((_, i) => `TG-${String(i + 1).padStart(2, '0')}`));
  });
});

describe('multi-pass geometry', () => {
  it('M08 makes two distinct passes, about one orbit apart, with the track shifted west', () => {
    const g = run(M08, M08.recommended, { aimId: 'east' }).config.geometry;
    expect(g.passes.length).toBeGreaterThanOrEqual(2);
    const [p1, p2] = g.passes;
    expect(p2.startStep).toBeGreaterThan(p1.endStep);
    const gapS = (p2.startStep - p1.startStep) * g.stepS;
    expect(Math.abs(gapS - g.periodS)).toBeLessThan(0.2 * g.periodS);
    // Longitude where each pass crosses 20° S: Earth turns about 24° per orbit at 550 km.
    const crossLon = (p: { startStep: number; endStep: number }) => {
      for (let k = p.startStep; k < p.endStep; k++) if ((g.lat[k] + 20) * (g.lat[k + 1] + 20) <= 0) return g.lon[k];
      return NaN;
    };
    const shift = crossLon(p1) - crossLon(p2);
    expect(shift).toBeGreaterThan(20);
    expect(shift).toBeLessThan(28);
  });

  it('evaluates sunlight and station contacts over the whole timeline', () => {
    const g = run(M08, M08.recommended, { aimId: 'east' }).config.geometry;
    const sun = Array.from(g.sunlit);
    expect(sun.includes(0) && sun.includes(1)).toBe(true);
    const lastQuarter = Math.floor(g.nSteps * 0.75);
    expect(g.contacts.some((c) => c.startStep < g.passes[1].startStep)).toBe(true);
    expect(g.contacts.some((c) => c.endStep >= g.passes[1].startStep)).toBe(true);
    expect(sun.slice(lastQuarter).length).toBeGreaterThan(0);
  });

  it('packets record their pass, and stored data survives across passes', () => {
    const r = run(M08, M08.recommended, { aimId: 'east', autoDownlink: false });
    r.runToEnd();
    const pass0 = r.state.packets.filter((p) => p.passIndex === 0);
    expect(pass0.length).toBeGreaterThan(0);
    // With downlink off nothing is sent, so everything captured is still on board at the end.
    expect(r.state.packets.every((p) => p.status === 'STORED')).toBe(true);
    expect(r.state.storageUsedMB).toBeCloseTo(r.state.packets.reduce((a, p) => a + p.sizeMB, 0), 6);
  });

  it('replaying a multi-pass command log reproduces events, score and commendations', () => {
    const live = run(M08, M08.recommended, { aimId: 'east', autoDownlink: false });
    live.advance(200);
    const first = live.config.targets[0].id;
    live.command({ type: 'prioritize', targetId: first });
    live.advance(1500);
    live.command({ type: 'setAutoDownlink', on: true });
    live.command({ type: 'skip', targetId: live.config.targets[1].id });
    live.runToEnd();
    const replay = run(M08, M08.recommended, { aimId: 'east', autoDownlink: false, replay: live.state.commandLog });
    replay.runToEnd();
    expect(JSON.stringify(replay.state.events)).toBe(JSON.stringify(live.state.events));
    expect(computeScore(replay)).toEqual(computeScore(live));
  });
});

describe('objective conditions', () => {
  const done = () => {
    const r = run(M01);
    r.runToEnd();
    return r;
  };
  const ev = (r: MissionRun, c: ObjectiveCondition) => evaluateCondition(c, r.config, r.state);

  it('delivery conditions read delivered packets only', () => {
    const r = done();
    const n = new Set(r.state.packets.filter((p) => p.status === 'DELIVERED').map((p) => p.targetId)).size;
    expect(ev(r, { type: 'deliverCount', count: n }).met).toBe(true);
    expect(ev(r, { type: 'deliverCount', count: n + 1 }).met).toBe(false);
    expect(ev(r, { type: 'deliverFromPasses', passes: 1 }).met).toBe(true);
    expect(ev(r, { type: 'deliverFromPasses', passes: 2 }).met).toBe(false);
    expect(ev(r, { type: 'deliverConfidence', categories: ['nominal'] }).met).toBe(true);
    expect(ev(r, { type: 'deliverConfidence', categories: ['nominal', 'low'] }).met).toBe(false);
  });

  it('top-priority uses the board order', () => {
    const r = done();
    const top = r.config.targets[0].id;
    const delivered = r.state.packets.some((p) => p.targetId === top && p.status === 'DELIVERED');
    expect(ev(r, { type: 'deliverTopPriority', count: 1 }).met).toBe(delivered);
    for (const p of r.state.packets) if (p.targetId === top) p.status = 'EXPIRED/LOST';
    expect(ev(r, { type: 'deliverTopPriority', count: 1 }).met).toBe(false);
  });

  it('constraints read the run statistics', () => {
    const r = done();
    const min = r.state.stats.minBatteryWh / r.config.spec.batteryWh;
    expect(ev(r, { type: 'minBattery', frac: min - 0.01 }).met).toBe(true);
    expect(ev(r, { type: 'minBattery', frac: min + 0.01 }).met).toBe(false);
    expect(ev(r, { type: 'noSafeMode' }).met).toBe(true);
    r.state.stats.safeModeAtStep = 10;
    expect(ev(r, { type: 'noSafeMode' }).met).toBe(false);
    expect(ev(r, { type: 'noDataLost' }).met).toBe(true);
    r.state.stats.packetsLost = 1;
    expect(ev(r, { type: 'noDataLost' }).met).toBe(false);
    expect(ev(r, { type: 'all', conditions: [{ type: 'deliverCount', count: 1 }, { type: 'noDataLost' }] }).met).toBe(false);
  });

  it('a met objective is lost when a constraint breaks later', () => {
    // M01 with a high-detail payload delivers its first packet while the battery is still
    // above 90%, then dips to about 84%. A floor between the two is met, then broken.
    const loadout = { ...M01.recommended, payloadId: 'payload-high' };
    const m: MissionDef = {
      ...M01,
      objective: { type: 'all', conditions: [{ type: 'deliverCount', count: 1 }, { type: 'minBattery', frac: 0.87 }], text: 'test' },
    };
    const r = run(m, loadout);
    r.runToEnd();
    const types = r.state.events.map((e) => e.type);
    expect(types.indexOf('objective-complete')).toBeGreaterThan(-1);
    expect(types.indexOf('objective-lost')).toBeGreaterThan(types.indexOf('objective-complete'));
    expect(r.state.objectiveMet).toBe(false);
    expect(computeScore(r).success).toBe(false);
    expect(objectiveProgress(r.config, r.state).parts.map((p) => p.met)).toEqual([true, false]);
  });
});

describe('commendations', () => {
  it('lists all five with explicit rules; Perfect needs the other four', () => {
    const r = run(M01);
    r.runToEnd();
    const c = computeScore(r).commendations;
    expect(c.map((x) => x.id)).toEqual(['complete', 'engineering', 'science', 'operations', 'perfect']);
    expect(c.every((x) => x.criterion.length > 10 && x.detail.length > 0)).toBe(true);
    expect(c[0].met).toBe(computeScore(r).success);
    expect(c[4].met).toBe(c.slice(0, 4).every((x) => x.met));
  });

  it('Science uses the mission secondary objectives when there are any', () => {
    const m = getMission('m06-polar-watch');
    const r = run(m);
    r.runToEnd();
    const rep = computeScore(r);
    expect(rep.secondary.map((s) => s.id)).toEqual(['eleven']);
    expect(rep.commendations.find((x) => x.id === "science")!.met).toBe(rep.success && rep.secondary[0].met);
  });

  it('Engineering requires every design check at PASS', () => {
    // Any warning or failure in the launched design withholds it.
    for (const m of [M01, M07]) {
      const r = run(m);
      r.runToEnd();
      const eng = computeScore(r).commendations.find((x) => x.id === 'engineering')!;
      expect(eng.met).toBe(!eng.detail.startsWith('Not passed'));
    }
  });
});
