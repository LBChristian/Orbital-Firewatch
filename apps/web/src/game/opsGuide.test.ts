import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTargetGroups, createRun, getMission, missionTargetOptions, normalizeFirmsRecords, parseCsv, type MissionRun } from '@ofw/simulation';
import { VOICE, voiceFor } from './content/missionVoice';
import { controllerSays, mainAction, needsDownlink, opsPhase } from './opsGuide';
import { designStats } from './stats';
import { computeDesign, MISSIONS } from '@ofw/simulation';

const ROOT = path.resolve(__dirname, '../../../..');
function run(id: string, opts: { aimId?: string; autoDownlink?: boolean; autoObserve?: boolean } = {}): MissionRun {
  const m = getMission(id);
  const csv = fs.readFileSync(path.join(ROOT, 'apps/web/public', m.firms.snapshotFile), 'utf8');
  const targets = buildTargetGroups(normalizeFirmsRecords(parseCsv(csv), m.firms.product, 'HISTORICAL').detections, missionTargetOptions(m));
  const r = createRun(m, m.recommended, targets, { aimId: opts.aimId, autoObserve: opts.autoObserve ?? true, autoDownlink: opts.autoDownlink ?? true });
  if ('error' in r) throw new Error(r.error);
  return r;
}

describe('flight controller and main action', () => {
  it('walks a manual-downlink mission through skip, capture, send and debrief', () => {
    const r = run('m05-dead-air', { autoDownlink: false });
    expect(mainAction(r, false)).toBe('skip');
    expect(controllerSays(r).text).toMatch(/On our way/);
    const seen = new Set<string>();
    let sentPrompted = false;
    while (!r.state.ended) {
      const kind = mainAction(r, false);
      seen.add(kind);
      if (kind === 'send') {
        expect(needsDownlink(r)).toBe(true);
        expect(controllerSays(r)).toEqual({ text: 'Station in range. Send the data now.', tone: 'urgent' });
        r.command({ type: 'beginDownlink' });
        sentPrompted = true;
      }
      r.advance(1);
    }
    expect(sentPrompted).toBe(true);
    expect(seen.has('capture') || seen.has('wait')).toBe(true);
    expect(mainAction(r, false)).toBe('debrief');
    const v = voiceFor('m05-dead-air');
    expect([v.say.win, v.say.lose]).toContain(controllerSays(r).text);
  });

  it('never asks to send when auto-send is on', () => {
    const r = run('m01-first-pass');
    while (!r.state.ended) {
      expect(mainAction(r, false)).not.toBe('send');
      r.advance(5);
    }
  });

  it('offers capture whenever a queued target is in view and the camera is free (manual capture)', () => {
    // With auto-capture on, the engine captures in the same step a target comes into view.
    const r = run('m01-first-pass', { autoObserve: false });
    let checked = 0;
    while (!r.state.ended) {
      const inView = r.state.queue.some((id) => r.state.targetStatus[id] === 'IN_WINDOW');
      if (inView && !r.state.capture && !r.state.safeMode) {
        expect(mainAction(r, false)).toBe('capture');
        checked++;
      }
      if (opsPhase(r) === 'coast') expect(mainAction(r, false)).toBe('skip');
      r.advance(1);
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('mission voice content', () => {
  it('has short lines for every campaign mission', () => {
    for (const m of MISSIONS) {
      const v = VOICE[m.id];
      expect(v, m.id).toBeDefined();
      for (const line of [v.goal, v.watch, v.tip, ...Object.values(v.say)]) {
        expect(line.split(/\s+/).length, `${m.code}: ${line}`).toBeLessThanOrEqual(15);
      }
      for (const n of Object.values(v.needs)) expect(n).toBeGreaterThanOrEqual(1);
    }
  });

  it('stat shape tracks the engine: battery, radio and view follow the parts', () => {
    const m = getMission('m04-shadow-line');
    const base = designStats(computeDesign(m.recommended, m.budgetCredits));
    const ext = designStats(computeDesign({ ...m.recommended, batteryId: 'battery-extended' }, m.budgetCredits));
    const solar = designStats(computeDesign({ ...m.recommended, solarId: 'solar-high' }, m.budgetCredits));
    const radio = designStats(computeDesign({ ...m.recommended, commsId: 'comms-high' }, m.budgetCredits));
    const wide = designStats(computeDesign({ ...m.recommended, payloadId: 'payload-wide' }, m.budgetCredits));
    expect(ext.battery).toBeGreaterThan(base.battery);
    // Bigger solar panels do not raise the battery score: they cannot help at night (M04's lesson).
    expect(solar.battery).toBe(base.battery);
    expect(radio.radio).toBeGreaterThan(base.radio);
    expect(wide.view).toBeGreaterThan(base.view);
    expect(wide.detail).toBeLessThan(base.detail);
    // M04's suggested battery is visibly below what the mission leans on; the extended one meets it.
    expect(base.battery).toBeLessThan(voiceFor(m.id).needs.battery);
    expect(ext.battery).toBeGreaterThanOrEqual(voiceFor(m.id).needs.battery);
  });
});
