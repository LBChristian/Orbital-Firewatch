# Product Spec: ORBITAL FIREWATCH

## Player promise

Design a notional Earth-observation satellite. Fly one pass over real NASA FIRMS thermal-anomaly detections. Bring the most valuable data home. You cannot observe everything.

## Core loop

Brief → Design → Validate → Plan → Observe (simulated pass) → Store → Downlink → Debrief → Redesign.

## Screens (as built)

| Screen | What the player does | Key outputs |
|---|---|---|
| Title | Start or continue campaign, campaign, how to play, data and sources, settings | Feed status, snapshot retrieval time, disclaimer |
| Briefing | Reads objective and constraints; chooses snapshot, live or synthetic data | Region and bbox, product, acquisition window (UTC), retrieval time, detections → target groups, data state |
| Design bay | Picks altitude, inclination, bus, payload, arrays, battery, recorder, radio, pointing, launch | Live mass, credits, power, storage, downlink, swath, data per capture; pass/warn/fail checks; changes since last launch; 3D model updates |
| Plan | Orders the capture queue, picks the first-pass aim point (M02), filters targets | Simulated ground track, swath and reach corridors, stations, predicted passes, contacts, reachable count, planned MB and Wh vs capacity |
| Deploy | 3-second skippable deployment vignette | |
| Operations | Watches the pass; Capture / Skip / Prioritize next / Begin downlink; auto-observe, auto-downlink and overwrite toggles; speed 0/1/2/4×; Next event | Moving satellite and scan line, target statuses with window countdowns, battery, recorder, link, packets, timeline tape, event log |
| Debrief | Replay, redesign, change plan, next mission | Grade, score categories with formulas, Mission Analyst causal notes, per-target outcomes, energy, downlink, storage, budget and mass margins, causal timeline |
| Campaign | Three chapters, ten missions; locked, available and completed status with the exact unlock requirement |
| Planning | Aim point, capture queue, per-pass breakdown (reachable groups, zones, eclipse), contacts and downlink capacity, battery budget against the reserve rule or safe-mode line |
| Map overlays | Mission zones (dashed amber with labels), the orbit's latitude limit when the region is near it, track sections in Earth's shadow, and a link beam only while transmitting |
| Operations | Passes and contacts panel (current or next pass, contact time left and capacity, data waiting), downlink prompt when auto-downlink is off, reserve-rule tracker, confirmed overwrite |
| Debrief | Objective check per condition, optional goals, per-pass captured/delivered/on board, commendations with rules, energy generated and unused |
| How to play, Data & sources, Settings | Info and settings, including assistance (mission default / always on / always off for observation and downlink) | Volumes, mute, test sound, reduced motion, map dimming, coaching tips |

## Campaign

| Mission | Region (FIRMS date) | New pressure | Success |
|---|---|---|---|
| M01 First Pass | Northern California (16 Nov 2026) | Learn the loop | Deliver 4 target groups |
| M02 Split Front | Zambezi basin + central Mozambique (14 Nov 2026) | Two fronts ~800 km apart; swath vs detail; inclination sets track direction | Deliver 2 groups in each front |
| M03 Data Bottleneck | Central New South Wales (15 Nov 2026) | Many targets, one post-pass contact; recorder and radio limit delivery | Deliver 600 observation value |

Balance against the bundled snapshot (`npm run balance`, auto-observe with all targets queued):

- **M01:** the recommended design succeeds (93, S). High Detail fails because its swath misses most targets.
- **M02:** the recommended design fails. Wide Swath between the fronts (79, B), a 30° inclination (92, S) and Wide Swath at 700 km with precision pointing (86, A) all succeed.
- **M03:** the recommended design fails (recorder full, radio limit). Balanced with the 250 Mbps radio succeeds (90, S). Wide Swath alone and High Detail alone fail.

## Scoring

Observations 35%, data delivered 25%, objective 20%, efficiency 10%, engineering margin 10%. Weights live in mission config; formulas are shown in the debrief. See [SCIENTIFIC_ASSUMPTIONS.md](SCIENTIFIC_ASSUMPTIONS.md).

## Out of scope (by design)

Multiplayer, accounts, payments, generative AI, operational orbit determination, fire perimeters, any safety or response advice.
