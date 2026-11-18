# TECHNICAL IMPLEMENTATION PLAN

## 1. Architecture guardrails

Keep the current monorepo and its dependency boundaries. Simulation logic remains pure TypeScript. API validates and serves data; client renders and sends commands to the deterministic engine. Keep mission configs data-driven. Keep secrets server-only. Keep historical data bundled for offline play.

## 2. Areas to inspect before coding

- `packages/simulation/src/config/missions.ts` and catalog/config files.
- FIRMS parsing, normalization, grouping and target eligibility policy.
- Orbit, geometry, pass segments, sunlight/eclipse and station contacts.
- `MissionRun` state machine, command log, events, replay and scoring.
- Design validation and balance scripts.
- Web Zustand store and persistence/versioning.
- Mission selection, briefing, design bay, plan, deploy, operations, debrief and archive screens.
- Leaflet overlays and map lifecycle cleanup.
- Three.js satellite composition and WebGL fallback.
- Web Audio SFX and settings.
- Existing test suites and documentation.

Use actual paths discovered in the repository. Do not assume the names above exactly match every implementation file.

## 3. Proposed domain model additions

Add only what is missing. Reuse existing types and naming conventions.

- CampaignChapter: id, title, missionIds, unlock requirements.
- MissionProgress: missionId, status, completedAt (if saved), bestScore, commendations.
- MissionObjective: id, type, target/threshold, required flag, evaluation method.
- MissionDataManifest: source/product/acquisition/retrieval/bbox/hash/counts/imagery metadata.
- PassDefinition or pass segment: stable id, start/end simulation time, geometry references, observation windows and contact windows.
- EnergyAccounting: generatedWh, consumedWh, storedWh delta, curtailedWh, batteryWh.
- MissionEvent: deterministic step/time/type/payload, using current event-log conventions.

Avoid duplicating the same fact in campaign progress, mission config and runtime state. Save only the minimum required for progression and replay.

## 4. Campaign and persistence

- Make chapter/mission unlock rules data-driven.
- Keep grade independent from completion.
- Store completion, best score and commendations in a versioned save format.
- If current local persistence exists, extend it with migrations and validation. If not, use localStorage or IndexedDB only after inspecting the existing data feed cache approach and choosing the smallest consistent option.
- Handle corrupt/old save gracefully with a recoverable reset path.
- No accounts, remote profile service or multiplayer.

## 5. Simulation work

### 5.1 Energy accounting

Calculate generated energy from generation power × elapsed time independently of battery clamp. Calculate consumed energy from actual load × elapsed time. Track stored delta after applying capacity and lower-bound constraints. Track curtailed generation when the battery is full. Ensure safe-mode thresholds still use battery state. Add deterministic tests for full battery, empty battery, eclipse, charging and load.

### 5.2 Target eligibility

Replace hardcoded low-confidence exclusion with a mission-configurable policy. Existing missions should retain current semantics unless an explicit config says otherwise. M07 should support low-confidence observations when present and relevant. Do not change confidence parsing semantics.

### 5.3 Multi-pass geometry

Extend the current geometry precomputation so the simulation timeline covers multiple orbits/passes. Recompute Earth-fixed ground track, sunlight, target windows and station contacts over elapsed time. Confirm no duplicate/impossible target windows. Use stable deterministic sampling. Ensure event ordering remains deterministic and command replay produces identical output.

### 5.4 Objective evaluation

Objectives should be pure evaluators over run state/events and mission config. Avoid embedding mission-specific branching in generic UI components. Unit-test every objective evaluator. Separate required completion criteria from optional commendations.

### 5.5 Mission event messages

Use a finite set of typed event kinds and derive them from state transitions. Avoid duplicate spam when a threshold remains crossed. Events should include simulation time and enough payload for a causal debrief.

## 6. Data pipeline

- Use current snapshot extraction scripts and manifest pattern.
- Add mission snapshot files only after source verification.
- Hash raw snapshots and store counts.
- Add manifest schema validation and test that every campaign mission references a present snapshot.
- Keep imagery metadata independent from FIRMS observation metadata.
- Ensure API fallback and static snapshot behavior continue working offline.
- Do not expose keys or full key-bearing upstream URLs.

## 7. UI work sequence

1. Campaign selection and unlock states.
2. Mission briefing with source/provenance metadata.
3. Design bay only if new component choices are needed; avoid unnecessary catalog inflation.
4. Planning view for new target zones and multiple passes.
5. Operations layout for manual decisions, pass timeline and resource telemetry.
6. Debrief with objective/commendation results and event-based causal analysis.
7. Archive/data-source explanations and settings for assistance/accessibility.

Prefer shared components for mission summary, resource meters, event log and objective status. Keep screen-specific state in the existing store architecture.

## 8. 3D and audio

- Modify the procedural satellite model to reflect component selections.
- Add solar deployment and downlink state animations only when tied to actual state.
- Keep all effects optional/reduced-motion safe.
- Reuse Web Audio synthesis and settings; do not add downloaded music or licensed SFX without provenance.
- Test WebGL fallback and disposal lifecycle.

## 9. Test plan

- Unit tests for new mission configs, data manifests, target policies, energy accounting, objective evaluators, pass geometry and progression.
- Integration tests for API snapshot retrieval/fallback and no secret leakage.
- Deterministic replay tests for every new command/event path.
- Balance tests that prove at least one recommended and one alternate strategy for each new mission.
- Browser tests for campaign unlock, mission flow, operations actions and debrief.
- Manual checks for audio, reduced motion, WebGL fallback and responsive breakpoints.

## 10. Suggested delivery milestones

| Milestone | Deliverable | Exit criteria |
|---|---|---|
| 0 Audit | Baseline and gap report | Existing tests/results recorded; no code changes |
| 1 Data | M04–M10 verified snapshots/manifests | All data gates pass or blocked items documented |
| 2 Campaign | 10 missions and progression config | Unlock/completion tests pass |
| 3 Engine | Power correction, target policy, multi-pass, objectives | Determinism and simulation tests pass |
| 4 Balance | Mission balance reports | Feasible recommended + alternate strategies |
| 5 UI | Campaign, briefing, plan, ops, debrief | Full mission flow works; no regressions |
| 6 Presentation | Model, map, VFX, SFX | Visual states match engine; accessibility checks pass |
| 7 Release | Docs and regression | Typecheck/test/build/balance and manual checks pass |

## 11. Technical risks

- Multi-pass geometry may expose assumptions tied to the current 2–2.2 hour single-pass mission.
- Historical NRT availability can change; preserve downloaded immutable snapshots and provenance.
- Fixed objectives can become infeasible if data is changed; data and objective balance must be versioned together.
- UI complexity can grow rapidly; use progressive disclosure and consistent components.
- 3D detail and Leaflet layers can increase memory/bundle size; measure before adding dependencies or textures.
- Existing mission defaults may over-automate operations; change carefully and preserve M01 onboarding.
