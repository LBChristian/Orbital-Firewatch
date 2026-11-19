# Test Plan and Results

Results recorded on 2026-11-18 with Node 26.13.0 (test counts updated 2026-11-19 after Update 1 Stage B), npm 11.20.0, TypeScript 7.0.2, Vitest 5.1.0.

## Automated

| Command | Result |
|---|---|
| `npm run typecheck` | Pass (exit 0) |
| `npm run test` | **176 passed / 176** (7 files) |
| `npm run balance` | Runs all 10 missions plus the documented strategy table. M01–M03 output is identical to the pre-Update-1 baseline, and no documented strategy differs from its expected result |
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

### `packages/simulation/tests/snapshots.test.ts` (48 tests)

- The manifest is schema v2 and lists all 10 campaign snapshots in order.
- Source provenance: a NASA FIRMS URL with no key, a valid retrieval time after the acquisition date, and a SHA-256 of the raw source (null only for M01–M03).
- Imagery metadata is kept separate, and its date match flag is correct.
- Mission config and manifest agree on file, date, area, imagery layer and imagery date.
- For each snapshot:
  - the file SHA-256, FIRMS header and row count match;
  - every row matches the bbox and date selection;
  - zero normaliser rejects, and confidence counts match;
  - grouping is deterministic and never invents or reuses detections.
- Mission data traits: M06 has at least 10 groups above 60° N, M07 has all three confidence classes, and M08 and M10 span more than 15° of longitude.
- Local only (when `data-raw/` exists): the raw file hash matches, and every M04–M10 snapshot is re-extracted byte for byte.

### `packages/simulation/tests/campaign.test.ts` (18 tests)

- Structure: 10 missions in 3 chapters, matching the configs. Ids, codes and seeds are unique; aim points and zones lie inside each region; every station is labelled notional. M01–M03 are balanced and M04–M10 provisional.
- Every recommended design passes hard validation and builds a run. M06 with a 53° orbit fails coverage and cannot build a run.
- Unlocks: only M01 is open at start. Chapter I is sequential, Chapter II opens all at once, and Chapter III opens after Chapter II, then sequential. Free Operations opens after M10. The practice setting opens everything without changing progress.
- Recording runs: a D-grade success completes the mission and unlocks the next one. A later failure keeps the completion and the best score; commendations merge.
- Save: a new save is empty; v1 migrates; v2 round-trips and is preferred over v1. Corrupt JSON, wrong versions and bad shapes recover without throwing. Malformed entries and unknown missions are dropped and values clamped.

### `packages/simulation/tests/engine.test.ts` (17 tests, Update 1 Stage D)

- Energy:
  - the balance closes (final = initial + generated − used − curtailed + unmet), with unmet 0;
  - generation is counted in full while the battery is full, and curtailment is above 0;
  - used energy equals housekeeping + radio + captures.
- Safe mode: with a deliberately undersized battery, it enters only below 15% and exits only at or above 35%. Events alternate, and the battery stays within [0, capacity].
- Target policy: Chapter I boards contain no groups whose best confidence is low. M07 has at least 2 low groups and 1 high (all that exist), still in priority order.
- Multiple passes:
  - M08 makes 2 or more passes about one orbital period apart, with the track 20–28° further west at 20° S;
  - sunlight and contacts are computed over the whole timeline;
  - packets record their pass and stay on board across passes;
  - a multi-pass command-log replay matches events, score and commendations.
- Objective conditions: delivery counts, passes, confidence, top-priority, battery floor, no safe mode, no data lost, and "all". A met objective is lost when a battery floor breaks later (M01 with a high-detail payload and a 0.87 floor).
- Commendations: five, each with its rule; Perfect requires the other four. Science uses secondary objectives where a mission has them. Engineering matches the design checks.

### `packages/simulation/tests/balance.test.ts` (40 tests, Update 1 Stage E)

- Every M04–M10 mission is marked balanced and has at least 2 winning and 1 losing documented strategy. The recommended loadout wins with at most a planning choice.
- Each documented strategy (35 in all) passes hard design validation and produces its expected success or fail against the bundled snapshot.
- For each mission, at least one documented strategy meets every optional goal.

### `apps/api/tests/api.test.ts` (24 tests)

- URL construction: W,S,E,N order and the date form; redacted URL.
- Validation: 9 bad queries rejected (bbox order, span, dayRange 0/6, unknown source, bad or future date, non-numeric).
- Live path: a LIVE envelope without key leakage, then CACHED with age; a dated request is HISTORICAL; empty response.
- Errors: invalid key, rate limit, 5xx, malformed body and timeout each map to the right status with a synthetic hint.
- Fallbacks: upstream failure falls back to the HISTORICAL snapshot; a stale cache is served as CACHED.
- No key: snapshot served as HISTORICAL; 503 outside mission areas; status does not leak secrets.
- Health, missions, config and 404 endpoints.

## Manual browser checks (browser, Vite dev server)

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
| Stage B (2026-11-19): title screen shows snapshot dates and retrieval from the v2 manifest; Data & sources lists all 10 snapshots with per-snapshot retrieval and imagery; M01 briefing still loads 85 detections offline (API stopped) with retrieval 2026-11-17 | Pass |
| Stage C (2026-11-19, 800×600 and 375×812): a v1 save migrates to v2 and the title shows "Continue: M02". The campaign shows Chapter I in order and Chapter II locked with "Complete M02, M03 to open Chapter II". The practice setting opens all 10. M06 briefing loads 14 targets offline with the gas-flare caveat and provisional note. M10 loads 4,661 detections into 20 groups in about 0.6 s. A corrupt save resets with a notice and a backup copy. No horizontal scroll at 375 px. The only console errors were 502s from the API proxy, because only the web server was running | Pass |
| Stage H (2026-11-20), viewports and accessibility: at 375×812, title, campaign, briefing, design, plan, operations and debrief (M10) have no horizontal scroll and no unnamed visible controls. After the fixes, operations at 375 px shows the map first with the action bar pinned (all four actions visible). 768×1024 and 1024×768: no horizontal scroll; at 1024 the map is 504×339 px. Keyboard: Tab shows the cyan focus ring. Reduced motion puts the reduced-motion class on the root element and drops transitions to about 0 | Pass |
| Stage H (2026-11-20), performance: in the dev server inside the app's browser pane, M10 operations ran at 4–21 fps with 50–1,000 ms long tasks (M01 had 50–100 ms tasks too). In a production build (`vite preview`), M10 ran at 134–141 fps, paused or at 4×, with no long tasks. The cost is React development mode. Also fixed: target markers were rebuilt every frame | Pass |
| Stage G (2026-11-20): M06 plan with a 70° orbit shows SOUTH BAND and NORTH BAND zone outlines, the "orbit limit 70.0°" label and the new legend rows. M08 plan draws shadow sections of the track. Flying M08 with manual downlink, the link beam appeared in 8 of 8 samples while transmitting and 0 while idle. The new sounds were not listened to (code paths only) | Pass |
| Stage F (2026-11-20): M08 flown in the browser with the Queensland-first aim and the mission default of manual downlink. The planner showed per-pass reach: pass 1 had 2 reachable in Queensland, pass 2 had 4 in the Kimberley. The passes-and-contacts panel showed pass timing, contact seconds left and capacity. The downlink prompt appeared at both contacts and Begin downlink delivered everything. The debrief objective check showed both conditions met, the optional goal not met (6/12), and a per-pass table (2/2/0 and 4/4/0). The Settings assistance controls render. No horizontal overflow on the debrief at 375 px. Console errors were only 502s from the offline API proxy, plus 404s carried over in the console from the earlier misconfigured preview launch; none appear in this page load's resource list | Pass |
| Stage E (2026-11-20): M04 briefing shows the reserve objective, the 50% optional goal and 24 target groups, with no provisional note; the design bay lists the 70° inclination. Console errors were only 502s from the offline API proxy (the game fell back to static files) and 404s left over from a misconfigured first preview launch, in which the API had taken the web port | Pass |
| Stage D (2026-11-19): M01 flown start to debrief in the browser. Score 93 / S, as before. The debrief lists all five commendations with their rules (all earned), and the save records them. The only console errors were 502s from the API proxy, because only the web server was running | Pass |
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
