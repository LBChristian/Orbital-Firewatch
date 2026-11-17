# Asset Credits and Data Provenance

| Asset / dataset | Creator / provider | Source URL | License / terms | Changes made | In-game use / attribution |
|---|---|---|---|---|---|
| FIRMS VIIRS NOAA-20 375 m NRT detections | NASA LANCE FIRMS | https://firms.modaps.eosdis.nasa.gov/ | NASA open data; FIRMS use limitations apply (not for preservation of life or property) | Rows selected by bbox and date, copied verbatim; normalised at runtime; grouped for gameplay | Target data with state badge, acquisition UTC, retrieval time; map credits |
| GIBS Corrected Reflectance (MODIS Terra, VIIRS NOAA-20), Blue Marble Shaded Relief, Reference Features | NASA GIBS / ESDIS | https://nasa-gibs.github.io/gibs-api-docs/ | NASA imagery, openly available | Tiles only; dimmed with CSS filter | Map corner credits layer and date |
| Blue Marble Next Generation, VIIRS Black Marble 2016 textures | NASA (via GIBS WMS) | https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi | NASA imagery, openly available | Exported at 2048×1024 JPEG | 3D Earth on title and deploy screens |
| CubeSat 101: Basic Concepts and Processes for First-Time CubeSat Developers (rev. Oct 2017) | NASA CubeSat Launch Initiative / Cal Poly | https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf | NASA public release | Paraphrased notes with page citations | Design bay notes, codex |
| Space Mission Concept Development Using Concept Maturity Levels (2013) | Wessen, Borden, Ziemer, Kwok (JPL) | https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299 | CC0 1.0 (record license) | CML names and paraphrased definitions | Briefing, design bay, debrief, codex |
| Satellite model | Team / generated procedurally in code | `apps/web/src/three/satelliteModel.ts` | Project code | n/a | Labelled "notional", "fictional spacecraft" |
| Canvas textures (foil, solar cells, radiator) | Procedural in code | same file | Project code | n/a | n/a |
| Sound effects and ambience | Procedural Web Audio | `apps/web/src/game/audio/sfx.ts` | Project code | n/a | n/a |
| IBM Plex Sans, Sans Condensed, Mono | IBM | https://github.com/IBM/plex | SIL Open Font License 1.1 | Self-hosted via @fontsource | UI typography |
| Libraries: React, Vite, Leaflet, Three.js, zustand, idb-keyval, Express, zod, csv-parse, Vitest, supertest | Respective authors | npm | MIT / BSD-2 (Leaflet) / ISC | none | Credits on the Data & sources screen |

No NASA insignia, logotype or seal is used. No third-party game assets are used. The reference art in the starter kit was not copied into the game.

## Data labels

- LIVE: retrieved during this session; the original acquisition time is shown.
- CACHED: earlier NASA FIRMS data reused, with age shown.
- HISTORICAL: a fixed past date (the bundled snapshot).
- SYNTHETIC DEMO: invented test and tutorial data, never NASA observations.

## Disclaimer

ORBITAL FIREWATCH is an independent educational simulation. It is not affiliated with or endorsed by NASA. It is not a wildfire alert, evacuation, dispatch, emergency-response or public-safety decision system. NASA FIRMS detections are active-fire/thermal-anomaly observations with limitations and must not be used to protect life or property.
