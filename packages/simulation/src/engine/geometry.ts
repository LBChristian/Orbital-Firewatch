import { EARTH_RADIUS_KM, RAD } from '../constants';
import type { MissionDef } from '../config/missions';
import type { DesignSpec } from '../design';
import type { TargetGroup } from '../firms/targets';
import { bboxCenter, bboxRadiusKm, haversineKm, wrapLon } from '../geo';
import {
  dayOfYear,
  elevationDeg,
  inEclipse,
  inertialPosition,
  inertialToEcef,
  orbitalPeriodS,
  solarDeclinationDeg,
  solveInsertion,
  sunDirection,
  type CircularOrbit,
} from '../orbit/orbit';

export interface TargetWindow {
  targetId: string;
  startStep: number;
  endStep: number;
  /** Step of closest approach. */
  closestStep: number;
  minDistKm: number;
  passIndex: number;
  /** True if the target is only reachable off-nadir (beyond half-swath). */
  offNadir: boolean;
}

export interface Pass {
  index: number;
  startStep: number;
  endStep: number;
}

export interface Contact {
  stationId: string;
  startStep: number;
  endStep: number;
  maxElevationDeg: number;
}

/** Precomputed, deterministic geometry for one mission run. */
export interface MissionGeometry {
  stepS: number;
  nSteps: number;
  orbit: CircularOrbit;
  periodS: number;
  aimId: string;
  lat: Float64Array;
  lon: Float64Array;
  sunlit: Uint8Array;
  /** Index into mission.groundStations of the best visible station, -1 if none. */
  station: Int8Array;
  /** Pass index at each step, -1 if outside region. */
  passAt: Int16Array;
  passes: Pass[];
  contacts: Contact[];
  windows: TargetWindow[];
  /** Distance (km) from the sub-satellite point to each target, [step * nTargets + targetIndex]. */
  targetDist: Float32Array;
  targetIds: string[];
  swathHalfKm: number;
  reachKm: number;
}

export interface GeometryError {
  error: string;
}

export function computeGeometry(
  mission: MissionDef,
  spec: DesignSpec,
  targets: TargetGroup[],
  aimId: string,
): MissionGeometry | GeometryError {
  const aim = mission.aimPoints.find((a) => a.id === aimId) ?? mission.aimPoints[0];
  const orbit = solveInsertion(spec.altitudeKm, spec.inclinationDeg, aim.lat, aim.lon, mission.insertionLeadS, mission.passBranch);
  if (!orbit) {
    return { error: `A ${spec.inclinationDeg}° orbit cannot reach the aim point at ${aim.lat.toFixed(1)}° latitude.` };
  }
  const stepS = mission.stepSeconds;
  const nSteps = Math.round((mission.durationHours * 3600) / stepS);
  const sun = sunDirection(aim.lon, mission.insertionLeadS, mission.localSolarTimeH, solarDeclinationDeg(dayOfYear(mission.firms.date)));
  const lat = new Float64Array(nSteps);
  const lon = new Float64Array(nSteps);
  const sunlit = new Uint8Array(nSteps);
  const station = new Int8Array(nSteps);
  const passAt = new Int16Array(nSteps);
  const nT = targets.length;
  const targetDist = new Float32Array(nSteps * nT);
  const center = bboxCenter(mission.bbox);
  const passRadius = bboxRadiusKm(mission.bbox) + spec.reachKm + mission.passMarginKm;
  const stationElev: number[][] = mission.groundStations.map(() => []);

  let passIndex = -1;
  let inPass = false;
  const passes: Pass[] = [];
  for (let k = 0; k < nSteps; k++) {
    const t = k * stepS;
    const pI = inertialPosition(orbit, t);
    const pE = inertialToEcef(pI, t);
    const r = Math.hypot(pE[0], pE[1], pE[2]);
    const la = Math.asin(pE[2] / r) * RAD;
    const lo = wrapLon(Math.atan2(pE[1], pE[0]) * RAD);
    lat[k] = la;
    lon[k] = lo;
    sunlit[k] = inEclipse(pI, sun) ? 0 : 1;
    let best = -1;
    let bestEl = -90;
    mission.groundStations.forEach((g, gi) => {
      const el = elevationDeg(pE, g.lat, g.lon);
      stationElev[gi].push(el);
      if (el >= g.minElevationDeg && el > bestEl) {
        bestEl = el;
        best = gi;
      }
    });
    station[k] = best;
    const dCenter = haversineKm(la, lo, center.lat, center.lon);
    if (dCenter <= passRadius) {
      if (!inPass) {
        inPass = true;
        passIndex++;
        passes.push({ index: passIndex, startStep: k, endStep: k });
      }
      passes[passIndex].endStep = k;
      passAt[k] = passIndex;
    } else {
      inPass = false;
      passAt[k] = -1;
    }
    for (let j = 0; j < nT; j++) {
      targetDist[k * nT + j] = haversineKm(la, lo, targets[j].lat, targets[j].lon);
    }
  }

  // Contacts per station
  const contacts: Contact[] = [];
  mission.groundStations.forEach((g, gi) => {
    let open: Contact | null = null;
    for (let k = 0; k < nSteps; k++) {
      const el = stationElev[gi][k];
      if (el >= g.minElevationDeg) {
        if (!open) open = { stationId: g.id, startStep: k, endStep: k, maxElevationDeg: el };
        open.endStep = k;
        open.maxElevationDeg = Math.max(open.maxElevationDeg, el);
      } else if (open) {
        contacts.push(open);
        open = null;
      }
    }
    if (open) contacts.push(open);
  });
  contacts.sort((a, b) => a.startStep - b.startStep);

  // Target windows: contiguous steps with distance <= reach
  const windows: TargetWindow[] = [];
  const half = spec.swathKm / 2;
  for (let j = 0; j < nT; j++) {
    let w: TargetWindow | null = null;
    for (let k = 0; k < nSteps; k++) {
      const d = targetDist[k * nT + j];
      if (d <= spec.reachKm) {
        if (!w) w = { targetId: targets[j].id, startStep: k, endStep: k, closestStep: k, minDistKm: d, passIndex: passAt[k], offNadir: true };
        w.endStep = k;
        if (d < w.minDistKm) {
          w.minDistKm = d;
          w.closestStep = k;
        }
      } else if (w) {
        w.offNadir = w.minDistKm > half;
        windows.push(w);
        w = null;
      }
    }
    if (w) {
      w.offNadir = w.minDistKm > half;
      windows.push(w);
    }
  }
  windows.sort((a, b) => a.startStep - b.startStep || a.targetId.localeCompare(b.targetId));

  return {
    stepS,
    nSteps,
    orbit,
    periodS: orbitalPeriodS(spec.altitudeKm),
    aimId: aim.id,
    lat,
    lon,
    sunlit,
    station,
    passAt,
    passes,
    contacts,
    windows,
    targetDist,
    targetIds: targets.map((t) => t.id),
    swathHalfKm: half,
    reachKm: spec.reachKm,
  };
}

export function isGeometryError(g: MissionGeometry | GeometryError): g is GeometryError {
  return (g as GeometryError).error !== undefined;
}

/**
 * Split a ground track into polyline segments that do not cross the antimeridian,
 * so maps draw a continuous track instead of a line across the whole world.
 */
export function trackSegments(lat: ArrayLike<number>, lon: ArrayLike<number>, from: number, to: number, every = 1): [number, number][][] {
  const segs: [number, number][][] = [];
  let cur: [number, number][] = [];
  let prevLon: number | null = null;
  for (let k = from; k <= to && k < lat.length; k += every) {
    const lo = lon[k];
    if (prevLon !== null && Math.abs(lo - prevLon) > 180) {
      if (cur.length > 1) segs.push(cur);
      cur = [];
    }
    cur.push([lat[k], lo]);
    prevLon = lo;
  }
  if (cur.length > 1) segs.push(cur);
  return segs;
}

/** Ground-station visibility radius on the ground for a min elevation, km (spherical Earth). */
export function stationFootprintKm(altitudeKm: number, minElevationDeg: number): number {
  const e = (minElevationDeg * Math.PI) / 180;
  const R = EARTH_RADIUS_KM;
  const a = R + altitudeKm;
  const lambda = Math.acos((R / a) * Math.cos(e)) - e;
  return lambda * R;
}
