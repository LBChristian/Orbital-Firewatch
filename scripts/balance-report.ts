/**
 * Balance report: runs every mission against the bundled real FIRMS snapshot with a set of
 * loadouts and aim points (auto-observe, all targets queued) and prints the outcome.
 * Usage: npm run balance [-- missionId]
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  BALANCE_STRATEGIES,
  MISSIONS,
  buildTargetGroups,
  missionTargetOptions,
  computeScore,
  createRun,
  formatMet,
  normalizeFirmsRecords,
  parseCsv,
  validateDesign,
  type Loadout,
  type MissionDef,
} from '../packages/simulation/src/index';

function loadTargets(m: MissionDef) {
  const csv = fs.readFileSync(path.resolve('apps/web/public', m.firms.snapshotFile), 'utf8');
  const { detections } = normalizeFirmsRecords(parseCsv(csv), m.firms.product, 'HISTORICAL');
  return buildTargetGroups(detections, missionTargetOptions(m));
}

const variants: Record<string, Partial<Loadout>> = {
  recommended: {},
  wide: { payloadId: 'payload-wide' },
  high: { payloadId: 'payload-high' },
  'wide+700+prec': { payloadId: 'payload-wide', altitudeId: 'alt-700', launchId: 'launch-small', pointingId: 'pointing-precision' },
  'bal+prec': { pointingId: 'pointing-precision' },
  'high+large+fast': { payloadId: 'payload-high', recorderId: 'recorder-large', commsId: 'comms-high', busId: 'bus-medium', launchId: 'launch-small' },
  'bal+fast': { commsId: 'comms-high' },
  'inc97': { inclinationId: 'inc-97' },
  'inc30': { inclinationId: 'inc-30' },
};

const only = process.argv[2];
for (const m of MISSIONS) {
  if (only && m.id !== only) continue;
  const targets = loadTargets(m);
  console.log(`\n=== ${m.code} ${m.name}: ${targets.length} targets; budget ${m.budgetCredits}`);
  console.log('  ' + targets.map((t) => `${t.callsign}(${t.priority.total}${t.zone ? ' ' + t.zone[0] : ''}) ${t.lat.toFixed(2)},${t.lon.toFixed(2)}`).join(' | '));
  for (const aim of m.aimPoints) {
    for (const [name, v] of Object.entries(variants)) {
      const loadout = { ...m.recommended, ...v };
      const val = validateDesign(loadout, m);
      const run = createRun(m, loadout, targets, { aimId: aim.id });
      if ('error' in run) {
        console.log(`  [${aim.id}] ${name.padEnd(16)} ERROR ${run.error}`);
        continue;
      }
      run.runToEnd();
      const r = computeScore(run);
      const g = run.config.geometry;
      const fails = val.checks.filter((c) => c.level === 'fail').map((c) => c.id);
      console.log(
        `  [${aim.id}] ${name.padEnd(16)} cost ${String(val.spec.cost).padStart(3)} ${fails.length ? 'FAIL:' + fails.join(',') : 'ok'.padEnd(5)} passes ${g.passes.length} contacts ${g.contacts
          .map((c) => `${c.stationId.slice(3)}@${formatMet(c.startStep, g.stepS).slice(3)}/${(c.endStep - c.startStep) * g.stepS}s`)
          .join(',')} | score ${String(r.total).padStart(3)} ${r.grade} ${r.success ? 'SUCCESS' : 'fail   '} | del ${r.counts.DELIVERED} stored ${r.counts['STORED, NOT DELIVERED']} full ${r.counts['MISSED: RECORDER FULL']} noReach ${r.counts['MISSED: NEVER IN REACH']} inReach ${r.counts['MISSED: IN REACH, NOT CAPTURED']} pwr ${r.counts['MISSED: LOW ENERGY']} | ${r.objective.detail} | minBat ${Math.round(r.energy.minFrac * 100)}%`,
      );
    }
  }
}

// Documented Update 1 strategies (the same table the balance tests assert).
console.log('\n=== Documented strategies (packages/simulation/src/config/balance.ts)');
for (const m of MISSIONS) {
  const rows = BALANCE_STRATEGIES[m.id];
  if (!rows || (only && m.id !== only)) continue;
  const targets = loadTargets(m);
  console.log(`\n${m.code} ${m.name}: ${m.objective.text}`);
  for (const s of rows) {
    const loadout = { ...m.recommended, ...s.loadout };
    const queue = targets.slice(0, s.queueTop ?? targets.length).map((t) => t.id);
    const run = createRun(m, loadout, targets, { aimId: s.aim ?? m.aimPoints[0].id, queue });
    if ('error' in run) {
      console.log(`  ${s.name.padEnd(38)} ERROR ${run.error}`);
      continue;
    }
    run.runToEnd();
    const r = computeScore(run);
    const got = r.success ? 'success' : 'fail';
    const sec = r.secondary.every((x) => x.met) ? 'optional met' : 'optional not met';
    console.log(
      `  ${s.name.padEnd(38)} ${got.padEnd(7)} ${got === s.expect ? '' : `(EXPECTED ${s.expect}) `}${String(r.total).padStart(3)} ${r.grade} | ${r.objective.detail} | min battery ${Math.round(r.energy.minFrac * 100)}% | ${sec} | ${s.note}`,
    );
  }
}
