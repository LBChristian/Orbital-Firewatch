import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { buildAreaUrl, redactedAreaUrl, type FetchLike } from '../src/providers/firmsProvider';

const SNAP_DIR = path.resolve(__dirname, '../../web/public/data/firms');
const KEY = 'TESTKEY0123456789abcdef';
const M1_AREA = 'west=-124.6&south=38&east=-120.8&north=42.2';

const CSV = [
  'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight',
  '40.1,-122.5,330.1,0.4,0.4,2026-11-17,2100,N20,VIIRS,n,2.0NRT,290.1,4.2,D',
  '40.2,-122.6,350.2,0.5,0.4,2026-11-17,2100,N20,VIIRS,h,2.0NRT,295.3,12.9,D',
  'bad,row,,,,,,,,,,,,',
].join('\n');

function mockFetch(body: string, status = 200, calls: string[] = []): FetchLike {
  return async (url) => {
    calls.push(url);
    return { ok: status >= 200 && status < 300, status, text: async () => body };
  };
}

describe('FIRMS URL construction', () => {
  it('builds the Area API URL in west,south,east,north order with optional date', () => {
    const q = { source: 'VIIRS_NOAA20_NRT' as const, west: -124.6, south: 38, east: -120.8, north: 42.2, dayRange: 2 };
    expect(buildAreaUrl('K', q)).toBe('https://firms.modaps.eosdis.nasa.gov/api/area/csv/K/VIIRS_NOAA20_NRT/-124.6,38,-120.8,42.2/2');
    expect(buildAreaUrl('K', { ...q, date: '2026-11-16' })).toMatch(/\/2\/2026-11-16$/);
    expect(redactedAreaUrl(q)).not.toContain('K/');
  });
});

describe('/api/firms/area validation', () => {
  const app = createApp({ mapKey: KEY, fetchImpl: mockFetch(CSV), snapshotDir: SNAP_DIR });
  it.each([
    ['bbox order', 'west=10&south=0&east=5&north=5'],
    ['south >= north', 'west=0&south=5&east=5&north=5'],
    ['too large', 'west=-180&south=-80&east=180&north=80'],
    ['dayRange > 5', `${M1_AREA}&dayRange=6`],
    ['dayRange 0', `${M1_AREA}&dayRange=0`],
    ['unknown source', `${M1_AREA}&source=MODIS_SECRET`],
    ['bad date', `${M1_AREA}&date=2026-13-45x`],
    ['future date', `${M1_AREA}&date=2099-01-01`],
    ['non-numeric', 'west=abc&south=0&east=5&north=5'],
  ])('rejects %s', async (_name, qs) => {
    const r = await request(app).get(`/api/firms/area?${qs}`);
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('INVALID_QUERY');
  });
});

describe('/api/firms/area live path', () => {
  it('fetches, normalises and returns a LIVE envelope without leaking the key; then CACHED', async () => {
    const calls: string[] = [];
    let t = Date.parse('2026-11-18T00:00:00Z');
    const app = createApp({ mapKey: KEY, fetchImpl: mockFetch(CSV, 200, calls), snapshotDir: SNAP_DIR, now: () => t });
    const r = await request(app).get(`/api/firms/area?${M1_AREA}&dayRange=1`);
    expect(r.status).toBe(200);
    expect(r.body.state).toBe('LIVE');
    expect(r.body.source).toBe('NASA FIRMS');
    expect(r.body.count).toBe(2);
    expect(r.body.detections[0].state).toBe('LIVE');
    expect(r.body.warnings.join(' ')).toContain('malformed');
    expect(JSON.stringify(r.body)).not.toContain(KEY);
    expect(calls[0]).toContain(KEY);
    t += 30_000;
    const r2 = await request(app).get(`/api/firms/area?${M1_AREA}&dayRange=1`);
    expect(r2.body.state).toBe('CACHED');
    expect(r2.body.staleAgeSeconds).toBe(30);
    expect(calls.length).toBe(1);
  });

  it('labels a dated request HISTORICAL', async () => {
    const app = createApp({ mapKey: KEY, fetchImpl: mockFetch(CSV), snapshotDir: SNAP_DIR });
    const r = await request(app).get(`/api/firms/area?${M1_AREA}&date=2026-11-17`);
    expect(r.body.state).toBe('HISTORICAL');
  });

  it('handles an empty FIRMS response as zero detections with a warning', async () => {
    const app = createApp({ mapKey: KEY, fetchImpl: mockFetch('latitude,longitude,acq_date\n'), snapshotDir: SNAP_DIR });
    const r = await request(app).get(`/api/firms/area?west=0&south=0&east=5&north=5`);
    expect(r.status).toBe(200);
    expect(r.body.count).toBe(0);
    expect(r.body.warnings.join(' ')).toContain('no detections');
  });

  it.each([
    ['invalid key', mockFetch('Invalid MAP_KEY.', 200), 502, 'INVALID_KEY'],
    ['rate limited', mockFetch('Exceeding allowed transaction limit', 200), 429, 'RATE_LIMITED'],
    ['upstream 5xx', mockFetch('oops', 503), 502, 'UPSTREAM_5XX'],
    ['malformed body', mockFetch('<html>not csv</html>', 200), 502, 'MALFORMED'],
    [
      'timeout',
      ((_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
        })) as FetchLike,
      504,
      'TIMEOUT',
    ],
  ])('without cache or snapshot, maps %s to an error with synthetic fallback hint', async (_n, f, status, code) => {
    const app = createApp({ mapKey: KEY, fetchImpl: f as FetchLike, firmsTimeoutMs: 300 });
    const r = await request(app).get(`/api/firms/area?west=0&south=0&east=5&north=5`).timeout(20000);
    expect(r.status).toBe(status);
    expect(r.body.error).toBe(code);
    expect(r.body.fallback).toBe('synthetic');
    expect(JSON.stringify(r.body)).not.toContain(KEY);
  }, 25000);

  it('falls back to the bundled HISTORICAL snapshot when upstream fails for a mission area', async () => {
    const app = createApp({ mapKey: KEY, fetchImpl: mockFetch('oops', 500), snapshotDir: SNAP_DIR });
    const r = await request(app).get(`/api/firms/area?${M1_AREA}&date=2026-11-16`);
    expect(r.status).toBe(200);
    expect(r.body.state).toBe('HISTORICAL');
    expect(r.body.count).toBe(85);
    expect(r.body.warnings.join(' ')).toContain('UPSTREAM_5XX');
  });

  it('serves a stale cached response as CACHED when upstream later fails', async () => {
    let t = Date.parse('2026-11-18T00:00:00Z');
    let fail = false;
    const f: FetchLike = async () => (fail ? { ok: false, status: 500, text: async () => 'x' } : { ok: true, status: 200, text: async () => CSV });
    const app = createApp({ mapKey: KEY, fetchImpl: f, now: () => t, cacheTtlSeconds: 60 });
    await request(app).get('/api/firms/area?west=0&south=0&east=5&north=5');
    fail = true;
    t += 120_000;
    const r = await request(app).get('/api/firms/area?west=0&south=0&east=5&north=5');
    expect(r.status).toBe(200);
    expect(r.body.state).toBe('CACHED');
    expect(r.body.staleAgeSeconds).toBe(120);
  });
});

describe('no MAP_KEY configured', () => {
  const app = createApp({ mapKey: 'replace_me', snapshotDir: SNAP_DIR, fetchImpl: mockFetch(CSV) });
  it('serves the bundled snapshot as HISTORICAL for mission areas', async () => {
    const r = await request(app).get(`/api/firms/area?${M1_AREA}`);
    expect(r.status).toBe(200);
    expect(r.body.state).toBe('HISTORICAL');
    expect(r.body.source).toBe('NASA FIRMS');
    expect(r.body.requestedDate).toBe('2026-11-16');
    expect(r.body.warnings.join(' ')).toContain('not live');
  });
  it('returns 503 with a synthetic fallback hint elsewhere', async () => {
    const r = await request(app).get('/api/firms/area?west=0&south=0&east=5&north=5');
    expect(r.status).toBe(503);
    expect(r.body.fallback).toBe('synthetic');
  });
  it('reports status without exposing secrets', async () => {
    const r = await request(app).get('/api/firms/status');
    expect(r.body.keyConfigured).toBe(false);
    expect(r.body.snapshotAvailable).toBe(true);
  });
});

describe('wide mission areas (M08, M10)', () => {
  const calls: string[] = [];
  const app = createApp({ mapKey: KEY, snapshotDir: SNAP_DIR, fetchImpl: mockFetch(CSV, 200, calls) });
  const M10 = 'source=VIIRS_NOAA20_NRT&west=-17&south=6&east=15&north=14&dayRange=1';
  it('serves the exact bundled snapshot even though the box is wider than 20°, without calling FIRMS', async () => {
    const r = await request(app).get(`/api/firms/area?${M10}&date=2026-11-13`);
    expect(r.status).toBe(200);
    expect(r.body.state).toBe('HISTORICAL');
    expect(r.body.count).toBe(4661);
    expect(r.body.warnings.join(' ')).toContain('NASA FIRMS was not queried');
    expect(calls.length).toBe(0);
  });
  it('still refuses a live (undated) query wider than 20°', async () => {
    const r = await request(app).get(`/api/firms/area?${M10}`);
    expect(r.status).toBe(400);
    expect(calls.length).toBe(0);
  });
  it('still refuses a wide dated box that is not a bundled snapshot', async () => {
    const r = await request(app).get('/api/firms/area?source=VIIRS_NOAA20_NRT&west=-17&south=6&east=15&north=14&dayRange=1&date=2026-11-12');
    expect(r.status).toBe(400);
  });
});

describe('other endpoints', () => {
  const app = createApp({ mapKey: KEY, snapshotDir: SNAP_DIR, fetchImpl: mockFetch(CSV) });
  it('health, missions, config, 404', async () => {
    expect((await request(app).get('/api/health')).body.ok).toBe(true);
    const m = await request(app).get('/api/missions');
    expect(m.body.missions.length).toBe(10);
    expect((await request(app).get('/api/missions/m02-split-front')).body.code).toBe('M02');
    expect((await request(app).get('/api/missions/nope')).status).toBe(404);
    const c = await request(app).get('/api/config');
    expect(c.body.isNotional).toBe(true);
    expect((await request(app).get('/api/nope')).status).toBe(404);
    const s = await request(app).get('/api/firms/status');
    expect(JSON.stringify(s.body)).not.toContain(KEY);
  });
});
