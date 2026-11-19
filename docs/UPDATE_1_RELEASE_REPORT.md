# Update 1 Release Report: Complete Campaign

Recorded on 2026-11-20 on Windows 11, with Node 26.13.0 and npm 11.20.0. This report covers commits `0d06427` to the commit that adds this file. The update specs are in [`docs/update-1/`](update-1/).

This is an educational game. It is not production-certified, not flight-grade, and not an emergency or public-safety tool. A passing build does not make it production-ready.

## Summary

ORBITAL FIREWATCH grows from 3 missions to a 10-mission campaign in three chapters. Every new mission uses real, hashed NASA FIRMS data. Each one teaches one engineering lesson and has tested winning and losing strategies.

| Area | Delivered |
|---|---|
| Data | Verbatim FIRMS snapshots for M04–M10 from one hashed download (2026-11-18). Manifest schema v2 with provenance per snapshot. GIBS imagery checked for each mission date. |
| Campaign | Three chapters with completion-only unlocks. Versioned save with migration and recovery. A campaign screen that shows exact unlock requirements. A practice setting that opens every mission. |
| Engine | Energy accounting fixed: generation counted in full, curtailed energy booked. Objectives built from composable conditions, which can be lost if a constraint breaks later. Packets record their pass. Optional goals. Five commendations with stated rules. Low-confidence handling set per mission, with confidence quotas. |
| Balance | All 7 new missions balanced. 35 documented strategies are asserted by tests. See [BALANCE_REPORT.md](BALANCE_REPORT.md). |
| Screens | Assistance defaults and settings. Operations: passes-and-contacts panel, downlink prompt, reserve tracker, overwrite confirmation. Planning: per-pass breakdown and battery budget. Debrief: per-condition objective check, optional goals, per-pass table, commendations. |
| Map and sound | Mission zones, the orbit's latitude limit, shadow sections of the track, and a link beam drawn only while transmitting. New "warn" and "downlink" procedural sounds. |
| Responsive and accessibility | On narrow screens, operations shows the map first and pins the action bar. Decorative markers are removed from the tab order. Target markers are no longer rebuilt every frame. |
| API | Exact bundled snapshots are served even for areas wider than the 20° live-query limit (M08, M10). Live queries stay bounded. |

## Missions

All data is NASA FIRMS VIIRS NOAA-20 375 m NRT (`VIIRS_NOAA20_NRT`), with rows copied verbatim. Imagery is NASA GIBS true colour on the acquisition date.

| Mission | Chapter | Region | Acquired | Rows | Imagery | Status |
|---|---|---|---|---|---|---|
| M01 First Pass | I | Northern California | 2026-11-16 | 85 | MODIS Terra | Unchanged |
| M02 Split Front | I | Zambezi / Mozambique | 2026-11-14 | 1,512 | NOAA-20 | Unchanged |
| M03 Data Bottleneck | I | Central NSW | 2026-11-15 | 160 | NOAA-20 | Unchanged |
| M04 Shadow Line | II | Maranhão–Tocantins, Brazil | 2026-11-14 | 751 | NOAA-20 | Balanced |
| M05 Dead Air | II | Borneo | 2026-11-15 | 159 | NOAA-20 | Balanced |
| M06 Polar Watch | II | West Siberian Plain | 2026-11-16 | 150 | MODIS Terra | Balanced |
| M07 Signal Triage | II | Mainland SE Asia | 2026-11-16 | 299 | NOAA-20 | Balanced |
| M08 Second Look | III | Northern and central Australia | 2026-11-16 | 3,280 | NOAA-20 | Balanced |
| M09 Hard Limits | III | Tanzania and southern Kenya | 2026-11-15 | 367 | NOAA-20 | Balanced |
| M10 Final Firewatch | III | West African Sahel belt | 2026-11-13 | 4,661 | NOAA-20 | Balanced |

M01–M03 were retrieved 2026-11-17T17:11:12Z; that raw file was not kept. M04–M10 were retrieved 2026-11-18T19:58:51Z; that raw file is SHA-256 `885db08a…be507db` and is kept locally in git-ignored `data-raw/`. Full provenance is in [DATA_PROVENANCE.md](DATA_PROVENANCE.md).

## Deviations from the Update 1 specs

| Spec | What was done | Why |
|---|---|---|
| M06 in Alaska/Yukon | West Siberian Plain | The available window had one FIRMS detection a day in Alaska/Yukon. The briefing warns that many Siberian detections are likely gas flares. |
| M08 in Central Australia | Widened to 121–146° E | Two consecutive orbits are about 24° apart. |
| M09 in an East African corridor | Tanzania and southern Kenya | South Sudan and Ethiopia had 4,400–12,000 rows a day, far beyond "moderate". |
| M04 objective: avoid safe mode | 35% operations reserve | Payload busy time caps a pass at about 12 captures, which cannot reach the 15% safe-mode threshold. |
| Recommended design always completes | It does, but in M04, M06, M08 and M10 only with a planning choice | This stops automation from solving the mission by itself, as the spec asks. |
| 3D model shows eclipse and downlink states | These are shown on the operations map instead | Operations happens on the map, and the spec says critical state must not exist only in 3D. |
| Free Operations / Sandbox after M10 | The unlock rule exists and is tested; the mode is **not built** | Deferred at the audit stage (scope). |
| Playwright end-to-end tests | Not added | Deferred at the audit stage. Flows were driven by scripts in the in-app browser instead. |
| Copy the AI concept images into the repo | Specs copied, images left out | They are mood references only (2.3 MB). |

Every decision is recorded in [DECISIONS.md](DECISIONS.md) (#20–#54).

## Automated results

| Command | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run test` | **179 passed / 179** (7 files: simulation, engine, campaign, balance, snapshots, references, API) |
| `npm run build` | Pass. Web JS 1,182 kB (330 kB gzip); API bundle 59 kB |
| `npm run balance` | Pass. No documented strategy differs from its expected result. M01–M03 output is identical to the pre-update baseline. |
| Secret scan of `apps/web/dist` | No key, test key, or FIRMS area-API URL found |

## Production smoke test (`NODE_ENV=production`, port 4011)

| Check | Result |
|---|---|
| `/`, the `/campaign` deep link, `/api/health` | 200 |
| `/api/missions` | 200, 10 missions |
| Manifest, an M06 snapshot, a texture | 200 |
| Dated snapshot request for each of M01–M10 | HISTORICAL with the manifest row count and retrieval time; M08 and M10 served despite the 20° limit, without calling FIRMS |
| Undated wide query; unknown route | 400; 404 |
| M10 briefing in the browser from the production server | Loads 4,661 detections into 20 groups. Data note states that FIRMS was not queried. No console errors. |

## Acceptance tests (`docs/update-1/ACCEPTANCE_TESTS.md`)

Pass means executed with evidence recorded in [TEST_PLAN.md](TEST_PLAN.md) or here.

| Section | Status | Notes |
|---|---|---|
| A Baseline and regression | Pass, except WebGL fallback | M01–M03 objectives, data and balance unchanged; all earlier tests pass. The WebGL-unavailable fallback was not re-tested. |
| B Campaign | Pass, except Free Operations | Unlocks, any-order Chapter II, grade independence, persistence, corrupt-save recovery all tested. The M10 → Free Operations unlock rule exists, but the mode is not built. |
| C Data provenance | Pass | Hashes, selection, counts, confidence, grouping, imagery, offline load and key scan. |
| D Simulation | Pass, except partial-downlink persistence | Energy, safe-mode hysteresis, confidence policy, multi-pass geometry, recorder persistence and replay are all tested. Partial-transfer persistence is pre-existing behaviour and has no dedicated Update 1 test. |
| E Balance | Pass | 40 balance tests and [BALANCE_REPORT.md](BALANCE_REPORT.md). |
| F UI and gameplay | Partial | See the coverage list below. Overwrite confirmation is implemented but its dialog was not clicked through in a browser. |
| G Visual, audio, accessibility | Partial | Link beam, eclipse, reduced motion, focus ring and viewports pass. Audio was not listened to. WebGL fallback not tested. 1440×900 and 1280×720 not tested specifically; the desktop pane was about 800 px wide. |
| H Release commands | Pass | All of the above. |
| I Non-claims | Pass | No flight-grade, live-FIRMS, accessibility-certification, mobile-device or NASA-endorsement claims. |

## Browser and device coverage

All browser checks used the Claude desktop app's built-in Chromium pane. No real phones or other browsers were tested.

- **Played start to debrief:** M01 (93 / S, all five commendations) and M08 (Queensland first, manual downlink, objective met).
- **Partly played:** M10 operations, ended early.
- **Opened to briefing, design or plan:** M04 and M06; M02 and M03 through the campaign flow.
- **Viewports:** 375×812, 768×1024, 1024×768, and the default pane at about 800 px. No horizontal overflow on any screen tested.
- **Not tested:** Firefox and Safari, real mobile devices, screen readers, audio playback, the WebGL-unavailable path, the GIBS imagery fallback chain, and the live FIRMS service with a real MAP_KEY.

## Performance

- **Production build** (`vite preview`), M10 operations: 134–141 fps, paused and at 4×, with no long tasks.
- **Dev server in the app pane:** 4–21 fps, with 50–1,000 ms long tasks, caused by React development mode.
- **Fixed:** the map was rebuilding all target markers every frame.
- **Load time:** M10 loads 4,661 detections into 20 groups in about 0.6 s.
- **Bundle size:** 1.18 MB JS (330 kB gzip), mostly Three.js and Leaflet. Not code-split.

## Known limitations and follow-ups

The full list is in [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md). Recommended next steps:

1. Build Free Operations / Sandbox: the unlock exists, but the mode does not.
2. Add Playwright end-to-end tests for the campaign flow and operations decisions.
3. Listen to the audio on desktop and mobile, and tune the levels.
4. Test the WebGL and imagery fallbacks, and run a screen-reader pass.
5. Code-split the Three.js scenes to shrink the first load.
6. If a later FIRMS download has Alaska/Yukon fire data, consider a second polar mission.

## How to run

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. To try any mission straight away, turn on **Settings → Open all missions (practice)**.

For a judged demo, use the production build, which plays smoothly:

```bash
npm run build
```

```bash
NODE_ENV=production PORT=4000 npm start
```

Then open http://localhost:4000. In PowerShell, set the variables with `$env:NODE_ENV="production"; $env:PORT="4000"; npm start`.
