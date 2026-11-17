import { DEG, EARTH_RADIUS_KM, EARTH_ROTATION_RAD_S, MU_EARTH_KM3_S2, RAD, TWO_PI } from '../constants';
import { latLonToUnit, wrapLon } from '../geo';

/**
 * SIMULATED / APPROXIMATE orbit model.
 *
 * Circular two-body orbit around a spherical, uniformly rotating Earth. Omitted on purpose:
 * eccentricity, J2 nodal precession and apsidal rotation, atmospheric drag, solar radiation
 * pressure, third-body effects, attitude dynamics, launch insertion errors, precise ephemerides
 * (SPICE), polar motion / precession / nutation, and operational orbit determination.
 */

/** Circular orbital period T = 2π sqrt(a^3 / μ), seconds. */
export function orbitalPeriodS(altitudeKm: number): number {
  const a = EARTH_RADIUS_KM + altitudeKm;
  return TWO_PI * Math.sqrt((a * a * a) / MU_EARTH_KM3_S2);
}

/** Mean motion n = sqrt(μ / a^3), rad/s. */
export function meanMotionRadS(altitudeKm: number): number {
  const a = EARTH_RADIUS_KM + altitudeKm;
  return Math.sqrt(MU_EARTH_KM3_S2 / (a * a * a));
}

/** Circular orbital speed v = sqrt(μ / a), km/s. */
export function orbitalSpeedKmS(altitudeKm: number): number {
  return Math.sqrt(MU_EARTH_KM3_S2 / (EARTH_RADIUS_KM + altitudeKm));
}

export interface CircularOrbit {
  altitudeKm: number;
  inclinationDeg: number;
  /** Right ascension of ascending node at t = 0, rad (inertial frame, Earth-fixed aligned at t = 0). */
  raanRad: number;
  /** Argument of latitude at t = 0, rad. */
  u0Rad: number;
}

/** Inertial (ECI-like) position at time t (s), km. Earth rotation angle is 0 at t = 0. */
export function inertialPosition(orbit: CircularOrbit, tS: number): [number, number, number] {
  const a = EARTH_RADIUS_KM + orbit.altitudeKm;
  const u = orbit.u0Rad + meanMotionRadS(orbit.altitudeKm) * tS;
  const i = orbit.inclinationDeg * DEG;
  const cO = Math.cos(orbit.raanRad);
  const sO = Math.sin(orbit.raanRad);
  const cu = Math.cos(u);
  const su = Math.sin(u);
  const ci = Math.cos(i);
  return [a * (cO * cu - sO * su * ci), a * (sO * cu + cO * su * ci), a * (su * Math.sin(i))];
}

/** Rotate inertial -> Earth-fixed (ECEF) by Earth rotation angle θ = ω t. */
export function inertialToEcef(p: [number, number, number], tS: number): [number, number, number] {
  const th = EARTH_ROTATION_RAD_S * tS;
  const c = Math.cos(th);
  const s = Math.sin(th);
  return [p[0] * c + p[1] * s, -p[0] * s + p[1] * c, p[2]];
}

export function ecefPosition(orbit: CircularOrbit, tS: number): [number, number, number] {
  return inertialToEcef(inertialPosition(orbit, tS), tS);
}

/** Sub-satellite point (spherical Earth), degrees. */
export function subSatellitePoint(orbit: CircularOrbit, tS: number): { lat: number; lon: number } {
  const [x, y, z] = ecefPosition(orbit, tS);
  const r = Math.hypot(x, y, z);
  return { lat: Math.asin(z / r) * RAD, lon: wrapLon(Math.atan2(y, x) * RAD) };
}

/** Maximum |latitude| a circular orbit's ground track reaches, degrees. */
export function maxReachableLatitudeDeg(inclinationDeg: number): number {
  return inclinationDeg <= 90 ? inclinationDeg : 180 - inclinationDeg;
}

/**
 * Solve RAAN and initial argument of latitude so the sub-satellite point crosses
 * (lat, lon) at time tAimS, on the northbound ('ascending') or southbound ('descending') branch.
 * This is a GAME CONVENIENCE: the mission's insertion is chosen so the first pass crosses
 * the aim point. Returns null if the inclination cannot reach that latitude.
 */
export function solveInsertion(
  altitudeKm: number,
  inclinationDeg: number,
  aimLat: number,
  aimLon: number,
  tAimS: number,
  branch: 'ascending' | 'descending',
): CircularOrbit | null {
  const i = inclinationDeg * DEG;
  const sinU = Math.sin(aimLat * DEG) / Math.sin(i);
  if (Math.abs(sinU) > 1) return null;
  let u = Math.asin(sinU);
  if (branch === 'descending') u = Math.PI - u;
  const alpha = Math.atan2(Math.cos(i) * Math.sin(u), Math.cos(u));
  const raan = aimLon * DEG - alpha + EARTH_ROTATION_RAD_S * tAimS;
  const u0 = u - meanMotionRadS(altitudeKm) * tAimS;
  return { altitudeKm, inclinationDeg, raanRad: raan, u0Rad: u0 };
}

/**
 * Sun direction (inertial unit vector), held fixed for the mission (Earth's orbital motion
 * of ~1°/day is ignored). Chosen so the local solar time at (aimLon) at tAimS is `localSolarTimeH`.
 */
export function sunDirection(
  aimLon: number,
  tAimS: number,
  localSolarTimeH: number,
  declinationDeg: number,
): [number, number, number] {
  const subsolarLonEcef = aimLon + (12 - localSolarTimeH) * 15;
  const ra = subsolarLonEcef * DEG + EARTH_ROTATION_RAD_S * tAimS;
  const d = declinationDeg * DEG;
  return [Math.cos(d) * Math.cos(ra), Math.cos(d) * Math.sin(ra), Math.sin(d)];
}

/** Approximate solar declination for a day of year (Cooper's equation), degrees. */
export function solarDeclinationDeg(dayOfYear: number): number {
  return 23.44 * Math.sin(TWO_PI * (284 + dayOfYear) / 365);
}

export function dayOfYear(isoDate: string): number {
  const d = Date.parse(isoDate + 'T00:00:00Z');
  const y = Date.parse(isoDate.slice(0, 4) + '-01-01T00:00:00Z');
  return Math.floor((d - y) / 86400000) + 1;
}

/** Cylindrical Earth-shadow test. Position in inertial frame (km), sun unit vector. */
export function inEclipse(pos: [number, number, number], sun: [number, number, number]): boolean {
  const dot = pos[0] * sun[0] + pos[1] * sun[1] + pos[2] * sun[2];
  if (dot >= 0) return false;
  const px = pos[0] - dot * sun[0];
  const py = pos[1] - dot * sun[1];
  const pz = pos[2] - dot * sun[2];
  return Math.hypot(px, py, pz) < EARTH_RADIUS_KM;
}

/** Elevation angle (deg) of a satellite (ECEF km) seen from a ground station on the spherical Earth. */
export function elevationDeg(satEcef: [number, number, number], stationLat: number, stationLon: number): number {
  const u = latLonToUnit(stationLat, stationLon);
  const gx = u[0] * EARTH_RADIUS_KM;
  const gy = u[1] * EARTH_RADIUS_KM;
  const gz = u[2] * EARTH_RADIUS_KM;
  const dx = satEcef[0] - gx;
  const dy = satEcef[1] - gy;
  const dz = satEcef[2] - gz;
  const range = Math.hypot(dx, dy, dz);
  return Math.asin((dx * u[0] + dy * u[1] + dz * u[2]) / range) * RAD;
}

/** Fraction of a circular orbit spent in sunlight when the sun lies in the orbit plane (worst case). */
export function worstCaseSunlitFraction(altitudeKm: number): number {
  const a = EARTH_RADIUS_KM + altitudeKm;
  const halfShadow = Math.asin(EARTH_RADIUS_KM / a);
  return 1 - halfShadow / Math.PI;
}
