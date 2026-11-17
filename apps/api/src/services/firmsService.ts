import fs from 'node:fs';
import path from 'node:path';
import {
  ALLOWED_FIRMS_SOURCES,
  buildEnvelope,
  normalizeFirmsRecords,
  parseCsv,
  relabelEnvelope,
  type DataState,
  type FirmsFeedEnvelope,
  type FirmsStatus,
} from '@ofw/simulation';
import { TtlCache } from '../cache/ttlCache';
import { fetchFirmsArea, FirmsProviderError, redactedAreaUrl, type FetchLike } from '../providers/firmsProvider';
import type { FirmsAreaQuery } from '../validation/schemas';

export interface SnapshotManifest {
  product: string;
  sourceUrl: string;
  retrievedAtUtc: string;
  snapshots: {
    missionId: string;
    regionName: string;
    area: { west: number; south: number; east: number; north: number };
    acquisitionDate: string;
    dayRange: number;
    file: string;
    rowCount: number;
  }[];
}

export interface FirmsServiceOptions {
  mapKey?: string;
  cacheTtlSeconds: number;
  fetchImpl: FetchLike;
  now: () => number;
  /** Directory containing manifest.json and the snapshot CSVs (…/data/firms). */
  snapshotDir?: string;
  /** Minimum seconds between forced refreshes of the same query. */
  refreshCooldownSeconds?: number;
  timeoutMs?: number;
  log?: (msg: string) => void;
}

export class FirmsServiceError extends Error {
  constructor(
    public httpStatus: number,
    public code: string,
    message: string,
    public fallback?: 'synthetic',
  ) {
    super(message);
  }
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

export class FirmsService {
  private cache: TtlCache<FirmsFeedEnvelope>;
  private lastRetrievalUtc?: string;
  private lastState?: DataState;
  private lastForcedRefresh = new Map<string, number>();
  private manifest?: SnapshotManifest;

  constructor(private opts: FirmsServiceOptions) {
    this.cache = new TtlCache(opts.cacheTtlSeconds);
    if (opts.snapshotDir) {
      try {
        this.manifest = JSON.parse(fs.readFileSync(path.join(opts.snapshotDir, 'manifest.json'), 'utf8'));
      } catch {
        this.manifest = undefined;
      }
    }
  }

  get keyConfigured(): boolean {
    const k = this.opts.mapKey?.trim();
    return !!k && k !== 'replace_me';
  }

  status(): FirmsStatus {
    const newest = this.cache.newest();
    return {
      provider: 'NASA FIRMS',
      keyConfigured: this.keyConfigured,
      lastRetrievalUtc: this.lastRetrievalUtc,
      lastState: this.lastState,
      cacheEntries: this.cache.size,
      cacheAgeSeconds: newest ? Math.round((this.opts.now() - newest.storedAtMs) / 1000) : undefined,
      allowedSources: ALLOWED_FIRMS_SOURCES,
      snapshotAvailable: !!this.manifest && this.manifest.snapshots.length > 0,
      message: this.keyConfigured
        ? 'Live FIRMS requests are enabled (server-side MAP_KEY configured).'
        : 'No FIRMS MAP_KEY configured on the server. Missions use the bundled historical NASA FIRMS snapshot.',
    };
  }

  private cacheKey(q: FirmsAreaQuery): string {
    return [q.source, q.west, q.south, q.east, q.north, q.dayRange, q.date ?? 'latest'].join('|');
  }

  /** Bundled snapshot matching the request area (and date, if given). */
  snapshotFor(q: FirmsAreaQuery, reason: string): FirmsFeedEnvelope | undefined {
    if (!this.manifest || !this.opts.snapshotDir) return undefined;
    const snap = this.manifest.snapshots.find(
      (s) =>
        near(s.area.west, q.west) &&
        near(s.area.south, q.south) &&
        near(s.area.east, q.east) &&
        near(s.area.north, q.north) &&
        (!q.date || q.date === s.acquisitionDate) &&
        q.source === this.manifest!.product,
    );
    if (!snap) return undefined;
    const file = path.join(this.opts.snapshotDir, path.basename(snap.file));
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      return undefined;
    }
    const { detections, warnings } = normalizeFirmsRecords(parseCsv(text), this.manifest.product, 'HISTORICAL');
    const extra = [
      reason,
      `Bundled NASA FIRMS snapshot: acquisition date ${snap.acquisitionDate} (UTC), retrieved ${this.manifest.retrievedAtUtc} from ${this.manifest.sourceUrl}.`,
    ];
    if (!q.date) extra.push(`Latest data was requested; this is a HISTORICAL snapshot, not live data.`);
    return buildEnvelope({
      detections,
      product: this.manifest.product,
      area: snap.area,
      dayRange: snap.dayRange,
      requestedDate: snap.acquisitionDate,
      fetchedAtUtc: this.manifest.retrievedAtUtc,
      state: 'HISTORICAL',
      warnings: [...extra, ...warnings],
      sourceUrl: this.manifest.sourceUrl,
    });
  }

  async area(q: FirmsAreaQuery): Promise<FirmsFeedEnvelope> {
    const now = this.opts.now();
    const key = this.cacheKey(q);

    if (!this.keyConfigured) {
      const snap = this.snapshotFor(q, 'No FIRMS MAP_KEY is configured on the server.');
      if (snap) {
        this.lastState = 'HISTORICAL';
        return snap;
      }
      throw new FirmsServiceError(503, 'NO_KEY', 'No FIRMS MAP_KEY is configured and no bundled snapshot matches this area. Use SYNTHETIC DEMO training data instead.', 'synthetic');
    }

    const cached = this.cache.get(key, now);
    const wantsRefresh = q.refresh === '1';
    if (cached && cached.fresh) {
      const last = this.lastForcedRefresh.get(key) ?? 0;
      const cooldown = this.opts.refreshCooldownSeconds ?? 60;
      if (!wantsRefresh || (now - last) / 1000 < cooldown) {
        const env = relabelEnvelope(cached.entry.value, q.date ? 'HISTORICAL' : 'CACHED', Math.round(cached.ageSeconds));
        if (wantsRefresh) env.warnings = [...env.warnings, `Refresh cooldown: try again in ${Math.ceil(cooldown - (now - last) / 1000)} s.`];
        return env;
      }
    }
    if (wantsRefresh) this.lastForcedRefresh.set(key, now);

    try {
      const rows = await fetchFirmsArea(this.opts.fetchImpl, this.opts.mapKey!, q, this.opts.timeoutMs);
      const state: DataState = q.date ? 'HISTORICAL' : 'LIVE';
      const { detections, warnings } = normalizeFirmsRecords(rows, q.source, state);
      if (detections.length === 0) warnings.push('FIRMS returned no detections for this area and window.');
      const env = buildEnvelope({
        detections,
        product: q.source,
        area: { west: q.west, south: q.south, east: q.east, north: q.north },
        dayRange: q.dayRange,
        requestedDate: q.date,
        fetchedAtUtc: new Date(now).toISOString(),
        state,
        warnings,
        sourceUrl: redactedAreaUrl(q),
      });
      this.cache.set(key, env, now);
      this.lastRetrievalUtc = env.fetchedAtUtc;
      this.lastState = state;
      this.opts.log?.(`FIRMS ${q.source} ${detections.length} detections (${state})`);
      return env;
    } catch (err) {
      const e = err instanceof FirmsProviderError ? err : new FirmsProviderError('UPSTREAM_ERROR', 'Unexpected FIRMS failure.');
      this.opts.log?.(`FIRMS request failed: ${e.code} ${e.message}`);
      if (cached) {
        const env = relabelEnvelope(cached.entry.value, q.date ? 'HISTORICAL' : 'CACHED', Math.round(cached.ageSeconds));
        env.warnings = [...env.warnings, `Live request failed (${e.code}: ${e.message}). Serving the last successful response.`];
        this.lastState = env.state;
        return env;
      }
      const snap = this.snapshotFor(q, `Live request failed (${e.code}: ${e.message}).`);
      if (snap) {
        this.lastState = 'HISTORICAL';
        return snap;
      }
      const status = e.code === 'INVALID_KEY' ? 502 : e.code === 'RATE_LIMITED' ? 429 : e.code === 'TIMEOUT' ? 504 : 502;
      throw new FirmsServiceError(status, e.code, e.message, 'synthetic');
    }
  }
}
