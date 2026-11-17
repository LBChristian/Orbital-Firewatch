import { DEG, EARTH_RADIUS_KM, RAD } from './constants';

export interface LatLon {
  lat: number;
  lon: number;
}

export interface BBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Great-circle distance (haversine) between two points on the spherical Earth model, km. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * DEG;
  const dLon = (lon2 - lon1) * DEG;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Normalise longitude to [-180, 180). */
export function wrapLon(lon: number): number {
  let l = ((lon + 180) % 360 + 360) % 360 - 180;
  if (l === -180 && lon > 0) l = 180;
  return l;
}

export function bboxCenter(b: BBox): LatLon {
  return { lat: (b.south + b.north) / 2, lon: (b.west + b.east) / 2 };
}

/** Half of the bbox diagonal (great-circle), km. */
export function bboxRadiusKm(b: BBox): number {
  const c = bboxCenter(b);
  return Math.max(
    haversineKm(c.lat, c.lon, b.north, b.east),
    haversineKm(c.lat, c.lon, b.south, b.west),
    haversineKm(c.lat, c.lon, b.north, b.west),
    haversineKm(c.lat, c.lon, b.south, b.east),
  );
}

export function inBBox(lat: number, lon: number, b: BBox): boolean {
  return lat >= b.south && lat <= b.north && lon >= b.west && lon <= b.east;
}

/** Unit ECEF vector for a geodetic point on the spherical model. */
export function latLonToUnit(lat: number, lon: number): [number, number, number] {
  const cl = Math.cos(lat * DEG);
  return [cl * Math.cos(lon * DEG), cl * Math.sin(lon * DEG), Math.sin(lat * DEG)];
}

export function unitToLatLon(x: number, y: number, z: number): LatLon {
  const r = Math.hypot(x, y, z);
  return { lat: Math.asin(z / r) * RAD, lon: Math.atan2(y, x) * RAD };
}

/** Human readable bbox, e.g. "38.0°N–42.2°N, 124.6°W–120.8°W". */
export function formatBBox(b: BBox): string {
  const la = (v: number) => `${Math.abs(v).toFixed(1)}°${v >= 0 ? 'N' : 'S'}`;
  const lo = (v: number) => `${Math.abs(v).toFixed(1)}°${v >= 0 ? 'E' : 'W'}`;
  return `${la(b.south)}–${la(b.north)}, ${lo(b.west)}–${lo(b.east)}`;
}

export function formatLatLon(lat: number, lon: number, digits = 3): string {
  return `${Math.abs(lat).toFixed(digits)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(digits)}°${lon >= 0 ? 'E' : 'W'}`;
}
