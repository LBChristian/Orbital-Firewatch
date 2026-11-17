/**
 * Balance report: runs every mission against the bundled real FIRMS snapshot with a set of
 * loadouts and aim points (auto-observe, all targets queued) and prints the outcome.
 * Usage: npm run balance [-- missionId]
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  MISSIONS,
  buildTargetGroups,
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
  return buildTargetGroups(detections, { clusterRadiusKm: m.clusterRadiusKm, maxTargets: m.maxTargets, zones: m.zones, excludeLowOnly: true });
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
