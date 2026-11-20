import type { MissionDef, MissionRun, ScoreReport, TargetGroup } from '@ofw/simulation';

/**
 * Kai: an original, fictional flight controller who says one short thing at a time.
 * Lines are picked from run state by fixed rules, so every line is true for the run.
 * Tone: calm, dry, a little Gen Z. Never jokes when something has failed.
 */

export const KAI = { name: 'Kai', role: 'flight controller', initials: 'KR' };

export interface KaiBrief {
  goal: string;
  watch: string;
  tip: string;
}

const BRIEFS: Record<string, KaiBrief> = {
  'm01-first-pass': {
    goal: 'Get data on 4 hot spots down to the ground.',
    watch: 'You get one pass. Blink and the window closes.',
    tip: 'Leave auto on. Watch how see, save, send works.',
  },
  'm02-split-front': {
    goal: '2 hot spots from EACH fire front.',
    watch: 'The fronts are 800 km apart. A narrow camera only sees one.',
    tip: 'Wider view, or tilt the orbit. Both are valid.',
  },
  'm03-data-bottleneck': {
    goal: 'Send home 600 points of data.',
    watch: 'Lots to see, tiny contact window. The radio is the bottleneck.',
    tip: 'A faster radio fixes a lot. Not glamorous, very effective.',
  },
  'm04-shadow-line': {
    goal: '8 hot spots, battery never under 35%.',
    watch: 'The pass is in Earth’s shadow. Panels make zero power.',
    tip: 'Bigger battery, or skip a few targets. Bigger panels won’t help in the dark.',
  },
  'm05-dead-air': {
    goal: 'Send home 500 points of data.',
    watch: 'One station, one short call. Then dead air.',
    tip: 'Start sending the moment the link is up. Every second counts.',
  },
  'm06-polar-watch': {
    goal: '2 hot spots in EACH latitude band.',
    watch: 'Up at 60°N+. A normal orbit literally cannot reach it.',
    tip: 'Polar orbit, then aim north. Many of these are gas flares, not wildfires.',
  },
  'm07-signal-triage': {
    goal: 'Send home 320 points of data.',
    watch: 'More targets than memory. You can’t take them all.',
    tip: 'Queue the best ones first. Order matters more than you think.',
  },
  'm08-second-look': {
    goal: '2 per zone, using two different passes.',
    watch: 'Earth turns ~24° per orbit. Your second pass lands somewhere else.',
    tip: 'Start over Queensland. The next orbit drifts west to the Kimberley.',
  },
  'm09-hard-limits': {
    goal: 'Get 6 hot spots down. Budget: 88 credits.',
    watch: 'Strict budget, strict weight. Red checks block launch.',
    tip: 'Cheap and wide beats fancy and broke.',
  },
  'm10-final-firewatch': {
    goal: '2 per zone in 3 zones, across two passes.',
    watch: 'Three zones, 30° apart. Everything you learned, at once.',
    tip: 'Start east. You need reach for the middle zone.',
  },
};

export function kaiBrief(m: MissionDef): KaiBrief {
  return BRIEFS[m.id] ?? { goal: m.objective.text, watch: m.constraintsNote, tip: m.tagline };
}

/* Target cards */

export function stars(t: TargetGroup): 1 | 2 | 3 {
  return t.priority.total >= 90 ? 3 : t.priority.total >= 75 ? 2 : 1;
}

/** Plain-language one-liner from real FIRMS fields. Never a danger rating. */
export function cardLine(t: TargetGroup): string {
  const heat = t.priority.frpRank >= 0.66 ? 'Bright' : t.priority.frpRank >= 0.33 ? 'Medium' : 'Faint';
  const conf = t.bestConfidence === 'high' ? 'sure' : t.bestConfidence === 'low' ? 'unsure' : 'likely';
  return `${heat} signal · NASA ${conf} it’s hot`;
}

/** Captures that still fit: the tighter of memory and battery (above the reserve or safe-mode floor). */
export function roomFor(run: MissionRun): { n: number; limit: 'memory' | 'battery' } {
  const { spec } = run.config;
  const s = run.state;
  const floor = reserveFrac(run.config.mission) ?? 0.15;
  const byMem = Math.max(0, Math.floor((spec.storageMB - s.storageUsedMB) / spec.dataMBPerCapture));
  const byBat = Math.max(0, Math.floor((s.batteryWh - spec.batteryWh * floor) / spec.captureWh));
  return byMem <= byBat ? { n: byMem, limit: 'memory' } : { n: byBat, limit: 'battery' };
}

export function reserveFrac(m: MissionDef): number | undefined {
  const find = (c: MissionDef['objective']): number | undefined =>
    c.type === 'minBattery' ? c.frac : c.type === 'all' ? c.conditions.map((x) => find(x as MissionDef['objective'])).find((x) => x !== undefined) : undefined;
  return find(m.objective);
}

/* Live lines */

export interface KaiLine {
  text: string;
  tone: 'calm' | 'warn' | 'bad' | 'good';
}

/** One line for right now, by priority. */
export function kaiNow(run: MissionRun): KaiLine {
  const { geometry: g, spec, mission } = run.config;
  const s = run.state;
  const k = Math.min(s.step, g.nSteps - 1);
  const pending = s.packets.filter((p) => p.status === 'STORED' || p.status === 'QUEUED' || p.status === 'TRANSMITTING');
  const inView = run.config.targets.filter((t) => s.targetStatus[t.id] === 'IN_WINDOW' && s.queue.includes(t.id));
  const room = roomFor(run);
  const nextPass = g.passes.find((p) => p.startStep > s.step);
  const nextContact = g.contacts.find((c) => c.startStep > s.step);
  const inContact = g.station[k] >= 0;
  const bat = s.batteryWh / spec.batteryWh;
  const reserve = reserveFrac(mission);
  const mins = (step: number) => Math.max(1, Math.round(((step - s.step) * g.stepS) / 60));

  if (s.ended) return s.objectiveMet ? { text: 'Objective met. Clean work. Debrief’s ready.', tone: 'good' } : { text: 'Window’s closed. Let’s look at what happened.', tone: 'bad' };
  if (s.safeMode) return { text: 'Safe mode. Battery’s too low, so everything’s paused until it recharges.', tone: 'bad' };
  if (reserve !== undefined && s.stats.minBatteryWh / spec.batteryWh < reserve) return { text: `We dipped under the ${Math.round(reserve * 100)}% reserve. That one’s gone, sorry.`, tone: 'bad' };
  if (inContact && pending.length > 0 && !s.transmitting && !s.autoDownlink) return { text: 'Station’s listening. Hit Send. Data on board scores nothing.', tone: 'warn' };
  if (s.transmitting) return { text: `Sending. ${pending.length} packet${pending.length === 1 ? '' : 's'} left in the queue.`, tone: 'good' };
  if (s.storageUsedMB + spec.dataMBPerCapture > spec.storageMB && inView.length > 0) return { text: 'Memory’s full. That’s the whole hard drive, no notes. Send or skip.', tone: 'warn' };
  if (reserve !== undefined && bat < reserve + 0.1) return { text: `Battery’s near the ${Math.round(reserve * 100)}% line. Skip the small ones.`, tone: 'warn' };
  if (!g.sunlit[k] && inView.length > 0) return { text: 'We’re in the shadow. Every capture comes out of the battery.', tone: 'warn' };
  if (s.capture) { const c = run.config.targets.find((t) => t.id === s.capture!.targetId); return { text: `Capturing ${c?.callsign ?? 'target'}. Camera's busy for a few seconds.`, tone: 'calm' }; }
  if (inView.length > 0) {
    if (room.n < inView.length) return { text: `${inView.length} in view, room for ${room.n}. Pick favourites.`, tone: 'warn' };
    return { text: `${inView.length} in view. Capture before the timer runs out.`, tone: 'calm' };
  }
  if (g.passAt[k] >= 0) return { text: 'Over the region. Targets light up as they come into view.', tone: 'calm' };
  if (pending.length > 0 && nextContact) return { text: `${pending.length} packet${pending.length === 1 ? '' : 's'} waiting. Next station in ${mins(nextContact.startStep)} min.`, tone: 'calm' };
  const nextWin = g.windows.filter((w) => w.startStep > s.step && s.queue.includes(w.targetId)).sort((a, b) => a.startStep - b.startStep)[0];
  if (nextWin) return { text: `First target in ${mins(nextWin.startStep)} min. Skip ahead, nothing happens till then.`, tone: 'calm' };
  if (nextPass) return { text: `Next pass in ${mins(nextPass.startStep)} min.`, tone: 'calm' };
  return { text: 'Nothing left to do this orbit. You can wrap up.', tone: 'calm' };
}

/* Debrief */

export interface KaiDebrief {
  stamp: 'Mission complete' | 'Mission incomplete';
  what: string;
  why: string;
  next: string;
}

export function kaiDebrief(r: ScoreReport, endedEarly = false): KaiDebrief {
  const top = r.analyst.find((n) => n.severity === 'critical') ?? r.analyst.find((n) => n.severity === 'warn') ?? r.analyst[0];
  const lost = endedEarly ? 0 : r.counts["MISSED: NEVER IN REACH"];
  const what = `${r.counts.DELIVERED} hot spot${r.counts.DELIVERED === 1 ? '' : 's'} delivered${lost ? `, ${lost} never in reach` : ''}. ${r.objective.detail}.`;
  if (endedEarly && !r.success) {
    return { stamp: 'Mission incomplete', what, why: 'You ended the mission before it played out.', next: 'Fly it to the end. Skip ahead jumps the quiet parts.' };
  }
  if (r.success) {
    return {
      stamp: 'Mission complete',
      what,
      why: top && top.severity !== 'good' ? top.finding : 'Everything you captured reached the ground.',
      next: top && top.severity !== 'good' ? top.suggestion : 'Chase the optional goals for the badges.',
    };
  }
  return { stamp: 'Mission incomplete', what, why: top?.finding ?? 'The objective was not reached.', next: top?.suggestion ?? 'Change the plan and fly again.' };
}
