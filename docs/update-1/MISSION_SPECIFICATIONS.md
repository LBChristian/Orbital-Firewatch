# MISSION SPECIFICATIONS — CAMPAIGN M01–M10

## Mission data status convention

M01–M03 are existing missions with documented snapshot dates. M04–M10 below are proposed mission designs. Their regions are candidates only. No date, detection count, target count, confidence mix or data availability is guaranteed until the data acquisition gate in `MISSION_DATA_REQUIREMENTS.md` passes.

## Chapter I — FIRST LIGHT

### M01 — FIRST PASS (existing; preserve)
- Region: Northern California, USA.
- Existing snapshot: FIRMS NOAA-20 VIIRS 375 m C2 NRT, acquisition date 2026-11-16, 85 source rows in current manifest.
- Lesson: full loop — design, plan, observe, store and downlink.
- Existing objective: deliver 4 target groups.
- Keep the recommended configuration feasible and preserve the introductory guided flow.
- Verify that imagery date is displayed separately from acquisition/retrieval time.

### M02 — SPLIT FRONT (existing; preserve)
- Region: Zambezi basin and central Mozambique; two target fronts separated by roughly 800 km in the current design.
- Existing snapshot: acquisition date 2026-11-14, 1,512 source rows in current manifest.
- Lesson: sensor swath, detail and inclination determine whether both fronts can be reached.
- Existing objective: deliver at least 2 groups in each front.
- Preserve the tested strategy notes: wide swath and a suitable inclination can succeed; the recommended default is intentionally not optimal.

### M03 — DATA BOTTLENECK (existing; preserve)
- Region: Central New South Wales, Australia.
- Existing snapshot: acquisition date 2026-11-15, 160 source rows in current manifest.
- Lesson: a large number of potential observations does not guarantee delivery; recorder and radio throughput constrain results.
- Existing objective: deliver 600 observation value.
- Preserve the documented balanced/fast-radio solution and the recorder-overflow teaching moment.

## Chapter II — OPERATIONAL PRESSURE

### M04 — SHADOW LINE

**Core lesson:** energy generation changes with sunlight and eclipse; stored energy must cover loads during shadow periods.

- Candidate region: Amazon Basin, Brazil. Select an exact subregion/date only after data verification.
- Scenario: a target corridor is crossed during a mission timeline that includes a meaningful eclipse interval. The challenge is to complete observations without entering safe mode or exhausting reserve.
- Primary objective: complete the mission and deliver a data-defined minimum observation value while keeping battery above the safe-mode threshold (or recover from a documented threshold crossing only if the mission is deliberately designed to teach recovery).
- Secondary objective: finish with a defined reserve, such as at least 25% battery. Set the exact threshold after simulation balance.
- Engineering objective: choose solar generation and battery capacity within mass/cost constraints.
- Operational objective: choose when to observe and when to preserve energy; allow the player to pause or skip low-value opportunities.
- Required systems: time-varying sunlight/eclipse, generation and consumption accounting, battery capacity, safe-mode hysteresis, energy timeline.
- Visuals: Earth-shadow arc on orbit view; solar-array state; battery charge/discharge graph; clear eclipse entry/exit markers.
- Avoid: random battery failure, arbitrary solar storms, fake weather effects or changing the sun vector without a documented model.
- Balance: compare at least small/large array and small/large battery combinations. Recommended design must complete the primary objective with a sensible reserve.

### M05 — DEAD AIR

**Core lesson:** a satellite may capture valuable data but fail to deliver it if no suitable ground-station contact is available or the radio is underpowered.

- Candidate region: Borneo, Indonesia. Verify target data and choose notional ground station geometry that produces meaningful but fair contact windows.
- Scenario: observations are distributed across a pass; the satellite has a short contact opportunity and a constrained downlink budget.
- Primary objective: deliver a data-defined threshold by the end of the available contact window(s).
- Secondary objective: deliver a selected high-priority packet before the contact closes.
- Engineering objective: select radio rate/power and antenna capability while respecting mass, budget and power.
- Operational objective: prioritize packet queue, decide when to start downlink, and avoid wasting contact time on low-priority data if the player has a better strategy.
- Required systems: explicit contact start/end, link rate, transfer progress, packet ordering, partial transfer persistence and contact handover if applicable.
- UI: contact countdown, estimated capacity (Mbps × available seconds / 8), queued MB, delivered MB, radio energy cost and packet priority.
- Visuals: ground station marker, line-of-sight/contact arc and restrained link beam during active downlink.
- Balance: create at least two viable strategies: higher-throughput radio versus selective capture/priority. Do not make one component a mandatory single answer unless the mission briefing explicitly teaches that hard constraint.

### M06 — POLAR WATCH

**Core lesson:** inclination controls latitude reach; orbit altitude and swath influence coverage, but cannot compensate for an unreachable latitude.

- Candidate region: Alaska/Yukon. Verify a fixed dataset with targets at latitudes that expose the reach constraint.
- Scenario: the target zone extends toward high latitudes. A low-inclination orbit cannot reach all targets, regardless of sensor detail.
- Primary objective: deliver a data-defined minimum number/value of observations inside a designated high-latitude zone.
- Secondary objective: capture at least one target from a secondary lower-latitude band if the dataset supports it.
- Engineering objective: choose a feasible inclination and sensor configuration while maintaining mass/cost limits.
- Operational objective: select an aim point/branch or plan the reachable target sequence using current planner capability.
- Required systems: correct reachability checks for prograde/retrograde inclinations; clear unreachable-latitude validation; target-zone overlay; no fake polar access.
- Visuals: latitude bands, orbit ground track and reachable/unreachable distinction.
- Balance: recommended design must not make all targets trivially reachable. At least one plausible alternative should trade altitude/swath against inclination.

### M07 — SIGNAL TRIAGE

**Core lesson:** observations have different data quality and game-priority cues; limited time/storage requires deliberate selection. Confidence and FRP are measurements/attributes, not danger ratings.

- Candidate region: mainland Southeast Asia. Choose a date/region only if the actual snapshot includes a useful mix of confidence categories and sufficient target groups.
- Scenario: the player cannot capture every target. They must decide which observations are worth the time, storage and energy cost.
- Primary objective: deliver a data-defined objective value while capturing a minimum count from the mission's defined categories/zones.
- Secondary objective: deliver at least one observation from each eligible confidence category present in the fixed snapshot. Do not require a category absent from the dataset.
- Engineering objective: choose a payload/recorder combination suited to limited capacity.
- Operational objective: use queue ordering, manual prioritization and skip controls. A low-confidence target may still be valuable under a mission objective; do not automatically exclude it.
- Required code audit: current target construction reportedly uses `excludeLowOnly: true`. Make this a mission-configurable policy. Preserve existing behavior for M01–M03 unless their configs say otherwise. For M07, include low-confidence detections when the real data and objective require them.
- Scoring: GAME PRIORITY remains a transparent game rule. Explain its components; do not label it severity, threat or risk.
- Visuals: confidence categories use accessible labels/patterns, not color alone; priority explanation panel; queue compare view.

## Chapter III — MISSION ASSURANCE

### M08 — SECOND LOOK

**Core lesson:** a mission can span multiple orbital passes. Capture windows, eclipse, recorder capacity and ground-station contacts must be coordinated across time.

- Candidate region: Central Australia. Verify enough historical observations and a timeline that allows at least two meaningful opportunities.
- Scenario: the first pass offers a limited observation window; the next pass creates another opportunity and/or a later downlink contact. Data stored during pass one remains onboard.
- Primary objective: deliver a data-defined amount across at least two distinct passes.
- Secondary objective: capture targets on both passes and deliver all selected high-priority packets.
- Engineering objective: balance recorder, battery, radio and sensor capability for a longer mission timeline.
- Operational objective: schedule capture and downlink priorities across pass boundaries; preserve packets between contacts.
- Required systems: pass-segment model, per-pass access windows, Earth rotation and station visibility across elapsed time, battery/sunlight progression, persistent recorder state, contact windows and deterministic event timeline.
- Do not fake multi-pass by replaying the same ground track or by appending a second pass without recomputing geometry.
- UI: timeline grouped by pass, upcoming pass summary, inter-pass battery/storage status, event markers and queued packets.
- Balance: at least two strategies (capture-heavy then downlink later; early downlink then second-pass capture) should be viable.

### M09 — HARD LIMITS

**Core lesson:** engineering is a constrained optimization problem. A design that excels in one metric can violate mass, cost, power, structural or launch constraints.

- Candidate region: East African observation corridor. Select the region only after verifying an adequate dataset and target geometry.
- Scenario: a constrained mission procurement envelope with strict limits on mass, cost and resource capability.
- Primary objective: validate and fly a design within all hard limits, then deliver a data-defined threshold.
- Secondary objective: achieve specified positive margins in at least two engineering categories.
- Engineering objective: make the player read validation checks, not brute-force one stat. Show why each invalid configuration fails.
- Operational objective: complete the run without safe mode or recorder overflow.
- Required systems: clear hard-fail versus warning classification; mass/cost/power/storage/launch compatibility; margins calculated from actual configured values; no hidden requirements.
- UI: engineering constraint panel with current value, limit, margin and consequence. Use consistent units.
- Balance: several component combinations should be valid; one “perfect” preset should not dominate every criterion.

### M10 — FINAL FIREWATCH

**Core lesson:** integrate payload selection, orbit geometry, target triage, power, storage, multi-pass scheduling and downlink into one capstone mission.

- Candidate geography: a multi-zone region or two connected observation corridors chosen only after a data audit. Avoid a global crisis narrative or implication of emergency response.
- Scenario: a sequence of observation opportunities across at least two passes, with a limited recorder and constrained downlink contacts. The player chooses which target groups to prioritize and when to transmit.
- Primary objective: deliver a data-defined campaign threshold and satisfy at least one objective condition in each designated zone.
- Secondary objectives: preserve a reserve, meet a packet-priority condition and finish within mass/cost limits.
- Engineering objective: create a balanced design that can operate through the entire timeline.
- Operational objective: make multiple consequential decisions; automation is available but should not solve the entire mission by itself.
- Required systems: all prior mechanics, multi-pass timeline, clear staged objectives, robust save/replay, debrief causal chain.
- Visuals: capstone briefing with route/zone overview; mission timeline; consistent satellite model; celebratory but restrained completion sequence.
- Unlock: completion unlocks Free Operations/Sandbox, not a paid item or random reward.
- Balance: require at least two viable strategies and ensure that one poor early decision does not make the rest of the mission incomprehensible. Provide a retry/replan option.

## Cross-mission definition of done

Every mission must have a verified data package, a deterministic config, a recommended loadout, a balance report, objective tests, at least one alternate viable strategy where reasonable, a briefing, a clear operations timeline, a causal debrief and a provenance display. New missions must work offline using their bundled historical snapshots.
