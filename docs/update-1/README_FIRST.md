# ORBITAL FIREWATCH — Update 1 Package

This package is a repository-aware implementation brief for expanding the current game into a complete 10-mission campaign. It is intended to be supplied to Claude Code from the root of `LBChristian/Orbital-Firewatch`.

## Package contents

1. `MASTER_UPDATE_PROMPT.md` — the primary instruction to Claude Code.
2. `GAME_DESIGN_SPEC.md` — player experience, campaign structure, progression and design rules.
3. `MISSION_SPECIFICATIONS.md` — detailed mission briefs for M01–M10.
4. `MISSION_DATA_REQUIREMENTS.md` — NASA data acquisition, provenance, validation and deterministic data packaging.
5. `SPACECRAFT_AND_OBJECT_CATALOG.md` — physical objects, spacecraft components, map objects and visual states.
6. `UI_UX_SPECIFICATION.md` — screens, interaction, information hierarchy and responsive behavior.
7. `ASSET_AND_AUDIO_MANIFEST.md` — required images, 3D models, VFX, SFX and implementation notes.
8. `TECHNICAL_IMPLEMENTATION_PLAN.md` — architecture-aware code plan and staged delivery sequence.
9. `ACCEPTANCE_TESTS.md` — functional, scientific, regression, usability and release gates.
10. `visual_references/` — original AI-generated concept reference sheet and four cropped panels.

## Important repository facts used to prepare this brief

The repository currently describes three missions: M01 First Pass, M02 Split Front and M03 Data Bottleneck. The existing architecture separates a deterministic TypeScript simulation (`packages/simulation`), an Express API (`apps/api`) and a React/Vite client (`apps/web`) using Leaflet, Three.js and Web Audio. FIRMS observations and GIBS imagery are already integrated, with bundled historical fallback data. The current simulation is intentionally approximate and the spacecraft, stations, costs, power, storage and communications are notional.

The repository documentation reported 51 passing tests, successful typecheck and build as of 2026-11-18. Claude must run the commands against the checked-out branch rather than assume those results still hold.

## How to use

1. Download and extract the ZIP.
2. Open the existing repository root in Claude Code.
3. Copy the contents of this package into a folder such as `docs/update-1/` in the repository, or leave the package beside the repo and provide its path.
4. Paste `MASTER_UPDATE_PROMPT.md` into Claude Code.
5. Require Claude to complete the audit and plan stage before implementation. Review the plan before approving any destructive or broad refactor.

## Non-negotiable data rule

The suggested geographic areas and mission concepts are design candidates, not proof that suitable NASA observations exist for a chosen date. Claude must inspect the current bundled data and query/archive candidate NASA FIRMS observations before locking mission dates, target counts, confidence distributions or objective thresholds. Never synthesize, edit or invent NASA detections. Synthetic training data must remain clearly marked as synthetic and must not be represented as NASA data.

## Visual reference disclaimer

The images are original AI-generated concept references. They are not NASA imagery, official spacecraft designs, final UI screenshots, production-ready 3D assets or scientifically validated depictions. They are visual direction only. Do not use NASA logos or imply NASA endorsement.
