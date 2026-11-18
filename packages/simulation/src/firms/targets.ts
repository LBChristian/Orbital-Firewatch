import { haversineKm, type BBox } from '../geo';
import type { ConfidenceCategory, DataState, FirmsDetection } from './types';

/**
 * GAME PRIORITY inputs and weights. This is a transparent game rule, NOT a fire severity,
 * threat level, or public-safety risk. Weights are gameplay choices.
 */
export interface PriorityWeights {
  recency: number;
  confidence: number;
  frpRank: number;
  objective: number;
}

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  recency: 0.15,
  confidence: 0.25,
  frpRank: 0.45,
  objective: 0.15,
};

/** Recency loses its full value linearly over this many hours behind the newest record. */
export const RECENCY_DECAY_HOURS = 48;

/** Confidence category -> qualitative data-quality cue (NOT a probability). */
export const CONFIDENCE_CUE: Record<ConfidenceCategory, number> = {
  high: 1,
  nominal: 0.7,
  low: 0.35,
  unknown: 0.5,
};

export interface PriorityBreakdown {
  /** 0..1: 1 - (hours behind the newest record in the dataset) / RECENCY_DECAY_HOURS, floored at 0. */
  recency: number;
  /** 0..1 cue from best member confidence category. */
  confidence: number;
  /** 0..1 percentile rank of the group's summed FRP within the loaded dataset. */
  frpRank: number;
  /** 0..1 mission objective relevance (mission rule). */
  objective: number;
  weights: PriorityWeights;
  /** 0..100 GAME PRIORITY. */
  total: number;
}

/** A game-generated grouping of nearby FIRMS detections. Not a fire perimeter. */
export interface TargetGroup {
  id: string;
  /** Short call sign shown in the game, e.g. "TG-03". */
  callsign: string;
  lat: number;
  lon: number;
  members: FirmsDetection[];
  state: DataState;
  sumFrpMW: number;
  maxFrpMW: number;
  bestConfidence: ConfidenceCategory;
  latestAcqUtc: string;
  earliestAcqUtc: string;
  /** Spread of member detections around the centroid, km. */
  spreadKm: number;
  priority: PriorityBreakdown;
  /** Mission-defined zone label (e.g. "WEST FRONT"), if any. */
  zone?: string;
}

const CONF_ORDER: ConfidenceCategory[] = ['unknown', 'low', 'nominal', 'high'];

/**
 * Deterministic greedy clustering. Detections are sorted by FRP (desc) then id; each
 * joins the first existing group whose seed lies within `radiusKm`, otherwise seeds a new group.
 */
export function clusterDetections(dets: FirmsDetection[], radiusKm: number): FirmsDetection[][] {
  const sorted = [...dets].sort((a, b) => (b.frpMW ?? 0) - (a.frpMW ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const groups: { seed: FirmsDetection; members: FirmsDetection[] }[] = [];
  for (const d of sorted) {
    const g = groups.find((g) => haversineKm(g.seed.latitude, g.seed.longitude, d.latitude, d.longitude) <= radiusKm);
    if (g) g.members.push(d);
    else groups.push({ seed: d, members: [d] });
  }
  return groups.map((g) => g.members);
}

export interface ObjectiveZone {
  id: string;
  label: string;
  bbox: BBox;
}

export interface BuildTargetsOptions {
  clusterRadiusKm: number;
  maxTargets: number;
  weights?: PriorityWeights;
  /** Zones that are relevant to the mission objective. Groups inside get objective = 1, else 0.5. */
  zones?: ObjectiveZone[];
  /** Exclude low-confidence-only groups from mission targets. */
  excludeLowOnly?: boolean;
  /**
   * Minimum number of board slots for groups whose best confidence is in each category.
   * The highest-priority groups of that category fill those slots; the rest of the board
   * is filled by priority as usual. Used where an objective needs every category present.
   */
  confidenceQuota?: Partial<Record<ConfidenceCategory, number>>;
}

function percentileRanks(values: number[]): number[] {
  if (values.length <= 1) return values.map(() => 1);
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((v) => {
    // fraction of values strictly below v, plus half of ties -> mid-rank percentile
    let below = 0;
    let equal = 0;
    for (const s of sorted) {
      if (s < v) below++;
      else if (s === v) equal++;
    }
    return (below + (equal - 1) / 2) / (values.length - 1);
  });
}

/**
 * Build the mission target board: cluster detections, compute GAME PRIORITY, and pick
 * the top `maxTargets` groups. Never creates detections; only groups real ones.
 */
export function buildTargetGroups(dets: FirmsDetection[], opts: BuildTargetsOptions): TargetGroup[] {
  const weights = opts.weights ?? DEFAULT_PRIORITY_WEIGHTS;
  const clusters = clusterDetections(dets, opts.clusterRadiusKm);
  if (clusters.length === 0) return [];
  let maxAcq = -Infinity;
  for (const d of dets) maxAcq = Math.max(maxAcq, Date.parse(d.acqUtc));
  const base = clusters.map((members) => {
    let lat = 0;
    let lon = 0;
    let sum = 0;
    let max = 0;
    let best: ConfidenceCategory = 'unknown';
    let latest = members[0].acqUtc;
    let earliest = members[0].acqUtc;
    for (const m of members) {
      lat += m.latitude;
      lon += m.longitude;
      sum += m.frpMW ?? 0;
      max = Math.max(max, m.frpMW ?? 0);
      if (CONF_ORDER.indexOf(m.confidence) > CONF_ORDER.indexOf(best)) best = m.confidence;
      if (m.acqUtc > latest) latest = m.acqUtc;
      if (m.acqUtc < earliest) earliest = m.acqUtc;
    }
    lat /= members.length;
    lon /= members.length;
    let spread = 0;
    for (const m of members) spread = Math.max(spread, haversineKm(lat, lon, m.latitude, m.longitude));
    return { members, lat, lon, sum, max, best, latest, earliest, spread };
  });
  const ranks = percentileRanks(base.map((b) => b.sum));
  const groups = base.map((b, i) => {
    const t = Date.parse(b.latest);
    const recency = Math.max(0, 1 - (maxAcq - t) / 3600000 / RECENCY_DECAY_HOURS);
    const confidence = CONFIDENCE_CUE[b.best];
    const frpRank = ranks[i];
    let zone: ObjectiveZone | undefined;
    if (opts.zones && opts.zones.length > 0) {
      zone = opts.zones.find(
        (z) => b.lat >= z.bbox.south && b.lat <= z.bbox.north && b.lon >= z.bbox.west && b.lon <= z.bbox.east,
      );
    }
    const objective = opts.zones && opts.zones.length > 0 ? (zone ? 1 : 0.5) : 1;
    const total = Math.round(
      100 *
        (weights.recency * recency +
          weights.confidence * confidence +
          weights.frpRank * frpRank +
          weights.objective * objective),
    );
    const g: TargetGroup = {
      id: '',
      callsign: '',
      lat: b.lat,
      lon: b.lon,
      members: b.members,
      state: b.members[0].state,
      sumFrpMW: Math.round(b.sum * 100) / 100,
      maxFrpMW: b.max,
      bestConfidence: b.best,
      latestAcqUtc: b.latest,
      earliestAcqUtc: b.earliest,
      spreadKm: Math.round(b.spread * 10) / 10,
      priority: { recency, confidence, frpRank, objective, weights, total },
      zone: zone?.label,
    };
    return g;
  });
  const eligible = opts.excludeLowOnly ? groups.filter((g) => g.bestConfidence !== 'low') : groups;
  eligible.sort(
    (a, b) => b.priority.total - a.priority.total || b.sumFrpMW - a.sumFrpMW || a.members[0].id.localeCompare(b.members[0].id),
  );
  const reserved = new Set<TargetGroup>();
  for (const [cat, n] of Object.entries(opts.confidenceQuota ?? {}) as [ConfidenceCategory, number][]) {
    eligible.filter((g) => g.bestConfidence === cat).slice(0, n).forEach((g) => reserved.add(g));
  }
  const rest = eligible.filter((g) => !reserved.has(g)).slice(0, Math.max(0, opts.maxTargets - reserved.size));
  const chosen = new Set([...reserved, ...rest]);
  // Keep priority order on the board, whichever way a group was chosen.
  const top = eligible.filter((g) => chosen.has(g)).slice(0, opts.maxTargets);
  top.forEach((g, i) => {
    g.callsign = `TG-${String(i + 1).padStart(2, '0')}`;
    g.id = `tg-${g.members[0].id}`;
  });
  return top;
}
