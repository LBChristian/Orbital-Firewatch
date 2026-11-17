import { fnv1a } from '../rng';
import type { ConfidenceCategory, DataState, FirmsDetection, FirmsFeedEnvelope } from './types';
import type { BBox } from '../geo';

/**
 * Minimal RFC-4180 style CSV parser (handles quoted fields, CRLF, blank lines).
 * Used by the browser for bundled snapshots. The API uses `csv-parse`.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, idx) => {
      o[h] = (r[idx] ?? '').trim();
    });
    return o;
  });
}

export function normalizeConfidence(raw: string | undefined): ConfidenceCategory {
  if (raw === undefined) return 'unknown';
  const v = raw.trim().toLowerCase();
  if (v === 'l' || v === 'low') return 'low';
  if (v === 'n' || v === 'nominal') return 'nominal';
  if (v === 'h' || v === 'high') return 'high';
  // MODIS uses 0-100 numeric confidence. Map to coarse categories only for display grouping.
  const num = Number(v);
  if (v !== '' && Number.isFinite(num)) {
    if (num < 30) return 'low';
    if (num < 80) return 'nominal';
    return 'high';
  }
  return 'unknown';
}

function num(v: string | undefined): number | undefined {
  if (v === undefined || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export interface NormalizeResult {
  detections: FirmsDetection[];
  rejected: number;
  warnings: string[];
}

/** Product -> instrument name, used only when the CSV omits the instrument column. */
export function instrumentForProduct(product: string): string | undefined {
  if (product.startsWith('VIIRS')) return 'VIIRS';
  if (product.startsWith('MODIS')) return 'MODIS';
  return undefined;
}

/**
 * Normalise raw FIRMS CSV records. Invalid rows (missing/invalid coordinates or date)
 * are rejected and counted, never repaired with invented values. Duplicate rows
 * (same id) are removed.
 */
export function normalizeFirmsRecords(
  records: Record<string, string>[],
  product: string,
  state: DataState,
): NormalizeResult {
  const warnings: string[] = [];
  const seen = new Set<string>();
  const detections: FirmsDetection[] = [];
  let rejected = 0;
  let dupes = 0;
  if (records.length > 0) {
    const cols = Object.keys(records[0]);
    for (const required of ['latitude', 'longitude', 'acq_date']) {
      if (!cols.includes(required)) warnings.push(`Source CSV is missing required column "${required}".`);
    }
    if (!cols.includes('instrument')) {
      warnings.push('Source CSV has no "instrument" column; instrument is derived from the product name.');
    }
  }
  for (const rec of records) {
    const lat = num(rec.latitude);
    const lon = num(rec.longitude);
    const date = rec.acq_date ?? '';
    if (
      lat === undefined ||
      lon === undefined ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      rejected++;
      continue;
    }
    const timeDigits = (rec.acq_time ?? '').replace(/\D/g, '');
    const acqTime = timeDigits === '' ? '0000' : timeDigits.padStart(4, '0').slice(-4);
    const hh = Number(acqTime.slice(0, 2));
    const mm = Number(acqTime.slice(2, 4));
    if (hh > 23 || mm > 59) {
      rejected++;
      continue;
    }
    const acqUtc = `${date}T${acqTime.slice(0, 2)}:${acqTime.slice(2, 4)}:00Z`;
    const id = `${product}-${date.replace(/-/g, '')}${acqTime}-${fnv1a(`${rec.latitude},${rec.longitude},${date},${acqTime},${rec.satellite ?? ''}`)}`;
    if (seen.has(id)) {
      dupes++;
      continue;
    }
    seen.add(id);
    const instrument = rec.instrument && rec.instrument !== '' ? rec.instrument : instrumentForProduct(product);
    detections.push({
      id,
      latitude: lat,
      longitude: lon,
      acqDate: date,
      acqTime,
      acqUtc,
      satellite: rec.satellite || undefined,
      instrument,
      instrumentDerivedFromProduct: !(rec.instrument && rec.instrument !== ''),
      confidenceRaw: rec.confidence,
      confidence: normalizeConfidence(rec.confidence),
      frpMW: num(rec.frp),
      brightTi4K: num(rec.bright_ti4 ?? rec.brightness),
      brightTi5K: num(rec.bright_ti5 ?? rec.bright_t31),
      scanKm: num(rec.scan),
      trackKm: num(rec.track),
      version: rec.version || undefined,
      daynight: rec.daynight || undefined,
      product,
      state,
      raw: { ...rec },
    });
  }
  if (rejected > 0) warnings.push(`${rejected} malformed row(s) were rejected (invalid coordinates, date or time).`);
  if (dupes > 0) warnings.push(`${dupes} duplicate row(s) were removed.`);
  return { detections, rejected, warnings };
}

export function acquisitionWindow(dets: FirmsDetection[]): { from: string; to: string } | undefined {
  if (dets.length === 0) return undefined;
  let from = dets[0].acqUtc;
  let to = dets[0].acqUtc;
  for (const d of dets) {
    if (d.acqUtc < from) from = d.acqUtc;
    if (d.acqUtc > to) to = d.acqUtc;
  }
  return { from, to };
}

export function buildEnvelope(args: {
  detections: FirmsDetection[];
  product: string;
  area: BBox;
  dayRange: number;
  requestedDate?: string;
  fetchedAtUtc: string;
  state: DataState;
  warnings: string[];
  staleAgeSeconds?: number;
  sourceUrl?: string;
}): FirmsFeedEnvelope {
  const synthetic = args.state === 'SYNTHETIC DEMO';
  return {
    source: synthetic ? 'SYNTHETIC GENERATOR (NOT NASA DATA)' : 'NASA FIRMS',
    product: args.product,
    area: args.area,
    requestedDate: args.requestedDate,
    dayRange: args.dayRange,
    fetchedAtUtc: args.fetchedAtUtc,
    acquisitionWindowUtc: acquisitionWindow(args.detections),
    state: args.state,
    staleAgeSeconds: args.staleAgeSeconds,
    count: args.detections.length,
    detections: args.detections,
    warnings: args.warnings,
    sourceUrl: args.sourceUrl,
  };
}

/** Re-label an envelope (e.g. LIVE -> CACHED) including every detection. */
export function relabelEnvelope(env: FirmsFeedEnvelope, state: DataState, staleAgeSeconds?: number): FirmsFeedEnvelope {
  if (env.state === 'SYNTHETIC DEMO' && state !== 'SYNTHETIC DEMO') {
    throw new Error('Synthetic data can never be relabelled as NASA data.');
  }
  return {
    ...env,
    state,
    staleAgeSeconds,
    detections: env.detections.map((d) => ({ ...d, state })),
  };
}
