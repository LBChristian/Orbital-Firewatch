import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MISSIONS, buildTargetGroups, normalizeFirmsRecords, parseCsv } from '../src/index';

/**
 * Checks the bundled FIRMS mission snapshots against their manifest. These are the data
 * gates for the campaign: every file must be byte-identical to what the manifest records,
 * rows must match the selection rule, and the normaliser must account for every row.
 */

const ROOT = path.resolve(__dirname, '../../..');
const DATA = path.join(ROOT, 'apps/web/public');
const manifest = JSON.parse(fs.readFileSync(path.join(DATA, 'data/firms/manifest.json'), 'utf8'));
const FIRMS_HEADER = 'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight';
const CAMPAIGN = [
  'm01-first-pass',
  'm02-split-front',
  'm03-data-bottleneck',
  'm04-shadow-line',
  'm05-dead-air',
  'm06-polar-watch',
  'm07-signal-triage',
  'm08-second-look',
  'm09-hard-limits',
  'm10-final-firewatch',
];

interface Entry {
  missionId: string;
  area: { west: number; south: number; east: number; north: number };
  acquisitionDate: string;
  file: string;
  rowCount: number;
  sourceUrl: string;
  retrievedAtUtc: string;
  sourceFile: string;
  sourceSha256: string | null;
  fileSha256: string;
  confidenceDistribution: Record<string, number>;
  imagery: { provider: string; layerId: string; date: string; dateMatchesAcquisition: boolean };
}
const entries: Entry[] = manifest.snapshots;
const text = (e: Entry) => fs.readFileSync(path.join(DATA, e.file), 'utf8');
const load = (e: Entry) => normalizeFirmsRecords(parseCsv(text(e)), manifest.product, 'HISTORICAL');
const groupsFor = (e: Entry) => buildTargetGroups(load(e).detections, { clusterRadiusKm: 12, maxTargets: 10_000 });

describe('bundled FIRMS snapshot manifest', () => {
  it('lists one snapshot per campaign mission, schema v2', () => {
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.product).toBe('VIIRS_NOAA20_NRT');
    expect(entries.map((e) => e.missionId)).toEqual(CAMPAIGN);
  });

  it('records source provenance without secrets', () => {
    for (const e of entries) {
      expect(e.sourceUrl, e.missionId).toMatch(/^https:\/\/firms\.modaps\.eosdis\.nasa\.gov\//);
      expect(e.sourceUrl).not.toMatch(/MAP_KEY|api\/area/i);
      expect(Number.isNaN(Date.parse(e.retrievedAtUtc)), e.missionId).toBe(false);
      expect(Date.parse(e.retrievedAtUtc)).toBeGreaterThan(Date.parse(e.acquisitionDate));
      if (e.sourceSha256 !== null) expect(e.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
    }
    // The raw source of M04-M10 is hashed; M01-M03 predate that and record null.
    expect(entries.filter((e) => e.sourceSha256 === null).map((e) => e.missionId)).toEqual(CAMPAIGN.slice(0, 3));
  });

  it('records imagery separately from the observations', () => {
    for (const e of entries) {
      expect(e.imagery.provider).toBe('NASA GIBS');
      expect(e.imagery.layerId).toMatch(/_CorrectedReflectance_TrueColor$/);
      expect(e.imagery.dateMatchesAcquisition).toBe(e.imagery.date === e.acquisitionDate);
    }
  });

  it('agrees with the mission config for every mission defined so far', () => {
    for (const m of MISSIONS) {
      const e = entries.find((x) => x.missionId === m.id)!;
      expect(e, m.id).toBeDefined();
      expect(m.firms.snapshotFile).toBe(e.file);
      expect(m.firms.date).toBe(e.acquisitionDate);
      expect(m.bbox).toEqual(e.area);
      expect(m.imagery.layerId).toBe(e.imagery.layerId);
      expect(m.imagery.date).toBe(e.imagery.date);
    }
  });
});

describe.each(entries.map((e) => [e.missionId, e] as const))('snapshot %s', (_id, e) => {
  it('is byte-identical to the manifest hash and row count', () => {
    const buf = fs.readFileSync(path.join(DATA, e.file));
    expect(crypto.createHash('sha256').update(buf).digest('hex')).toBe(e.fileSha256);
    const lines = buf.toString('utf8').trim().split('\n');
    expect(lines[0]).toBe(FIRMS_HEADER);
    expect(lines.length - 1).toBe(e.rowCount);
  });

  it('only contains rows matching the selection rule', () => {
    for (const d of load(e).detections) {
      expect(d.acqDate).toBe(e.acquisitionDate);
      expect(d.latitude).toBeGreaterThanOrEqual(e.area.south);
      expect(d.latitude).toBeLessThanOrEqual(e.area.north);
      expect(d.longitude).toBeGreaterThanOrEqual(e.area.west);
      expect(d.longitude).toBeLessThanOrEqual(e.area.east);
    }
  });

  it('normalises every row and matches the confidence distribution', () => {
    const { detections, rejected } = load(e);
    expect(rejected).toBe(0);
    expect(detections.length).toBe(e.rowCount);
    const conf: Record<string, number> = {};
    for (const d of detections) conf[d.confidence] = (conf[d.confidence] ?? 0) + 1;
    expect(conf).toEqual(e.confidenceDistribution);
  });

  it('groups deterministically without inventing detections', () => {
    const a = groupsFor(e);
    const b = groupsFor(e);
    expect(a.map((g) => [g.id, g.members.length])).toEqual(b.map((g) => [g.id, g.members.length]));
    const ids = new Set(load(e).detections.map((d) => d.id));
    const members = a.flatMap((g) => g.members.map((d) => d.id));
    expect(new Set(members).size).toBe(members.length);
    expect(members.every((id) => ids.has(id))).toBe(true);
  });
});

describe('data traits the new missions depend on', () => {
  const byId = (id: string) => entries.find((e) => e.missionId === id)!;

  it('M06 has target groups beyond the reach of a 53° orbit', () => {
    const north = groupsFor(byId('m06-polar-watch')).filter((g) => g.lat > 60);
    expect(north.length).toBeGreaterThanOrEqual(10);
  });

  it('M07 contains all three VIIRS confidence categories', () => {
    expect(Object.keys(byId('m07-signal-triage').confidenceDistribution).sort()).toEqual(['high', 'low', 'nominal']);
  });

  it('M08 and M10 span enough longitude for consecutive-orbit passes', () => {
    for (const id of ['m08-second-look', 'm10-final-firewatch']) {
      const top = groupsFor(byId(id)).slice(0, 40);
      const lons = top.map((g) => g.lon);
      expect(Math.max(...lons) - Math.min(...lons), id).toBeGreaterThan(15);
    }
  });
});

/** Runs only where the raw upstream file is kept (data-raw/ is not committed). */
const raw = entries.find((e) => e.sourceSha256 !== null);
const rawPath = raw ? path.join(ROOT, 'data-raw', fs.existsSync(path.join(ROOT, 'data-raw')) ? (fs.readdirSync(path.join(ROOT, 'data-raw')).find((f) => f.endsWith('.csv')) ?? '') : '') : '';
describe.runIf(raw && fs.existsSync(rawPath) && fs.statSync(rawPath).isFile())('raw source file (local only)', () => {
  it('matches the recorded hash and reproduces each snapshot', () => {
    const buf = fs.readFileSync(rawPath);
    expect(crypto.createHash('sha256').update(buf).digest('hex')).toBe(raw!.sourceSha256);
    const lines = buf.toString('utf8').replace(/\r\n/g, '\n').trim().split('\n');
    for (const e of entries.filter((x) => x.sourceSha256 === raw!.sourceSha256)) {
      const rows = lines.slice(1).filter((l) => {
        const c = l.split(',');
        const lat = Number(c[0]);
        const lon = Number(c[1]);
        return c[5] === e.acquisitionDate && lat >= e.area.south && lat <= e.area.north && lon >= e.area.west && lon <= e.area.east;
      });
      expect([lines[0], ...rows].join('\n') + '\n', e.missionId).toBe(text(e));
    }
  }, 60_000);
});
