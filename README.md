# ORBITAL FIREWATCH

*One pass. One opportunity. Make it count.*

A browser game for the NASA Space Apps Challenge 2026 ("Space Mission Design Game"). You design a small, fictional Earth-observation satellite, fly it over real NASA FIRMS thermal-anomaly detections, and try to capture and downlink the most valuable observations before power, storage and contact time run out.

> Independent educational project using NASA data. Not affiliated with or endorsed by NASA.
> Educational simulation only. FIRMS active-fire/thermal-anomaly detections have limitations and must not be used to protect life or property.

## Campaign

Ten missions in three chapters, each built on one day of real NASA FIRMS detections bundled with the game:

| Chapter | Missions | What you learn |
|---|---|---|
| I First Light | M01 First Pass, M02 Split Front, M03 Data Bottleneck | The loop, swath and reach, recorder and radio limits |
| II Operational Pressure | M04 Shadow Line, M05 Dead Air, M06 Polar Watch, M07 Signal Triage | Eclipse power, contact time, latitude reach, target triage |
| III Mission Assurance | M08 Second Look, M09 Hard Limits, M10 Final Firewatch | Multi-pass planning, hard design limits, everything together |

Chapter I is played in order, then Chapter II opens all at once, then Chapter III in order. A mission counts as complete when its objective is met; your grade never locks anything. Settings → "Open all missions (practice)" opens every mission. Screens start in a short, simple view with Kai, your flight controller; switch on Expert view for every number and source. From Chapter II, you start downlinks yourself (an assist setting can change that).

Challenge 13 listed resources used: NASA CubeSat 101 (design-bay notes with page citations) and JPL Concept Maturity Levels (campaign stages CML 2–4). FIRMS and GIBS are extra NASA data services, not on that list. See [docs/CHALLENGE_RESOURCE_COMPLIANCE.md](docs/CHALLENGE_RESOURCE_COMPLIANCE.md).

## AI disclosure

Built with help from AI coding tools (Claude Code). Game design, data choices and testing were reviewed by the team.

## Prerequisites

- Node.js 22.12 or newer (tested with Node 26.13, npm 11.20)
- Optional: a free NASA FIRMS MAP_KEY for live data (https://firms.modaps.eosdis.nasa.gov/api/map_key/)

## Install and run

```bash
npm install
```

```bash
npm run dev
```

This starts the API on http://localhost:4000 and the web app on http://localhost:5173. Open the web URL.

Without a MAP_KEY, the game uses the bundled real FIRMS snapshot (labelled HISTORICAL). The game also runs with the API stopped: the web app falls back to the static snapshot files.

### Live FIRMS data (optional)

```bash
cp .env.example .env
```

Set `FIRMS_MAP_KEY` in `.env`. The key stays on the server and is never sent to the browser. Restart `npm run dev`. The briefing's **Latest live data** button then requests the last 24 h for the mission region.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API (tsx watch) + web (Vite) |
| `npm run typecheck` | Type-check simulation, API and web |
| `npm run test` | Vitest: simulation, engine, campaign, balance, data snapshots and API (179 tests) |
| `npm run build` | Production web build + bundled API (`apps/api/dist/server.js`) |
| `npm start` | Run the production server; serves the API and the built web app when `NODE_ENV=production` |
| `npm run balance` | Print a balance report for every mission plus the documented strategies (see docs/BALANCE_REPORT.md) |

### Production

```bash
npm run build
```

```bash
NODE_ENV=production PORT=4000 npm start
```

Open http://localhost:4000. The production build plays much more smoothly than `npm run dev` (React development mode), so use it for demos. Any Node host works, for example Render, Railway or Fly. Set `FIRMS_MAP_KEY` in the host's secret settings, never in the repository.

## Repository layout

```
packages/simulation   Deterministic engine: orbit, coverage, power, storage, downlink, scoring,
                      FIRMS normalisation, mission and component config (shared by web and API)
apps/api              Express API: FIRMS proxy, validation (zod), cache, snapshot fallback
apps/web              React + Vite game: screens, Leaflet map, Three.js satellite, Web Audio SFX
apps/web/public/data  Bundled FIRMS snapshots for all 10 missions (verbatim rows) + manifest
scripts/              Snapshot extraction and balance report
docs/                 Product, architecture, science, provenance, compliance, tests, decisions
```

## Documentation

- [Product spec](docs/PRODUCT_SPEC.md)
- [Technical architecture](docs/TECHNICAL_ARCHITECTURE.md)
- [Scientific assumptions](docs/SCIENTIFIC_ASSUMPTIONS.md)
- [Data provenance](docs/DATA_PROVENANCE.md)
- [Challenge resource compliance](docs/CHALLENGE_RESOURCE_COMPLIANCE.md)
- [Decisions](docs/DECISIONS.md)
- [Asset credits](docs/ASSET_CREDITS.md)
- [Update 1 release report](docs/UPDATE_1_RELEASE_REPORT.md)
- [Update 1 specifications](docs/update-1/)
- [Balance report](docs/BALANCE_REPORT.md)
- [Test plan and results](docs/TEST_PLAN.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md)
- [Team work split](docs/TEAM_WORK_SPLIT.md)

## 30-second demo path

1. Title → **Start campaign** → M01 briefing shows 85 real FIRMS detections (HISTORICAL, 16 Nov 2026). **Campaign** shows all ten missions in three chapters; Settings → "Open all missions (practice)" opens every mission. Screens start in a short, simple view with Kai, your flight controller; switch on Expert view for every number and source.
2. **Accept mission** → Design bay: switch the payload to High Detail and watch the swath shrink and the telescope grow. Press **Validate design**, then **Reset to recommended**.
3. **Continue** → Plan: the cyan swath crosses the target field; one target is marked out of reach.
4. **Launch** → Operations: captures fire as targets enter the swath, and packets downlink to GS SIERRA.
5. Debrief: grade and score breakdown, plus Mission Analyst notes on why each target was or was not delivered.
