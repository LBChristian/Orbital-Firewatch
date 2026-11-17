import { get as idbGet, set as idbSet } from 'idb-keyval';
import {
  buildEnvelope,
  normalizeFirmsRecords,
  parseCsv,
  relabelEnvelope,
  syntheticEnvelope,
  type FirmsFeedEnvelope,
  type FirmsStatus,
  type MissionDef,
} from '@ofw/simulation';
import type { FeedMode } from '../state/store';

export interface SnapshotManifest {
  product: string;
  sourceUrl: string;
  retrievedAtUtc: string;
  usageNotes: string;
  snapshots: { missionId: string; regionName: string; acquisitionDate: string; file: string; rowCount: number }[];
}

export interface FeedResult {
  envelope: FirmsFeedEnvelope;
  notes: string[];
}

const API_TIMEOUT_MS = 20000;

async function fetchJson<T>(url: string, timeoutMs = API_TIMEOUT_MS): Promise<{ status: number; body: T }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) throw new Error('API not available');
    return { status: res.status, body: (await res.json()) as T };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchServerStatus(): Promise<FirmsStatus | null> {
  try {
    const r = await fetchJson<FirmsStatus>('/api/firms/status', 5000);
    return r.status === 200 ? r.body : null;
  } catch {
    return null;
  }
}

let manifestPromise: Promise<SnapshotManifest | null> | null = null;
export function loadManifest(): Promise<SnapshotManifest | null> {
  manifestPromise ??= fetch('/data/firms/manifest.json')
    .then((r) => (r.ok ? (r.json() as Promise<SnapshotManifest>) : null))
    .catch(() => null);
  return manifestPromise;
}

/** Load the bundled snapshot directly from static files (works without the API). */
export async function loadStaticSnapshot(m: MissionDef): Promise<FirmsFeedEnvelope | null> {
  const manifest = await loadManifest();
  try {
    const res = await fetch('/' + m.firms.snapshotFile);
    if (!res.ok) return null;
    const text = await res.text();
    const { detections, warnings } = normalizeFirmsRecords(parseCsv(text), m.firms.product, 'HISTORICAL');
    return buildEnvelope({
      detections,
      product: m.firms.product,
      area: m.bbox,
      dayRange: m.firms.dayRange,
      requestedDate: m.firms.date,
      fetchedAtUtc: manifest?.retrievedAtUtc ?? 'unknown',
      state: 'HISTORICAL',
      warnings: [
        `Bundled NASA FIRMS snapshot (acquisition date ${m.firms.date} UTC), loaded from static files.`,
        ...warnings,
      ],
      sourceUrl: manifest?.sourceUrl,
    });
  } catch {
    return null;
  }
}

function areaQuery(m: MissionDef): string {
  const b = m.bbox;
  return `source=${m.firms.product}&west=${b.west}&south=${b.south}&east=${b.east}&north=${b.north}`;
}

const cacheKey = (m: MissionDef) => `ofw.live.${m.id}`;

/**
 * Load mission targets:
 *  - snapshot: API (which may serve a live historical query or the bundled snapshot) -> static snapshot
 *  - live: API latest -> IndexedDB last-good (CACHED) -> static snapshot (HISTORICAL)
 *  - synthetic: seeded SYNTHETIC DEMO generator (never NASA)
 */
export async function loadFeed(m: MissionDef, mode: FeedMode, refresh = false): Promise<FeedResult> {
  const notes: string[] = [];
  if (mode === 'synthetic') {
    return {
      envelope: syntheticEnvelope(m.bbox, m.maxTargets * 4, m.seed, new Date().toISOString()),
      notes: ['SYNTHETIC DEMO: invented training points. They are not NASA observations.'],
    };
  }

  if (mode === 'live') {
    try {
      const r = await fetchJson<FirmsFeedEnvelope & { error?: string; message?: string }>(`/api/firms/area?${areaQuery(m)}&dayRange=1${refresh ? '&refresh=1' : ''}`);
      if (r.status === 200) {
        if (r.body.state === 'LIVE') {
          try {
            await idbSet(cacheKey(m), { storedAt: Date.now(), envelope: r.body });
          } catch {
            /* IndexedDB unavailable */
          }
        }
        return { envelope: r.body, notes };
      }
      notes.push(`Live request failed: ${r.body.message ?? r.body.error ?? `HTTP ${r.status}`}`);
    } catch {
      notes.push('The game server could not be reached for live data.');
    }
    try {
      const cached = (await idbGet(cacheKey(m))) as { storedAt: number; envelope: FirmsFeedEnvelope } | undefined;
      if (cached) {
        const age = Math.round((Date.now() - cached.storedAt) / 1000);
        const env = relabelEnvelope(cached.envelope, 'CACHED', age);
        env.warnings = [...env.warnings, 'Using the last successful live response stored in this browser.'];
        return { envelope: env, notes };
      }
    } catch {
      /* ignore */
    }
    notes.push('Falling back to the bundled historical snapshot.');
  }

  try {
    const r = await fetchJson<FirmsFeedEnvelope & { error?: string; message?: string }>(`/api/firms/area?${areaQuery(m)}&dayRange=${m.firms.dayRange}&date=${m.firms.date}`);
    if (r.status === 200) return { envelope: r.body, notes };
    notes.push(`Server could not provide the snapshot: ${r.body.message ?? r.body.error}`);
  } catch {
    notes.push('Game server not reachable; loaded the bundled snapshot from static files.');
  }
  const env = await loadStaticSnapshot(m);
  if (env) return { envelope: env, notes };
  throw new Error('No NASA data available: the server is unreachable and the bundled snapshot could not be loaded. You can continue with SYNTHETIC DEMO training data.');
}
