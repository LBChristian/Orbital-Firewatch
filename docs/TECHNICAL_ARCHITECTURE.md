# Technical Architecture

```
            ┌───────────────────────── apps/web (React 19 + Vite 8) ─────────────────────────┐
 Browser    │ screens (features/*) ── zustand store ── MissionRun (engine, in browser)        │
            │ Leaflet map (GIBS tiles + PixelLayer canvas + sim layers) · Three.js · Web Audio│
            └───────────────┬───────────────────────────────────────┬─────────────────────────┘
                            │ /api/*                                 │ /data/firms/* (static fallback)
            ┌───────────────▼──────────── apps/api (Express 5) ──────┴─────────────┐
 Server     │ zod validation → FirmsService (TTL cache, refresh cooldown) → provider │
            │ FIRMS_MAP_KEY from env only · snapshot fallback · rate limit          │
            └───────────────┬──────────────────────────────────────────────────────┘
                            │ HTTPS (key in path, never logged or returned)
                       NASA FIRMS Area API          NASA GIBS WMTS (direct from browser, no key)
```

## Packages

- **`packages/simulation`**: pure TypeScript with no DOM or Node APIs in `src/`. It is consumed as source by Vite and bundled into the API by esbuild.
  - `constants.ts`, `geo.ts`: Earth model, haversine, bbox helpers.
  - `orbit/orbit.ts`: circular two-body orbit, Earth rotation, insertion solve, sun direction, eclipse, station elevation.
  - `firms/`: FIRMS types, CSV parsing and normalisation, target grouping and GAME PRIORITY, synthetic generator.
  - `config/catalog.ts`, `config/missions.ts`: every balance value, region, station and scoring weight.
  - `design.ts`: derived spec and validation checks.
  - `engine/geometry.ts`: precomputes the per-step track, sunlight, station visibility, passes, contacts, target distances and windows.
  - `engine/engine.ts`: `MissionRun`, the deterministic fixed-step state machine with commands and an event log.
  - `engine/scoring.ts`: score report and Mission Analyst.
- **`apps/api`**: `createApp(opts)` (testable with injected fetch and clock), `FirmsService`, `firmsProvider`, `TtlCache`, zod schemas. `build.mjs` bundles everything into `dist/server.js`.
- **`apps/web`**: `game/state/store.ts` (screen flow, feed, loadouts, run, progress, settings), `game/data/feed.ts` (API → IndexedDB → static fallback chain), `game/audio/sfx.ts`, `features/*` screens, `three/*` 3D.

## Determinism

- Geometry is precomputed once per run from mission, design, targets and aim point.
- The engine advances in fixed `stepSeconds` (2 s). The UI only chooses how many steps to run per animation frame. Rates are 6/10/20/300 sim-s per real s at 1×, by activity, multiplied by the speed setting. Pausing runs zero steps.
- Player commands are applied at a step boundary and logged as `{step, command}`. `new MissionRun(config, commandLog)` replays identically. Tests assert identical events and scores.
- No `Math.random` or wall-clock time in the engine. The synthetic generator uses a seeded PRNG.

## API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Service status, cache entries, whether a key is configured |
| `GET /api/firms/status` | Provider, last retrieval, cache age, allowed sources, snapshot availability |
| `GET /api/firms/area?source&west&south&east&north&dayRange&date&refresh` | Validated, bounded FIRMS query. Returns a `FirmsFeedEnvelope` |
| `GET /api/missions`, `/api/missions/:id` | Mission config |
| `GET /api/config` | Notional component catalogue |

Validation rules:
- Source must be one of `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT` or `VIIRS_SNPP_NRT`.
- west < east and south < north. Each side spans at most 20°.
- dayRange is 1–5.
- date is `YYYY-MM-DD` and not in the future.
- 30 requests per client per minute; upstream timeout 15 s; refresh cooldown 60 s.

Fallback order: fresh cache (CACHED) → live FIRMS (LIVE, or HISTORICAL when a date is given) → stale cache (CACHED + warning) → bundled snapshot (HISTORICAL + warning) → error with a `fallback: "synthetic"` hint.
