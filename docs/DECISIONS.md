# Decisions

| # | Decision | Why | Reversible? |
|---|---|---|---|
| 1 | Repo created at `Documents/orbital-firewatch` (new git repo, `main`) | The setup guide suggests this location; there was no existing repo | Yes |
| 2 | npm workspaces: `packages/simulation`, `apps/api`, `apps/web` | Shared types and engine across server and browser | Yes |
| 3 | The simulation package is consumed as TypeScript source (Vite) and bundled into the API with esbuild | No separate build step for the shared package | Yes |
| 4 | Bundled snapshot comes from the public FIRMS 7-day CSV (no key) | No MAP_KEY was available; this is still real NASA data. Labelled HISTORICAL | Yes |
| 5 | Mission regions and dates were chosen after surveying the 7-day file | They give each mission the intended geometry (compact, split, dense) | Yes, via `missions.ts` + extraction script |
| 6 | Each mission is one main pass of 2–2.2 h simulated time, with coasting between events | Fits the 4–7 minute target; matches the "one pass" pitch | Yes |
| 7 | First-pass insertion is solved to cross the aim point | Guarantees a meaningful pass on real targets; documented as a convenience | Yes |
| 8 | Recency decays over 48 h instead of a min–max scale | Min–max over a single day ranked day and night overpasses as 0 vs 1 | Yes |
| 9 | Leaflet used directly (not React-Leaflet) | 60 fps imperative satellite updates and a custom canvas pixel layer | Yes |
| 10 | Detections are drawn on a custom canvas layer as squares | Honest pixel representation; 1,500+ points without DOM cost | Yes |
| 11 | Per-mission GIBS layer and date in config | Imagery coverage was checked per region (M01 needs MODIS Terra) | Yes |
| 12 | zustand for state; idb-keyval for the browser cache | Small, proven libraries | Yes |
| 13 | IBM Plex fonts via @fontsource (OFL), self-hosted | No external font requests; works offline | Yes |
| 14 | Procedural satellite and procedural Web Audio | Assets always exist; no licensing risk | Yes |
| 15 | Capture energy is a lump cost per capture | Makes power a real constraint at mission timescales | Yes |
| 16 | Commits are made by the team | Keeps history reviewable | n/a |
| 17 | Use CubeSat 101 and Concept Maturity Levels (both on the CH13 list) | Team chose this option; FIRMS and GIBS are not on the list | Yes |
| 18 | Citations live in config with printed page numbers, paraphrased, never long quotes | Keeps claims checkable and within copyright limits | Yes |
| 19 | The notional bus is described as a small satellite (<300 kg), not a CubeSat | CubeSat 101 defines both; the game bus is 40–68 kg | Yes |
| 20 | Update 1 specs kept in `docs/update-1/`; the AI-generated concept images were left out | The specs guide the work; the images are mood references only and add 2.3 MB | Yes |
| 21 | M06 Polar Watch moved from Alaska/Yukon to the West Siberian Plain | Alaska/Yukon had one FIRMS detection a day in the available window. Siberia has 39 groups above 60° N, out of reach of a 53° orbit. Briefing must say many may be industrial heat sources | Yes, if a later download has Alaska data |
| 22 | All M04–M10 snapshots come from one 7-day download (2026-11-18) kept in git-ignored `data-raw/` | The public file rolls daily; one hashed download makes the batch reproducible | Yes |
| 23 | Snapshot provenance is per snapshot (manifest schema v2), not top level | M01–M03 and M04–M10 come from different downloads | Yes |
| 24 | Snapshot CSVs are `-text` in `.gitattributes` | Windows `core.autocrlf` would change their bytes and break the hashes | Yes |
| 25 | M08 widened to 121–146° E; M09 moved to Tanzania/Kenya | M08 needs room for two consecutive-orbit tracks (about 24° apart); the East African candidate was far too dense | Yes |
| 26 | Campaign: Chapter I in order (M01→M02→M03); Chapter II (M04–M07) opens after all of Chapter I, any order; Chapter III after all of Chapter II, in order (M08→M09→M10) | Matches the Update 1 design. Before this, every mission was open at any time; Chapter I is now sequential so new players meet the loop first | Yes, `CHAPTERS` in `config/campaign.ts` |
| 27 | Unlocks depend on completion only (primary objective met); grade and score never lock anything | Update 1 rule; coaching, not gating | No |
| 28 | Settings has "Open all missions (practice)", off by default | Lets testers, judges and teammates reach any mission without editing storage; saved progress is untouched | Yes |
| 29 | Save format v2 under `ofw.save`; the v1 `ofw.progress` map is migrated once; an unreadable save resets to empty, keeps a copy in `ofw.save.unreadable`, and shows a notice | No accounts; local only; never crash on a bad save | Yes |
| 30 | New missions carry `balanceStatus: 'provisional'`, shown on the briefing and campaign screen | Their objectives are placeholders until Stage E; the player is told rather than misled | Yes, set to `balanced` per mission in Stage E |
| 31 | Chapter II missions practise CML 3 and Chapter III CML 4; CML 5+ is not used | CML 5 and above are about partners, contracts and schedule, which the game does not model | Yes |
| 32 | The mission archive screen became the campaign screen | One place lists missions; the spec's separate archive adds nothing yet | Yes |

