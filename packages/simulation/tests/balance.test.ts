import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BALANCE_STRATEGIES,
  MISSIONS,
  buildTargetGroups,
  computeScore,
  createRun,
  missionTargetOptions,
  normalizeFirmsRecords,
  parseCsv,
  validateDesign,
  type MissionDef,
} from '../src/index';

/** Every documented strategy for every balanced Update 1 mission, run against its bundled snapshot. */

const ROOT = path.resolve(__dirname, '../../..');
function targetsFor(m: MissionDef) {
  const csv = fs.readFileSync(path.join(ROOT, 'apps/web/public', m.firms.snapshotFile), 'utf8');
  return buildTargetGroups(normalizeFirmsRecords(parseCsv(csv), m.firms.product, 'HISTORICAL').detections, missionTargetOptions(m));
}

const NEW = MISSIONS.slice(3);

describe('mission balance', () => {
  it('every Update 1 mission is balanced and has strategies documented', () => {
    for (const m of NEW) {
      expect(m.balanceStatus, m.code).toBe('balanced');
      const rows = BALANCE_STRATEGIES[m.id] ?? [];
      expect(rows.filter((r) => r.expect === 'success').length, m.code).toBeGreaterThanOrEqual(2);
      expect(rows.some((r) => r.expect === 'fail'), m.code).toBe(true);
      // The recommended loadout can complete the mission (with at most a planning choice).
      expect(rows.some((r) => r.expect === 'success' && !r.loadout), m.code).toBe(true);
    }
  });

  for (const m of NEW) {
    describe(m.code, () => {
      const targets = targetsFor(m);
      for (const s of BALANCE_STRATEGIES[m.id]) {
        it(`${s.name}: ${s.expect}`, () => {
          const loadout = { ...m.recommended, ...s.loadout };
          // Every documented design can actually be launched.
          expect(validateDesign(loadout, m).checks.filter((c) => c.level === 'fail').map((c) => c.id)).toEqual([]);
          const queue = targets.slice(0, s.queueTop ?? targets.length).map((t) => t.id);
          const run = createRun(m, loadout, targets, { aimId: s.aim ?? m.aimPoints[0].id, queue });
          if ('error' in run) throw new Error(run.error);
          run.runToEnd();
          const r = computeScore(run);
          expect(r.success ? 'success' : 'fail', r.objective.detail).toBe(s.expect);
        });
      }
    });
  }

  it('optional goals are achievable for every new mission', () => {
    // At least one documented row meets all secondary objectives.
    for (const m of NEW) {
      const targets = targetsFor(m);
      const ok = BALANCE_STRATEGIES[m.id].some((s) => {
        const run = createRun(m, { ...m.recommended, ...s.loadout }, targets, {
          aimId: s.aim ?? m.aimPoints[0].id,
          queue: targets.slice(0, s.queueTop ?? targets.length).map((t) => t.id),
        });
        if ('error' in run) return false;
        run.runToEnd();
        const r = computeScore(run);
        return r.success && r.secondary.every((x) => x.met);
      });
      expect(ok, m.code).toBe(true);
    }
  }, 60_000);
});
