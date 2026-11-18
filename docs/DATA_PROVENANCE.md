# Data Provenance

## NASA FIRMS (target locations)

**Bundled snapshot** (`apps/web/public/data/firms/`):

- Source: public NASA FIRMS NOAA-20 VIIRS 375 m Collection 2 NRT 7-day global CSV, https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_7d.csv. No MAP_KEY is needed for this file. It only ever holds the last 7 days, so each batch was taken from a different download:
  - M01–M03: retrieved 2026-11-17T17:11:12Z. The raw download was not kept, so these entries record `sourceSha256: null`.
  - M04–M10: retrieved 2026-11-18T19:58:51Z (346,240 rows, acq_date 2026-11-11 to 2026-11-18). SHA-256 `885db08a9ef336c06a6f8115b38c6d3b6f480b2815dc252f5875f8cb6be507db`. The raw file is kept locally in `data-raw/` (git-ignored, 28 MB).
- Extraction: `scripts/extract-firms-snapshot.mjs <csv> <url> <retrievedAt> <missionIds>`. Rows are copied verbatim with the original header, selected only by mission bounding box and `acq_date`. Nothing is modified, rounded or invented. Only the listed missions are rewritten, so later batches never touch earlier files.
- Manifest (schema v2): for each snapshot, the source URL, retrieval time, source file name and hash, the snapshot file's own SHA-256, row count, confidence and day/night counts, acquisition time range, and the GIBS imagery layer and date.
- `.gitattributes` marks the CSVs `-text` so Windows line-ending conversion cannot change their bytes.
- `packages/simulation/tests/snapshots.test.ts` checks each file against the manifest. It checks the hash, header and row count, that every row matches the selection rule, that the normaliser accounts for every row with zero rejects, the confidence counts, and that grouping is deterministic and never invents detections. Where `data-raw/` exists, it also re-extracts every M04–M10 snapshot from the raw file and compares them byte for byte.

| File | Area (W, S, E, N) | acq_date | Rows | Confidence (low / nominal / high) |
|---|---|---|---|---|
| m01-first-pass_2026-11-16.csv | −124.6, 38.0, −120.8, 42.2 | 2026-11-16 | 85 | 0 / 85 / 0 |
| m02-split-front_2026-11-14.csv | 24.0, −20.5, 35.5, −8.0 | 2026-11-14 | 1512 | 504 / 994 / 14 |
| m03-data-bottleneck_2026-11-15.csv | 146.0, −35.6, 150.2, −31.2 | 2026-11-15 | 160 | 56 / 104 / 0 |
| m04-shadow-line_2026-11-14.csv | −50.0, −10.0, −44.0, −3.0 | 2026-11-14 | 751 | 25 / 723 / 3 |
| m05-dead-air_2026-11-15.csv | 108.0, −4.5, 119.0, 7.5 | 2026-11-15 | 159 | 3 / 138 / 18 |
| m06-polar-watch_2026-11-16.csv | 64.0, 58.0, 84.0, 68.0 | 2026-11-16 | 150 | 1 / 149 / 0 |
| m07-signal-triage_2026-11-16.csv | 97.0, 10.0, 109.0, 23.0 | 2026-11-16 | 299 | 8 / 289 / 2 |
| m08-second-look_2026-11-16.csv | 121.0, −28.0, 146.0, −15.0 | 2026-11-16 | 3280 | 194 / 2900 / 186 |
| m09-hard-limits_2026-11-15.csv | 29.0, −10.0, 41.0, 0.0 | 2026-11-15 | 367 | 27 / 339 / 1 |
| m10-final-firewatch_2026-11-13.csv | −17.0, 6.0, 15.0, 14.0 | 2026-11-13 | 4661 | 882 / 3611 / 168 |

### How the M04–M10 regions were chosen

The Update 1 mission specs named candidate regions. Each candidate was checked against the 2026-11-18 download before anything was fixed:

| Mission | Candidate in spec | Result | Chosen |
|---|---|---|---|
| M04 Shadow Line | Amazon Basin | Pará and Mato Grosso were thin on most dates; Maranhão–Tocantins had 725–751 rows on 13–14 Nov | Maranhão–Tocantins, 14 Nov |
| M05 Dead Air | Borneo | 120–536 rows a day | Borneo, 15 Nov (the only date with all three confidence classes) |
| M06 Polar Watch | Alaska / Yukon | **1 detection a day** in the whole window. Not usable | West Siberian Plain, 16 Nov (39 groups at 60.6–66.7° N) |
| M07 Signal Triage | Mainland SE Asia | Only 16 Nov has low, nominal and high rows together | Mainland SE Asia, 16 Nov |
| M08 Second Look | Central Australia | Central Australia alone spans too little longitude for two consecutive orbits | Widened to northern and central Australia (121–146° E), 16 Nov |
| M09 Hard Limits | East African corridor | South Sudan / Ethiopia had 4,400–12,000 rows a day, far denser than "moderate" | Tanzania and southern Kenya, 15 Nov |
| M10 Final Firewatch | Multi-zone, to be chosen | West Africa has several separate fire belts across 30° of longitude | West African Sudanian and Sahel belt, 13 Nov |

**M06 caveat.** In mid-November almost every FIRMS detection above 58° N is in the West Siberian oil and gas region or northern Alberta. Many are likely persistent industrial heat sources such as gas flares rather than vegetation fires. The CSV has no field that tells them apart, so the game must not call them fires. The M06 briefing has to say this plainly. It is also a fair teaching point: a thermal anomaly is not always a fire.

Notes on this file's format: it has no `instrument` column, so the game derives "VIIRS" from the product and labels it as derived. Confidence is spelled out (`low` / `nominal` / `high`); the normaliser also accepts `l` / `n` / `h` and numeric MODIS values.

**Live API** (optional): `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{W},{S},{E},{N}/{DAY_RANGE}[/{DATE}]`. This was implemented and tested against mocked responses (success, empty, malformed, invalid key, rate limit, 5xx, timeout). **It has not been exercised against the real service, because no MAP_KEY was available during the build.** The key lives only in server env; responses expose a redacted URL.

**Normalised record**: id = `{product}-{date}{time}-{fnv1a(lat,lon,date,time,satellite)}`. The raw columns are kept in `raw`. Invalid rows are rejected and counted, and duplicates are removed.

**States**:
- LIVE: fetched this session.
- CACHED: an earlier response reused, with age shown.
- HISTORICAL: a fixed past date (the bundled snapshot, or a live request with a date).
- SYNTHETIC DEMO: the seeded generator, product `SYNTHETIC_TRAINING`, source `SYNTHETIC GENERATOR (NOT NASA DATA)`. `relabelEnvelope` throws if anyone tries to relabel synthetic data as NASA data.

## NASA GIBS (imagery)

Layers were verified against `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml` on 2026-11-18:

- `MODIS_Terra_CorrectedReflectance_TrueColor` (GoogleMapsCompatible_Level9, jpg), 2026-11-16, for M01. NOAA-20 tiles over California were almost empty on that date (196–3108 byte tiles), so Terra was chosen.
- `VIIRS_NOAA20_CorrectedReflectance_TrueColor`, 2026-11-14 for M02 and 2026-11-15 for M03. Both returned full tiles.
- M04–M10 (checked 2026-11-18 by fetching five zoom-6 tiles across each mission area on its acquisition date, for NOAA-20, SNPP, Terra and Aqua):
  - `VIIRS_SNPP_CorrectedReflectance_TrueColor` returned 404 everywhere and is not used.
  - NOAA-20 returned full tiles (13–28 kB) for M04, M05, M07, M08, M09 and M10. It is used on the acquisition date for all six. Two M10 tiles were smaller (8–11 kB) and may include swath gaps; this is to be checked in the browser.
  - M06: NOAA-20 tiles were mostly blank (1,665 bytes) at 58–68° N in November. MODIS Terra returned real imagery (5–13 kB, snow and cloud on inspection), so M06 uses Terra on 16 Nov.
- Every mission's imagery date equals its FIRMS acquisition date. The manifest records this as `dateMatchesAcquisition`.
- Fallbacks: `BlueMarble_ShadedRelief_Bathymetry` (Level8, static), then a neutral grid background.
- Overlay: `Reference_Features_15m` (Level13, png).
- 3D textures: WMS GetMap (EPSG:4326, 2048×1024) of `BlueMarble_NextGeneration` and `VIIRS_Black_Marble` (2016-01-01), saved to `apps/web/public/textures/`.

The map corner always shows the layer name and date.

## Simulated (fictional) data

Player satellite, orbit, swath, captures, packets, ground stations, target groups, GAME PRIORITY and score. These are always drawn in cyan or green simulation styles with SIMULATED / NOTIONAL labels.
