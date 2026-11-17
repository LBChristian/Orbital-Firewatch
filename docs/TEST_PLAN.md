# Test Plan and Results

Results recorded on 2026-11-18 with Node 26.13.0, npm 11.20.0, TypeScript 7.0.2, Vitest 5.1.0.

## Automated

| Command | Result |
|---|---|
| `npm run typecheck` | Pass (exit 0) |
| `npm run test` | **51 passed / 51** (3 files) |
| `npm run build` | Pass. Web built by Vite; API bundled to `apps/api/dist/server.js` (38 kB) |
| Secret scan of `apps/web/dist` | No `FIRMS_MAP_KEY` or key values; the web bundle never references the FIRMS Area API |

### `packages/simulation/tests/simulation.test.ts` (25 tests)

Coverage by area:

- **Orbit:**
  - orbital periods (400 km, 550 km, GEO)
  - orbital speed
  - haversine known values
  - insertion solve hits the aim point for 3 inclinations × 2 branches
  - unreachable latitude is refused
  - continuous ground track across the antimeridian, with segment splitting
- **FIRMS:**
  - real snapshot normalisation keeps raw values
  - malformed, out-of-range, duplicate and bad-time rows are rejected; confidence mapping
  - empty response
  - deterministic clustering that never invents detections
- **Design:** mass, structure, budget, launch-orbit and inclination failures; mass and cost sums.
- **Coverage:** great-circle eligibility is deterministic; a narrower swath gives fewer eligible targets.
- **Resources:**
  - capture energy equals captures × Wh
  - battery stays within bounds
  - storage never exceeds capacity, and M03 overflows
  - downlink ≤ rate × contact time and ≤ rate × active time
  - radio energy equals W × active time
  - an out-of-reach manual capture costs nothing
- **Determinism:**
  - pausing (zero steps) freezes state
  - speed (1 vs 37 steps per frame vs run-to-end) gives identical events and score
  - command-log replay gives identical events and score
  - "next event" never skips a target window
  - the debrief reconciles with the event log
- **Campaign:**
  - M01 succeeds with the recommended design
  - M02: recommended fails, wide swath between the fronts succeeds
  - M03: recommended fails with storage or radio notes, a faster radio succeeds

### `packages/simulation/tests/references.test.ts` (2 tests)

- Every design-bay choice cites a Challenge 13 listed source with a page number and a game note.
- CML 1–9 are defined in order, and the campaign climbs CML 2, 3, 4.

### `apps/api/tests/api.test.ts` (24 tests)

- URL construction: W,S,E,N order and the date form; redacted URL.
- Validation: 9 bad queries rejected (bbox order, span, dayRange 0/6, unknown source, bad or future date, non-numeric).
- Live path: a LIVE envelope without key leakage, then CACHED with age; a dated request is HISTORICAL; empty response.
- Errors: invalid key, rate limit, 5xx, malformed body and timeout each map to the right status with a synthetic hint.
- Fallbacks: upstream failure falls back to the HISTORICAL snapshot; a stale cache is served as CACHED.
- No key: snapshot served as HISTORICAL; 503 outside mission areas; status does not leak secrets.
- Health, missions, config and 404 endpoints.

## Manual browser checks (Claude in-app browser, Vite dev server)

| Check | Result |
|---|---|
| Title → briefing → design → plan → deploy → operations → debrief for M01 | Pass. Score 93 / S, identical to the headless balance run |
| M02 with recommended design: planner shows 1/14 reachable | Pass |
| M02 with Wide Swath: debrief 79 / B, objective met, identical to the balance run | Pass |
| Design validation: heavy loadout fails mass and structure; continue is blocked | Pass |
| Real GIBS imagery behind detections; imagery toggle; credits show layer and date | Pass (M01 switched to MODIS Terra after NOAA-20 tiles were found empty) |
| Settings: reduced-motion class applied; volume controls present | Pass |
| 375 px wide title screen: no horizontal scroll | Pass |
| Console errors during a clean M02 run | None after fixes (map-removal guards) |
| CML track on briefing (M02 = CML 3), 10 cited notes in the design bay, CML feedback-loop note on a failed debrief; no console errors | Pass |
| Production server: `/`, deep link, `/api/health`, snapshot, textures served; oversized bbox gives 400 | Pass |

Defects found and fixed during testing:

- The deploy screen hung under React StrictMode.
- "Next event" skipped target windows and station hand-overs.
- The Leaflet map was mis-sized after layout.
- Leaflet callbacks ran after the map was removed.
- A design loadout was updated from stale closure state.
- The 3D camera was too close.
- The coach tip overlapped the legend.

## Not covered

- The live FIRMS service with a real MAP_KEY.
- The WebGL-unavailable fallback on a real device.
- Playwright end-to-end tests.
- Audio output was not listened to; generation code paths only.
- Full M03 playthrough in the browser. It is covered by the engine tests, and the browser runs the same engine.
