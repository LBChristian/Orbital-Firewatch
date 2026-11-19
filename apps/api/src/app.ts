import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  ALTITUDE_OPTIONS,
  BATTERY_OPTIONS,
  BUS_OPTIONS,
  CATALOG_IS_NOTIONAL,
  COMMS_OPTIONS,
  INCLINATION_OPTIONS,
  LAUNCH_OPTIONS,
  MISSIONS,
  PAYLOAD_OPTIONS,
  POINTING_OPTIONS,
  RECORDER_OPTIONS,
  SOLAR_OPTIONS,
} from '@ofw/simulation';
import { FirmsService, FirmsServiceError } from './services/firmsService';
import { firmsAreaBaseSchema, firmsAreaQuerySchema } from './validation/schemas';
import type { FetchLike } from './providers/firmsProvider';

export interface AppOptions {
  mapKey?: string;
  cacheTtlSeconds?: number;
  fetchImpl?: FetchLike;
  now?: () => number;
  snapshotDir?: string;
  /** Built web app directory to serve in production. */
  webDistDir?: string;
  log?: (msg: string) => void;
  /** Max /api/firms/area requests per client per minute. */
  rateLimitPerMinute?: number;
  /** Upstream FIRMS timeout, ms. */
  firmsTimeoutMs?: number;
}

const DISCLAIMER =
  'Independent educational project using NASA data. Not affiliated with or endorsed by NASA. Educational simulation only. FIRMS active-fire/thermal-anomaly detections have limitations and must not be used to protect life or property.';

export function createApp(opts: AppOptions = {}) {
  const now = opts.now ?? (() => Date.now());
  const firms = new FirmsService({
    mapKey: opts.mapKey,
    cacheTtlSeconds: opts.cacheTtlSeconds ?? 900,
    fetchImpl: opts.fetchImpl ?? (fetch as unknown as FetchLike),
    now,
    snapshotDir: opts.snapshotDir,
    log: opts.log,
    timeoutMs: opts.firmsTimeoutMs,
  });
  const startedAt = now();
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // Simple fixed-window rate limit for the upstream-facing route.
  const limit = opts.rateLimitPerMinute ?? 30;
  const hits = new Map<string, { windowStart: number; count: number }>();
  const rateLimit = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? 'unknown';
    const t = now();
    const h = hits.get(ip);
    if (!h || t - h.windowStart > 60000) hits.set(ip, { windowStart: t, count: 1 });
    else if (++h.count > limit) {
      res.status(429).json({ error: 'RATE_LIMITED', message: 'Too many FIRMS requests from this client. Wait a minute.' });
      return;
    }
    if (hits.size > 5000) hits.clear();
    next();
  };

  app.get('/api/health', (_req, res) => {
    const s = firms.status();
    res.json({ ok: true, service: 'orbital-firewatch-api', uptimeSeconds: Math.round((now() - startedAt) / 1000), firmsCacheEntries: s.cacheEntries, keyConfigured: s.keyConfigured, disclaimer: DISCLAIMER });
  });

  app.get('/api/firms/status', (_req, res) => {
    res.json(firms.status());
  });

  app.get('/api/firms/area', rateLimit, async (req, res) => {
    const parsed = firmsAreaQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      // A dated request for exactly a bundled mission snapshot is a local file read, not an
      // upstream query, so the span limit does not apply (M08 and M10 are wider than 20°).
      const base = firmsAreaBaseSchema.safeParse(req.query);
      if (base.success && base.data.date) {
        const snap = firms.snapshotFor(base.data, 'Bundled mission snapshot served directly (area wider than the live-query limit; NASA FIRMS was not queried).');
        if (snap) {
          res.json(snap);
          return;
        }
      }
      res.status(400).json({ error: 'INVALID_QUERY', message: 'Invalid FIRMS area query.', issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
      return;
    }
    try {
      res.json(await firms.area(parsed.data));
    } catch (err) {
      if (err instanceof FirmsServiceError) {
        res.status(err.httpStatus).json({ error: err.code, message: err.message, fallback: err.fallback });
        return;
      }
      res.status(500).json({ error: 'INTERNAL', message: 'Unexpected server error.' });
    }
  });

  app.get('/api/missions', (_req, res) => {
    res.json({ missions: MISSIONS, disclaimer: DISCLAIMER });
  });

  app.get('/api/missions/:id', (req, res) => {
    const m = MISSIONS.find((x) => x.id === req.params.id);
    if (!m) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown mission.' });
      return;
    }
    res.json(m);
  });

  app.get('/api/config', (_req, res) => {
    res.json({
      isNotional: CATALOG_IS_NOTIONAL,
      note: 'All component values are fictional game-balance parameters, not NASA specifications or real prices.',
      bus: BUS_OPTIONS,
      payload: PAYLOAD_OPTIONS,
      solar: SOLAR_OPTIONS,
      battery: BATTERY_OPTIONS,
      recorder: RECORDER_OPTIONS,
      comms: COMMS_OPTIONS,
      pointing: POINTING_OPTIONS,
      launch: LAUNCH_OPTIONS,
      altitude: ALTITUDE_OPTIONS,
      inclination: INCLINATION_OPTIONS,
    });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown API route.' });
  });

  // Production: serve the built web app with SPA fallback.
  if (opts.webDistDir && fs.existsSync(path.join(opts.webDistDir, 'index.html'))) {
    const dist = opts.webDistDir;
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  return app;
}
