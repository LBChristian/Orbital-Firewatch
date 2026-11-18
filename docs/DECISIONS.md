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
