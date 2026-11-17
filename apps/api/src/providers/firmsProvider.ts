import { parse } from 'csv-parse/sync';
import type { FirmsAreaQuery } from '../validation/schemas';

export const FIRMS_AREA_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';

export type FirmsErrorCode = 'INVALID_KEY' | 'RATE_LIMITED' | 'TIMEOUT' | 'UPSTREAM_5XX' | 'UPSTREAM_ERROR' | 'MALFORMED' | 'NETWORK';

export class FirmsProviderError extends Error {
  constructor(
    public code: FirmsErrorCode,
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

/** Build the Area API URL: /{MAP_KEY}/{SOURCE}/{W},{S},{E},{N}/{DAY_RANGE}[/{DATE}]. */
export function buildAreaUrl(mapKey: string, q: Pick<FirmsAreaQuery, 'source' | 'west' | 'south' | 'east' | 'north' | 'dayRange' | 'date'>): string {
  const area = [q.west, q.south, q.east, q.north].map((v) => String(v)).join(',');
  const base = `${FIRMS_AREA_BASE}/${encodeURIComponent(mapKey)}/${q.source}/${area}/${q.dayRange}`;
  return q.date ? `${base}/${q.date}` : base;
}

/** The same URL with the key redacted. Safe for logs and responses. */
export function redactedAreaUrl(q: Parameters<typeof buildAreaUrl>[1]): string {
  return buildAreaUrl('MAP_KEY_REDACTED', q);
}

export type FetchLike = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

/**
 * Fetch and parse a FIRMS Area API CSV. Classifies FIRMS error bodies (which can arrive
 * with HTTP 200) and never includes the key in error messages.
 */
export async function fetchFirmsArea(
  fetchImpl: FetchLike,
  mapKey: string,
  q: FirmsAreaQuery,
  timeoutMs = 15000,
): Promise<Record<string, string>[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Awaited<ReturnType<FetchLike>>;
  let body: string;
  try {
    res = await fetchImpl(buildAreaUrl(mapKey, q), { signal: controller.signal, headers: { 'User-Agent': 'orbital-firewatch-educational-game' } });
    body = await res.text();
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new FirmsProviderError('TIMEOUT', `FIRMS did not respond within ${timeoutMs / 1000} s.`);
    throw new FirmsProviderError('NETWORK', 'Could not reach FIRMS (network error).');
  } finally {
    clearTimeout(timer);
  }
  const trimmed = body.trim();
  const lower = trimmed.slice(0, 300).toLowerCase();
  if (lower.includes('invalid map_key') || lower.includes('invalid key') || res.status === 401 || res.status === 403) {
    throw new FirmsProviderError('INVALID_KEY', 'FIRMS rejected the server MAP_KEY.', res.status);
  }
  if (res.status === 429 || lower.includes('exceeding allowed transaction limit') || lower.includes('transaction limit')) {
    throw new FirmsProviderError('RATE_LIMITED', 'FIRMS transaction limit reached. Try again later.', res.status);
  }
  if (res.status >= 500) throw new FirmsProviderError('UPSTREAM_5XX', `FIRMS returned HTTP ${res.status}.`, res.status);
  if (!res.ok) throw new FirmsProviderError('UPSTREAM_ERROR', `FIRMS returned HTTP ${res.status}.`, res.status);
  if (trimmed === '') return [];
  const firstLine = trimmed.split(/\r?\n/, 1)[0].toLowerCase();
  if (!firstLine.includes('latitude') || !firstLine.includes('longitude')) {
    throw new FirmsProviderError('MALFORMED', 'FIRMS response was not the expected CSV (missing latitude/longitude header).');
  }
  try {
    return parse(trimmed, {
      columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    }) as Record<string, string>[];
  } catch {
    throw new FirmsProviderError('MALFORMED', 'FIRMS CSV could not be parsed.');
  }
}
