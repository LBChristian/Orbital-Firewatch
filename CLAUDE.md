# ORBITAL FIREWATCH — Project Instructions for Claude Code

## Project
ORBITAL FIREWATCH is an independent educational browser game for the NASA Space Apps Challenge 2026 “Space Mission Design Game” challenge. Players design and operate a notional Earth-observation satellite to observe and transmit follow-up data for NASA FIRMS active-fire/thermal-anomaly detections.

## Core product rule
This must be a playable game, not a dashboard. The core loop is: Brief → Design → Validate → Plan → Observe on simulated orbital passes → Store → Downlink → Debrief → Redesign.

## Truth and provenance rules
- FIRMS records are NASA-derived thermal-anomaly/active-fire detections. They are not exact fire perimeters and may include non-fire hot sources or be affected by cloud cover.
- FIRMS confidence is categorical, not a calibrated probability. FRP is not a public-safety danger score.
- The player satellite, orbit, sensor swath, capture, downlink, clusters, priority score, and mission outcome are game simulation outputs.
- Never label synthetic data as LIVE or NASA. Support LIVE, CACHED, HISTORICAL, SYNTHETIC DEMO states and show timestamps.
- This is an educational game only, not an alert, evacuation, dispatch, wildfire response, or public-safety system.
- Verify that at least one NASA dataset is listed in the exact official Challenge 13 Resources section before claiming event Global Award data-source compliance.
- Never imply NASA endorsement. Do not use NASA insignia/logotype/seal as product branding.

## Engineering rules
- Use TypeScript for simulation logic.
- Keep units explicit and all tunable values in config files.
- Make simulation deterministic for the same seed/config/data.
- Separate source data, normalized data, simulation state, and rendered visualization.
- Document all simplified assumptions. Do not claim flight-grade accuracy.
- Keep FIRMS MAP_KEY on the server only. Never expose or commit secrets.
- Cache API data, use bounded queries, and keep the game playable offline with labelled fallback data.
- Handle all loading, empty, error, cache, and unavailable states.

## Visual rules
- Premium aerospace operations game aesthetic, not generic admin dashboard.
- Dark navy/charcoal base; cyan/teal active states; amber warnings; red critical states.
- Clear hierarchy, restrained glow, legible typography, no excessive cards or animation clutter.
- Build a detailed notional satellite asset with procedural Three.js geometry or a verified licensed GLB. Do not imply it is an actual NASA satellite.
- Main Earth map is Leaflet + NASA GIBS; 3D is used for the satellite design/launch vignette, not as a replacement for the data map.
- SFX should be generated with Web Audio API unless external licenses are verified. Audio must not autoplay.
- Respect reduced motion, keyboard access, and color contrast.

## Workflow
1. Inspect the repository and current git state before changing files.
2. Do not discard user changes or run destructive commands.
3. Keep the app compiling after each milestone.
4. Run `npm run typecheck`, `npm run test`, and `npm run build` after relevant changes; report actual results.
5. Do not claim a feature, test, API, or deployment works unless you verified it.
6. Keep README, decisions, data provenance, scientific assumptions, test plan, and asset credits updated.
7. Avoid scope creep. No accounts, online multiplayer, external AI API, or elaborate backend unless the user explicitly approves.
8. Ask only if a missing decision blocks work; otherwise make a reversible assumption and record it in `docs/DECISIONS.md`.

## Reference files
- `proposal/PROJECT_PROPOSAL_REFERENCE.md` — searchable text extraction of the proposal.
- `proposal/ORBITAL_FIREWATCH_Project_Proposal.docx` — formatted proposal narrative and intended scope.
- `reference-art/mission-dashboard-mockup.png` — visual reference only; do not treat embedded map points as real data.
- `reference-art/architecture-reference.png` — architecture visual reference only.
- `reference-art/coverage-schematic-reference.png` — gameplay/coverage concept reference only.
- `reference-art/dual-concept-board-reference.png` — overall visual reference only.

## Useful commands
Keep the actual package manager and scripts documented in the root README. Expected scripts where feasible:
- `npm run dev`
- `npm run dev:web`
- `npm run dev:api`
- `npm run typecheck`
- `npm run test`
- `npm run build`
