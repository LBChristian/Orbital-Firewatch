import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MISSIONS, buildTargetGroups, computeScore, createRun, getMission, missionTargetOptions, normalizeFirmsRecords, parseCsv, type MissionDef } from '@ofw/simulation';
import { cardLine, kaiBrief, kaiDebrief, kaiNow, roomFor, stars } from './kai';

const ROOT = path.resolve(__dirname, '../../../../..');
function run(m: MissionDef, opts = {}) {
  const csv = fs.readFileSync(path.join(ROOT, 'apps/web/public', m.firms.snapshotFile), 'utf8');
  const t = buildTargetGroups(normalizeFirmsRecords(parseCsv(csv), m.firms.product, 'HISTORICAL').detections, missionTargetOptions(m));
  const r = createRun(m, m.recommended, t, opts);
  if ('error' in r) throw new Error(r.error);
  return r;
}

describe('Kai lines', () => {
  it('has a short briefing for every mission', () => {
    for (const m of MISSIONS) {
      const b = kaiBrief(m);
      for (const line of [b.goal, b.watch, b.tip]) {
        expect(line.length, m.code).toBeGreaterThan(10);
        expect(line.split(' ').length, `${m.code}: ${line}`).toBeLessThanOrEqual(16);
      }
    }
  });

  it('gives 1-3 stars and never calls a detection dangerous', () => {
    const r = run(getMission('m07-signal-triage'));
    for (const t of r.config.targets) {
      expect([1, 2, 3]).toContain(stars(t));
      expect(cardLine(t)).not.toMatch(/danger|threat|risk|severe/i);
    }
  });

  it('room counts the tighter of memory and battery', () => {
    const r = run(getMission('m07-signal-triage'));
    const room = roomFor(r);
    const { spec } = r.config;
    expect(room.n).toBe(Math.min(Math.floor(spec.storageMB / spec.dataMBPerCapture), Math.floor((spec.batteryWh * 0.85) / spec.captureWh)));
  });

  it('always has a line, and every line is short', () => {
    for (const id of ['m01-first-pass', 'm04-shadow-line', 'm08-second-look']) {
      const r = run(getMission(id), { autoDownlink: false });
      while (!r.state.ended) {
        const l = kaiNow(r);
        expect(l.text.length).toBeGreaterThan(5);
        expect(l.text.split(' ').length, l.text).toBeLessThanOrEqual(18);
        r.advance(25);
      }
      expect(kaiNow(r).tone).toMatch(/good|bad/);
    }
  });

  it('asks the player to send when a station is listening and auto-downlink is off', () => {
    const r = run(getMission('m08-second-look'), { autoDownlink: false, aimId: 'east' });
    let asked = false;
    while (!r.state.ended && !asked) {
      r.advance(1);
      asked = kaiNow(r).text.startsWith('Station’s listening');
    }
    expect(asked).toBe(true);
  });

  it('debrief lines come from the report', () => {
    const r = run(getMission('m01-first-pass'));
    r.runToEnd();
    const d = kaiDebrief(computeScore(r));
    expect(d.stamp).toBe('Mission complete');
    expect(d.what).toMatch(/^\d+ hot spots? delivered/);
  });
});
