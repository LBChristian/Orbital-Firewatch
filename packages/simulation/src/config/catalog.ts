/**
 * NOTIONAL COMPONENT CATALOG — GAME-BALANCE PARAMETERS.
 *
 * Every number below is a fictional game value chosen for gameplay trade-offs. None of them
 * is a NASA specification, a real product datasheet, a real launch price, or a measured sensor
 * performance. "Credits" are a game currency, not dollars.
 */

export const CATALOG_IS_NOTIONAL = true as const;

interface BaseOption {
  id: string;
  label: string;
  short: string;
  description: string;
  /** Why the subsystem matters (tooltip). */
  why: string;
  massKg: number;
  cost: number;
  isNotional: true;
}

export interface BusOption extends BaseOption {
  /** Continuous housekeeping load (avionics, heaters, ADCS baseline), W. */
  baseLoadW: number;
  /** Maximum mass of attached subsystems the structure can carry, kg. */
  structureCapacityKg: number;
}

export interface PayloadOption extends BaseOption {
  /** Effective cross-track swath at 550 km altitude, km (scales linearly with altitude). */
  swathKmAt550: number;
  /** Data volume per capture, decimal MB. */
  dataMB: number;
  /** Time to complete one capture, s. */
  captureS: number;
  /** Energy per capture (includes cooler, slew settle, processing), Wh. */
  captureWh: number;
  /** Instantaneous draw while capturing, W (display). */
  powerW: number;
  /** Detail tier multiplier on observation value (not a GSD claim). */
  detail: number;
  detailTier: string;
}

export interface SolarOption extends BaseOption {
  /** Generation in sunlight (average, including pointing losses), W. */
  generationW: number;
}

export interface BatteryOption extends BaseOption {
  capacityWh: number;
}

export interface RecorderOption extends BaseOption {
  capacityMB: number;
}

export interface CommsOption extends BaseOption {
  rateMbps: number;
  /** Draw while transmitting, W. */
  powerW: number;
}

export interface PointingOption extends BaseOption {
  /** Extra off-nadir reach beyond the half-swath, km. */
  extraReachKm: number;
  /** Extra time per capture for slew/settle, s. */
  extraCaptureS: number;
  /** Extra energy per capture, Wh. */
  extraCaptureWh: number;
  /** Continuous ADCS load, W. */
  loadW: number;
  /** Value multiplier for captures in the outer 30% of the swath (edge distortion). */
  edgeFactor: number;
}

export interface LaunchOption extends BaseOption {
  capacityKg: number;
  /** Altitudes this launch option can deliver to, km. */
  allowedAltitudesKm: number[];
}

export interface AltitudeOption {
  id: string;
  label: string;
  altitudeKm: number;
  cost: number;
  /** Detail multiplier from viewing distance (lower is closer = more detail). Notional. */
  detailFactor: number;
  description: string;
  isNotional: true;
}

export interface InclinationOption {
  id: string;
  label: string;
  inclinationDeg: number;
  description: string;
}

export const BUS_OPTIONS: BusOption[] = [
  {
    id: 'bus-small',
    label: 'Small platform',
    short: 'SMALL',
    description: 'Compact smallsat bus. Cheap and light, limited structure capacity.',
    why: 'The bus carries everything. Its housekeeping load runs all the time, including in eclipse.',
    massKg: 40,
    cost: 18,
    baseLoadW: 22,
    structureCapacityKg: 60,
    isNotional: true,
  },
  {
    id: 'bus-medium',
    label: 'Medium platform',
    short: 'MEDIUM',
    description: 'Larger bus that can carry heavier arrays, recorders and radios.',
    why: 'More structure capacity, but a heavier, more power-hungry baseline.',
    massKg: 68,
    cost: 30,
    baseLoadW: 34,
    structureCapacityKg: 120,
    isNotional: true,
  },
];

export const PAYLOAD_OPTIONS: PayloadOption[] = [
  {
    id: 'payload-wide',
    label: 'Wide Swath',
    short: 'WIDE',
    description: 'Broad cross-track coverage, lower detail tier, compact data.',
    why: 'Wide swath sees more targets per pass, but each observation is worth less.',
    massKg: 16,
    cost: 14,
    swathKmAt550: 560,
    dataMB: 260,
    captureS: 4,
    captureWh: 3.0,
    powerW: 45,
    detail: 0.6,
    detailTier: 'DETAIL TIER 1',
    isNotional: true,
  },
  {
    id: 'payload-balanced',
    label: 'Balanced',
    short: 'BAL',
    description: 'Medium swath and detail. A good default.',
    why: 'Balanced trade between coverage, data volume and value per observation.',
    massKg: 20,
    cost: 18,
    swathKmAt550: 300,
    dataMB: 420,
    captureS: 6,
    captureWh: 4.5,
    powerW: 60,
    detail: 0.85,
    detailTier: 'DETAIL TIER 2',
    isNotional: true,
  },
  {
    id: 'payload-high',
    label: 'High Detail',
    short: 'HIGH',
    description: 'Narrow swath, richest data per observation, heavy data and energy.',
    why: 'Each capture is worth the most, but fills the recorder and battery fast and sees fewer targets.',
    massKg: 28,
    cost: 26,
    swathKmAt550: 150,
    dataMB: 900,
    captureS: 9,
    captureWh: 8.0,
    powerW: 95,
    detail: 1.0,
    detailTier: 'DETAIL TIER 3',
    isNotional: true,
  },
];

export const SOLAR_OPTIONS: SolarOption[] = [
  {
    id: 'solar-compact',
    label: 'Compact arrays',
    short: 'COMPACT',
    description: 'Two short wings.',
    why: 'Solar arrays recharge the battery in sunlight. Small arrays recharge slowly between passes.',
    massKg: 5,
    cost: 6,
    generationW: 70,
    isNotional: true,
  },
  {
    id: 'solar-standard',
    label: 'Standard arrays',
    short: 'STD',
    description: 'Two full-length deployable wings.',
    why: 'Enough margin for most single-pass missions.',
    massKg: 9,
    cost: 10,
    generationW: 130,
    isNotional: true,
  },
  {
    id: 'solar-high',
    label: 'High Output arrays',
    short: 'HIGH',
    description: 'Long multi-panel wings.',
    why: 'Fast recharge between back-to-back passes and contacts. Heavier and pricier.',
    massKg: 15,
    cost: 17,
    generationW: 220,
    isNotional: true,
  },
];

export const BATTERY_OPTIONS: BatteryOption[] = [
  {
    id: 'battery-standard',
    label: 'Standard battery',
    short: 'STD',
    description: 'Covers eclipse plus a modest observation burst.',
    why: 'The battery powers everything in eclipse and buffers bursts of captures and downlink.',
    massKg: 7,
    cost: 5,
    capacityWh: 90,
    isNotional: true,
  },
  {
    id: 'battery-extended',
    label: 'Extended battery',
    short: 'EXT',
    description: 'Double capacity for long capture bursts.',
    why: 'More captures per pass before safe mode. Heavier.',
    massKg: 13,
    cost: 10,
    capacityWh: 180,
    isNotional: true,
  },
];

export const RECORDER_OPTIONS: RecorderOption[] = [
  {
    id: 'recorder-small',
    label: 'Small recorder',
    short: '2 GB',
    description: '2,000 MB solid-state recorder.',
    why: 'Captured data waits here until a ground contact. When it is full, new captures are rejected.',
    massKg: 2,
    cost: 3,
    capacityMB: 2000,
    isNotional: true,
  },
  {
    id: 'recorder-medium',
    label: 'Medium recorder',
    short: '5 GB',
    description: '5,000 MB solid-state recorder.',
    why: 'Room for a full pass of balanced captures.',
    massKg: 3,
    cost: 6,
    capacityMB: 5000,
    isNotional: true,
  },
  {
    id: 'recorder-large',
    label: 'Large recorder',
    short: '12 GB',
    description: '12,000 MB solid-state recorder.',
    why: 'Holds many high-detail captures, but storage alone does not deliver data.',
    massKg: 5,
    cost: 11,
    capacityMB: 12000,
    isNotional: true,
  },
];

export const COMMS_OPTIONS: CommsOption[] = [
  {
    id: 'comms-low',
    label: 'Low-rate radio',
    short: '20 Mbps',
    description: '20 Mbps downlink.',
    why: 'Delivered data = rate x contact time / 8. A slow radio may leave data stranded on board.',
    massKg: 3,
    cost: 4,
    rateMbps: 20,
    powerW: 15,
    isNotional: true,
  },
  {
    id: 'comms-standard',
    label: 'Standard radio',
    short: '80 Mbps',
    description: '80 Mbps downlink.',
    why: 'Moves a pass worth of balanced data in one contact.',
    massKg: 5,
    cost: 9,
    rateMbps: 80,
    powerW: 30,
    isNotional: true,
  },
  {
    id: 'comms-high',
    label: 'High Throughput radio',
    short: '250 Mbps',
    description: '250 Mbps downlink with a high-gain dish.',
    why: 'Short contacts become useful, but it draws more power and costs more.',
    massKg: 8,
    cost: 18,
    rateMbps: 250,
    powerW: 65,
    isNotional: true,
  },
];

export const POINTING_OPTIONS: PointingOption[] = [
  {
    id: 'pointing-basic',
    label: 'Basic pointing',
    short: 'BASIC',
    description: 'Nadir-locked. Targets must fall inside the swath.',
    why: 'Pointing decides how far off the ground track you can look and how sharp edge captures are.',
    massKg: 2,
    cost: 3,
    extraReachKm: 0,
    extraCaptureS: 0,
    extraCaptureWh: 0,
    loadW: 4,
    edgeFactor: 0.85,
    isNotional: true,
  },
  {
    id: 'pointing-precision',
    label: 'Precision pointing',
    short: 'PRECISION',
    description: 'Reaction wheels slew off-nadir to reach targets beyond the swath edge.',
    why: 'Extends reach by 120 km and removes edge penalty, at the cost of slew time and energy.',
    massKg: 5,
    cost: 10,
    extraReachKm: 120,
    extraCaptureS: 3,
    extraCaptureWh: 1.5,
    loadW: 12,
    edgeFactor: 1.0,
    isNotional: true,
  },
];

export const LAUNCH_OPTIONS: LaunchOption[] = [
  {
    id: 'launch-rideshare',
    label: 'Rideshare',
    short: 'RIDESHARE',
    description: 'Share a ride with other payloads. Cheapest, limited mass and orbits.',
    why: 'Launch capacity caps total spacecraft mass; rideshare only reaches the common orbits.',
    massKg: 0,
    cost: 15,
    capacityKg: 110,
    allowedAltitudesKm: [450, 550],
    isNotional: true,
  },
  {
    id: 'launch-small',
    label: 'Small dedicated',
    short: 'SMALL LV',
    description: 'Dedicated small launcher to any preset orbit.',
    why: 'Any preset orbit, more mass.',
    massKg: 0,
    cost: 34,
    capacityKg: 170,
    allowedAltitudesKm: [450, 550, 700],
    isNotional: true,
  },
  {
    id: 'launch-medium',
    label: 'Medium capacity',
    short: 'MEDIUM LV',
    description: 'Medium launcher with generous mass margin.',
    why: 'Lots of mass margin, very expensive.',
    massKg: 0,
    cost: 58,
    capacityKg: 380,
    allowedAltitudesKm: [450, 550, 700],
    isNotional: true,
  },
];

export const ALTITUDE_OPTIONS: AltitudeOption[] = [
  {
    id: 'alt-450',
    label: '450 km',
    altitudeKm: 450,
    cost: 0,
    detailFactor: 1.0,
    description: 'Low: closest view (more detail), narrower swath, shorter ground contacts.',
    isNotional: true,
  },
  {
    id: 'alt-550',
    label: '550 km',
    altitudeKm: 550,
    cost: 0,
    detailFactor: 0.95,
    description: 'Middle: the common smallsat altitude.',
    isNotional: true,
  },
  {
    id: 'alt-700',
    label: '700 km',
    altitudeKm: 700,
    cost: 6,
    detailFactor: 0.85,
    description: 'High: wider swath and longer contacts, less detail. Needs a dedicated launch.',
    isNotional: true,
  },
];

export const INCLINATION_OPTIONS: InclinationOption[] = [
  {
    id: 'inc-30',
    label: '30° low inclination',
    inclinationDeg: 30,
    description: 'Ground track stays between 30°N and 30°S. Frequent revisits in the tropics; cannot see higher latitudes.',
  },
  {
    id: 'inc-53',
    label: '53° mid inclination',
    inclinationDeg: 53,
    description: 'Covers 53°N to 53°S, with many passes near mid-latitudes.',
  },
  {
    id: 'inc-97',
    label: '97.6° sun-synchronous-like',
    inclinationDeg: 97.6,
    description: 'Near-polar, retrograde: reaches almost every latitude. (Real sun-synchronous orbits rely on J2 precession, which this model omits.)',
  },
];

export interface Loadout {
  busId: string;
  payloadId: string;
  solarId: string;
  batteryId: string;
  recorderId: string;
  commsId: string;
  pointingId: string;
  launchId: string;
  altitudeId: string;
  inclinationId: string;
}

export const LOADOUT_KEYS: (keyof Loadout)[] = [
  'busId',
  'payloadId',
  'solarId',
  'batteryId',
  'recorderId',
  'commsId',
  'pointingId',
  'launchId',
  'altitudeId',
  'inclinationId',
];

function byId<T extends { id: string }>(list: T[], id: string, kind: string): T {
  const f = list.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown ${kind} option: ${id}`);
  return f;
}

export interface ResolvedLoadout {
  bus: BusOption;
  payload: PayloadOption;
  solar: SolarOption;
  battery: BatteryOption;
  recorder: RecorderOption;
  comms: CommsOption;
  pointing: PointingOption;
  launch: LaunchOption;
  altitude: AltitudeOption;
  inclination: InclinationOption;
}

export function resolveLoadout(l: Loadout): ResolvedLoadout {
  return {
    bus: byId(BUS_OPTIONS, l.busId, 'bus'),
    payload: byId(PAYLOAD_OPTIONS, l.payloadId, 'payload'),
    solar: byId(SOLAR_OPTIONS, l.solarId, 'solar'),
    battery: byId(BATTERY_OPTIONS, l.batteryId, 'battery'),
    recorder: byId(RECORDER_OPTIONS, l.recorderId, 'recorder'),
    comms: byId(COMMS_OPTIONS, l.commsId, 'comms'),
    pointing: byId(POINTING_OPTIONS, l.pointingId, 'pointing'),
    launch: byId(LAUNCH_OPTIONS, l.launchId, 'launch'),
    altitude: byId(ALTITUDE_OPTIONS, l.altitudeId, 'altitude'),
    inclination: byId(INCLINATION_OPTIONS, l.inclinationId, 'inclination'),
  };
}

export const SUBSYSTEMS = [
  { key: 'busId', label: 'Bus / platform', options: BUS_OPTIONS },
  { key: 'payloadId', label: 'Payload profile', options: PAYLOAD_OPTIONS },
  { key: 'solarId', label: 'Solar arrays', options: SOLAR_OPTIONS },
  { key: 'batteryId', label: 'Battery', options: BATTERY_OPTIONS },
  { key: 'recorderId', label: 'Recorder', options: RECORDER_OPTIONS },
  { key: 'commsId', label: 'Communications', options: COMMS_OPTIONS },
  { key: 'pointingId', label: 'Pointing', options: POINTING_OPTIONS },
  { key: 'launchId', label: 'Launch / deployment', options: LAUNCH_OPTIONS },
] as const;
