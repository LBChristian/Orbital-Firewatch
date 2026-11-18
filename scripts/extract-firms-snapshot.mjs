#!/usr/bin/env node
/**
 * Build the bundled FIRMS mission snapshots and their manifest.
 *
 * Rows are copied VERBATIM (original CSV line text, original header). Nothing is
 * modified, re-rounded, or invented. Selection is only by bounding box and acq_date.
 *
 * Usage:
 *   node scripts/extract-firms-snapshot.mjs <firms.csv> <sourceUrl> <retrievedAtUtc> <missionId>[,<missionId>...]
 *   node scripts/extract-firms-snapshot.mjs --refresh
 *
 * Only the listed missions are (re)written. Other manifest entries keep their source
 * provenance. Every run recomputes hashes and counts from the snapshot files themselves.
 * `--refresh` only recomputes those, without extracting anything.
 *
 * Sources used so far (see docs/DATA_PROVENANCE.md):
 *   M01-M03: public FIRMS NOAA-20 VIIRS 7-day global CSV retrieved 2026-11-17 (raw file not kept)
 *   M04-M10: the same public file retrieved 2026-11-18, kept locally in data-raw/ (git-ignored)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PRODUCT = 'VIIRS_NOAA20_NRT';

/** Must stay in sync with packages/simulation/src/config/missions.ts */
const REGIONS = [
  { id: 'm01-first-pass', name: 'Northern California', west: -124.6, south: 38.0, east: -120.8, north: 42.2, date: '2026-11-16', imagery: { layerId: 'MODIS_Terra_CorrectedReflectance_TrueColor', date: '2026-11-16' } },
  { id: 'm02-split-front', name: 'Zambezi Fronts (Zambia / Zimbabwe / Malawi / Mozambique)', west: 24.0, south: -20.5, east: 35.5, north: -8.0, date: '2026-11-14', imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', date: '2026-11-14' } },
  { id: 'm03-data-bottleneck', name: 'Central New South Wales', west: 146.0, south: -35.6, east: 150.2, north: -31.2, date: '2026-11-15', imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', date: '2026-11-15' } },
  { id: 'm04-shadow-line', name: 'Maranhão and Tocantins, Brazil (eastern Amazon / Cerrado edge)', west: -50.0, south: -10.0, east: -44.0, north: -3.0, date: '2026-11-14', imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', date: '2026-11-14' } },
  { id: 'm05-dead-air', name: 'Borneo (Indonesia / Malaysia / Brunei)', west: 108.0, south: -4.5, east: 119.0, north: 7.5, date: '2026-11-15', imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', date: '2026-11-15' } },
  { id: 'm06-polar-watch', name: 'West Siberian Plain, Russia', west: 64.0, south: 58.0, east: 84.0, north: 68.0, date: '2026-11-16', imagery: { layerId: 'MODIS_Terra_CorrectedReflectance_TrueColor', date: '2026-11-16' } },
  { id: 'm07-signal-triage', name: 'Mainland Southeast Asia', west: 97.0, south: 10.0, east: 109.0, north: 23.0, date: '2026-11-16', imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', date: '2026-11-16' } },
  { id: 'm08-second-look', name: 'Northern and central Australia', west: 121.0, south: -28.0, east: 146.0, north: -15.0, date: '2026-11-16', imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', date: '2026-11-16' } },
  { id: 'm09-hard-limits', name: 'Tanzania and southern Kenya', west: 29.0, south: -10.0, east: 41.0, north: 0.0, date: '2026-11-15', imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', date: '2026-11-15' } },
  { id: 'm10-final-firewatch', name: 'West African Sudanian and Sahel belt', west: -17.0, south: 6.0, east: 15.0, north: 14.0, date: '2026-11-13', imagery: { layerId: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', date: '2026-11-13' } },
];

const outDir = path.resolve('apps/web/public/data/firms');
const manifestPath = path.join(outDir, 'manifest.json');
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const readLines = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trim().split('\n');

function columns(header) {
  const cols = header.split(',');
  const idx = Object.fromEntries(['latitude', 'longitude', 'acq_date', 'acq_time', 'confidence', 'daynight'].map((c) => [c, cols.indexOf(c)]));
  if (Object.values(idx).some((i) => i < 0)) throw new Error('unexpected header: ' + header);
  return idx;
}

/** Counts derived from the snapshot file itself (never from the source file). */
function fileStats(relFile) {
  const abs = path.join(outDir, path.basename(relFile));
  const lines = readLines(abs);
  const ix = columns(lines[0]);
  const confidence = {};
  const dayNight = {};
  let first = null;
  let last = null;
  for (const l of lines.slice(1)) {
    const c = l.split(',');
    confidence[c[ix.confidence]] = (confidence[c[ix.confidence]] ?? 0) + 1;
    dayNight[c[ix.daynight]] = (dayNight[c[ix.daynight]] ?? 0) + 1;
    const t = `${c[ix.acq_date]}T${c[ix.acq_time].padStart(4, '0').slice(0, 2)}:${c[ix.acq_time].padStart(4, '0').slice(2)}Z`;
    if (!first || t < first) first = t;
    if (!last || t > last) last = t;
  }
  return {
    rowCount: lines.length - 1,
    fileSha256: sha256(fs.readFileSync(abs)),
    confidenceDistribution: confidence,
    dayNightDistribution: dayNight,
    acquisitionTimeRangeUtc: first ? [first, last] : null,
  };
}

const old = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { snapshots: [] };
const byId = new Map(old.snapshots.map((s) => [s.missionId, s]));

const args = process.argv.slice(2);
if (args[0] !== '--refresh') {
  const [file, sourceUrl, retrievedAtUtc, ids] = args;
  if (!file || !sourceUrl || !retrievedAtUtc || !ids) {
    console.error('usage: extract-firms-snapshot.mjs <csv> <sourceUrl> <retrievedAtUtc> <missionId,...> | --refresh');
    process.exit(1);
  }
  const lines = readLines(file);
  const header = lines[0];
  const ix = columns(header);
  const sourceSha256 = sha256(fs.readFileSync(file));
  for (const id of ids.split(',')) {
    const r = REGIONS.find((x) => x.id === id);
    if (!r) throw new Error('unknown mission ' + id);
    const rows = lines.slice(1).filter((l) => {
      const c = l.split(',');
      const lat = Number(c[ix.latitude]);
      const lon = Number(c[ix.longitude]);
      return c[ix.acq_date] === r.date && lat >= r.south && lat <= r.north && lon >= r.west && lon <= r.east;
    });
    const fileName = `${r.id}_${r.date}.csv`;
    fs.writeFileSync(path.join(outDir, fileName), [header, ...rows].join('\n') + '\n');
    byId.set(r.id, {
      missionId: r.id,
      file: `data/firms/${fileName}`,
      sourceUrl,
      retrievedAtUtc,
      sourceFile: path.basename(file),
      sourceSha256,
    });
    console.log(`${fileName}: ${rows.length} rows`);
  }
}

const snapshots = [];
for (const r of REGIONS) {
  const prev = byId.get(r.id);
  if (!prev) continue;
  snapshots.push({
    missionId: r.id,
    regionName: r.name,
    product: PRODUCT,
    area: { west: r.west, south: r.south, east: r.east, north: r.north },
    acquisitionDate: r.date,
    dayRange: 1,
    file: prev.file,
    // Older entries carried their source at the top level of the manifest.
    sourceUrl: prev.sourceUrl ?? old.sourceUrl,
    retrievedAtUtc: prev.retrievedAtUtc ?? old.retrievedAtUtc,
    sourceFile: prev.sourceFile ?? 'J1_VIIRS_C2_Global_7d.csv',
    sourceSha256: prev.sourceSha256 ?? null,
    selection: 'Rows with acq_date equal to acquisitionDate and latitude/longitude inside area (inclusive). Copied verbatim.',
    ...fileStats(prev.file),
    imagery: { provider: 'NASA GIBS', ...r.imagery, dateMatchesAcquisition: r.imagery.date === r.date },
  });
}

const manifest = {
  schemaVersion: 2,
  description:
    'Bundled NASA FIRMS VIIRS NOAA-20 snapshot rows for ORBITAL FIREWATCH missions. Rows are verbatim copies of the source CSV, selected only by bounding box and acquisition date. Not modified.',
  provider: 'NASA FIRMS (LANCE)',
  product: PRODUCT,
  productDescription: 'VIIRS 375 m active fire / thermal anomaly product (NOAA-20), Collection 2 NRT',
  usageNotes:
    'NASA FIRMS data are openly shared. Active-fire/thermal-anomaly detections have limitations (e.g. cloud obscuration, non-fire hot sources) and must not be used for the preservation of life or property. Attribution: NASA FIRMS / LANCE. Not affiliated with or endorsed by NASA.',
  snapshots,
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest written (${snapshots.length} snapshots)`);
