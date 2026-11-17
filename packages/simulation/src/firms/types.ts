import type { BBox } from '../geo';

/** Provenance display states. Exactly these four are supported. */
export type DataState = 'LIVE' | 'CACHED' | 'HISTORICAL' | 'SYNTHETIC DEMO';

export const DATA_STATES: readonly DataState[] = ['LIVE', 'CACHED', 'HISTORICAL', 'SYNTHETIC DEMO'];

export type ConfidenceCategory = 'low' | 'nominal' | 'high' | 'unknown';

/** Products the API is allowed to request. */
export const ALLOWED_FIRMS_SOURCES = ['VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT', 'VIIRS_SNPP_NRT'] as const;
export type FirmsSource = (typeof ALLOWED_FIRMS_SOURCES)[number];

/**
 * A normalised FIRMS detection. Keeps the original raw string values in `raw`.
 * A detection is a satellite-derived active-fire / thermal-anomaly pixel, NOT a fire perimeter.
 */
export interface FirmsDetection {
  /** Stable id: product + acquisition + coordinates hash. */
  id: string;
  latitude: number;
  longitude: number;
  /** YYYY-MM-DD (UTC) */
  acqDate: string;
  /** HHMM (UTC) */
  acqTime: string;
  /** ISO 8601 UTC timestamp built from acq_date + acq_time. */
  acqUtc: string;
  satellite?: string;
  /** Instrument as reported; if the source CSV has no instrument column, derived from the product name. */
  instrument?: string;
  instrumentDerivedFromProduct?: boolean;
  /** Raw confidence value as reported (e.g. "n", "nominal", "h"). */
  confidenceRaw?: string;
  confidence: ConfidenceCategory;
  /** Fire Radiative Power, MW, as reported. A radiative measurement, not a danger score. */
  frpMW?: number;
  brightTi4K?: number;
  brightTi5K?: number;
  /** Along-scan pixel size, km (VIIRS ~0.375 km at nadir, larger off-nadir). */
  scanKm?: number;
  /** Along-track pixel size, km. */
  trackKm?: number;
  version?: string;
  daynight?: string;
  product: string;
  state: DataState;
  /** Original column values, untouched. */
  raw: Record<string, string>;
}

export interface FirmsFeedEnvelope {
  /** 'NASA FIRMS' only for real NASA-derived rows. Synthetic data uses the generator name. */
  source: 'NASA FIRMS' | 'SYNTHETIC GENERATOR (NOT NASA DATA)';
  product: string;
  area: BBox;
  requestedDate?: string;
  dayRange: number;
  fetchedAtUtc: string;
  acquisitionWindowUtc?: { from: string; to: string };
  state: DataState;
  staleAgeSeconds?: number;
  count: number;
  detections: FirmsDetection[];
  warnings: string[];
  /** URL of the public source (never contains the MAP_KEY). */
  sourceUrl?: string;
}

export interface FirmsStatus {
  provider: 'NASA FIRMS';
  keyConfigured: boolean;
  lastRetrievalUtc?: string;
  lastState?: DataState;
  cacheEntries: number;
  cacheAgeSeconds?: number;
  allowedSources: readonly string[];
  snapshotAvailable: boolean;
  message: string;
}
