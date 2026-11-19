import type { Loadout } from './catalog';

/**
 * Documented strategies for each Update 1 mission, with the outcome the balance work
 * found. The test suite runs every row against the bundled snapshot and fails if the
 * engine disagrees, and `npm run balance` prints the same table. Changing a mission,
 * the catalog or the engine therefore cannot silently break a documented strategy.
 */
export interface BalanceStrategy {
  name: string;
  /** Changes from the mission's recommended loadout. */
  loadout?: Partial<Loadout>;
  /** Aim point id; defaults to the mission's first aim point (the planner default). */
  aim?: string;
  /** Keep only the top N targets queued (the player trims the queue in planning). */
  queueTop?: number;
  expect: 'success' | 'fail';
  /** Why this row matters for the lesson. */
  note: string;
}

export const BALANCE_STRATEGIES: Record<string, BalanceStrategy[]> = {
  'm04-shadow-line': [
    { name: 'Recommended, capture everything', expect: 'fail', note: 'Standard battery drops to about 29%, below the 35% reserve.' },
    { name: 'Recommended, queue trimmed to 14', queueTop: 14, expect: 'success', note: 'Operations fix: fewer captures in shadow keep about 44%.' },
    { name: 'Extended battery', loadout: { batteryId: 'battery-extended' }, expect: 'success', note: 'Design fix: stored energy carries the night pass (about 64%).' },
    { name: 'Larger arrays only', loadout: { solarId: 'solar-high' }, expect: 'fail', note: 'Arrays produce nothing in shadow; the reserve still breaks.' },
    { name: 'Extended battery, wide swath', loadout: { batteryId: 'battery-extended', payloadId: 'payload-wide' }, expect: 'success', note: 'More, cheaper captures.' },
  ],
  'm05-dead-air': [
    { name: 'Recommended', expect: 'success', note: 'Contact-limited: about 527 of 500, with packets left on board.' },
    { name: 'Low-rate radio', loadout: { commsId: 'comms-low' }, expect: 'fail', note: 'A 20 Mbps radio moves almost nothing in one short contact.' },
    { name: 'High-rate radio', loadout: { commsId: 'comms-high' }, expect: 'success', note: 'Radio strategy: everything captured reaches the ground.' },
    { name: 'Wide swath', loadout: { payloadId: 'payload-wide' }, expect: 'success', note: 'Selective-volume strategy: smaller packets fit the contact.' },
    { name: 'High-detail payload', loadout: { payloadId: 'payload-high' }, expect: 'fail', note: '900 MB packets clog the contact.' },
    { name: 'Northern aim point', aim: 'north', expect: 'fail', note: 'The pass misses the main cluster.' },
  ],
  'm06-polar-watch': [
    { name: 'Recommended, centre aim', expect: 'fail', note: 'Only 1 of 2 groups reached in the north band.' },
    { name: 'Recommended, northern aim', aim: 'north', expect: 'success', note: 'Planning fix: bias the pass toward 66° N.' },
    { name: '70° inclination', loadout: { inclinationId: 'inc-70' }, expect: 'fail', note: 'Reaches 70° N but the track turns before covering the north band.' },
    { name: 'Wide swath', loadout: { payloadId: 'payload-wide' }, expect: 'success', note: 'More reach instead of a different aim.' },
    { name: 'Precision pointing', loadout: { pointingId: 'pointing-precision' }, expect: 'success', note: '+120 km reach.' },
    { name: 'High-detail payload', loadout: { payloadId: 'payload-high' }, expect: 'fail', note: 'A 150 km swath cannot cover both bands.' },
  ],
  'm07-signal-triage': [
    { name: 'Recommended', expect: 'success', note: 'Small recorder; about 331 of 320.' },
    { name: 'Medium recorder', loadout: { recorderId: 'recorder-medium' }, expect: 'success', note: 'More storage, more value.' },
    { name: 'Wide swath', loadout: { payloadId: 'payload-wide' }, expect: 'success', note: 'Smaller packets fit more in the recorder.' },
    { name: 'High-detail payload', loadout: { payloadId: 'payload-high' }, expect: 'fail', note: 'Two 900 MB captures fill the 2 GB recorder.' },
    { name: 'Western aim point', aim: 'west', expect: 'fail', note: 'Only one group in reach.' },
    { name: '30° orbit, wide swath', loadout: { inclinationId: 'inc-30', payloadId: 'payload-wide' }, expect: 'success', note: 'Also meets the every-confidence optional goal.' },
  ],
  'm08-second-look': [
    { name: 'Recommended, Kimberley first', expect: 'fail', note: 'The next orbit falls over the ocean: one pass only.' },
    { name: 'Recommended, Queensland first', aim: 'east', expect: 'success', note: 'Planning fix: the second orbit reaches the Kimberley.' },
    { name: 'Balanced payload, Queensland first', aim: 'east', loadout: { payloadId: 'payload-balanced' }, expect: 'fail', note: 'A 300 km swath misses the Kimberley on pass 2.' },
    { name: 'Precision pointing, Queensland first', aim: 'east', loadout: { payloadId: 'payload-balanced', pointingId: 'pointing-precision' }, expect: 'success', note: 'Reach instead of swath.' },
    { name: '30° orbit, Queensland first', aim: 'east', loadout: { payloadId: 'payload-balanced', inclinationId: 'inc-30' }, expect: 'success', note: 'A flatter track sweeps more longitude.' },
  ],
  'm09-hard-limits': [
    { name: 'Recommended', expect: 'success', note: 'Wide swath, compact arrays: 76 of 88 credits.' },
    { name: 'Balanced payload', loadout: { payloadId: 'payload-balanced', solarId: 'solar-standard' }, expect: 'fail', note: 'Valid but too few groups (5 of 6).' },
    { name: 'Wide swath, small recorder', loadout: { recorderId: 'recorder-small' }, expect: 'success', note: 'Another valid design.' },
    { name: 'Wide swath, precision pointing', loadout: { solarId: 'solar-standard', pointingId: 'pointing-precision' }, expect: 'success', note: 'Budget warning, more groups.' },
    { name: 'Low-rate radio', loadout: { commsId: 'comms-low' }, expect: 'fail', note: 'Cheap, but the data never gets down.' },
  ],
  'm10-final-firewatch': [
    { name: 'Recommended, central zone first', expect: 'fail', note: 'One pass only reaches the region.' },
    { name: 'Recommended, east zone first', aim: 'east', expect: 'success', note: 'Planning fix: pass 2 reaches the west zone.' },
    { name: 'No precision pointing, east first', aim: 'east', loadout: { pointingId: 'pointing-basic' }, expect: 'fail', note: 'The central zone stays out of reach.' },
    { name: '30° orbit, wide swath, east first', aim: 'east', loadout: { inclinationId: 'inc-30', pointingId: 'pointing-basic' }, expect: 'success', note: 'A flatter track crosses two zones in one pass.' },
    { name: 'Balanced payload, east first', aim: 'east', loadout: { payloadId: 'payload-balanced', pointingId: 'pointing-basic' }, expect: 'fail', note: 'Too narrow for three zones.' },
  ],
};
