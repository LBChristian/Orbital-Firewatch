# MISSION DATA REQUIREMENTS — NASA FIRMS / GIBS

## 1. Purpose

The campaign must be reproducible and playable offline. Use curated, fixed historical NASA FIRMS data packages for M01–M10. Keep the existing live-data path as a separate sandbox feature. Do not let live data alter campaign objectives or balance.

## 2. Current documented baseline

The repository's current `docs/DATA_PROVENANCE.md` records:

| Mission | Product | Acquisition date | Bbox (W,S,E,N) | Source rows |
|---|---|---|---|---:|
| M01 | NOAA-20 VIIRS 375 m C2 NRT | 2026-11-16 | -124.6, 38.0, -120.8, 42.2 | 85 |
| M02 | NOAA-20 VIIRS 375 m C2 NRT | 2026-11-14 | 24.0, -20.5, 35.5, -8.0 | 1512 |
| M03 | NOAA-20 VIIRS 375 m C2 NRT | 2026-11-15 | 146.0, -35.6, 150.2, -31.2 | 160 |

These are the current documented snapshot facts, not guarantees that a future upstream endpoint will retain the same files. Verify the actual repository manifest and snapshot hashes before modifying them.

## 3. Candidate data search for M04–M10

Candidate areas from the mission designs:

| Mission | Candidate region | Data traits required |
|---|---|---|
| M04 Shadow Line | Amazon Basin, Brazil | Enough valid target groups in a compact corridor; date must support corresponding GIBS imagery or an explicitly dated fallback |
| M05 Dead Air | Borneo, Indonesia | Targets positioned so the chosen notional station geometry yields short, meaningful contact windows |
| M06 Polar Watch | Alaska/Yukon | Valid observations across latitude bands, including targets near the designed reach boundary |
| M07 Signal Triage | Mainland Southeast Asia | Mixed confidence categories, sufficient groups and useful FRP/time distribution |
| M08 Second Look | Central Australia | Enough targets to distribute across two or more distinct passes |
| M09 Hard Limits | East African corridor | Moderate target density suitable for constrained but achievable objectives |
| M10 Final Firewatch | Multi-zone corridor selected after data audit | Multiple zones with enough valid targets for staged multi-pass objectives |

These are hypotheses. Do not commit dates or exact objective counts until validated. If a candidate does not work, choose another region/date and update all design documents.

## 4. Source and retrieval rules

- Use the actual NASA FIRMS product supported by the existing integration, e.g. `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT` or `VIIRS_SNPP_NRT`, only when the chosen source/product and requested date are valid.
- Preserve the original raw CSV rows and original headers. Do not manually edit coordinates, FRP, confidence, acquisition date/time, satellite or instrument fields.
- Store exact source URL, product identifier, retrieval timestamp in UTC, acquisition date(s), bbox, row count, file checksum and extraction script/version.
- Store the raw snapshot plus a manifest. If a filtered mission snapshot is derived, preserve the raw source file or reproducible source reference and extraction script.
- Keep the API key on the server. Never include MAP_KEY in generated docs, manifest, logs, browser bundle or client requests.
- Do not treat synthetic training data as NASA data. The source label must remain `SYNTHETIC GENERATOR (NOT NASA DATA)`.

## 5. Required manifest schema

Use the current repository schema where possible; extend additively. Each mission data package should record at least:

```json
{
  "missionId": "m04-shadow-line",
  "source": "NASA FIRMS",
  "product": "VIIRS_NOAA20_NRT",
  "productDescription": "Exact official product description",
  "sourceUrl": "Exact retrieval URL with secrets redacted",
  "retrievedAtUtc": "ISO-8601 timestamp",
  "acquisitionDates": ["YYYY-MM-DD"],
  "bbox": {"west": 0, "south": 0, "east": 0, "north": 0},
  "rawFile": "relative/path/to/raw.csv",
  "rawSha256": "sha256 hex digest",
  "sourceRowCount": 0,
  "selectedRowCount": 0,
  "normalizedCount": 0,
  "rejectedCount": 0,
  "duplicateCount": 0,
  "confidenceDistribution": {"low": 0, "nominal": 0, "high": 0, "unknown": 0},
  "targetGroupCount": 0,
  "grouping": {"algorithm": "current deterministic grouping algorithm", "radiusKm": 12},
  "imagery": {
    "provider": "NASA GIBS",
    "layer": "Exact layer identifier",
    "date": "YYYY-MM-DD or null",
    "dateMatchesAcquisition": true,
    "fallback": "none or exact fallback layer"
  },
  "notes": ["Known limitations and caveats"]
}
```

This is a proposed logical shape, not permission to break existing types. Map it to the existing manifest conventions and validate with a schema/test.

## 6. Validation pipeline

For each candidate:

1. Retrieve actual source rows from NASA FIRMS or a documented archive.
2. Verify response format, source product, acquisition date and geographic bbox.
3. Check latitude/longitude bounds, timestamps, FRP numeric validity, confidence mapping and duplicate handling using the existing normalizer.
4. Compare raw and normalized counts. Record rejects and duplicates; do not silently discard without counts.
5. Group detections using the actual engine algorithm. Confirm grouping is deterministic and does not invent records.
6. Inspect target distribution against mission zones and planned orbit geometry.
7. Confirm target counts/values are sufficient for primary and secondary objectives.
8. Run `npm run balance` or the relevant mission simulation across recommended and alternate designs.
9. Store the immutable fixed snapshot and manifest in the existing static-data convention.
10. Add tests for manifest schema, snapshot parsing, target counts, confidence distribution and objective feasibility.

## 7. GIBS imagery alignment

- Query the actual WMTS capabilities and verify layer identifiers, tile matrix, projection and date availability.
- Prefer imagery on the FIRMS acquisition date when available and suitable.
- If exact-date imagery is unavailable, use a clearly labelled fallback. Display the layer name and imagery date in the map legend/credits.
- Never imply a static basemap shows the exact conditions at the FIRMS acquisition time when it does not.
- Keep imagery and detections as separate layers with independent dates/metadata.

## 8. Live data and fixed campaign separation

- Fixed campaign: bundled immutable historical snapshots; deterministic objective counts and balance.
- Live sandbox: optional current FIRMS query; objective counts adapt to the actual feed or the sandbox offers an open-ended score challenge. Never reuse fixed-campaign thresholds without checking feasibility.
- Cached feed: label CACHED and show age/retrieval time.
- Historical feed: label HISTORICAL and show acquisition date and retrieval timestamp.
- Synthetic demo: label SYNTHETIC DEMO prominently and never attribute to NASA.

## 9. Interpretation and disclaimers

FIRMS observations are thermal-anomaly/active-fire detections, not perimeters or ground-truth incident boundaries. Confidence is a categorical quality flag. FRP is a radiative measurement. GAME PRIORITY is a game scoring construct. None is a fire severity, danger, threat or emergency-response recommendation. The game is educational and must not be used to protect life or property.

## 10. Release gate

Do not mark M04–M10 content complete until each mission has a verified source package, manifest, immutable snapshot, balance report and automated tests. If a data package cannot be obtained or verified, mark the mission blocked and report the evidence. Never fill the gap with invented NASA-looking rows.
