# GAME DESIGN SPECIFICATION — UPDATE 1

## 1. High concept

ORBITAL FIREWATCH is a browser-based educational mission-design game. Players design and operate a fictional Earth-observation satellite to collect selected NASA FIRMS thermal-anomaly observations and deliver the data to notional ground stations. The game turns orbital geometry, sensor coverage, spacecraft power, onboard storage and communications into understandable trade-offs.

## 2. Design pillars

1. Decisions have visible consequences. A narrower sensor improves detail but reduces coverage; a faster radio may cost mass, budget and power; a larger battery adds reserve but consumes mass and cost.
2. Real data, honest labels. NASA observations are real and traceable; spacecraft and mission outcomes are simulated.
3. Learn through operation. The player should understand not only which design failed, but when and why it failed.
4. Replay through strategy. Each mission should allow multiple valid configurations or operational plans where possible.
5. Technical clarity over spectacle. Visuals support comprehension; never hide the map, numbers or causal information.

## 3. Target experience

- Platform: desktop-first browser game, responsive down to tablet/mobile widths.
- Mode: single-player campaign plus unlocked sandbox.
- Session: a mission should be understandable in 10–20 minutes, with later multi-pass missions taking longer.
- Audience: players curious about space systems, Earth observation and engineering trade-offs; no prior orbital mechanics knowledge required.
- Tone: credible, calm, urgent when a contact/window is ending, never militaristic or disaster sensationalist.

## 4. Campaign structure

### Chapter I — First Light
- M01 First Pass: learn the full mission loop.
- M02 Split Front: trade swath and inclination to cover separated target zones.
- M03 Data Bottleneck: recorder and downlink capacity constrain delivered data.

### Chapter II — Operational Pressure
- M04 Shadow Line: power generation, eclipse and battery reserve.
- M05 Dead Air: ground-station access and limited communication opportunities.
- M06 Polar Watch: inclination, latitude reach and orbit geometry.
- M07 Signal Triage: choose observations under limited time/resources using quality cues without confusing them with hazard severity.

### Chapter III — Mission Assurance
- M08 Second Look: schedule capture and downlink across multiple passes.
- M09 Hard Limits: satisfy hard mass, cost, power and structural margins simultaneously.
- M10 Final Firewatch: integrated multi-pass campaign requiring robust design and operational priorities.

## 5. Player flow

Title → Campaign → Mission briefing → Design bay → Mission plan → Deployment → Operations → Debrief → Next mission / redesign / replay.

The player may return to the campaign between missions. The game should autosave completed mission state and selected loadout if the current persistence layer supports it. If no reliable persistence exists, add a small versioned local save with safe migration and reset controls; do not add accounts.

## 6. Progression and rewards

- Unlock by completion, not grade.
- Show mission completion and commendations independently.
- Commendations: Mission Complete, Engineering Commendation, Science Commendation, Operations Commendation, and optional Perfect Mission. Each has explicit criteria and is not required to advance.
- Avoid XP grind, artificial currency and pay-to-win. Optional unlocks should be mission presets, visual decals or archive entries only if they do not distort engineering choices.
- Completing M10 unlocks Free Operations / Sandbox. Sandbox supports selectable mission region/date/data state where available, custom design and repeatable runs. It must clearly distinguish live, cached, historical and synthetic data.

## 7. Difficulty curve and assistance

- M01: guided; explain the core loop and allow assisted observation/downlink.
- M02: introduce deliberate design and planning choices; keep optional coaching.
- M03: teach storage/radio throughput; make the bottleneck understandable before launch.
- M04–M07: each introduces one dominant constraint and requires the player to operate at least one important decision.
- M08: multi-pass scheduling and persistent recorder state.
- M09: engineering validation with hard constraints and margins.
- M10: integrate the full set of mechanics with minimal but accessible coaching.

Provide separate toggles for coaching, assisted observation and assisted downlink. Do not conflate these. A player may disable coaching while retaining automation, or operate manually while keeping contextual help.

## 8. Mission objective design

Each mission has:
- Primary objective: required for completion.
- Secondary objective: optional additional challenge.
- Engineering objective: design/validation criterion.
- Operational objective: one or more player-command criteria.
- Science/quality objective: based only on available FIRMS fields and explicit game rules.

Avoid objectives based on exact target counts until the fixed snapshot is acquired and tested. Prefer data-driven counts and explicit zone IDs. A mission must have at least one feasible recommended configuration. A mission may have multiple valid strategies; document them in the balance report.

## 9. Scoring

Retain the current category weighting unless a tested change is necessary:
- Observations: 35%
- Data delivered: 25%
- Objective: 20%
- Efficiency: 10%
- Engineering margin: 10%

Keep formula disclosure in debrief. A grade above C currently requires objective completion; verify this remains consistent with campaign completion and commendations. Do not let grade gate unlocks.

Mission-specific bonus criteria should add commendations or clearly identified bonus score, not secretly alter the global scoring model. Do not use FRP as a direct measure of fire danger. GAME PRIORITY is a game rule, not an emergency-risk score.

## 10. Debrief requirements

The debrief must answer:
1. What was the objective?
2. What did the spacecraft actually observe?
3. What data was stored, lost/rejected, overwritten (if player authorized), and delivered?
4. Which resource or geometry constraint mattered most?
5. Which player decisions caused the result?
6. What is one actionable design or operations change for the next attempt?

Every Mission Analyst statement must be traceable to engine state/events. Avoid generic AI-generated coaching. Use deterministic rule-based explanations.

## 11. Data and safety language

Use exact terms: FIRMS active-fire/thermal-anomaly detections; observation acquisition time; imagery layer and imagery date; retrieval timestamp; simulated spacecraft; notional station; game priority. Never call detections fire boundaries, confirmed incidents, danger scores or emergency alerts. Maintain the educational disclaimer and non-affiliation statement.

## 12. Visual language

- Primary base: dark graphite/navy, neutral text, cyan data/satellite, amber attention, red critical only, green confirmed success.
- Use a consistent spacing and type scale. Avoid excessive rounded cards, gradients, glow and large ornamental icons.
- Maps must prioritize geographic context and target legibility.
- Charts must answer a question, include units and labels, and not duplicate numbers already visible.
- Animations must explain deployment, scan, capture, downlink or state transitions.
- Reduced-motion mode must suppress nonessential animation and camera movement.
