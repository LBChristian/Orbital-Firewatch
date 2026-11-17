# Data Provenance

## NASA FIRMS (target locations)

**Bundled snapshot** (`apps/web/public/data/firms/`):

- Source: public NASA FIRMS NOAA-20 VIIRS 375 m Collection 2 NRT 7-day global CSV, https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_7d.csv. No MAP_KEY is needed for this file.
- Retrieved: 2026-11-17T17:11:12Z.
- Extraction: `scripts/extract-firms-snapshot.mjs`. Rows are copied verbatim with the original header, selected only by mission bounding box and `acq_date`. Nothing is modified, rounded or invented. `manifest.json` records the product, source URL, retrieval time, area, date and row count.

| File | Area (W, S, E, N) | acq_date | Rows |
|---|---|---|---|
| m01-first-pass_2026-11-16.csv | −124.6, 38.0, −120.8, 42.2 | 2026-11-16 | 85 |
| m02-split-front_2026-11-14.csv | 24.0, −20.5, 35.5, −8.0 | 2026-11-14 | 1512 |
| m03-data-bottleneck_2026-11-15.csv | 146.0, −35.6, 150.2, −31.2 | 2026-11-15 | 160 |

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
- Fallbacks: `BlueMarble_ShadedRelief_Bathymetry` (Level8, static), then a neutral grid background.
- Overlay: `Reference_Features_15m` (Level13, png).
- 3D textures: WMS GetMap (EPSG:4326, 2048×1024) of `BlueMarble_NextGeneration` and `VIIRS_Black_Marble` (2016-01-01), saved to `apps/web/public/textures/`.

The map corner always shows the layer name and date.

## Simulated (fictional) data

Player satellite, orbit, swath, captures, packets, ground stations, target groups, GAME PRIORITY and score. These are always drawn in cyan or green simulation styles with SIMULATED / NOTIONAL labels.
