# MASTER PROMPT — ORBITAL FIREWATCH: UPDATE 1 / COMPLETE CAMPAIGN EXPANSION

You are acting as the senior game engineer, simulation engineer, technical artist, UI/UX lead and QA owner responsible for the first major content update to ORBITAL FIREWATCH. You are working inside the existing Git repository. Your task is to evolve the current playable prototype into a coherent 10-mission single-player campaign while preserving its working simulation, data provenance, architecture and identity.

This is an implementation assignment, not a greenfield redesign. The existing codebase is the source of truth. These documents are the intended product direction, but when a specification conflicts with an established technical constraint or actual repository behavior, stop, explain the conflict and propose the smallest safe resolution. Do not silently invent APIs, data fields, science or mechanics.

## 0. First response: audit only, do not edit

Before changing any file:

1. Inspect the complete repository tree, git status, active branch and recent commits.
2. Read `README.md`, `CLAUDE.md` if present, and all relevant files in `docs/`, especially product, architecture, scientific assumptions, data provenance, challenge compliance, decisions, test plan and known limitations.
3. Trace the implementation of missions, mission configuration, target normalization/grouping, orbit/coverage geometry, power, recorder, downlink, scoring, mission progression, persistence, screens, map layers, Three.js satellite, audio and tests.
4. Run the current baseline: install only if necessary, then `npm run typecheck`, `npm run test`, `npm run build`, and `npm run balance` if available. Record actual results and failures. Do not overwrite lockfiles or upgrade dependencies without justification.
5. Compare implementation with every file in this Update 1 package. Identify already implemented functionality, missing functionality, incompatible assumptions, data risks and regressions likely to occur.
6. Return an audit report and a staged implementation plan with exact files/modules expected to change. Wait for approval before broad implementation if the user has not already explicitly approved the implementation stage.

Never claim to have visually tested a screen, listened to audio, queried live NASA endpoints or validated a real dataset unless you actually did so during this session.

## 1. Product objective

Deliver a 10-mission campaign, keeping M01–M03 recognizable and adding M04–M10 as genuinely different engineering challenges. The campaign should teach satellite mission design through decisions with visible consequences. The player is an Earth-observation mission operator: design a fictional spacecraft, plan observation opportunities, operate the pass(es), capture selected thermal-anomaly observations, store them, downlink them and understand the outcome.

The experience should feel like a polished technical mission-control game, not a dashboard full of decorative widgets. The player must make meaningful decisions. Use clear typography, restrained color, strong hierarchy, map readability and purposeful animation. Avoid generic AI-generated interface tropes, excessive glowing cards, meaningless charts, random status pills and decorative fake telemetry.

## 2. Preserve existing architecture

Preserve and extend:

- `packages/simulation`: pure deterministic TypeScript simulation, configuration, geometry, mission engine, event log and scoring.
- `apps/api`: Express API, validated FIRMS access, caching, snapshot fallback and secret handling.
- `apps/web`: React/Vite client, Zustand state, Leaflet map, Three.js visualization and Web Audio.
- Existing data and manifest conventions under `apps/web/public/data/`.

Do not migrate frameworks, replace Leaflet, replace Three.js, rewrite the engine, introduce a server-side game engine, add accounts/multiplayer/payments or add a large dependency unless an explicit technical need is demonstrated. Keep simulation code free of DOM and Node APIs. Keep NASA keys server-only. Maintain deterministic replay and command logs.

## 3. Campaign requirements

Create three chapters:

- Chapter I — FIRST LIGHT: M01 First Pass, M02 Split Front, M03 Data Bottleneck.
- Chapter II — OPERATIONAL PRESSURE: M04 Shadow Line, M05 Dead Air, M06 Polar Watch, M07 Signal Triage.
- Chapter III — MISSION ASSURANCE: M08 Second Look, M09 Hard Limits, M10 Final Firewatch.

M01–M03 must retain their established learning objectives, regions, data provenance and current behavior unless a documented defect requires a targeted correction. Do not rewrite their objectives merely to make the new missions easier to implement.

Chapter II unlocks after completing the Chapter I campaign requirements. M04–M07 may be selected in any order. Chapter III unlocks after completing M04–M07. M08–M10 then become available in sequence or by chapter selection as defined in the design spec. Do not require an A/S grade to unlock content. Completion and commendations are separate.

A mission is complete when its primary objective is satisfied and the player reaches debrief. A low score should trigger coaching, not block campaign progression. Provide a campaign map/list that shows available, completed and locked missions with clear unlock requirements.

## 4. Mission identity and gameplay

Implement the seven new missions from `MISSION_SPECIFICATIONS.md`. Each mission must have:

- A clear narrative briefing and a single dominant engineering lesson.
- A specific region and a verified, fixed historical data package.
- Explicit objective conditions, optional/bonus objectives and fail/partial-success conditions.
- A recommended starter design that is feasible but not necessarily perfect.
- At least two viable design/operations strategies where the mission permits them.
- A reasoned debrief that cites actual simulation events and explains causal outcomes.
- Distinct visual/map treatment only where it improves understanding.

Do not fake environmental hazards, spacecraft failures or NASA observations. Mission events must be driven by deterministic simulation state and clearly labelled as simulated game events.

## 5. Core gameplay improvements

### 5.1 Operations must be playable

Audit the current `createRun(..., { autoObserve: true, autoDownlink: true })` behavior. Avoid making all operations an unattended animation. Provide an intentional assisted/guided experience and a manual operations experience. A suggested default is guided operations for the earliest onboarding mission and manual control introduced progressively. Preserve accessibility and allow players to adjust assistance.

Player actions should include the existing commands where supported: capture/observe, skip, prioritize next, begin downlink, auto-observe toggle, auto-downlink toggle, overwrite-lowest-value toggle and simulation speed. Do not add controls that the engine cannot actually honor. Explain action consequences before commitment when destructive (e.g. overwriting stored observations).

### 5.2 Multi-pass operations

M08 and M10 require meaningful planning across more than one pass. Reuse and extend existing pass/contact geometry. Do not simulate multiple passes by merely extending a single-pass timer if geometry, Earth rotation, sunlight and station visibility are not recalculated correctly. Each pass must have a distinct window, target opportunity and/or downlink opportunity. Preserve data in the recorder between passes. The player should be able to plan capture and transmission priorities across the full timeline.

### 5.3 Mission events

Introduce a small deterministic event system only if the current event log does not already support the required messages. Examples: target window opening/closing, battery entering reserve, recorder threshold reached, ground station acquired, downlink contact ending, target group captured, packet delivered. Events must be derived from actual engine state. No random scripted failures.

### 5.4 Resource accounting

Review power accounting, including generated energy while the battery is full. Distinguish energy generated, energy consumed, energy stored and curtailed energy. Battery state remains clamped, but statistics must not undercount generation due to capacity clipping. Add regression tests.

### 5.5 Data time correctness

Display and store separately: observation acquisition time, imagery layer date, retrieval timestamp and simulation time. Do not imply that a current FIRMS feed is temporally matched to a fixed historical GIBS basemap. If exact-date imagery is unavailable, label the imagery date visibly and provide a neutral/Blue Marble fallback.

## 6. NASA data and scientific integrity

Follow `MISSION_DATA_REQUIREMENTS.md` exactly. Historical campaign missions must be deterministic and playable offline. Live FIRMS data must remain a separate optional sandbox/challenge mode and must not change the fixed campaign's difficulty or mission balance.

Never fabricate detections, timestamps, FRP, confidence, sensor, source URL or NASA imagery. Never call synthetic records NASA data. Never turn FRP or GAME PRIORITY into fire severity, threat, risk or emergency-response guidance. A FIRMS thermal anomaly is not a fire perimeter. Keep the educational disclaimer visible in relevant places.

Before locking new mission data:

1. Query/inspect the real candidate NASA FIRMS source and date.
2. Confirm the mission bbox, product, acquisition date, rows, valid records, confidence distribution and target grouping.
3. Confirm that mission-specific target zones and objective counts are achievable.
4. Run the deterministic balance simulation for at least the recommended design and alternate configurations.
5. Record source, exact retrieval time, original product, source URL, raw snapshot hash, selected bbox/date, row count, normalization rejects, grouping parameters and known caveats in the manifest.
6. If the data is unsuitable, change the date/region/objective or choose another verified source. Do not hand-edit rows.

The README currently identifies FIRMS and GIBS as extra NASA services, not resources from the NASA Space Apps Challenge 2026 Challenge 13 Resources tab. Do not retroactively claim they were listed challenge resources. Keep challenge compliance statements accurate and distinguish educational use from official affiliation.

## 7. Visual direction

Use `visual_references/` as mood and composition references only. The satellite is fictional. Create a consistent visual language:

- Deep neutral/navy surfaces, restrained cyan for spacecraft/data path, amber for attention/priority, red only for critical warnings, green only for confirmed success.
- Map and data layers must remain readable over imagery.
- Real content first; decoration second.
- Use purposeful motion: solar-array deployment, scan pass, target acquisition, packet transfer, orbital movement and mission transitions.
- Respect reduced-motion settings. Avoid flashing, constant pulsing and motion that hides data.
- Do not reproduce exact AI concept text or inaccurate scientific symbols.

The 3D spacecraft should communicate selected design choices: bus, payload, solar array size, battery/thermal module, recorder and antenna/radio. Avoid adding tiny surface details that have no visual or gameplay purpose. Keep performance appropriate for ordinary desktop browsers and provide the existing non-WebGL fallback.

## 8. Required implementation order

Work in small reviewable stages:

A. Audit and design reconciliation.
B. Mission data acquisition and validation. No gameplay implementation until the candidate data packages pass validation.
C. Campaign configuration and progression model.
D. Simulation mechanics: multi-pass, power accounting, operational events, objective evaluation.
E. Mission balance and deterministic tests.
F. UI/UX: campaign, briefing, design/plan, operations, debrief, archive/data provenance.
G. 3D model, map overlays, VFX and audio.
H. Accessibility, responsive layout, offline behavior and performance.
I. Final regression, documentation and release report.

After each stage, run relevant tests and report files changed, tests run, results, known gaps and next stage. Do not silently continue through a failing stage.

## 9. Quality gates

All tests in `ACCEPTANCE_TESTS.md` must pass or be explicitly recorded as blocked with evidence. Minimum required commands: `npm run typecheck`, `npm run test`, `npm run build`, `npm run balance`. Add tests for every new deterministic mechanic and every mission's objective/balance. Add browser end-to-end tests if the repo's current test tooling can support them without destabilizing the project; otherwise document exact manual test scripts and evidence.

No console errors, no unhandled promise rejections, no leaked API keys, no fake NASA attribution, no broken deep links, no horizontal overflow at common mobile widths, no inaccessible critical actions and no regression in M01–M03.

## 10. Completion report

At completion, provide:

- Summary of delivered features.
- Mission-by-mission status and dataset provenance.
- Changed/added files.
- Architecture decisions and any deviations from these specs.
- Automated test/typecheck/build/balance results.
- Browser/device test coverage and items not tested.
- Performance/bundle-size observations.
- Known limitations and follow-up recommendations.
- Exact run instructions.

Do not describe a planned or mocked feature as complete. Do not claim the game is production-ready merely because the build passes.

Begin with the audit. Do not edit files until the audit and plan are presented and approved.
