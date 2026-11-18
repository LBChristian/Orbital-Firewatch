import { describe, expect, it } from 'vitest';
import { CML_LEVELS, LOADOUT_KEYS, MISSIONS, SOURCES, SUBSYSTEM_CITATIONS, cmlLevel } from '../src/index';

describe('Challenge 13 resource citations', () => {
  it('every design-bay choice cites a listed source with a page and a game note', () => {
    for (const k of LOADOUT_KEYS) {
      const c = SUBSYSTEM_CITATIONS[k];
      expect(c, k).toBeDefined();
      expect(SOURCES[c.source].listedForChallenge13).toBe(true);
      expect(c.page).toMatch(/^\d+([–,] ?\d+)*$/);
      expect(c.note.length).toBeGreaterThan(20);
      expect(c.inGame.length).toBeGreaterThan(20);
    }
  });

  it('defines CML 1-9 in order; Chapter I climbs CML 2, 3, 4, then trade space and point design', () => {
    expect(CML_LEVELS.map((l) => l.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(MISSIONS.map((m) => m.cml.level)).toEqual([2, 3, 4, 3, 3, 3, 3, 4, 4, 4]);
    expect(cmlLevel(3).name).toBe('Trade Space');
    expect(() => cmlLevel(10)).toThrow();
  });
});
