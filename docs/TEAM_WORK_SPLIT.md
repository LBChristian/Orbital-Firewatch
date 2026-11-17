# Team Work Split

Shared contracts (change only with agreement):
- `packages/simulation/src/firms/types.ts` (`FirmsDetection`, `FirmsFeedEnvelope`, `DataState`)
- `config/catalog.ts` (`Loadout`)
- `config/missions.ts` (`MissionDef`)
- `engine/engine.ts` (`Command`, `GameEvent`, `RunState`)

| Role | Owns | Avoid editing |
|---|---|---|
| Frontend / game director | `apps/web/src/app`, `features/*`, `game/state`, `styles` | engine internals |
| NASA data / backend | `apps/api/**`, `game/data/feed.ts`, `scripts/extract-firms-snapshot.mjs`, `public/data` | screens |
| Simulation engineer | `packages/simulation/**` (orbit, engine, scoring, config), `scripts/balance-report.ts` | UI |
| Technical artist / UI / QA | `apps/web/src/three`, `game/audio`, `styles`, docs, demo | engine, API |

Workflow: one branch per module. Run `npm run typecheck && npm test && npm run build` before merging. Run `npm run balance` after any change to `config/*`.
