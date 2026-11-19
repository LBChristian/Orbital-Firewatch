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
| 33 | Objectives are composable conditions with pure evaluators (`engine/objectives.ts`); M01–M03 keep their single conditions unchanged | Required by the new missions; Chapter I behaviour and balance stay identical (balance output diffed) | Yes |
| 34 | A met objective with a constraint can be lost later (OBJECTIVE LOST event) | A "no safe mode" objective cannot honestly be complete until the mission ends | Yes |
| 35 | Five commendations with fixed rules (`commendations()` in `scoring.ts`); stored in the save; never gate unlocks | Spec asks for separate, explicit, optional criteria | Yes |
| 36 | Target policy is per mission (`targetPolicy`); M07 reserves 2 low and 1 high board slots | M07's optional goal needs every confidence category on the board; its snapshot has only 1 high group | Yes |
| 37 | Energy generated is counted in full; clamp losses are booked as curtailed or unmet | Fixes the undercount the Update 1 audit found; the score does not use these numbers, so balance is unchanged | No |
| 38 | Run config now carries the loadout | Needed to judge the Engineering commendation from the launched design | Yes |
| 39 | Every Update 1 mission's recommended design can win, but in M04, M06, M08 and M10 only with a planning choice (trim the queue, pick the aim point); the defaults fail | Meets "recommended can complete" while keeping automation from solving missions by itself | Yes |
| 40 | M04 uses a 35% operations reserve objective, with a pre-dawn pass at the end of eclipse | Payload busy time caps captures at about 12 per pass, which is not enough to reach the 15% safe-mode threshold; the reserve rule makes the eclipse trade-off real | Yes |
| 41 | M07's notional station moved after the pass (GS LINGNAN), and a "Mekong valley" aim point was added | With a contact before the pass, radio timing was the bottleneck instead of triage; the aim point makes the every-confidence optional goal reachable | Yes |
| 42 | Catalog gains a 70° inclination option (no cost) | Gives M06 a plausible alternative that reaches the latitude but not the band; other missions are unaffected | Yes |
| 43 | Recommended loadouts: M08 wide swath; M09 wide swath + compact arrays; M10 wide swath + precision + large recorder | Found by the balance sweep; see docs/BALANCE_REPORT.md | Yes |
| 44 | Documented strategies live in `config/balance.ts` and are asserted by tests | A mission, catalog or engine change cannot silently break the balance | Yes |
| 45 | Assistance defaults: Chapter I starts with auto-observe and auto-downlink on; Chapters II–III start with auto-downlink off. Settings can set either to mission default, always on or always off | Update 1 asks that not every mission be full automation; manual downlink makes delivery an operations decision without making captures tedious | Yes |
| 46 | Operations prompts the player when a station is in view, data is waiting and auto-downlink is off | Manual downlink should be a decision, not a trap | Yes |
| 47 | Turning on "overwrite when full" asks for confirmation | It permanently deletes stored packets | Yes |
| 48 | Balance tables stay auto-operated (both assists on) | They measure designs and plans; manual operation is the player's choice | Yes |
| 49 | Engine-state visuals (eclipse, link, zones, latitude limit) are drawn on the Leaflet map, not added to the 3D model | Operations happens on the map, and Update 1 says critical state must not exist only in 3D. The 3D model already reflects every component choice and the deployment | Yes |
| 50 | The link beam is drawn only while the engine's `transmitting` flag is set | Update 1 asks for no decorative beams | No |
| 51 | New procedural sounds: "warn" (design valid with warnings) and "downlink" (downlink started) | Fill gaps S04 and S10 in the Update 1 audio list; still Web Audio, no files | Yes |

