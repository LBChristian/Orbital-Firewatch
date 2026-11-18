import type { BBox } from '../geo';
import type { ObjectiveZone } from '../firms/targets';
import type { Loadout } from './catalog';

/**
 * Mission campaign configuration. Regions/dates match the bundled FIRMS snapshot
 * (scripts/extract-firms-snapshot.mjs). Ground stations are NOTIONAL game scenario
 * locations, not real NASA or commercial stations.
 */

export interface GroundStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  minElevationDeg: number;
}

export interface AimPoint {
  id: string;
  label: string;
  description: string;
  lat: number;
  lon: number;
}

export type MissionObjective =
  | { type: 'deliverCount'; count: number; text: string }
  | { type: 'zones'; perZone: number; text: string }
  | { type: 'deliverValue'; value: number; text: string };

export interface ScoreWeights {
  observation: number;
  delivery: number;
  objective: number;
  efficiency: number;
  margin: number;
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  observation: 0.35,
  delivery: 0.25,
  objective: 0.2,
  efficiency: 0.1,
  margin: 0.1,
};

export interface MissionDef {
  id: string;
  code: string;
  name: string;
  tagline: string;
  briefing: string;
  teaches: string[];
  difficulty: 1 | 2 | 3;
  /** Concept Maturity Level this mission practises (Wessen et al. 2013), with the game framing. */
  cml: { level: 2 | 3 | 4; focus: string };
  regionName: string;
  bbox: BBox;
  /** FIRMS product + historical date of the bundled snapshot. */
  firms: { product: string; date: string; dayRange: number; snapshotFile: string };
  /** NASA GIBS true-colour layer verified to have tiles over the region on this date. */
  imagery: { layerId: string; label: string; date: string };
  zones?: ObjectiveZone[];
  clusterRadiusKm: number;
  maxTargets: number;
  objective: MissionObjective;
  /** Number of top-priority targets used as the observation-score reference. */
  referenceCount: number;
  budgetCredits: number;
  durationHours: number;
  stepSeconds: number;
  /** Local solar time at the aim point during the first pass (sets the sun direction). */
  localSolarTimeH: number;
  /** Time from mission start to the first crossing of the aim point, s. */
  insertionLeadS: number;
  passBranch: 'ascending' | 'descending';
  aimPoints: AimPoint[];
  groundStations: GroundStation[];
  /** Pass detection margin added around the region, km. */
  passMarginKm: number;
  scoreWeights: ScoreWeights;
  recommended: Loadout;
  seed: number;
  /** Shown in briefing. */
  constraintsNote: string;
  /**
   * 'balanced': objective and recommended design have been checked with the balance report.
   * 'provisional': data and geometry are fixed, but the objective is a placeholder until balance testing.
   */
  balanceStatus: 'balanced' | 'provisional';
  /** Mission-specific caution about what the detections may be. Shown in the briefing. */
  dataCaveat?: string;
}

const RECOMMENDED_BASE: Loadout = {
  busId: 'bus-small',
  payloadId: 'payload-balanced',
  solarId: 'solar-standard',
  batteryId: 'battery-standard',
  recorderId: 'recorder-medium',
  commsId: 'comms-standard',
  pointingId: 'pointing-basic',
  launchId: 'launch-rideshare',
  altitudeId: 'alt-550',
  inclinationId: 'inc-53',
};

export const MISSIONS: MissionDef[] = [
  {
    id: 'm01-first-pass',
    code: 'M01',
    name: 'FIRST PASS',
    tagline: 'Learn the loop: see it, capture it, store it, send it home.',
    briefing:
      'NASA FIRMS reported a scatter of thermal-anomaly detections across the Klamath and North Coast ranges of Northern California. Your notional follow-up satellite gets one good pass over the region. Capture the highest-priority target groups and downlink the data to a notional ground station before the mission window closes.',
    teaches: ['Target selection', 'Sensor swath', 'Capture', 'Data storage', 'Contact window', 'Downlink', 'Debrief'],
    difficulty: 1,
    cml: { level: 2, focus: 'Quantify the key parameters (swath, data per capture, energy, downlink) and check with a first-order pass whether the concept works at all.' },
    regionName: 'Northern California, USA',
    bbox: { west: -124.6, south: 38.0, east: -120.8, north: 42.2 },
    firms: { product: 'VIIRS_NOAA20_NRT', date: '2026-11-16', dayRange: 1, snapshotFile: 'data/firms/m01-first-pass_2026-11-16.csv' },
    imagery: { layerId: 'MODIS_Terra_CorrectedReflectance_TrueColor', label: 'MODIS Terra Corrected Reflectance (True Color)', date: '2026-11-16' },
    clusterRadiusKm: 12,
    maxTargets: 8,
    objective: { type: 'deliverCount', count: 4, text: 'Deliver data for at least 4 target groups to the ground.' },
    referenceCount: 6,
    budgetCredits: 150,
    durationHours: 2,
    stepSeconds: 2,
    localSolarTimeH: 10.5,
    insertionLeadS: 360,
    passBranch: 'descending',
    aimPoints: [
      { id: 'center', label: 'Region centre', description: 'Aim the first pass through the middle of the target field.', lat: 40.6, lon: -122.7 },
    ],
    groundStations: [
      { id: 'gs-sierra', name: 'GS SIERRA (notional)', lat: 36.0, lon: -119.0, minElevationDeg: 10 },
      { id: 'gs-cascade', name: 'GS CASCADE (notional)', lat: 46.0, lon: -121.0, minElevationDeg: 10 },
    ],
    passMarginKm: 150,
    scoreWeights: DEFAULT_SCORE_WEIGHTS,
    recommended: { ...RECOMMENDED_BASE },
    seed: 101,
    constraintsNote: 'Generous budget, power, storage and contact time. The recommended loadout can succeed.',
    balanceStatus: 'balanced',
  },
  {
    id: 'm02-split-front',
    code: 'M02',
    name: 'SPLIT FRONT',
    tagline: 'Two fronts, one swath. Wide or sharp?',
    briefing:
      'FIRMS detections on 14 Nov 2026 form two separated groups: a western front across the Kafue and upper Zambezi basins and an eastern front in central Mozambique, roughly 800 km apart. The objective rewards observing both fronts. A narrow swath flown north-south cannot touch both. Your swath, pointing, aim point and the direction your inclination sends the ground track all decide which targets are reachable.',
    teaches: ['Swath vs detail trade-off', 'Inclination sets ground-track direction', 'Pointing reach', 'Targets that cannot be observed'],
    difficulty: 2,
    cml: { level: 3, focus: 'Explore the trade space: swath against detail, inclination against track direction, pointing against cost, measured by what science each option returns.' },
    regionName: 'Zambezi basin and central Mozambique, southern Africa',
    bbox: { west: 24.0, south: -20.5, east: 35.5, north: -8.0 },
    firms: { product: 'VIIRS_NOAA20_NRT', date: '2026-11-14', dayRange: 1, snapshotFile: 'data/firms/m02-split-front_2026-11-14.csv' },
    imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', label: 'VIIRS NOAA-20 Corrected Reflectance (True Color)', date: '2026-11-14' },
    zones: [
      { id: 'west', label: 'WEST FRONT', bbox: { west: 24.0, south: -20.5, east: 28.0, north: -14.5 } },
      { id: 'east', label: 'EAST FRONT', bbox: { west: 32.5, south: -20.5, east: 35.5, north: -14.5 } },
    ],
    clusterRadiusKm: 12,
    maxTargets: 14,
    objective: { type: 'zones', perZone: 2, text: 'Deliver data for at least 2 target groups in EACH front.' },
    referenceCount: 8,
    budgetCredits: 135,
    durationHours: 2,
    stepSeconds: 2,
    localSolarTimeH: 13.5,
    insertionLeadS: 360,
    passBranch: 'descending',
    aimPoints: [
      { id: 'center', label: 'Between fronts', description: 'Cross the gap between the fronts. Whether the swath touches both depends on reach and on the ground-track direction your inclination gives.', lat: -17.0, lon: 30.5 },
      { id: 'west', label: 'West front', description: 'Fly straight over the Kafue / Zambezi front.', lat: -16.8, lon: 26.6 },
      { id: 'east', label: 'East front', description: 'Fly straight over the central Mozambique / Malawi front.', lat: -18.6, lon: 34.8 },
    ],
    groundStations: [
      { id: 'gs-kalahari', name: 'GS KALAHARI (notional)', lat: -22.5, lon: 24.0, minElevationDeg: 10 },
      { id: 'gs-rift', name: 'GS RIFT (notional)', lat: -6.0, lon: 37.0, minElevationDeg: 10 },
    ],
    passMarginKm: 150,
    scoreWeights: DEFAULT_SCORE_WEIGHTS,
    recommended: { ...RECOMMENDED_BASE },
    seed: 202,
    constraintsNote: 'Tighter budget. Few passes over the region. Not every target can be observed.',
    balanceStatus: 'balanced',
  },
  {
    id: 'm03-data-bottleneck',
    code: 'M03',
    name: 'DATA BOTTLENECK',
    tagline: 'Plenty to see. Not enough room, power or contact time to send it all.',
    briefing:
      'Central New South Wales shows a dense field of FIRMS detections on 15 Nov 2026. Many groups fall inside your swath on one pass, but the recorder, battery and a single short contact window limit what you can bring home. Capture selectively, rank your packets, and transmit before the window closes.',
    teaches: ['Data volume vs recorder capacity', 'Energy per capture', 'Downlink rate x contact time', 'Packet prioritisation'],
    difficulty: 3,
    cml: { level: 4, focus: 'Commit to one point design whose recorder, radio and battery carry acceptable margins for the observations you choose.' },
    regionName: 'Central New South Wales, Australia',
    bbox: { west: 146.0, south: -35.6, east: 150.2, north: -31.2 },
    firms: { product: 'VIIRS_NOAA20_NRT', date: '2026-11-15', dayRange: 1, snapshotFile: 'data/firms/m03-data-bottleneck_2026-11-15.csv' },
    imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', label: 'VIIRS NOAA-20 Corrected Reflectance (True Color)', date: '2026-11-15' },
    clusterRadiusKm: 12,
    maxTargets: 16,
    objective: { type: 'deliverValue', value: 600, text: 'Deliver at least 600 observation value (GAME PRIORITY x detail) to the ground.' },
    referenceCount: 10,
    budgetCredits: 110,
    durationHours: 2.2,
    stepSeconds: 2,
    localSolarTimeH: 14.0,
    insertionLeadS: 360,
    passBranch: 'ascending',
    aimPoints: [
      { id: 'center', label: 'Target field centre', description: 'Fly over the densest cluster of detections.', lat: -33.2, lon: 148.2 },
    ],
    groundStations: [{ id: 'gs-outback', name: 'GS OUTBACK (notional)', lat: -30.0, lon: 121.0, minElevationDeg: 15 }],
    passMarginKm: 150,
    scoreWeights: DEFAULT_SCORE_WEIGHTS,
    recommended: { ...RECOMMENDED_BASE },
    seed: 303,
    constraintsNote: 'Limited recorder budget, one short contact. High-detail data fills storage fast.',
    balanceStatus: 'balanced',
  },
  {
    id: 'm04-shadow-line',
    code: 'M04',
    name: 'SHADOW LINE',
    tagline: 'The arrays go dark every orbit. The battery has to carry you through.',
    briefing:
      'FIRMS recorded a dense band of thermal-anomaly detections across Maranhão and Tocantins, Brazil, on 14 Nov 2026. Your spacecraft reaches the region soon after crossing Earth’s shadow, when the arrays have produced nothing for half an hour. Size the arrays and battery so captures and downlink do not push the spacecraft into safe mode.',
    teaches: ['Sunlight and eclipse', 'Battery reserve', 'Energy per capture', 'Safe mode'],
    difficulty: 2,
    cml: { level: 3, focus: 'Trade array size against battery capacity, mass and cost, measured by how many observations survive the eclipse.' },
    regionName: 'Maranhão and Tocantins, Brazil',
    bbox: { west: -50.0, south: -10.0, east: -44.0, north: -3.0 },
    firms: { product: 'VIIRS_NOAA20_NRT', date: '2026-11-14', dayRange: 1, snapshotFile: 'data/firms/m04-shadow-line_2026-11-14.csv' },
    imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', label: 'VIIRS NOAA-20 Corrected Reflectance (True Color)', date: '2026-11-14' },
    clusterRadiusKm: 12,
    maxTargets: 14,
    objective: { type: 'deliverCount', count: 5, text: 'Deliver data for at least 5 target groups to the ground.' },
    referenceCount: 8,
    budgetCredits: 130,
    durationHours: 2.5,
    stepSeconds: 2,
    localSolarTimeH: 7.5,
    insertionLeadS: 2400,
    passBranch: 'descending',
    aimPoints: [
      { id: 'center', label: 'Maranhão cluster', description: 'Fly over the densest detections around 4–6° S.', lat: -4.8, lon: -45.4 },
      { id: 'west', label: 'Tocantins edge', description: 'Cross the western detections near the Tocantins river.', lat: -4.0, lon: -48.8 },
    ],
    groundStations: [
      { id: 'gs-planalto', name: 'GS PLANALTO (notional)', lat: -13.0, lon: -47.0, minElevationDeg: 10 },
      { id: 'gs-atlantico', name: 'GS ATLANTICO (notional)', lat: -7.0, lon: -36.0, minElevationDeg: 10 },
    ],
    passMarginKm: 150,
    scoreWeights: DEFAULT_SCORE_WEIGHTS,
    recommended: { ...RECOMMENDED_BASE },
    seed: 404,
    constraintsNote: 'The pass follows an eclipse. Captures and downlink draw on a battery that has not recharged yet.',
    balanceStatus: 'provisional',
  },
  {
    id: 'm05-dead-air',
    code: 'M05',
    name: 'DEAD AIR',
    tagline: 'Data on board is worth nothing until it reaches the ground.',
    briefing:
      'On 15 Nov 2026 FIRMS recorded detections across Borneo, most of them in East Kalimantan near the equator. Your only notional ground station sees the spacecraft briefly and low on the horizon. Choose your radio, decide which packets go first, and start the downlink the moment the contact opens.',
    teaches: ['Contact windows', 'Downlink rate x time', 'Packet priority', 'Radio power'],
    difficulty: 2,
    cml: { level: 3, focus: 'Trade radio rate against power, mass and cost, and capture volume against the contact time available.' },
    regionName: 'Borneo (Indonesia / Malaysia / Brunei)',
    bbox: { west: 108.0, south: -4.5, east: 119.0, north: 7.5 },
    firms: { product: 'VIIRS_NOAA20_NRT', date: '2026-11-15', dayRange: 1, snapshotFile: 'data/firms/m05-dead-air_2026-11-15.csv' },
    imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', label: 'VIIRS NOAA-20 Corrected Reflectance (True Color)', date: '2026-11-15' },
    clusterRadiusKm: 12,
    maxTargets: 14,
    objective: { type: 'deliverValue', value: 450, text: 'Deliver at least 450 observation value (GAME PRIORITY x detail) to the ground.' },
    referenceCount: 8,
    budgetCredits: 125,
    durationHours: 2,
    stepSeconds: 2,
    localSolarTimeH: 10.5,
    insertionLeadS: 360,
    passBranch: 'ascending',
    aimPoints: [
      { id: 'center', label: 'East Kalimantan', description: 'Fly over the main cluster near the equator.', lat: 0.2, lon: 116.8 },
      { id: 'north', label: 'Sabah and Sarawak', description: 'Bias the pass north to include the scattered northern groups.', lat: 3.0, lon: 115.5 },
    ],
    groundStations: [{ id: 'gs-sulu', name: 'GS SULU (notional)', lat: 9.5, lon: 123.5, minElevationDeg: 20 }],
    passMarginKm: 150,
    scoreWeights: DEFAULT_SCORE_WEIGHTS,
    recommended: { ...RECOMMENDED_BASE },
    seed: 505,
    constraintsNote: 'One station, high minimum elevation, short contact. Every second of downlink counts.',
    balanceStatus: 'provisional',
  },
  {
    id: 'm06-polar-watch',
    code: 'M06',
    name: 'POLAR WATCH',
    tagline: 'Some latitudes are out of reach, whatever sensor you carry.',
    briefing:
      'On 16 Nov 2026 FIRMS recorded thermal anomalies across the West Siberian Plain between 60° and 67° N. A 53° orbit never passes north of 53°, so no swath or pointing upgrade can reach them. Choose an inclination that does, then work out what that orbit costs you elsewhere.',
    teaches: ['Inclination sets latitude reach', 'Unreachable targets', 'Swath and altitude limits', 'Thermal anomaly is not always fire'],
    difficulty: 2,
    cml: { level: 3, focus: 'Trade inclination, altitude and swath against coverage of a high-latitude target field.' },
    regionName: 'West Siberian Plain, Russia',
    bbox: { west: 64.0, south: 58.0, east: 84.0, north: 68.0 },
    firms: { product: 'VIIRS_NOAA20_NRT', date: '2026-11-16', dayRange: 1, snapshotFile: 'data/firms/m06-polar-watch_2026-11-16.csv' },
    imagery: { layerId: 'MODIS_Terra_CorrectedReflectance_TrueColor', label: 'MODIS Terra Corrected Reflectance (True Color)', date: '2026-11-16' },
    zones: [
      { id: 'south', label: 'SOUTH BAND', bbox: { west: 64.0, south: 58.0, east: 84.0, north: 63.0 } },
      { id: 'north', label: 'NORTH BAND', bbox: { west: 64.0, south: 65.0, east: 84.0, north: 68.0 } },
    ],
    clusterRadiusKm: 12,
    maxTargets: 14,
    objective: { type: 'zones', perZone: 1, text: 'Deliver data for at least 1 target group in EACH latitude band.' },
    referenceCount: 8,
    budgetCredits: 130,
    durationHours: 2,
    stepSeconds: 2,
    localSolarTimeH: 11.0,
    insertionLeadS: 360,
    passBranch: 'descending',
    aimPoints: [
      { id: 'center', label: 'Middle Ob', description: 'Fly over the densest groups near 61° N.', lat: 61.2, lon: 72.5 },
      { id: 'north', label: 'Northern groups', description: 'Bias the pass toward the groups near 66° N.', lat: 65.5, lon: 76.0 },
    ],
    groundStations: [
      { id: 'gs-taiga', name: 'GS TAIGA (notional)', lat: 57.0, lon: 66.0, minElevationDeg: 10 },
      { id: 'gs-yamal', name: 'GS YAMAL (notional)', lat: 69.0, lon: 75.0, minElevationDeg: 10 },
    ],
    passMarginKm: 150,
    scoreWeights: DEFAULT_SCORE_WEIGHTS,
    recommended: { ...RECOMMENDED_BASE, inclinationId: 'inc-97' },
    seed: 606,
    constraintsNote: 'The default 53° orbit cannot reach the region. Low November sun means short daylight.',
    balanceStatus: 'provisional',
    dataCaveat:
      'Many detections here are likely persistent industrial heat sources, such as gas flares at oil and gas fields, rather than vegetation fires. FIRMS cannot tell them apart in this file, so the game treats every point only as a thermal anomaly.',
  },
  {
    id: 'm07-signal-triage',
    code: 'M07',
    name: 'SIGNAL TRIAGE',
    tagline: 'You cannot take everything. Decide what is worth the space.',
    briefing:
      'On 16 Nov 2026 FIRMS recorded scattered detections across Thailand, Laos, Cambodia and Vietnam, with low, nominal and high confidence flags. More groups fall in reach than your recorder and battery can handle. Rank the queue and skip what is not worth it. Confidence is a data-quality flag and FRP is a radiative measurement; neither is a danger rating.',
    teaches: ['Queue ranking', 'Skipping targets', 'Confidence categories', 'GAME PRIORITY is a game rule'],
    difficulty: 2,
    cml: { level: 3, focus: 'Trade observation count against data volume and energy, choosing which science to keep.' },
    regionName: 'Mainland Southeast Asia',
    bbox: { west: 97.0, south: 10.0, east: 109.0, north: 23.0 },
    firms: { product: 'VIIRS_NOAA20_NRT', date: '2026-11-16', dayRange: 1, snapshotFile: 'data/firms/m07-signal-triage_2026-11-16.csv' },
    imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', label: 'VIIRS NOAA-20 Corrected Reflectance (True Color)', date: '2026-11-16' },
    clusterRadiusKm: 12,
    maxTargets: 16,
    objective: { type: 'deliverValue', value: 500, text: 'Deliver at least 500 observation value (GAME PRIORITY x detail) to the ground.' },
    referenceCount: 10,
    budgetCredits: 115,
    durationHours: 2,
    stepSeconds: 2,
    localSolarTimeH: 13.5,
    insertionLeadS: 360,
    passBranch: 'ascending',
    aimPoints: [
      { id: 'center', label: 'Annamite range', description: 'Fly along the Laos and Vietnam border where groups are densest.', lat: 17.5, lon: 105.8 },
      { id: 'west', label: 'Central Thailand', description: 'Shift the pass west over the Thai groups.', lat: 16.5, lon: 100.5 },
    ],
    groundStations: [{ id: 'gs-mekong', name: 'GS MEKONG (notional)', lat: 11.0, lon: 104.5, minElevationDeg: 10 }],
    passMarginKm: 150,
    scoreWeights: DEFAULT_SCORE_WEIGHTS,
    recommended: { ...RECOMMENDED_BASE, recorderId: 'recorder-small' },
    seed: 707,
    constraintsNote: 'Small recorder and tight budget. More targets in reach than you can store.',
    balanceStatus: 'provisional',
  },
  {
    id: 'm08-second-look',
    code: 'M08',
    name: 'SECOND LOOK',
    tagline: 'One pass is not enough. Plan across two.',
    briefing:
      'On 16 Nov 2026 FIRMS recorded thermal anomalies from the Kimberley across the Tanami to western Queensland, too far apart for one pass. Earth turns about 24° under the orbit each revolution, so the next pass crosses a different strip. Data captured on the first pass stays on board until a contact, so plan what to capture and when to send it across both passes.',
    teaches: ['Consecutive passes', 'Earth rotation under the orbit', 'Recorder across passes', 'Downlink scheduling'],
    difficulty: 3,
    cml: { level: 4, focus: 'Commit to a design that keeps recorder, battery and radio margins across a longer timeline.' },
    regionName: 'Northern and central Australia',
    bbox: { west: 121.0, south: -28.0, east: 146.0, north: -15.0 },
    firms: { product: 'VIIRS_NOAA20_NRT', date: '2026-11-16', dayRange: 1, snapshotFile: 'data/firms/m08-second-look_2026-11-16.csv' },
    imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', label: 'VIIRS NOAA-20 Corrected Reflectance (True Color)', date: '2026-11-16' },
    zones: [
      { id: 'west', label: 'KIMBERLEY', bbox: { west: 121.0, south: -21.0, east: 129.0, north: -15.0 } },
      { id: 'east', label: 'QUEENSLAND', bbox: { west: 137.0, south: -24.0, east: 146.0, north: -19.0 } },
    ],
    clusterRadiusKm: 12,
    maxTargets: 18,
    objective: { type: 'zones', perZone: 2, text: 'Deliver data for at least 2 target groups in EACH zone.' },
    referenceCount: 10,
    budgetCredits: 145,
    durationHours: 3.6,
    stepSeconds: 2,
    localSolarTimeH: 10.5,
    insertionLeadS: 360,
    passBranch: 'ascending',
    aimPoints: [
      { id: 'east', label: 'Queensland first', description: 'Cross the eastern groups first; the next orbit passes further west.', lat: -21.6, lon: 140.0 },
      { id: 'west', label: 'Kimberley first', description: 'Cross the Kimberley first; later orbits pass further west still.', lat: -18.0, lon: 124.5 },
    ],
    groundStations: [
      { id: 'gs-pilbara', name: 'GS PILBARA (notional)', lat: -22.0, lon: 118.0, minElevationDeg: 10 },
      { id: 'gs-gulf', name: 'GS GULF (notional)', lat: -16.0, lon: 141.0, minElevationDeg: 10 },
    ],
    passMarginKm: 150,
    scoreWeights: DEFAULT_SCORE_WEIGHTS,
    recommended: { ...RECOMMENDED_BASE, recorderId: 'recorder-large' },
    seed: 808,
    constraintsNote: 'Two passes, about 96 minutes apart. The recorder carries data between them.',
    balanceStatus: 'provisional',
  },
  {
    id: 'm09-hard-limits',
    code: 'M09',
    name: 'HARD LIMITS',
    tagline: 'Every number has a ceiling. Stay under all of them at once.',
    briefing:
      'On 15 Nov 2026 FIRMS recorded detections across southern Tanzania, with a few in Kenya. The mission is funded on a strict budget and a rideshare launch with no spare mass. A design that maximises one number will break another. Read the validation checks, keep every margin positive, and still bring the data home.',
    teaches: ['Mass margin', 'Budget margin', 'Power balance', 'Hard limits vs warnings'],
    difficulty: 3,
    cml: { level: 4, focus: 'Close a point design with positive margins in mass, cost, power and storage at the same time.' },
    regionName: 'Tanzania and southern Kenya',
    bbox: { west: 29.0, south: -10.0, east: 41.0, north: 0.0 },
    firms: { product: 'VIIRS_NOAA20_NRT', date: '2026-11-15', dayRange: 1, snapshotFile: 'data/firms/m09-hard-limits_2026-11-15.csv' },
    imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', label: 'VIIRS NOAA-20 Corrected Reflectance (True Color)', date: '2026-11-15' },
    clusterRadiusKm: 12,
    maxTargets: 14,
    objective: { type: 'deliverCount', count: 5, text: 'Deliver data for at least 5 target groups to the ground.' },
    referenceCount: 8,
    budgetCredits: 95,
    durationHours: 2,
    stepSeconds: 2,
    localSolarTimeH: 10.5,
    insertionLeadS: 360,
    passBranch: 'descending',
    aimPoints: [
      { id: 'center', label: 'Southern highlands', description: 'Fly over the groups near 9° S.', lat: -8.8, lon: 36.5 },
      { id: 'east', label: 'Coastal belt', description: 'Shift the pass east toward the groups near the coast.', lat: -8.5, lon: 39.0 },
    ],
    groundStations: [{ id: 'gs-serengeti', name: 'GS SERENGETI (notional)', lat: -3.0, lon: 35.0, minElevationDeg: 10 }],
    passMarginKm: 150,
    scoreWeights: DEFAULT_SCORE_WEIGHTS,
    recommended: { ...RECOMMENDED_BASE },
    seed: 909,
    constraintsNote: 'Strict budget, rideshare mass limit. Warnings are allowed; failures are not.',
    balanceStatus: 'provisional',
  },
  {
    id: 'm10-final-firewatch',
    code: 'M10',
    name: 'FINAL FIREWATCH',
    tagline: 'Everything you have learned, across three zones and two passes.',
    briefing:
      'On 13 Nov 2026 FIRMS recorded thousands of detections across the Sudanian and Sahel belt of West Africa, from Senegal to Nigeria and Chad. They fall in three zones spread over 30° of longitude. Plan two passes, decide which zones each one serves, keep the battery out of safe mode, and fit the data through limited contacts. Automation will help, but it will not plan this for you.',
    teaches: ['Multi-pass planning', 'Zone objectives', 'Power, storage and downlink together', 'Triage'],
    difficulty: 3,
    cml: { level: 4, focus: 'Bring every trade together into one point design and an operations plan that holds across the whole timeline.' },
    regionName: 'West African Sudanian and Sahel belt',
    bbox: { west: -17.0, south: 6.0, east: 15.0, north: 14.0 },
    firms: { product: 'VIIRS_NOAA20_NRT', date: '2026-11-13', dayRange: 1, snapshotFile: 'data/firms/m10-final-firewatch_2026-11-13.csv' },
    imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', label: 'VIIRS NOAA-20 Corrected Reflectance (True Color)', date: '2026-11-13' },
    zones: [
      { id: 'west', label: 'WEST ZONE', bbox: { west: -17.0, south: 6.0, east: -8.0, north: 14.0 } },
      { id: 'central', label: 'CENTRAL ZONE', bbox: { west: -3.0, south: 6.0, east: 3.0, north: 14.0 } },
      { id: 'east', label: 'EAST ZONE', bbox: { west: 4.0, south: 6.0, east: 15.0, north: 14.0 } },
    ],
    clusterRadiusKm: 12,
    maxTargets: 20,
    objective: { type: 'zones', perZone: 2, text: 'Deliver data for at least 2 target groups in EACH zone.' },
    referenceCount: 12,
    budgetCredits: 145,
    durationHours: 3.6,
    stepSeconds: 2,
    localSolarTimeH: 10.5,
    insertionLeadS: 360,
    passBranch: 'ascending',
    aimPoints: [
      { id: 'east', label: 'East zone first', description: 'Cross Nigeria and Niger first; the next orbit passes about 24° further west.', lat: 11.5, lon: 5.5 },
      { id: 'central', label: 'Central zone first', description: 'Cross Burkina Faso and Ghana first.', lat: 12.0, lon: 0.5 },
    ],
    groundStations: [
      { id: 'gs-sahel', name: 'GS SAHEL (notional)', lat: 16.0, lon: -2.0, minElevationDeg: 10 },
      { id: 'gs-guinea', name: 'GS GUINEA (notional)', lat: 5.0, lon: -10.0, minElevationDeg: 10 },
    ],
    passMarginKm: 150,
    scoreWeights: DEFAULT_SCORE_WEIGHTS,
    recommended: { ...RECOMMENDED_BASE, recorderId: 'recorder-large' },
    seed: 1010,
    constraintsNote: 'Three zones, two passes, two contacts. The recommended design is a starting point, not an answer.',
    balanceStatus: 'provisional',
  },
];

export function getMission(id: string): MissionDef {
  const m = MISSIONS.find((m) => m.id === id);
  if (!m) throw new Error(`Unknown mission ${id}`);
  return m;
}
