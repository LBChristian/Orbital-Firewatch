# ACCEPTANCE TESTS — UPDATE 1

A test is Pass only when executed and evidence is recorded. A planned test is not a pass. Keep a dated test report in the repository.

## A. Baseline and regression

- [ ] Existing M01–M03 still load and retain their established objectives and data provenance.
- [ ] Existing design validation and mission scoring tests pass.
- [ ] Existing target normalization and raw-row retention tests pass.
- [ ] Existing deterministic replay tests pass.
- [ ] Existing API validation, cache, fallback and secret-redaction tests pass.
- [ ] No regression in map lifecycle cleanup or WebGL fallback behavior.

## B. Campaign

- [ ] Campaign shows all 10 missions grouped into three chapters.
- [ ] M01 is available at new-game start.
- [ ] M02/M03 availability follows current Chapter I rules (confirm exact intended order in implementation).
- [ ] Chapter II unlocks only after Chapter I completion requirements.
- [ ] M04–M07 are selectable in any order once Chapter II unlocks.
- [ ] Chapter III unlocks after M04–M07 completion.
- [ ] M08–M10 unlock according to the defined Chapter III progression.
- [ ] Mission grade does not block unlock.
- [ ] Completion, score and commendations persist across reload.
- [ ] Invalid/corrupt save recovers safely without crashing.
- [ ] Completing M10 unlocks Free Operations/Sandbox.

## C. Data provenance

For each M04–M10:
- [ ] Raw source snapshot exists and parses.
- [ ] Product/source/date/bbox/retrieval timestamp are recorded.
- [ ] Raw file checksum matches manifest.
- [ ] Normalized and rejected row counts reconcile.
- [ ] Confidence distribution is accurate.
- [ ] Target grouping is deterministic and does not invent detections.
- [ ] Mission zones contain the expected actual targets.
- [ ] GIBS layer and imagery date are verified and displayed separately.
- [ ] Mission works offline from bundled data.
- [ ] Synthetic demo cannot be relabelled as NASA data.
- [ ] No NASA MAP_KEY appears in client bundle, source maps, logs or docs.

## D. Simulation

- [ ] Energy generation is counted even when battery is full.
- [ ] Consumed energy matches modeled loads.
- [ ] Stored energy delta respects capacity and zero bounds.
- [ ] Curtailed energy is tracked and tested.
- [ ] Safe-mode entry/exit hysteresis is deterministic.
- [ ] M07 can include low-confidence records according to mission config.
- [ ] Existing missions retain their intended low-confidence behavior.
- [ ] M08 has at least two distinct computed passes.
- [ ] Earth-fixed ground track evolves across passes.
- [ ] Sunlight/eclipse is evaluated over the full multi-pass timeline.
- [ ] Station contacts are computed for each pass and elapsed time.
- [ ] Recorder contents persist between passes.
- [ ] Partial downlink progress persists correctly.
- [ ] Event ordering is deterministic.
- [ ] Replaying the same command log produces identical events, score and objective result.

## E. Mission feasibility and balance

For every new mission M04–M10:
- [ ] Recommended loadout passes hard design validation.
- [ ] Recommended loadout can complete primary objective.
- [ ] At least one alternate strategy is documented and tested where mission design allows.
- [ ] Objective thresholds are based on actual fixed data and engine outcomes.
- [ ] Optional objectives are achievable but not required for campaign progression.
- [ ] Failure/partial success is understandable and recoverable through retry/replan.
- [ ] Mission balance report includes resource margins, captured groups, delivered value and score.

## F. UI and gameplay

- [ ] Title → campaign → briefing → design → plan → deploy → operations → debrief works for all 10 missions.
- [ ] Locked missions show exact unlock requirement.
- [ ] Briefing displays FIRMS acquisition date and retrieval time separately from imagery layer/date.
- [ ] Design bay displays units and notional labels.
- [ ] Planner accurately displays reach, zones, passes and contacts.
- [ ] Operations provides functional player decisions; it is not merely an unattended animation.
- [ ] Destructive overwrite action requires clear confirmation.
- [ ] Debrief reconciles captured, stored, delivered and discarded data.
- [ ] Mission Analyst notes map to actual events/states.
- [ ] No critical information is communicated only by color or audio.

## G. Visual, audio and accessibility

- [ ] Satellite model updates with component selections.
- [ ] Solar deployment state matches deployment animation.
- [ ] Downlink beam appears only during actual transmission.
- [ ] Eclipse visual matches simulation sunlight state.
- [ ] Reduced-motion setting suppresses nonessential motion.
- [ ] WebGL-unavailable fallback remains playable.
- [ ] Audio can be muted and volume adjusted.
- [ ] Audio is manually auditioned; no clipping or repeated alarm fatigue.
- [ ] Keyboard navigation and visible focus work for core actions.
- [ ] Common viewport sizes tested: 1440×900, 1280×720, 1024×768, 768×1024, 375×812.
- [ ] No horizontal overflow at tested widths.

## H. Release commands

- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run balance`
- [ ] Production server smoke test: title route, deep link, API health, mission data, snapshot and textures.
- [ ] Browser console contains no unexpected errors.
- [ ] Final test report records environment, date, command, result and known gaps.

## I. Explicit non-claims

- [ ] Do not call the game flight-grade, operationally validated or an emergency-response tool.
- [ ] Do not claim real live FIRMS API validation unless tested with the actual service.
- [ ] Do not claim full accessibility certification based on a few manual checks.
- [ ] Do not claim mobile support beyond the devices/browsers actually tested.
- [ ] Do not claim NASA endorsement or official NASA affiliation.
