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
  },
];

export function getMission(id: string): MissionDef {
  const m = MISSIONS.find((m) => m.id === id);
  if (!m) throw new Error(`Unknown mission ${id}`);
  return m;
}
