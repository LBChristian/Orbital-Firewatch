import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_MISSION_IDS,
  CHAPTERS,
  MISSIONS,
  SAVE_VERSION,
  chapterOf,
  createRun,
  loadSave,
  missionAvailability,
  nextMissionId,
  recordRun,
  sandboxUnlocked,
  validateDesign,
  type ProgressMap,
} from '../src/index';

const done = (...ids: string[]): ProgressMap =>
  Object.fromEntries(ids.map((id) => [id, { completed: true, bestScore: 40, bestGrade: 'D', attempts: 1, commendations: [] }]));
const status = (p: ProgressMap, id: string) => missionAvailability(p, id).status;
const CH1 = CHAPTERS[0].missionIds;
const CH2 = CHAPTERS[1].missionIds;
const CH3 = CHAPTERS[2].missionIds;

describe('campaign structure', () => {
  it('has 10 missions in three chapters, matching the mission configs', () => {
    expect(CHAPTERS.map((c) => c.missionIds.length)).toEqual([3, 4, 3]);
    expect(CAMPAIGN_MISSION_IDS).toEqual(MISSIONS.map((m) => m.id));
    expect(MISSIONS.map((m) => m.code)).toEqual(['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10']);
    expect(chapterOf('m06-polar-watch').numeral).toBe('II');
  });

  it('marks every mission balanced after Update 1 balance testing', () => {
    expect(MISSIONS.every((m) => m.balanceStatus === 'balanced')).toBe(true);
  });

  it('every mission has unique ids, codes and seeds, and aim points inside its region', () => {
    for (const key of ['id', 'code', 'seed'] as const) expect(new Set(MISSIONS.map((m) => m[key])).size).toBe(MISSIONS.length);
    for (const m of MISSIONS) {
      for (const a of m.aimPoints) {
        expect(a.lat, `${m.code} ${a.id}`).toBeGreaterThanOrEqual(m.bbox.south);
        expect(a.lat).toBeLessThanOrEqual(m.bbox.north);
        expect(a.lon).toBeGreaterThanOrEqual(m.bbox.west);
        expect(a.lon).toBeLessThanOrEqual(m.bbox.east);
      }
      for (const z of m.zones ?? []) {
        expect(z.bbox.west, `${m.code} ${z.id}`).toBeGreaterThanOrEqual(m.bbox.west);
        expect(z.bbox.east).toBeLessThanOrEqual(m.bbox.east);
      }
      expect(m.groundStations.every((g) => g.name.includes('(notional)'))).toBe(true);
    }
  });

  it('every recommended design passes hard validation and produces a run', () => {
    for (const m of MISSIONS) {
      const v = validateDesign(m.recommended, m);
      expect(v.checks.filter((c) => c.level === 'fail').map((c) => c.id), m.code).toEqual([]);
      const run = createRun(m, m.recommended, []);
      expect('error' in run, m.code).toBe(false);
    }
  });

  it('M06 cannot be flown with the default 53° orbit', () => {
    const m = MISSIONS.find((x) => x.id === 'm06-polar-watch')!;
    const loadout = { ...m.recommended, inclinationId: 'inc-53' };
    expect(validateDesign(loadout, m).checks.find((c) => c.id === 'coverage')?.level).toBe('fail');
    expect('error' in createRun(m, loadout, [])).toBe(true);
  });
});

describe('unlock rules', () => {
  it('opens M01 only on a new game', () => {
    expect(CAMPAIGN_MISSION_IDS.filter((id) => status({}, id) === 'available')).toEqual(['m01-first-pass']);
    expect(nextMissionId({})).toBe('m01-first-pass');
  });

  it('runs Chapter I in order', () => {
    expect(status(done(CH1[0]), CH1[1])).toBe('available');
    expect(status(done(CH1[0]), CH1[2])).toBe('locked');
    expect(missionAvailability(done(CH1[0]), CH1[2]).requirement).toBe('Complete M02 first.');
  });

  it('opens all of Chapter II at once after Chapter I, in any order', () => {
    expect(CH2.map((id) => status(done(CH1[0], CH1[1]), id))).toEqual(['locked', 'locked', 'locked', 'locked']);
    expect(missionAvailability(done(CH1[0]), CH2[0]).requirement).toBe('Complete M02, M03 to open Chapter II.');
    expect(CH2.map((id) => status(done(...CH1), id))).toEqual(['available', 'available', 'available', 'available']);
    expect(status(done(...CH1, CH2[3]), CH2[0])).toBe('available');
  });

  it('opens Chapter III after all of Chapter II, then in order', () => {
    expect(status(done(...CH1, ...CH2.slice(0, 3)), CH3[0])).toBe('locked');
    const p = done(...CH1, ...CH2);
    expect(CH3.map((id) => status(p, id))).toEqual(['available', 'locked', 'locked']);
    expect(status(done(...CH1, ...CH2, CH3[0]), CH3[1])).toBe('available');
  });

  it('unlocks Free Operations only after M10', () => {
    expect(sandboxUnlocked(done(...CH1, ...CH2, CH3[0], CH3[1]))).toBe(false);
    expect(sandboxUnlocked(done(...CAMPAIGN_MISSION_IDS))).toBe(true);
  });

  it('practice setting opens everything without touching progress', () => {
    expect(CAMPAIGN_MISSION_IDS.every((id) => missionAvailability({}, id, true).status === 'available')).toBe(true);
    expect(missionAvailability(done(CH1[0]), CH1[0], true).status).toBe('completed');
  });
});

describe('recording runs', () => {
  const at = '2026-11-19T00:00:00Z';
  it('a low grade still completes the mission; grade never gates unlocks', () => {
    const p = recordRun({}, CH1[0], { score: 31, grade: 'D', success: true, atUtc: at });
    expect(p[CH1[0]]).toMatchObject({ completed: true, bestGrade: 'D', attempts: 1, firstCompletedAtUtc: at });
    expect(status(p, CH1[1])).toBe('available');
  });

  it('a failed run after a completion keeps the completion and best score', () => {
    let p = recordRun({}, CH1[0], { score: 80, grade: 'A', success: true, atUtc: at, commendations: ['complete'] });
    p = recordRun(p, CH1[0], { score: 20, grade: 'D', success: false, atUtc: '2026-11-20T00:00:00Z', commendations: ['engineering'] });
    expect(p[CH1[0]]).toMatchObject({ completed: true, bestScore: 80, bestGrade: 'A', attempts: 2, firstCompletedAtUtc: at });
    expect(p[CH1[0]].commendations).toEqual(['complete', 'engineering']);
  });
});

describe('save format', () => {
  const v2 = (progress: unknown) => JSON.stringify({ version: SAVE_VERSION, progress });

  it('starts empty with no save', () => {
    expect(loadSave(null, null)).toEqual({ save: { version: SAVE_VERSION, progress: {} }, source: 'new' });
  });

  it('migrates a version-1 progress map', () => {
    const legacy = JSON.stringify({ 'm01-first-pass': { bestScore: 93, bestGrade: 'S', completed: true, attempts: 2 } });
    const r = loadSave(null, legacy);
    expect(r.source).toBe('migrated');
    expect(r.save.progress['m01-first-pass']).toEqual({ completed: true, bestScore: 93, bestGrade: 'S', attempts: 2, commendations: [], firstCompletedAtUtc: undefined });
  });

  it('round-trips the current version and prefers it over a legacy map', () => {
    const p = done(CH1[0]);
    const r = loadSave(v2(p), JSON.stringify({}));
    expect(r.source).toBe('current');
    expect(r.save.progress).toEqual(p);
  });

  it('recovers from corrupt or wrong-version saves without throwing', () => {
    for (const bad of ['{not json', '[]', 'null', JSON.stringify({ version: 99, progress: {} }), JSON.stringify({ version: SAVE_VERSION, progress: 5 })]) {
      const r = loadSave(bad, null);
      expect(r.source, bad).toBe('recovered');
      expect(r.save.progress).toEqual({});
      expect(r.discarded).toBe(bad);
    }
    expect(loadSave(null, '{oops').source).toBe('recovered');
  });

  it('drops malformed entries and unknown missions, and clamps values', () => {
    const r = loadSave(
      v2({
        'm01-first-pass': { completed: true, bestScore: 140, bestGrade: 'S', attempts: 1.7, commendations: ['complete', 'bogus'] },
        'm02-split-front': { completed: 'yes' },
        'm99-unknown': { completed: true, bestScore: 1, bestGrade: 'D', attempts: 1 },
      }),
      null,
    );
    expect(Object.keys(r.save.progress)).toEqual(['m01-first-pass']);
    expect(r.save.progress['m01-first-pass']).toMatchObject({ bestScore: 100, attempts: 1, commendations: ['complete'] });
  });
});
