# ORBITAL FIREWATCH - Proposal (text extraction)

PROJECT PROPOSAL  /  2026

ORBITAL FIREWATCH

Earth-Observation Satellite Mission Game

One pass. One opportunity. Make it count.

Figure 1. Gameplay screen mockup. All hotspot locations and the orbital path in this illustration are synthetic; this is not live FIRMS data.

GAME TYPE

Single-player mission strategy / time management / exploration; optional co-op is post-hackathon scope.

FORMAT

Browser-first satellite mission game; 3 short observation missions with increasing difficulty.

CORE HOOK

Design a satellite and prioritize real NASA fire-hotspot detections before orbit, power, storage, and downlink limits run out.

DATA

NASA FIRMS VIIRS active-fire detections + NASA GIBS Earth imagery tiles.

Prepared for: NASA Space Apps Challenge 2026  |  Challenge 13: Space Mission Design Game

Prepared: 15 November 2026  •  Team size: 3–4  •  Prototype window: 48 hours

01  /  PROPOSAL AT A GLANCE

Executive Summary

ORBITAL FIREWATCH is a fast-paced satellite mission-design game in which players configure an Earth-observation spacecraft, select an orbit and sensor, prioritize wildfire-related satellite hotspot detections, and attempt to capture and transmit the most valuable observations before time and resources run out. NASA FIRMS provides real active-fire/thermal-anomaly detections for mission targets; NASA GIBS provides Earth imagery for map context. The game then simulates a notional follow-up spacecraft with simplified orbit, sensor swath, power, storage, and downlink models.

The distinctive mechanic is “one pass, limited resources”: the player cannot observe every target. A higher-resolution payload may produce richer data but consume more power and storage; a wider swath may cover more targets but trade away detail; a faster downlink may consume more power and budget. Players must design a mission around real data and make time-critical operational choices.

Value proposition

ORBITAL FIREWATCH makes the relationship between Earth-observation data and spacecraft engineering tangible. Players learn that finding a target is only the start: the satellite must be designed, positioned, powered, scheduled, and able to deliver its data.

Challenge Alignment

The Space Mission Design Game challenge calls for an interactive experience that covers mission objectives, spacecraft and payload design, launch/orbit choices, budgets, mass, power, communications, and mission success. ORBITAL FIREWATCH is therefore framed as a complete notional Earth-observation mission, not a fire-map viewer or an emergency-response dashboard. [1][2]

Challenge requirement

ORBITAL FIREWATCH implementation

Mission objective

Observe selected satellite-detected hotspots and deliver prioritized imagery/data to a ground station.

Spacecraft / payload

Configure bus, optical/thermal sensor profile, swath, resolution tier, power system, storage, radio, and optional maneuver reserve.

Launch / orbit

Choose from simplified orbital presets with altitude and inclination trade-offs; validate target coverage in an educational ground-track model.

Limited resources

Track mass, cost, generated data, battery, observation duty cycle, downlink capacity, and contact-time assumptions.

Mission operations

Schedule observations, choose targets during available passes, manage storage, and downlink priority data.

Evaluation

Score priority-weighted observations, data delivered, objective completion, and resource efficiency.

This document is a proposal for a Space Apps educational game. It is not an official NASA proposal template, a NASA endorsement, or an operational wildfire-monitoring service.

02  /  PLAYER EXPERIENCE

Game Vision and Core Loop

The intended feeling is urgency with agency. The player receives a briefing based on satellite-observed hotspots, designs a spacecraft that can perform the requested observations, then has to make choices during a limited sequence of orbital passes. The map is the mission board; the satellite design is the player’s strategy; the downlink deadline creates pressure.

Step

Player activity

Game response

1. Detect

Load target records for a chosen area and date window.

Map plots FIRMS detections and groups nearby records into game targets.

2. Design

Choose orbit preset, sensor swath/resolution, solar array, battery, recorder, and radio.

Validator updates mass, power, cost, storage, and observation capability.

3. Plan

Select priority targets and an observation schedule.

Mission planner estimates which targets fall inside the simulated swath.

4. Observe

Run the orbital pass and choose which eligible targets to capture.

Power is consumed; captured observations create data volume.

5. Transmit

Use a ground-contact window and allocate downlink time.

Priority packets are delivered; stored data is retained if capacity is insufficient.

6. Debrief

Review coverage, data delivery, and design trade-offs.

Score, causal explanations, and redesigned mission unlock the next mission.

Core Game Pillars

Real targets: the mission board is populated from NASA FIRMS observations, with timestamps and source identifiers retained.

No perfect coverage: a limited swath and pass schedule force players to choose what they can observe.

Every subsystem matters: sensor choice changes data volume and power; orbit changes coverage; radio and storage change delivered science.

A clear consequence loop: missed targets, full storage, low battery, or late downlink produce visible mission outcomes.

Short replayable missions: each level takes approximately 4–7 minutes and introduces a new constraint.

Figure 2. Observation-pass concept. This is a teaching diagram, not a precise orbital coverage calculation.

03  /  SATELLITE MISSION DESIGN

Spacecraft and Mission Systems

Players must configure a notional Earth-observation satellite before they can start the mission. The prototype should use a small, understandable catalog rather than a large parts marketplace. Every component must affect at least one validated constraint.

Subsystem

Configurable choices

Simulation consequence

Spacecraft bus

Small / medium platform

Baseline mass, cost, and available subsystem slots.

Orbit

Low / medium altitude; selected inclination preset

Orbital period and approximate ground-track/coverage opportunity.

Payload

Wide-swath / high-resolution / balanced sensor profile

Swath width, observation data volume, and power draw.

Power

Solar-array tier; battery capacity

Available power, energy reserve, and observation duty cycle.

Data storage

Small / medium / large recorder

Maximum observations retained before downlink.

Communications

Low / medium / high data-rate radio

Downlink capacity, energy use, and mission budget.

Attitude / pointing

Basic / precision pointing mode

Observation scheduling limits and pointing penalty.

Launch / deployment

Rideshare / dedicated small-launch / medium-launch capacity preset

Mass envelope, deployment option, and notional launch cost.

Simplified engineering model

Orbit period: for a circular orbit, use T = 2π√(a³/μ), where a is Earth-centred orbital radius and μ is Earth’s gravitational parameter.

Ground track: approximate the subsatellite path while accounting for Earth rotation. In 48 hours, use a deterministic 2D educational model and label its assumptions.

Swath: represent the sensor footprint as a configurable cross-track width. A target is observable when the simulated ground track passes within the swath boundary during a valid observation interval.

Power: integrate simplified generation and load over the mission timeline; instrument captures and downlink sessions consume energy.

Data: each observation adds a defined data volume; storage is limited; delivered data is bounded by radio bit rate × contact duration ÷ 8.

Budget and mass: component values are game-balance parameters unless a separately cited public specification is used. Do not label fictional costs as NASA cost estimates.

Critical scientific boundary

FIRMS detections are not exact wildfire boundaries, and the notional player satellite is not the VIIRS satellite that produced the original detection. The game simulates a follow-up Earth-observation mission: real NASA detections become target locations, while a separate simplified spacecraft model determines whether the player’s fictional satellite could observe them.

04  /  NASA DATA STRATEGY

NASA Data Integration

Primary source: NASA FIRMS

NASA’s Fire Information for Resource Management System (FIRMS) distributes satellite-derived active-fire and thermal-anomaly detections. The Area API supports a geographic bounding box, sensor/source, date, and day range, and returns CSV records. The proposed prototype source is VIIRS NOAA-20 or NOAA-21 near-real-time (NRT), selected according to availability. A free FIRMS MAP_KEY is required for API access. [3][4]

FIRMS field

Use in game

Important interpretation

latitude / longitude

Map target position and cluster membership.

Point detection location, not a fire perimeter.

acq_date / acq_time

Target freshness and mission timeline.

Observation time in the data record; normalize timezone explicitly.

confidence

Detection-quality cue in target details.

Use the sensor-specific confidence definition; do not convert to probability without calibration.

frp

Relative target-priority input.

Fire Radiative Power is a satellite-derived radiative measure (MW for common VIIRS records); not a direct measure of life-safety risk.

satellite / instrument

Traceability and filtering.

Preserve which observing platform/instrument generated the record.

daynight / scan / track

Optional context and quality display.

Retain field meaning and avoid using as an unsupported risk score.

Context imagery: NASA GIBS

NASA Global Imagery Browse Services (GIBS) exposes pre-rendered Earth-observation visualizations through public OGC services including WMTS and WMS. The proposal uses a time-aware GIBS layer as map context behind the FIRMS points. GIBS layer availability varies by product and time; a request for the current date can be blank before acquisition or processing is complete, so the app must support a previous available date or a bundled neutral basemap. [5]

Live-data and fallback policy

Backend requests one selected VIIRS source for a bounded region and short date range; do not query the global world dataset on every UI change.

Normalize dates, times, numeric values, confidence categories, satellite, instrument, and product version. Preserve the raw row or source identifier for traceability.

Filter invalid coordinates and deduplicate records using source identity / timestamp / coordinate rules; keep clustering parameters visible in documentation.

Cache the last successful response with retrievedAt, source, area, date range, sensor, and record count. Use a bundled sample data snapshot when live access fails.

Render every target with a source badge: LIVE, CACHED, or SYNTHETIC DEMO. Never present synthetic mock targets as NASA detections.

FIRMS safety and accuracy boundary

NASA cautions that active-fire/thermal-anomaly detections have limited accuracy, can be affected by cloud cover, and should not be used for preservation of life or property. ORBITAL FIREWATCH is an educational mission-design game, not a wildfire alert, evacuation, dispatch, or public-safety decision system. [6]

05  /  MISSION CAMPAIGN AND SCORING

Prototype Mission Campaign

Mission

Briefing

New pressure

Success condition

01 — First Pass

Observe a small set of hotspot targets in one region.

Starter orbit; ample power and downlink.

Observe and deliver a minimum number of high-priority targets.

02 — Split Front

Targets are spread across separated clusters.

Orbit/sensor trade-off; competing observation choices.

Maximize priority-weighted data delivery within a limited pass schedule.

03 — Data Bottleneck

Many eligible targets but limited recorder and contact time.

Storage pressure, power reserve, and downlink capacity.

Deliver the most valuable packets before the mission window closes.

For the hackathon, mission regions should be selected from an accessible FIRMS bounding box with cached snapshots from a known date. If current detections are sparse in the chosen area, the fallback mission uses a clearly labelled historical dataset. The team should not use simulated points as if they were real active-fire records.

Target prioritization (transparent game rule)

The game can calculate a mission priority score from normalized, disclosed inputs such as observation recency, sensor confidence category, and FRP rank/quantile. The weights are gameplay choices—not a NASA severity model. A target card must show its underlying fields, acquisition timestamp, satellite, and the fact that it is a thermal-anomaly detection.

Scoring model

Score dimension

Weight

Measured result

Priority-weighted observations

35%

Target value captured within the simulated swath and valid mission window.

Data delivered

25%

Captured packets successfully transmitted before debrief.

Mission objectives

20%

Mission-specific target count / region / priority goals reached.

Resource efficiency

10%

Power, storage, downlink, and budget used effectively.

Engineering margin

10%

Mass, energy, and storage margins remain within validated bounds.

Learning outcomes

Understand how Earth-observation satellites convert sensor observations into geospatial records.

Explain trade-offs among orbit, swath, resolution, power, storage, and downlink capacity.

Distinguish a satellite thermal-anomaly detection from a verified fire perimeter or a public-safety assessment.

Understand that useful observations must be scheduled, stored, transmitted, and interpreted in context.

Figure 3. ORBITAL FIREWATCH NASA-data and mission-simulation architecture.

Data/model separation

The provenance boundary is essential. FIRMS records remain NASA-derived observations; the game’s cluster labels, target priority score, hypothetical satellite ground track, sensor swath, captured-image volume, downlink outcome, and mission score are generated by the game. The interface must show these as different layers and must never imply that a notional satellite produced the original FIRMS observations.

Information layer

Source / owner

Player-facing label

Hotspot records

NASA FIRMS

NASA observation • sensor and acquisition timestamp shown

Earth imagery

NASA GIBS

NASA map layer • selected layer and date shown

Target clusters / priority

Game logic

Game-generated grouping / mission priority

Orbit, swath, resource state

Game simulation

Simulated / approximate spacecraft model

Data freshness states

State

When used

Required UI treatment

LIVE

Current request succeeds and source timestamp is within the selected mission window.

Show source, sensor, acquisition time, retrieval time, and “LIVE” badge.

CACHED

Live request fails or is skipped; last successful NASA response is reused.

Show “CACHED”, original acquisition time, cache retrieval time, and age.

HISTORICAL

Player selects a fixed past date for a replay scenario.

Show the selected historical date; do not call it real-time.

SYNTHETIC

Only used in tutorials or guaranteed demo fallback when a NASA snapshot is not available.

Show “SYNTHETIC DEMO”; never mix with NASA records without a clear layer separation.

A FIRMS point is a satellite-derived thermal anomaly detection, not an exact fire boundary. NASA notes that the VIIRS point symbol represents an approximately 375 m × 375 m pixel at nadir; view geometry and detection confidence affect interpretation. The game will display the detection as a point/footprint with its sensor metadata, not as a polygon claiming the whole area is burning. [6]

06  /  TECHNOLOGY AND ARCHITECTURE

Technical Stack and Components

Layer

Recommended technology

Responsibility

Web application

React + TypeScript + Vite

Mission briefing, satellite builder, target selection, mission console, and debrief.

Map UI

Leaflet + React-Leaflet

Pan/zoom, FIRMS point markers, target clusters, simulated ground track and sensor swath.

NASA imagery

NASA GIBS WMTS/WMS

Time-aware Earth-observation map layers.

NASA data proxy

Node.js + Express

FIRMS MAP_KEY protection, bounded queries, validation, normalization and cache.

Simulation core

Pure TypeScript modules

Orbit approximation, swath coverage, power, storage, downlink, mission clock and scoring.

Charts

Recharts or SVG

Resource budget and observation/downlink timelines.

Persistence

Versioned JSON + IndexedDB; optional SQLite

Cached FIRMS rows, mission saves, run history and offline fallback.

Hosting

Vercel / Cloudflare Pages + Node API

Public, password-free demo URL.

System architecture

The application separates NASA data ingestion from gameplay simulation. NASA data determines the target catalogue; the game engine determines the hypothetical satellite’s design and performance. The simulated orbit must never be confused with the actual orbit of the NASA VIIRS observing satellite.

Proposed application endpoints

Endpoint

Purpose

Security / fallback

GET /api/firms/area

Query selected FIRMS sensor, bounding box, and short date window.

Server-only MAP_KEY; bounded request; last-good JSON cache.

GET /api/firms/status

Return feed status, retrieval time, and cache age.

Never expose the MAP_KEY; report LIVE/CACHED/SYNTHETIC state.

GET /api/missions/{id}

Load mission rules, target goals, and configuration presets.

Versioned local mission data; deterministic seed.

GIBS WMTS tile template

Load selected NASA imagery layer in map client.

Check layer/date availability; neutral basemap fallback.

API security and caching

Keep FIRMS MAP_KEY in the server environment; never expose it in frontend JavaScript or a public repository.

Use a bounded Area API query (region + sensor + short date range); request the minimum data needed for the selected mission.

Respect FIRMS limits and cache responses; avoid rapid polling. The documented MAP_KEY transaction window is 5,000 requests per 10 minutes, but the prototype should use far fewer.

GIBS map layers are accessed through public standards-based endpoints; check layer and time availability before relying on a specific date.

If a data source is unavailable, preserve the game loop with a timestamped cached response and a visible stale-data banner.

07  /  DELIVERY PLAN

48-Hour Prototype Plan

A complete mission loop must be playable before the team adds polish. The minimum product is: a real FIRMS feed or cached sample, a GIBS-backed map, a satellite configuration screen, one working orbital-pass simulation, target capture, downlink, and a debrief.

Window

Deliverable

Acceptance check

0–4 h

Repo, API key, FIRMS query proof, GIBS layer proof, shared types

A bounded NASA response is parsed and a map layer renders.

4–10 h

Target map, filters, clustering and cached fallback

LIVE/CACHED/SYNTHETIC states are visible; targets show original attributes.

10–16 h

Satellite configuration and constraint checks

Changing orbit/sensor/power/storage/radio updates mission feasibility.

16–24 h

Ground-track and swath simulation

One mission can capture eligible targets on a simulated pass.

24–30 h

Power, storage and downlink timeline

Captured data consumes storage; downlink transfers bounded packet volume.

30–36 h

Three progressive missions, scoring and debrief

Mission 01–03 can be completed and scored.

36–42 h

Visual polish, QA, data disclosure and offline check

App remains playable when FIRMS is unavailable.

42–48 h

Deployment, demo, credits and submission

Public project link and short demo are accessible from a private window.

Team allocation (3–4 people)

Role

Ownership

Primary output

Game / frontend lead

React shell, game state, mission UX and release build

Playable web application and deployed link.

Data / backend engineer

FIRMS API, GIBS layer, normalization, cache and provenance

Reliable NASA-data pipeline and offline snapshots.

Simulation engineer

Orbit/swath, resource budgets, observation and downlink logic

Deterministic mission engine and tests.

UI / QA / content (if 4th)

Map usability, mission content, accessibility, test/demo

Readable game experience, mission progression and submission material.

For a three-person team, the frontend lead also owns content integration and demo production. Cut multiplayer, accounts, advanced AI, precise orbit determination, full-resolution imagery processing, and all claims of operational emergency support.

08  /  VALIDATION AND RESPONSIBLE USE

Testing and Evaluation Plan

Test area

Test case

Pass condition

FIRMS ingestion

Valid response, empty response, malformed row, expired key.

App identifies errors and uses cached data without mislabelling it as live.

Provenance

Target marker opened in the mission map.

Original acquisition date/time, sensor, confidence, FRP, and source state are shown.

Map imagery

Current GIBS date has missing tiles.

Fallback date/layer or neutral basemap is applied and disclosed.

Orbit / coverage

Change altitude, inclination, swath, and target location.

Eligibility changes deterministically and is labelled approximate.

Resource coupling

Capture data, fill storage, then downlink.

Power, storage, and delivered-data totals reconcile.

Mission scoring

Replay same scenario and configuration.

Same targets and score are produced; no hidden randomness.

Usability

First-time player completes Mission 01.

Player can explain why a target was or was not observed and delivered.

Risks and mitigations

Risk

Impact

Mitigation

FIRMS MAP_KEY not ready / expired

Live target feed unavailable.

Obtain key early; keep bundled sample; add status badge and no-secret frontend.

Sparse or stale active-fire detections

Mission board has too few targets.

Use a clearly labelled historical date/region snapshot from FIRMS.

GIBS time layer unavailable

Map imagery incomplete.

Check layer availability; allow fallback date or neutral basemap.

Fire detections misinterpreted

Game appears to claim real fire boundaries or safety value.

Use “hotspot/thermal anomaly”; display limitations and no-response disclaimer.

Orbit model overstated

Players mistake the demo for flight-grade coverage prediction.

Publish model assumptions; use “simulated pass/approximate swath” terminology.

Scope creep

No complete game by deadline.

Three missions, one sensor model, one region selector, one orbit engine.

How this can help NASA and the public

ORBITAL FIREWATCH can support NASA’s public STEM and Earth-science engagement by helping learners understand how satellite observations become geospatial information and how spacecraft engineering constrains what can be observed and returned. It demonstrates practical reuse of open NASA Earth-observation data and can encourage data literacy. It does not improve NASA’s operational wildfire detection, replace FIRMS, validate fire perimeters, or provide emergency-response recommendations.

Responsible-use boundary

FIRMS itself warns that active-fire / thermal-anomaly products have limitations, can be affected by cloud cover, and must not be used for preservation of life or property. The game is educational only and must not be marketed as a real-time alert or decision-support product. [6]

09  /  COMPLIANCE AND REFERENCES

NASA Space Apps Readiness Checklist

Challenge fit: show the complete chain from mission objective to satellite design, launch/orbit assumptions, resource checks, observation operations, downlink and evaluation.

Required source check: integrate at least one NASA dataset or resource explicitly listed in the official Challenge 13 Resources tab. FIRMS and GIBS are proposed NASA sources here, but their presence on that exact tab must be verified before claiming Global Award eligibility. [1][8]

Data provenance: ship DATA_SOURCES.md with sensor/product name, query area, date range, retrieval timestamp, field mapping, cache age, and intended use.

Attribution and licensing: cite NASA products, libraries, map layers, fonts, and third-party assets. Review Space Apps legal terms. [9]

AI disclosure: disclose AI tools used in the solution and label any AI-generated imagery. The map and dashboard figures in this document are custom illustrative mockups using synthetic coordinates, not live NASA data.

Public safety: prominently label the project “EDUCATIONAL SIMULATION — NOT FOR EMERGENCY RESPONSE.” Do not present hotspot priority as human-safety risk.

Public demo: open the project in a private browser window and test live data, cached fallback, and map layers.

References

[1] NASA Space Apps Challenge 2026 — event and participation information. Open source

[2] NASA Space Apps public team listing reproducing the CH13 Space Mission Design Game brief; official registration portal remains authoritative. Open source

[3] NASA FIRMS — Area API documentation, sensors, bounding-box and date parameters. Open source

[4] NASA FIRMS — free MAP_KEY registration and usage information. Open source

[5] NASA GIBS — Access Basics (WMTS/WMS, map layers and time dimension). Open source

[6] NASA FIRMS — map, detection interpretation and use limitations. Open source

[7] NASA FIRMS — Data Ingest and Manipulation tutorial; example VIIRS attributes. Open source

[8] NASA Space Apps — Resources and participant guides; verify official CH13 Resources tab. Open source

[9] NASA Space Apps — terms and legal requirements for project materials and citations. Open source

[10] NASA Scientific Visualization Studio — Active Fires as Observed by VIIRS, 2024–present (visual/data context). Open source

[11] NASA FIRMS — API tutorial and data access guidance. Open source

Source status: web-checked 15 November 2026. API availability, product names, map-layer availability, and challenge submission requirements should be rechecked before final submission.