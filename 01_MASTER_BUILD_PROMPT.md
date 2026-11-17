# ORBITAL FIREWATCH — Claude Code Master Build Prompt

> Paste this entire document into Claude Code after opening the project repository. Keep `CLAUDE.md` at the repository root. Put the proposal and reference images in the repository (the companion starter kit already contains them). The prompt is designed for a 3–4 person team and a 48-hour hackathon build.

---

## ROLE AND EXPECTATION

You are acting as a senior game director, senior full-stack TypeScript engineer, gameplay/simulation engineer, technical artist, UI/UX designer, audio/VFX designer, QA lead, and release engineer working as one coordinated development team.

Your task is to BUILD a complete, playable browser game named **ORBITAL FIREWATCH**. Do not stop at a plan, wireframe, static dashboard, or architecture document. Inspect the repository, make the implementation, run it, test it, fix defects, and leave the project in a state that another developer can run and continue.

Treat this as a polished vertical slice for a 48-hour NASA Space Apps Challenge project. The game must be visually memorable, genuinely interactive, technically honest, and easy for a judge to understand within the first 30 seconds.

Work independently using sensible defaults. Ask the user a question only if a missing decision blocks implementation or would create a major irreversible architectural choice. Record assumptions in `docs/DECISIONS.md` instead of repeatedly interrupting the build.

## 1. PRODUCT VISION

**Title:** ORBITAL FIREWATCH  
**Tagline:** One Pass. One Opportunity. Make It Count.  
**Genre:** Mission strategy / time-pressure / satellite operations / educational simulation.  
**Primary platform:** Desktop-first responsive web game.  
**Player mode:** Single-player. Do not implement online multiplayer in this build.  
**Typical mission duration:** Approximately 4–7 minutes.  
**Core experience:** The player designs and operates a notional Earth-observation satellite to collect and transmit useful follow-up observations of NASA FIRMS thermal-anomaly detections. The player has limited orbital opportunities, payload capability, power, storage, downlink capacity, mass, and budget. The player cannot observe every target. Engineering decisions determine what can be observed and what data can be delivered.

The game must NOT be a wildfire map dashboard with a satellite image pasted on top. It must feel like a real game with a clear objective, choices, pressure, feedback, progression, a failure state, a victory state, and replayable missions.

### Core differentiator

**ONE PASS. LIMITED RESOURCES. PRIORITIZE.**

The player configures an Earth-observation satellite and then has a limited sequence of simulated orbital passes to observe target locations. Sensor swath, resolution profile, orbit, power, storage, pointing, and downlink settings interact. A capture is not automatically a successful delivery: the observation must be collected, retained, and transmitted during a valid simulated contact window.

### Educational purpose

The game should help learners understand:
- How Earth-observation satellite missions are designed around an objective.
- How orbit altitude and inclination influence approximate coverage opportunities.
- How sensor swath and resolution create trade-offs.
- How observation consumes electrical energy and creates data volume.
- Why storage and downlink capacity constrain useful science return.
- Why mission design is an iterative optimization problem.
- What NASA FIRMS hotspot/thermal-anomaly data does and does not represent.

### Relationship to NASA

This is an independent educational game using NASA data and public documentation. It is not a NASA product, not NASA-endorsed, not a wildfire warning service, and not an operational satellite planning or emergency-response tool. Do not use NASA insignia, NASA logotype, NASA seal, or other NASA identifiers as product branding. Do not imply NASA sponsorship or approval. Include a visible disclosure such as: **“Independent educational project using NASA data. Not affiliated with or endorsed by NASA.”**

## 2. NON-NEGOTIABLE DEVELOPMENT RULES

1. **Build a playable game, not a mockup.** Every major button must have a working action. Every displayed budget and meter must be connected to simulation state.
2. **Keep the vertical slice small but complete.** Three missions, one notional satellite platform, a few component choices, a functioning orbit/coverage model, capture, storage, downlink, score, and debrief. Do not build a huge catalogue.
3. **Real and simulated data must never be confused.** FIRMS detections are NASA-derived observations. The player’s satellite, orbit, sensor swath, capture events, data packets, and mission score are fictional game simulation outputs.
4. **Never fabricate live NASA data.** Never label synthetic targets as LIVE or NASA. Clearly show `LIVE`, `CACHED`, `HISTORICAL`, or `SYNTHETIC DEMO` state wherever targets are shown.
5. **FIRMS points are hotspot/thermal-anomaly detections, not fire perimeters.** Do not draw a polygon implying that the whole region is burning. Do not call FRP a human danger score. Do not infer casualties, evacuation needs, or dispatch priorities.
6. **Do not use the game for public safety.** Put a concise disclaimer in onboarding, map legend, target detail, and credits: “Educational simulation only. FIRMS active-fire/thermal-anomaly detections have limitations and must not be used to protect life or property.”
7. **No fake engineering authority.** Game-balance parameters must be labelled as notional/fictional. Do not present invented cost, sensor resolution, satellite mass, or orbit performance as NASA specifications.
8. **Keep calculations deterministic.** Given the same mission seed, target dataset, loadout, and commands, replay must produce the same result.
9. **Keep the NASA MAP_KEY secret.** It belongs only in server environment variables. Never commit `.env`, expose the key to the browser, or include it in logs/screenshots.
10. **Design for failure of the network.** The game must remain playable with cached data or a bundled, clearly labelled historical/synthetic training snapshot.
11. **Prefer simple, proven libraries.** Do not add a dependency without a clear need. Avoid complex cloud services, authentication, online multiplayer, payment systems, and unnecessary AI APIs.
12. **Keep the app compiling after each milestone.** Run typecheck, tests, and production build after meaningful changes.
13. **Do not silently skip tests or claim tests passed without running them.** Report actual commands and results.
14. **Do not overwrite existing user work.** Inspect the repo and Git state first. Do not run destructive shell commands or discard uncommitted changes. Ask before removing files or rewriting substantial existing code.
15. **No copyright shortcuts.** Do not scrape models, textures, SFX, music, or code from commercial games. Track all external assets, sources, and licenses in `docs/ASSET_CREDITS.md`.

## 3. FIRST ACTIONS — REPOSITORY AUDIT AND IMPLEMENTATION PLAN

Before coding:
1. Inspect the complete repository, current branch, uncommitted changes, package manager, existing app, environment files, and available commands.
2. Inspect `CLAUDE.md`, `proposal/PROJECT_PROPOSAL_REFERENCE.md` (preferred text reference), `proposal/ORBITAL_FIREWATCH_Project_Proposal.docx` if present, and `reference-art/` if present. Treat proposal/reference images as design guidance only, not as sources of real telemetry, exact UI copy, accurate orbital geometry, or verified NASA branding. Some AI-generated reference art may contain inaccurate text or pseudo-logos; do not reproduce those marks. Use the game name and an independent-project disclaimer instead.
3. If the repository is empty, scaffold the recommended stack in Section 8.
4. Create/update these documents before major implementation:
   - `docs/PRODUCT_SPEC.md`
   - `docs/TECHNICAL_ARCHITECTURE.md`
   - `docs/SCIENTIFIC_ASSUMPTIONS.md`
   - `docs/DATA_PROVENANCE.md`
   - `docs/DECISIONS.md`
   - `docs/ASSET_CREDITS.md`
   - `docs/TEST_PLAN.md`
5. Create an implementation checklist with milestones. Then start building. Do not spend the entire first session writing plans.
6. If Claude Code supports subagents in the active environment, use them only for isolated research/review tasks (e.g. validate NASA API contract, inspect visual design, review simulation math). Keep one primary agent responsible for integration. Do not let parallel agents edit the same files.

## 4. GAME FLOW AND SCREENS

Implement these screens as a coherent experience with transitions. Avoid an ordinary admin-dashboard layout.

### 4.1 Title / Main Menu

- Game title and tagline.
- Primary CTA: `START MISSION`.
- Secondary actions: `MISSION ARCHIVE`, `HOW TO PLAY`, `DATA & SOURCES`, `SETTINGS`.
- Short cinematic satellite/earth scene or animated mission schematic.
- Show data-feed state and last refresh time in a small unobtrusive panel.
- Show the independent-project disclaimer in credits/info.

### 4.2 Mission Briefing

Show:
- Mission name and objective.
- Region and bounding box in a human-readable way.
- FIRMS data source/satellite/instrument, acquisition window, and retrieval timestamp.
- Number of valid observations and clustered target groups.
- Data state (`LIVE`, `CACHED`, `HISTORICAL`, or `SYNTHETIC DEMO`).
- Mission constraints: observation window, maximum mass, budget, pass count, minimum delivery target.
- A clear explanation that detections are thermal anomalies, not exact fire boundaries or safety assessments.
- `ACCEPT MISSION` and `BACK TO BRIEFING` actions.

### 4.3 Satellite Design Bay

This is a playable configuration scene, not a static product table. Use a central 3D satellite preview with component selection panels and a live engineering budget.

Configurable systems:
- Bus/platform tier: Small / Medium.
- Orbit profile: choose from a constrained set of low-Earth-orbit presets. Expose altitude and inclination values and explain them.
- Payload profile: Wide Swath / Balanced / High Detail.
- Solar array tier: Compact / Standard / High Output.
- Battery tier: Standard / Extended.
- Recorder: Small / Medium / Large.
- Communications: Low / Standard / High Throughput.
- Pointing: Basic / Precision.
- Launch/deployment capacity: Rideshare / Small dedicated / Medium capacity preset.

Every choice must update:
- Mass (kg).
- Notional budget credits.
- Payload power draw (W).
- Solar generation estimate (W).
- Battery capacity (Wh).
- Storage capacity (GB or MB consistently).
- Downlink rate (Mbps).
- Sensor swath width (km).
- Observation data volume (MB per capture).
- Pointing/observation penalty if applicable.

The values above are game-balance parameters unless the developer separately cites a real public specification. Store all balance values in data/config files, not scattered through UI code.

Include:
- A live mass/budget/power/storage/downlink summary.
- Hard constraint failures and soft warnings.
- Tooltips explaining why each subsystem matters.
- A `RESET TO RECOMMENDED` option.
- A `VALIDATE DESIGN` action.
- Clear indication of what has changed since the previous configuration.

### 4.4 Mission Planning Map

Use a real interactive map as the central experience.

- NASA GIBS imagery layer with valid date/time, selected layer, and attribution.
- FIRMS detection points displayed as discrete observations/pixels, not fire polygons.
- Clustering at appropriate zoom levels to prevent marker overload.
- Selectable target groups and individual detections.
- Target panel showing source fields: latitude, longitude, acquisition date/time UTC, satellite, instrument, confidence category, FRP, version, day/night, and source state where available.
- A clearly labelled game-generated mission priority score and a short explanation of its inputs.
- Proposed orbit ground track, sensor swath corridor, selected targets, and hypothetical ground-station contact opportunities are all visually distinct from NASA source layers.
- Mission timeline and a limited number of observation windows.
- Filter by source/satellite/confidence/date and mission target status.
- Provide a keyboard-accessible target list as an alternative to map-only interaction.

### 4.5 Mission Operations / Observation Run

This is the main game screen and must be visually compelling.

Layout:
- Central large map with the satellite ground track, moving satellite marker, observation swath, target markers, selected target highlight, and ground-station visibility windows.
- Top bar: mission time, remaining passes, mission objective progress, data freshness label.
- Left panel: target queue and mission priority.
- Right panel: spacecraft telemetry — power, battery, storage, payload temperature if modelled, radio/link state, mass not changing after launch, system health.
- Bottom timeline: events, pass start/end, target opportunities, capture, stored packet, contact window, downlink completion.
- Primary actions: `CAPTURE / OBSERVE`, `SKIP`, `PRIORITIZE NEXT`, and where appropriate `BEGIN DOWNLINK` or `AUTO-OBSERVE`.
- Simulation speed controls: Pause, 1×, 2×, 4×. Never let speed change alter physical calculations; it only changes how quickly simulation time advances in real time.
- Pause must freeze game time and all simulation systems.
- The player should be able to understand why an observation is eligible or missed.

### 4.6 Mission Debrief

Show a satisfying end-of-mission report:
- Priority-weighted targets observed.
- Captures stored successfully.
- Data successfully delivered.
- Observations lost due to storage saturation.
- Observations missed due to orbit/swath/time.
- Energy consumed and remaining.
- Downlink utilization.
- Budget and mass margin.
- Final score with category breakdown.
- A causal event timeline.
- Two or three specific redesign suggestions based on the actual run state.
- `REPLAY MISSION`, `REDESIGN SATELLITE`, and `NEXT MISSION` actions.

Never give a score without explaining how it was calculated.

## 5. MISSION CAMPAIGN AND PROGRESSION

Build three complete missions with increasing difficulty. Each should take approximately 4–7 minutes after the tutorial.

### Mission 01 — FIRST PASS

Purpose: teach the player the basic loop.
- One regional map area.
- A manageable number of NASA FIRMS detections (e.g. 5–12 target points after filtering/selection; do not fabricate extra NASA points).
- One orbit preset and a balanced default sensor.
- Generous power, storage, budget, and downlink capacity.
- Teaches: target selection, sensor swath, capture, data storage, contact window, downlink, debrief.
- Success should be achievable with the recommended default configuration.

### Mission 02 — SPLIT FRONT

Purpose: create a genuine trade-off.
- Targets exist in multiple geographic clusters within a larger region or across a longer pass sequence.
- The player must decide whether to prefer wide swath or higher detail.
- Constrain pass count and power.
- Use a transparent mission objective that rewards a subset of targets, not every point.
- Show targets that cannot be observed during the available simulated pass.

### Mission 03 — DATA BOTTLENECK

Purpose: force system-level reasoning.
- More eligible target candidates, limited recorder capacity, and restricted downlink/contact time.
- High-detail capture produces more data and consumes more energy.
- A faster radio consumes more power and budget.
- The player must prioritize, capture selectively, and transmit before mission end.
- Debrief should explain the causal chain (e.g. high-detail sensor → more data → recorder filled → some observations not retained; or low-rate radio → data not delivered before deadline).

Mission content, component balance, region presets, and scoring weights must live in configuration files. Use deterministic seeds so runs can be replayed exactly.

## 6. NASA DATA CONTRACT — FIRMS AND GIBS

### 6.1 Primary data: NASA FIRMS

Use NASA FIRMS Area API as the primary source of actual target locations.

Official references:
- FIRMS API area page: https://firms.modaps.eosdis.nasa.gov/api/area
- FIRMS API tutorial: https://firms.modaps.eosdis.nasa.gov/content/academy/data_api/firms_api_use.html
- MAP_KEY registration: https://firms.modaps.eosdis.nasa.gov/api/map_key/
- VIIRS fire hotspot product descriptions: https://firms.modaps.eosdis.nasa.gov/content/descriptions/FIRMS_VIIRS_Firehotspots.html

Use one of the VIIRS Near Real-Time sources, preferably choose an available source from `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, or `VIIRS_SNPP_NRT` based on the FIRMS data-availability endpoint and actual service response. Do not assume every source or date is available.

Area API pattern (verify against current official docs before implementation):

`https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{WEST},{SOUTH},{EAST},{NORTH}/{DAY_RANGE}`

Optional historical-date form:

`https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{WEST},{SOUTH},{EAST},{NORTH}/{DAY_RANGE}/{YYYY-MM-DD}`

Important API constraints:
- Bounding-box order is west, south, east, north.
- Use a bounded geographic region; do not query `world` for normal gameplay.
- Day range is limited by the documented API (currently 1–5 days); validate before forwarding.
- Check the data availability endpoint when selecting historical dates or sensor products.
- MAP_KEY is required and must exist only on the server.
- Do not poll frequently. Cache responses and expose a manual refresh action with a clear cooldown/status.
- Parse CSV safely; handle blank responses, header changes, malformed rows, timeouts, rate limits, bad keys, and upstream 5xx errors.

Expected VIIRS fields may include:
- `latitude`, `longitude`
- `bright_ti4`, `bright_ti5`
- `scan`, `track`
- `acq_date`, `acq_time` (acquisition time is UTC)
- `satellite`, `instrument`
- `confidence` (sensor-specific categorical code; common VIIRS values are low/nominal/high represented by l/n/h)
- `version`
- `frp` (Fire Radiative Power; commonly reported in MW)
- `daynight`

Do not assume all datasets expose identical columns. Parse optional fields safely and keep unknown columns in a raw metadata object when reasonable.

### 6.2 FIRMS interpretation constraints

- A FIRMS record is a satellite-derived active-fire/thermal-anomaly detection. It may represent fire, hot smoke, agricultural burning, gas flares, volcanoes, or other hot sources.
- Cloud cover can obscure detections.
- A VIIRS detection is approximately a 375 m pixel at nadir; actual footprint changes with scan/track/view geometry. Do not draw a perfect 375 m square for every observation without accounting for the footprint fields and caveat.
- Confidence is a categorical detection-quality indicator, NOT a calibrated probability that a fire exists.
- FRP is a radiative measurement in the source product; do not equate it directly to danger, area burned, people at risk, or emergency severity.
- Do not create official fire perimeter polygons from FIRMS points.
- Do not provide evacuation, dispatch, life-safety, or property-protection recommendations.

### 6.3 Data freshness and provenance state

Every response and every target must carry provenance. Support exactly these display states:
- `LIVE`: successfully retrieved from FIRMS during this session; still show original acquisition UTC and retrieval UTC.
- `CACHED`: data retrieved earlier and reused; show acquisition date, cached retrieval date/time, and cache age.
- `HISTORICAL`: user or mission selected a historical date; show that date prominently; do not call it live.
- `SYNTHETIC DEMO`: invented tutorial/test data; use a separate visual style and never mix it into a layer labelled NASA/FIRMS.

Suggested normalized response envelope:

```ts
interface FirmsFeedEnvelope {
  source: 'NASA FIRMS';
  product: string;
  area: { west: number; south: number; east: number; north: number };
  requestedDate?: string;
  dayRange: number;
  fetchedAtUtc: string;
  acquisitionWindowUtc?: { from: string; to: string };
  state: 'LIVE' | 'CACHED' | 'HISTORICAL' | 'SYNTHETIC DEMO';
  staleAgeSeconds?: number;
  count: number;
  detections: FirmsDetection[];
  warnings: string[];
}
```

Create a stable `id` from product/source plus available source identity fields (and a deterministic hash if no unique source ID exists). Keep original raw values and the normalized record.

### 6.4 Recommended data query approach

- Provide three or four curated mission-region presets (e.g. western North America, southeastern Australia, southern Africa, Southeast Asia) and allow the player to choose one. Use a reasonable bounded bounding box for each.
- Use a short date range and one sensor product at a time.
- Request only when entering a mission briefing, changing region/date, or explicitly refreshing (subject to cooldown).
- If the API returns few/no detections, do not create fake NASA targets. Offer a curated historical FIRMS snapshot if bundled, or switch to `SYNTHETIC DEMO` training data in a separate mode.
- Store one or more real historical FIRMS CSV/JSON snapshots in `public/data/` or `server/data/` with a manifest recording retrieval date, product, area, original source URL, and license/usage notes. The snapshot must contain real source rows and must not be silently modified.
- Do not commit the MAP_KEY or raw private secrets.

### 6.5 Context imagery: NASA GIBS

Official references:
- GIBS API docs: https://nasa-gibs.github.io/gibs-api-docs/
- Access basics: https://nasa-gibs.github.io/gibs-api-docs/access-basics/
- Web Mercator WMTS capabilities: https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml
- Visualization catalog: linked from the official GIBS docs.

Use NASA GIBS as contextual imagery behind the FIRE detection points. Before hardcoding a layer, inspect GetCapabilities and confirm the layer identifier, projection, tile matrix set, image format, and time domain. Prefer a suitable true-colour daily layer, but do not assume a date exists for the latest day. Use a known-valid historical date for fallback or a neutral map background.

GIBS WMTS REST pattern:

`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{LayerIdentifier}/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.{FormatExt}`

GIBS is a visualization service. Clearly attribute the actual layer and selected date in the map credits panel. Handle missing tiles gracefully; never let a broken imagery layer make the game unusable.

### 6.6 Official challenge resource compliance

The team must verify the actual NASA Space Apps Challenge 2026 Challenge 13 “Space Mission Design Game” Resources tab. Do not claim that FIRMS or GIBS satisfies the event's Global Award data-source rule unless it is actually listed there or otherwise confirmed by the organizers. Create `docs/CHALLENGE_RESOURCE_COMPLIANCE.md` with:
- Exact challenge resource name.
- URL.
- What data/content is used.
- How it enters gameplay.
- Where it is visible in the app.
- Attribution.
- Unresolved confirmation status if the team has not supplied the exact official resource list.

Keep FIRMS/GIBS as additional NASA data services even if another required challenge source is selected.

## 7. GAMEPLAY AND ENGINEERING SIMULATION

The simulation must be modular, deterministic, unit-aware, testable, and separate from visual rendering.

### 7.1 Physics constants and orbit model

Use a documented Earth model and constants in one module. For an educational circular-orbit approximation:

`T = 2π * sqrt(a^3 / μ)`

where `a = R_E + h`, `R_E` is the chosen mean Earth radius, `h` is orbital altitude, and `μ` is Earth's gravitational parameter.

Implement a simple circular two-body orbit with Earth rotation to calculate a notional ground track. A reasonable implementation can:
1. Generate orbital position from mean motion `n = sqrt(μ / a^3)` and time.
2. Apply inclination and RAAN rotations to the orbital-plane vector.
3. Rotate the inertial position into an Earth-fixed frame using Earth rotation.
4. Convert the sub-satellite point into latitude/longitude.
5. Sample the track at fixed simulated-time intervals.

Clearly document what is omitted: eccentricity, J2 perturbation, drag, attitude dynamics, precise launch insertion, full SPICE ephemerides, and operational orbit determination. Label the resulting track `SIMULATED / APPROXIMATE`.

Do not use the FIRMS observation satellite's orbit as the player's satellite orbit. They are separate.

### 7.2 Sensor swath and target eligibility

Each payload profile defines a configurable effective swath width, data volume per capture, capture time, and power draw. These are notional game values.

For each sampled ground-track point, calculate the great-circle distance to each FIRMS detection using the haversine formula. A target becomes observable when its distance to the track is within half the effective swath width and the simulation is within the mission's allowed observation window.

Use interpolation or sufficiently dense samples so the player does not miss a target due only to coarse sampling. Document the chosen sample step. The footprint must be described as an educational approximation, not an operational instrument footprint.

### 7.3 Observation / payload profiles

Use three balanced profiles whose numbers are stored in config and labelled as game parameters:
- **WIDE SWATH:** large effective swath, lower detail, lower data per capture, moderate power.
- **BALANCED:** medium swath, medium data, medium power.
- **HIGH DETAIL:** narrow swath, high data per capture, higher power and/or longer exposure.

Do not present fictional GSD/resolution values as measured sensor performance. If you show a notional resolution tier, call it `detail tier` unless you have a defensible public reference.

### 7.4 Power system

Use consistent units. Track battery energy in Wh and power in W. For each simulation time step:
- Estimate solar generation when in the sunlight condition.
- Subtract bus load, payload load, attitude/pointing load, and radio load.
- Add/subtract energy using `Wh = W * hours`.
- Clamp battery between zero and configured capacity.
- Enforce low-energy safe mode or observation lockout according to mission rules.

A simplified eclipse model is acceptable. Document it. Make it clear that the power model is an educational game approximation.

### 7.5 Storage and downlink

- Each successful capture creates an immutable observation packet with target ID, capture time, profile, data size, quality/detail tier, and status.
- Packet statuses: `CAPTURED`, `STORED`, `QUEUED`, `TRANSMITTING`, `DELIVERED`, `EXPIRED/LOST`.
- Storage fills when a packet is retained. If full, reject or overwrite only according to an explicit player choice; never silently delete data.
- Downlink volume: `MB = Mbps * seconds / 8` using decimal megabytes consistently. Convert to bytes internally if helpful, but document units.
- Downlink consumes radio power and only occurs during the simulated ground-station contact window or an explicit mission-approved communication window.
- Create 2–3 notional ground station locations in data config. Their geographic positions are game scenario data, not claimed to be NASA ground stations unless a real public station is cited.
- Approximate visibility using satellite and ground-station position vectors and a minimum elevation-angle threshold, or use a clearly documented scheduled contact window for MVP. Do not pretend a hand-authored window is an actual station prediction.

### 7.6 Mass and budget

- Sum component mass and compare against selected launch/deployment capacity.
- Sum notional component costs and compare against mission credits.
- Do not display invented prices as real launch-service prices or NASA budgets.
- Keep all catalogue values in JSON/TypeScript config with `isNotional: true` or clear documentation.

### 7.7 Target grouping and game priority

Cluster nearby FIRMS detections for usability. The cluster is a game-generated grouping and must not be presented as a NASA fire perimeter.

Create a transparent target-priority rule using disclosed inputs, such as:
- Acquisition recency relative to the mission's chosen data window.
- FIRMS confidence category as a qualitative data-quality cue (not a probability).
- FRP percentile/rank within the currently loaded dataset (not a danger score).
- Mission objective relevance.

Show the formula or clear breakdown in the target details. Label the result `GAME PRIORITY` or `MISSION PRIORITY`, never `FIRE SEVERITY`, `THREAT LEVEL`, or `PUBLIC SAFETY RISK`.

### 7.8 Scoring

Implement a transparent score. Recommended initial weights:
- 35% priority-weighted observations successfully captured within eligible windows.
- 25% captured data successfully delivered.
- 20% mission-specific objective achievement.
- 10% resource efficiency.
- 10% engineering margin / design feasibility.

Store weights in mission configuration. Explain each score in the debrief. A score must not describe the real-world severity or response success of a wildfire.

## 8. TECHNICAL STACK AND REPOSITORY STRUCTURE

Use this as the default. If the current repo already has a coherent working stack, inspect it and adapt rather than rewriting unnecessarily.

### Recommended stack

- Frontend: React + TypeScript + Vite.
- Styling: CSS Modules or plain CSS variables with a token system; no over-engineered styling framework.
- Main map: Leaflet + React-Leaflet and Leaflet marker/polygon/polyline layers.
- NASA basemap: GIBS WMTS/WMS tiles.
- 3D satellite preview/launch vignette: Three.js (direct Three.js integration is fine; do not add React Three Fiber unless it clearly reduces complexity).
- Charts/timelines: Recharts or custom SVG.
- Backend: Node.js + Express + TypeScript.
- Input validation: Zod.
- FIRMS CSV parsing: `csv-parse` or another maintained robust CSV parser.
- Client cache: IndexedDB (use a small wrapper such as `idb`) plus a bundled JSON fallback.
- Server cache: simple bounded in-memory cache with TTL for hackathon; do not require Redis.
- Tests: Vitest for simulation and normalization; add Playwright smoke tests if time and environment permit.
- Deployment: frontend and API in a simple single repo. Prefer a single deployable Node web service serving the Vite build and API, or a simple split Vercel frontend + Node backend if deployment is already familiar. Do not add deployment complexity late in the build.

Current Vite documentation requires a supported Node version; verify the installed version before scaffold. Use a current supported LTS satisfying Vite's documented minimum (Node 22.12+ is a safe baseline at the time this prompt was authored). Check the current official docs rather than pinning stale versions.

### Suggested structure

```text
orbital-firewatch/
  CLAUDE.md
  README.md
  .gitignore
  .env.example
  package.json
  docs/
    PRODUCT_SPEC.md
    TECHNICAL_ARCHITECTURE.md
    SCIENTIFIC_ASSUMPTIONS.md
    DATA_PROVENANCE.md
    CHALLENGE_RESOURCE_COMPLIANCE.md
    DECISIONS.md
    ASSET_CREDITS.md
    TEST_PLAN.md
  apps/
    web/
      src/
        app/
        components/
        features/
          briefing/
          satellite-builder/
          mission-map/
          operations/
          debrief/
          campaign/
        game/
          state/
          audio/
          vfx/
        map/
        three/
        styles/
        data/
      public/
        data/
        models/
        textures/
        audio/
    api/
      src/
        routes/
        services/
        providers/
        cache/
        validation/
  packages/
    simulation/
      src/
        orbit/
        coverage/
        power/
        storage/
        communications/
        scoring/
        missions/
        types/
      tests/
```

If a simpler structure will produce a working result faster, simplify it. Do not create empty folders for appearance. Use shared types rather than duplicated front/back definitions.

### Required backend endpoints

- `GET /api/health` — service and cache status.
- `GET /api/firms/status` — provider, last retrieval, cache age, product/date availability if known, and state.
- `GET /api/firms/area?source=...&west=...&south=...&east=...&north=...&dayRange=...&date=...` — validate all values, query bounded FIRMS API, normalize, return provenance envelope.
- `GET /api/missions` — load mission metadata and rules.
- `GET /api/config` — optional read-only simulation configuration.

The browser must never call FIRMS with the secret MAP_KEY directly. The API should validate bbox and region size, allow only approved sources, restrict date/day range, apply timeout, cache, and return useful errors.

### Environment

Create `.env.example` with:

```env
FIRMS_MAP_KEY=replace_me
PORT=4000
NODE_ENV=development
FIRMS_CACHE_TTL_SECONDS=900
```

Never commit `.env`. Provide setup instructions in README. If key is absent, return a clear `CACHED` or `SYNTHETIC DEMO` mode with a useful message; never crash.

## 9. VISUAL DIRECTION AND ART DIRECTION

Create a coherent premium mission-operations aesthetic: modern aerospace instrumentation, functional information hierarchy, restrained cinematic effects, and a strong sense of urgency. It should look like a designed game, not a generic AI-generated admin template.

### Art direction

- Dark near-black/navy background with layered charcoal panels.
- Signal cyan/teal for active map/system states.
- Warm amber for warnings and mission objectives.
- Red only for critical states, failures, and hazard emphasis.
- Off-white readable primary typography.
- Use a modern sans-serif for headings/body and a monospaced face for telemetry/data values.
- Use consistent 8px spacing rhythm, deliberate panel hierarchy, restrained borders, and purposeful negative space.
- Avoid excessive glow, excessive rounded cards, random gradients, tiny labels, and every-panel-is-a-card dashboard clutter.
- Use subtle grid/reticle/coordinate motifs only where they improve the mission-control feeling.
- Keep map legibility dominant.

### Visual hierarchy

The player should always see, in order:
1. Current mission objective and remaining time/pass.
2. Map, orbit path, swath, and targets.
3. Satellite status and resource constraints.
4. Available actions and next event.
5. Source/provenance details without visual clutter.

### 3D assets — build real models, not decorative placeholders

Create a cohesive notional small Earth-observation satellite model. This is a fictional player spacecraft, not a claim that it is an actual NASA spacecraft.

Satellite model components:
- central rectangular satellite bus with bevelled edges;
- two deployable solar-array wings with visible cell grid;
- panel hinges, brackets, and support rails;
- optical/thermal instrument aperture with dark lens and protective baffle;
- high-gain communication antenna/dish or flat-panel antenna according to selected radio tier;
- low-gain antenna stubs;
- star-tracker/sensor elements;
- radiator panels and thermal blankets;
- small status lights and labelled but generic equipment panels;
- attachment points and clean pivots for deployment animation.

Requirements:
- Prefer procedural Three.js geometry/materials for the MVP so the asset is guaranteed to exist and is editable.
- If Blender is installed and time allows, create a Blender Python script that builds and exports a `.glb`; keep the procedural runtime model as fallback.
- Use a coherent scale and pivot hierarchy.
- Provide at least one idle rotation/hover animation and a solar-panel deployment animation.
- Create component visual variants when the player changes equipment (wide-swath sensor, high-detail sensor, larger arrays, antenna variants, etc.).
- Use PBR-like materials, subtle emissive indicators, and appropriate lighting. Do not use giant unlit flat colors.
- Ensure the model is readable at the target camera distance and does not obscure the UI.
- Optimize geometry and texture sizes. Avoid 8K textures.

### 3D Earth and orbital vignette

Build a contained Three.js scene for launch and satellite design:
- Earth sphere with a suitable licensed texture or a procedural material; night-side shading optional.
- Thin atmosphere rim, subtle cloud layer if available.
- Notional satellite in orbit with solar panels.
- Orbit line and moving marker.
- Directional sunlight and soft ambient fill.
- Camera controls restricted to sensible rotate/zoom ranges.
- Deployment animation and short transition into the 2D operational map.

Do not try to build the whole Earth interface in 3D. The main mission map should remain a precise, legible 2D Leaflet map with separate NASA and simulated overlays.

### Map VFX

Implement purposeful, data-safe effects:
- Target marker pulse rings for selected targets.
- Distinct marker styles for LIVE/CACHED/HISTORICAL/SYNTHETIC.
- Cluster expansion when zooming in.
- Selected target reticle and scanning line.
- Satellite ground-track sweep with a clearly labelled simulated swath corridor.
- Observation capture flash/ripple on eligible target.
- Small data-packet animation from satellite HUD toward downlink station when a packet is transmitted.
- Subtle warnings when battery, storage, or downlink reaches thresholds.
- Mission-success/failure feedback.

Do not render flames over every FIRMS point. The satellite detections are pixels/point footprints, not confirmed fire polygons. Use the actual NASA map imagery as context. If you add illustrative fire imagery in a briefing, mark it as illustrative and keep it separate from data layers.

### VFX quality and performance

- Use CSS/SVG/Canvas/Three.js effects according to the layer; avoid expensive full-screen particle systems.
- Respect `prefers-reduced-motion` and add an in-game reduced-motion toggle.
- Avoid flashing/strobing effects.
- Cap device pixel ratio for the 3D vignette if needed.
- Dispose of WebGL geometries, materials, and textures on unmount.
- Handle WebGL-unavailable devices with a static 2D satellite illustration/fallback.

## 10. AUDIO AND SOUND DESIGN

Create a small but coherent sound system. Sound should reinforce player decisions and feedback rather than constantly play.

### Required sound events

- UI hover/focus: very subtle tick (optional; do not spam).
- UI click/confirm: short clean digital confirmation.
- Mission accepted: short rising two-tone signal.
- Satellite deploy: mechanical latch + soft servo movement.
- Target acquired: radar lock chirp.
- Observation captured: shutter-like electronic pulse, not a camera flash sound that implies photography if not appropriate.
- Data transmission: packet ticks or soft digital stream.
- Low battery warning: restrained two-tone warning with cooldown.
- Storage nearly full: short muted alert.
- Mission objective complete: brief positive confirmation.
- Mission failure: subdued descending signal.
- Debrief/result grade: short reward sting.
- Optional low-volume ambient mission-room loop.

### Implementation

- Prefer procedural sound generation with the browser Web Audio API for the prototype (OscillatorNode, GainNode, BiquadFilterNode, delay/reverb where appropriate). This avoids licensing problems and missing files.
- If external audio is used, use only assets whose license is verified and add a credit/license record. Pixabay's license or CC0 assets may be considered, but confirm the individual asset's license and do not redistribute raw asset packs as standalone downloads.
- Do not autoplay audio before user interaction. Resume AudioContext after an explicit start/enable sound action.
- Provide master volume, SFX volume, ambient volume, mute, and test-sound controls in Settings.
- Add event cooldowns and prevent overlapping repetitive alarms.
- Ensure the game is fully playable muted.

## 11. GAME FEEL, ANIMATION, AND JUICE

Add meaningful feedback for every important player action:
- Component selection updates the 3D satellite and smoothly animates affected budget bars.
- Validation produces explicit pass/warning/fail rows with icons and concise reasons.
- Starting a mission uses a short 2–3 second deploy/transition sequence with a skip option.
- Satellite marker moves smoothly along the precomputed ground track.
- Observation opportunity gets a visual warning before the window closes.
- Captured target receives a ring and a status change.
- Packet enters recorder queue, then travels through the downlink sequence.
- Storage fills visually and gives a clear warning before full.
- Mission end creates a clean result transition and debrief.

Avoid unnecessary shaking, constant pulsing, particle clutter, fake 3D camera cuts, and long non-interactive cinematics. The player must retain control.

## 12. ACCESSIBILITY AND USABILITY

- Desktop-first for the hackathon judging experience, but responsive down to tablet/mobile widths.
- Keyboard navigation for all critical actions.
- Clearly visible focus states.
- Text must remain legible at 1366×768 and 1920×1080.
- Color is never the only way to communicate state; pair it with text/icon/shape.
- Provide a tutorial and a persistent help/codex panel.
- Explain FRP, confidence, swath, orbital pass, storage, and downlink in plain language.
- Use UTC labels for source acquisition times and local time only where explicitly labelled.
- Add pause and reduced-motion settings.
- Add a visible `DATA SOURCES & LIMITATIONS` panel.

## 13. AI FEATURES — OPTIONAL, NOT CORE

Do not add a generative AI API as a requirement for the core game. It would add cost, latency, credentials, moderation and reliability risks.

Instead, implement a deterministic Mission Analyst based on actual simulation events:
- “Your wide-swath profile observed more targets, but the lower detail tier reduced the per-target data score.”
- “Your recorder reached capacity before the final target group. Increase storage or reduce the number of high-detail captures.”
- “Your radio could not transmit all retained packets during the available contact window.”

Every analyst message must be generated from actual game state and an explanation rule. If an optional LLM is later connected, it may rewrite/explain these structured facts but must never invent metrics or change simulation outcomes.

## 14. TESTING AND ACCEPTANCE CRITERIA

The prototype is complete only when all applicable acceptance criteria pass.

### Build and run
- `npm install` completes from a clean checkout.
- `npm run dev` starts web and API development processes with clear output.
- `npm run build` succeeds.
- `npm run typecheck` succeeds.
- `npm run test` succeeds.
- Production build can be served without relying on dev-server behavior.

### NASA data
- Correct FIRMS Area API request is constructed from validated inputs.
- MAP_KEY is not bundled into frontend assets.
- Live response parses and normalizes correctly.
- Empty, stale, malformed, timeout, invalid-key and unavailable-source paths are handled.
- A bundled real NASA snapshot works without an API key and is labelled HISTORICAL or CACHED as appropriate.
- Synthetic tutorial data is visibly labelled SYNTHETIC DEMO.
- Every marker detail panel shows its source and UTC acquisition timestamp.
- GIBS layer date/availability errors fall back gracefully.

### Simulation
- Circular orbit period calculation has unit tests and known expected values.
- Ground track is continuous across longitude wrap.
- Target swath eligibility is deterministic and uses a great-circle calculation.
- Sensor swath changes target eligibility.
- Captures consume configured energy and storage.
- Storage cannot exceed capacity.
- Downlink cannot transmit more than the configured rate × contact duration.
- Downlink consumes configured energy.
- Mass and budget constraints validate correctly.
- Pausing freezes every simulation process.
- Speed changes do not change total physical simulation outcomes.
- Same seed/config/data produces identical score and event log.

### Gameplay
- A first-time player can complete Mission 01 with the recommended loadout.
- Mission 02 forces a meaningful sensor/orbit/coverage trade-off.
- Mission 03 forces a meaningful storage/downlink trade-off.
- Player can understand why targets are eligible, captured, missed, stored, or delivered.
- A full mission can be replayed.
- Debrief score reconciles with the event log.

### UX and visual
- No clipped or overlapping panels at standard desktop resolution.
- All buttons work.
- Loading, empty, error and cached states look intentional.
- Satellite 3D model loads and has a non-WebGL fallback.
- Sound settings work and do not autoplay.
- Reduced-motion setting works.
- No console errors during the main gameplay loop.

## 15. 48-HOUR PRIORITY PLAN

Build in this sequence. Do not delay the playable loop for visual polish.

### Milestone 1 — 0 to 4 hours
- Repo audit, scaffold, shared types, environment example.
- Register/test FIRMS MAP_KEY if provided.
- Make one bounded FIRMS query and parse it.
- Validate GIBS imagery tile/layer in Leaflet.
- Bundle one historical data snapshot if permitted and correctly attributed.
- Create a working first screen and map.

### Milestone 2 — 4 to 10 hours
- Build map with FIRMS markers, clustering, details and data states.
- Build mission briefing and target list.
- Add cached/offline fallback.
- Add clear FIRMS/GIBS attribution and limitations.

### Milestone 3 — 10 to 16 hours
- Build satellite design bay and 3D model.
- Add editable subsystem profiles and live mass/power/storage/budget summaries.
- Implement design validation.

### Milestone 4 — 16 to 24 hours
- Implement orbital period/ground track.
- Implement swath/target eligibility.
- Implement observation capture, power use and storage packets.
- Make Mission 01 playable from start to debrief.

### Milestone 5 — 24 to 32 hours
- Implement contact windows and downlink.
- Implement Missions 02 and 03.
- Implement deterministic scoring and causal debrief.

### Milestone 6 — 32 to 38 hours
- Polish UI, VFX, SFX, animations and tutorial.
- Add event log and mission replay.

### Milestone 7 — 38 to 43 hours
- Run tests, fix bugs, verify API secrets, offline mode, accessibility, attribution and browser console.
- Deploy a stable public URL.

### Milestone 8 — 43 to 48 hours
- Freeze features.
- Test the public deployment in a private/incognito browser.
- Prepare screenshots and a 30-second demo path.
- Complete sources, credits, challenge resource compliance, README and project submission materials.

If time becomes short, protect the following features in order:
1. Real FIRMS data + provenance/fallback.
2. Working map.
3. Satellite configuration with meaningful trade-offs.
4. Orbit/swath target eligibility.
5. Capture, storage and downlink.
6. Three mission progression and debrief.
7. 3D polish, SFX, VFX, optional extras.

Do not cut the data-provenance boundaries or scientific disclaimer.

## 16. TEAM PARALLEL WORK

For a 3–4 member team, divide work as follows. Keep shared TypeScript contracts stable.

- **Frontend / game director:** screen flow, game state, mission UX, component panels, integration.
- **NASA data / backend engineer:** FIRMS API proxy, MAP_KEY, GIBS validation, CSV normalizer, cache, provenance and fallback.
- **Simulation engineer:** orbit, ground track, swath, power, storage, downlink, scoring, deterministic tests.
- **Technical artist / UI / QA:** satellite model, animation, VFX, sound, responsive polish, accessibility, demo and credits.

Claude should create task boundaries and shared interfaces in `docs/TEAM_WORK_SPLIT.md`. Do not let team members work on the same files without an integration agreement.

## 17. FINAL DELIVERABLES

Leave the repository with:
- Complete running game source code.
- `README.md` with prerequisites, install, env configuration, run, test, build and deploy instructions.
- `.env.example` with no secrets.
- `.gitignore` that excludes `.env`, build outputs, cache files, editor files and large temporary exports.
- `CLAUDE.md` project guidance.
- `docs/PRODUCT_SPEC.md`.
- `docs/TECHNICAL_ARCHITECTURE.md`.
- `docs/SCIENTIFIC_ASSUMPTIONS.md`.
- `docs/DATA_PROVENANCE.md`.
- `docs/CHALLENGE_RESOURCE_COMPLIANCE.md`.
- `docs/ASSET_CREDITS.md`.
- `docs/TEST_PLAN.md` and test results.
- `public/data/` or server equivalent with a documented fallback snapshot.
- At least one polished 3D satellite model in GLB or runtime procedural geometry.
- Sound and VFX systems with settings and graceful fallbacks.
- Deployed demo instructions.
- A concise `docs/KNOWN_LIMITATIONS.md` that states exactly what is simplified.

## 18. START EXECUTION NOW

Begin by inspecting the repository and available environment. Report a short summary of what exists and any blockers. Then create the implementation checklist and start Milestone 1 immediately.

Do not ask me to approve every file or every step. Make reasonable reversible decisions, preserve user work, and continue until a tested playable vertical slice exists. If you discover that a specific live service or external package is unavailable, implement a clearly labelled fallback and document the limitation rather than pretending it works.

The target is a complete, polished, playable mission-design game—not a static prototype screen.
