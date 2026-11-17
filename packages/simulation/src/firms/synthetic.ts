import type { BBox } from '../geo';
import { mulberry32 } from '../rng';
import { buildEnvelope } from './normalize';
import type { FirmsDetection, FirmsFeedEnvelope } from './types';

/**
 * SYNTHETIC DEMO training data. These are invented points for tutorials/testing ONLY.
 * They are never labelled NASA, never LIVE, and use a distinct product id.
 */
export const SYNTHETIC_PRODUCT = 'SYNTHETIC_TRAINING';

export function generateSyntheticDetections(area: BBox, count: number, seed: number, date = '2000-01-01'): FirmsDetection[] {
  const rnd = mulberry32(seed);
  const out: FirmsDetection[] = [];
  const nClusters = Math.max(3, Math.round(count / 4));
  const centers = Array.from({ length: nClusters }, () => ({
    lat: area.south + (area.north - area.south) * (0.1 + 0.8 * rnd()),
    lon: area.west + (area.east - area.west) * (0.1 + 0.8 * rnd()),
  }));
  for (let i = 0; i < count; i++) {
    const c = centers[i % nClusters];
    const lat = c.lat + (rnd() - 0.5) * 0.12;
    const lon = c.lon + (rnd() - 0.5) * 0.12;
    const conf = rnd();
    const confidence = conf > 0.75 ? 'high' : conf > 0.2 ? 'nominal' : 'low';
    const frp = Math.round((1 + rnd() ** 2 * 80) * 100) / 100;
    const hh = String(Math.floor(rnd() * 24)).padStart(2, '0');
    const mm = String(Math.floor(rnd() * 60)).padStart(2, '0');
    out.push({
      id: `SYN-${seed}-${i}`,
      latitude: Math.round(lat * 1e5) / 1e5,
      longitude: Math.round(lon * 1e5) / 1e5,
      acqDate: date,
      acqTime: `${hh}${mm}`,
      acqUtc: `${date}T${hh}:${mm}:00Z`,
      satellite: 'SYNTHETIC',
      instrument: 'NONE (synthetic)',
      instrumentDerivedFromProduct: false,
      confidenceRaw: confidence,
      confidence,
      frpMW: frp,
      product: SYNTHETIC_PRODUCT,
      state: 'SYNTHETIC DEMO',
      raw: { note: 'synthetic training point - not a NASA observation' },
    });
  }
  return out;
}

export function syntheticEnvelope(area: BBox, count: number, seed: number, nowIso: string): FirmsFeedEnvelope {
  const detections = generateSyntheticDetections(area, count, seed);
  return buildEnvelope({
    detections,
    product: SYNTHETIC_PRODUCT,
    area,
    dayRange: 1,
    fetchedAtUtc: nowIso,
    state: 'SYNTHETIC DEMO',
    warnings: ['SYNTHETIC DEMO training data: invented points, not NASA observations.'],
  });
}
