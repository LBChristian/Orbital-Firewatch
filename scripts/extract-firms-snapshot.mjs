#!/usr/bin/env node
/**
 * Extract a bundled FIRMS snapshot for each mission region from a FIRMS CSV file.
 *
 * Rows are copied VERBATIM (original CSV line text, original header). Nothing is
 * modified, re-rounded, or invented. Selection is only by bounding box and acq_date.
 *
 * Usage:
 *   node scripts/extract-firms-snapshot.mjs <path-to-firms.csv> <sourceUrl> <retrievedAtUtc>
 *
 * The source file used for the bundled snapshot was the public (no MAP_KEY) FIRMS
 * NOAA-20 VIIRS 7-day global CSV. See docs/DATA_PROVENANCE.md.
 */
import fs from 'node:fs';
import path from 'node:path';

const [, , file, sourceUrl, retrievedAtUtc] = process.argv;
if (!file || !sourceUrl || !retrievedAtUtc) {
  console.error('usage: extract-firms-snapshot.mjs <csv> <sourceUrl> <retrievedAtUtc>');
  process.exit(1);
}

/** Must stay in sync with packages/simulation/src/missions/missions.ts */
const REGIONS = [
  { id: 'm01-first-pass', name: 'Northern California', west: -124.6, south: 38.0, east: -120.8, north: 42.2, date: '2026-11-16' },
  { id: 'm02-split-front', name: 'Zambezi Fronts (Zambia / Zimbabwe / Malawi / Mozambique)', west: 24.0, south: -20.5, east: 35.5, north: -8.0, date: '2026-11-14' },
  { id: 'm03-data-bottleneck', name: 'Central New South Wales', west: 146.0, south: -35.6, east: 150.2, north: -31.2, date: '2026-11-15' },
];

const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trim();
const lines = text.split('\n');
const header = lines[0];
const cols = header.split(',');
const iLat = cols.indexOf('latitude');
const iLon = cols.indexOf('longitude');
const iDate = cols.indexOf('acq_date');
if (iLat < 0 || iLon < 0 || iDate < 0) throw new Error('unexpected header: ' + header);

const outDir = path.resolve('apps/web/public/data/firms');
fs.mkdirSync(outDir, { recursive: true });
const manifest = {
  description:
    'Bundled NASA FIRMS VIIRS NOAA-20 snapshot rows for ORBITAL FIREWATCH missions. Rows are verbatim copies of the source CSV, selected only by bounding box and acquisition date. Not modified.',
  provider: 'NASA FIRMS (LANCE)',
  product: 'VIIRS_NOAA20_NRT',
  productDescription: 'VIIRS 375 m active fire / thermal anomaly product (NOAA-20), Collection 2 NRT',
  sourceUrl,
  retrievedAtUtc,
  usageNotes:
    'NASA FIRMS data are openly shared. Active-fire/thermal-anomaly detections have limitations (e.g. cloud obscuration, non-fire hot sources) and must not be used for the preservation of life or property. Attribution: NASA FIRMS / LANCE. Not affiliated with or endorsed by NASA.',
  snapshots: [],
};

for (const r of REGIONS) {
  const rows = lines.slice(1).filter((l) => {
    const c = l.split(',');
    const lat = Number(c[iLat]);
    const lon = Number(c[iLon]);
    return c[iDate] === r.date && lat >= r.south && lat <= r.north && lon >= r.west && lon <= r.east;
  });
  const fileName = `${r.id}_${r.date}.csv`;
  fs.writeFileSync(path.join(outDir, fileName), [header, ...rows].join('\n') + '\n');
  manifest.snapshots.push({
    missionId: r.id,
    regionName: r.name,
    area: { west: r.west, south: r.south, east: r.east, north: r.north },
    acquisitionDate: r.date,
    dayRange: 1,
    file: `data/firms/${fileName}`,
    rowCount: rows.length,
  });
  console.log(`${fileName}: ${rows.length} rows`);
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('manifest written');
