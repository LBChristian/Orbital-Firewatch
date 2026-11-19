/**
 * Short, plain-language mission content. The full briefings, citations and data notes stay in
 * the mission config and are shown on request; this file is what a new player reads first.
 * Lines are written to be read in a couple of seconds. Tips follow what the balance tests show
 * works (docs/BALANCE_REPORT.md) without giving the whole answer away.
 */

export type StatKey = 'view' | 'detail' | 'battery' | 'memory' | 'radio';

export interface MissionVoice {
  /** What winning looks like, in one short line. */
  goal: string;
  /** The one thing most likely to go wrong. */
  watch: string;
  /** A nudge toward a working plan. */
  tip: string;
  /** What this mission leans on, 1–5. A hint drawn over your satellite's shape, not a rule. */
  needs: Record<StatKey, number>;
  /** The flight controller's lines at each moment. */
  say: {
    brief: string;
    design: string;
    plan: string;
    win: string;
    lose: string;
  };
}

export const CONTROLLER = { name: 'Ines', role: 'Flight controller' };

export const VOICE: Record<string, MissionVoice> = {
  'm01-first-pass': {
    goal: 'Get data for 4 hot spots down to the ground.',
    watch: 'Data still on board at the end does not count.',
    tip: 'The suggested satellite works. Just fly it.',
    needs: { view: 2, detail: 2, battery: 2, memory: 2, radio: 2 },
    say: {
      brief: 'One pass over Northern California. See it, save it, send it home.',
      design: 'This satellite is ready to go. Look around, then continue.',
      plan: 'Cyan band is what you can see. Ticked targets get captured.',
      win: 'Data is on the ground. That is the whole job.',
      lose: 'Some data never made it down. Check what ran out.',
    },
  },
  'm02-split-front': {
    goal: '2 hot spots from each of two areas, far apart.',
    watch: 'A narrow view only reaches one area.',
    tip: 'Wider view, or a different orbit tilt.',
    needs: { view: 4, detail: 2, battery: 2, memory: 2, radio: 2 },
    say: {
      brief: 'Two fire areas, 800 km apart. One pass has to touch both.',
      design: 'How wide can you see? That decides this one.',
      plan: 'Does the cyan band cross both boxes? If not, go back.',
      win: 'Both areas covered on one pass. Nice reach.',
      lose: 'One area was out of reach. Widen the view or change the tilt.',
    },
  },
  'm03-data-bottleneck': {
    goal: 'Send home enough data value: 600 points.',
    watch: 'Memory fills fast, and the radio window is short.',
    tip: 'A faster radio clears the backlog.',
    needs: { view: 2, detail: 2, battery: 2, memory: 3, radio: 4 },
    say: {
      brief: 'Plenty to see here. The hard part is getting it home.',
      design: 'Watch Memory and Radio. Seeing is easy this time.',
      plan: 'Only one short station window, near the end. Plan for it.',
      win: 'Everything that mattered got through the window.',
      lose: 'The radio window closed with data still on board.',
    },
  },
  'm04-shadow-line': {
    goal: 'Get 8 hot spots down. Never drop below 35% battery.',
    watch: 'The pass is at night. Solar panels give nothing.',
    tip: 'Bigger battery, or capture fewer targets.',
    needs: { view: 2, detail: 2, battery: 4, memory: 3, radio: 2 },
    say: {
      brief: 'We fly over in the dark. Every capture comes out of the battery.',
      design: 'Bigger solar panels will not help at night. Look at the battery.',
      plan: 'Untick a few low-value targets if the battery looks tight.',
      win: 'Through the dark with power to spare.',
      lose: 'The battery dipped under 35%. Carry more, or capture less.',
    },
  },
  'm05-dead-air': {
    goal: 'Send home 500 points of data value.',
    watch: 'The station is in range for about five minutes.',
    tip: 'From now on, you press Send data yourself.',
    needs: { view: 2, detail: 2, battery: 2, memory: 2, radio: 4 },
    say: {
      brief: 'Lots to capture over Borneo. Barely any time to send it.',
      design: 'Radio speed is your bottleneck. Smaller data also helps.',
      plan: 'See the station window? Everything has to fit through it.',
      win: 'Short window, full delivery. Well timed.',
      lose: 'The window closed before the data got through.',
    },
  },
  'm06-polar-watch': {
    goal: '2 hot spots from each of two northern bands.',
    watch: 'The default orbit never goes this far north.',
    tip: 'Pick a polar orbit, then aim the pass north.',
    needs: { view: 3, detail: 2, battery: 2, memory: 2, radio: 2 },
    say: {
      brief: 'Siberia, 60 to 67 degrees north. Many of these are gas flares.',
      design: 'Orbit tilt decides how far north you go. 53 degrees will not do.',
      plan: 'Is the northern band inside the cyan? Try the other aim point.',
      win: 'Both bands covered, high in the north.',
      lose: 'The north band was out of reach. Aim further north.',
    },
  },
  'm07-signal-triage': {
    goal: 'Send home 320 points of data value.',
    watch: 'Memory holds only a few captures.',
    tip: 'Untick low-value targets so memory keeps the good ones.',
    needs: { view: 2, detail: 2, battery: 2, memory: 3, radio: 2 },
    say: {
      brief: 'More targets than memory. You choose what is worth keeping.',
      design: 'Small memory. Decide: more space, or smaller captures.',
      plan: 'Top of the list gets captured first. Order matters.',
      win: 'You kept the right ones.',
      lose: 'Memory filled with the wrong captures.',
    },
  },
  'm08-second-look': {
    goal: '2 hot spots in each area, from two separate passes.',
    watch: 'Earth turns about 24° between passes.',
    tip: 'Start in the east. The next pass lands further west.',
    needs: { view: 4, detail: 2, battery: 2, memory: 3, radio: 2 },
    say: {
      brief: 'Two passes, an orbit apart. Earth turns under us in between.',
      design: 'You need reach on the second pass too. Look at View.',
      plan: 'Check both passes. Does the second one reach the Kimberley?',
      win: 'Two passes, two areas. Good planning.',
      lose: 'Only one pass found targets. Try the other starting point.',
    },
  },
  'm09-hard-limits': {
    goal: 'Get 6 hot spots down on an 88-credit budget.',
    watch: 'Red checks block launch. Amber is a warning.',
    tip: 'Cheaper parts can still do the job.',
    needs: { view: 3, detail: 2, battery: 2, memory: 2, radio: 3 },
    say: {
      brief: 'Tight money, small rocket. Every part has to earn its place.',
      design: 'Watch the budget and mass bars. Red means no launch.',
      plan: 'Nothing fancy here. Just make sure the targets are in reach.',
      win: 'On budget and on target.',
      lose: 'Not enough came home. Try a wider view at the same price.',
    },
  },
  'm10-final-firewatch': {
    goal: '2 hot spots in each of 3 areas, over two passes.',
    watch: 'Starting in the wrong place leaves an area unseen.',
    tip: 'Start in the east, and bring a long reach.',
    needs: { view: 5, detail: 2, battery: 3, memory: 3, radio: 3 },
    say: {
      brief: 'Three areas across West Africa. Everything you have learned.',
      design: 'Reach matters most. Make sure you can still afford the rest.',
      plan: 'Two passes, three boxes. Which start covers all of them?',
      win: 'All three areas. That is a full mission.',
      lose: 'An area was missed. Change where the first pass starts.',
    },
  },
};

export function voiceFor(missionId: string): MissionVoice {
  return VOICE[missionId] ?? VOICE['m01-first-pass'];
}

/** Plain names for the five satellite stats, with the technical term for tooltips. */
export const STAT_LABEL: Record<StatKey, { name: string; tech: string }> = {
  view: { name: 'View', tech: 'Sensor swath plus pointing reach' },
  detail: { name: 'Detail', tech: 'Payload detail tier and altitude' },
  battery: { name: 'Battery', tech: 'Stored energy (Wh)' },
  memory: { name: 'Memory', tech: 'Onboard recorder (MB)' },
  radio: { name: 'Radio', tech: 'Downlink rate (Mbps)' },
};
