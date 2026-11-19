import type { MissionRun, ObjectiveCondition } from '@ofw/simulation';
import { voiceFor } from './content/missionVoice';

/**
 * What the operations screen tells the player right now: one line from the flight controller
 * and the single most useful action. Pure functions of the engine state, so they are testable
 * and never disagree with the simulation.
 */

export type OpsPhase = 'focus' | 'pass' | 'contact' | 'coast';
export type Tone = 'calm' | 'urgent' | 'good';
export type MainActionKind = 'debrief' | 'send' | 'capture' | 'skip' | 'wait';

export function opsPhase(run: MissionRun): OpsPhase {
  const s = run.state;
  const g = run.config.geometry;
  const k = Math.min(s.step, g.nSteps - 1);
  if (s.capture) return 'focus';
  if (run.config.targets.some((t) => s.targetStatus[t.id] === 'IN_WINDOW')) return 'focus';
  if (g.passAt[k] >= 0) return 'pass';
  if (g.station[k] >= 0 && pendingPackets(run).length > 0) return 'contact';
  return 'coast';
}

export function pendingPackets(run: MissionRun) {
  return run.state.packets.filter((p) => p.status === 'STORED' || p.status === 'QUEUED' || p.status === 'TRANSMITTING');
}

/** Battery floor from the objective, if it has one. */
export function reserveFraction(c: ObjectiveCondition): number | undefined {
  if (c.type === 'minBattery') return c.frac;
  if (c.type === 'all') return c.conditions.map(reserveFraction).find((x) => x !== undefined);
  return undefined;
}

/** A station is in view, data is waiting, and nothing will send it unless the player acts. */
export function needsDownlink(run: MissionRun): boolean {
  const s = run.state;
  const g = run.config.geometry;
  const k = Math.min(s.step, g.nSteps - 1);
  return g.station[k] >= 0 && pendingPackets(run).length > 0 && !s.transmitting && !s.autoDownlink && !s.safeMode && !s.ended;
}

export function controllerSays(run: MissionRun): { text: string; tone: Tone } {
  const s = run.state;
  const g = run.config.geometry;
  const { mission: m, spec } = run.config;
  const v = voiceFor(m.id);
  const ph = opsPhase(run);
  const reserve = reserveFraction(m.objective);
  const passNext = g.passes.find((p) => p.startStep > s.step);
  const contactNext = g.contacts.find((c) => c.startStep > s.step);
  if (s.ended) return { text: s.objectiveMet ? v.say.win : v.say.lose, tone: s.objectiveMet ? 'good' : 'urgent' };
  if (s.safeMode) return { text: 'Battery critical. Everything pauses until it recharges.', tone: 'urgent' };
  if (needsDownlink(run)) return { text: 'Station in range. Send the data now.', tone: 'urgent' };
  if (reserve !== undefined && s.stats.minBatteryWh / spec.batteryWh < reserve) return { text: 'We went under the battery reserve. Go easy on captures.', tone: 'urgent' };
  if (s.transmitting) return { text: 'Sending data. Keep going while the station can hear us.', tone: 'good' };
  if (ph === 'focus') return { text: s.autoObserve ? 'Target in view. Auto-capture has it.' : 'Target in view. Capture it before it slips away.', tone: 'calm' };
  if (ph === 'pass') return { text: 'Over the area. Targets are coming into view.', tone: 'calm' };
  if (s.step < (g.passes[0]?.startStep ?? 0)) return { text: 'On our way. Press Skip ahead to jump to the action.', tone: 'calm' };
  if (passNext) return { text: `Next pass in ${Math.max(1, Math.round(((passNext.startStep - s.step) * g.stepS) / 60))} min. Skip ahead when ready.`, tone: 'calm' };
  if (contactNext && pendingPackets(run).length > 0) return { text: 'Holding the data until the next station.', tone: 'calm' };
  return { text: 'Nothing left to see. End the mission when you are done.', tone: 'calm' };
}

/**
 * The main button. `selectedInView` is true when the player has picked a target that can be
 * captured right now. Auto-capture is not consulted: the player may always capture by hand.
 */
export function mainAction(run: MissionRun, selectedInView: boolean): MainActionKind {
  const s = run.state;
  if (s.ended) return 'debrief';
  if (needsDownlink(run)) return 'send';
  const inView = s.queue.some((id) => s.targetStatus[id] === 'IN_WINDOW') || selectedInView;
  if (inView && !s.capture && !s.safeMode) return 'capture';
  if (opsPhase(run) !== 'focus') return 'skip';
  return 'wait';
}
