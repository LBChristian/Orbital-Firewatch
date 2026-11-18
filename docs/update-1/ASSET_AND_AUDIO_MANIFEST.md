# ASSET AND AUDIO MANIFEST

## 1. Included concept references

The `visual_references/` folder contains:
- `00_full_reference_board.png`: generated 2×2 concept board.
- `01_satellite_in_orbit.png`: satellite silhouette/material direction.
- `02_observation_environment.png`: Earth observation/environment direction.
- `03_mission_control_ui.png`: map/operations interface mood direction.
- `04_downlink_ground_station.png`: satellite-to-station communication scene direction.

These are AI-generated concept references, not NASA assets, official hardware depictions, final screenshots or licensed production assets. They may be used as internal direction only. Do not embed them as if they were in-game screenshots. Do not include NASA logos.

## 2. Production asset inventory

| ID | Asset | Type | Required use | Priority |
|---|---|---|---|---|
| A01 | Fictional observation satellite | Procedural Three.js model | Design bay, deployment, operations | Critical |
| A02 | Payload aperture/baffle | 3D subassembly | Payload choice and observation | High |
| A03 | Solar array wings + hinges | 3D subassembly | Design choice and deployment | Critical |
| A04 | Antenna / radio assembly | 3D subassembly | Downlink state | High |
| A05 | Battery/avionics representation | 3D subassembly or UI schematic | Resource explanation | Medium |
| A06 | Earth globe textures | Existing texture assets | Globe/map | Critical |
| A07 | Mission target and zone symbols | SVG/CSS/Canvas | Leaflet map | Critical |
| A08 | Orbit, pass and swath overlays | Canvas/SVG/Three geometry | Planner and operations | Critical |
| A09 | Ground station marker | SVG/Canvas | Contact planning | High |
| A10 | Campaign chapter thumbnails | Original artwork or map crops | Campaign selection | Medium |
| A11 | Mission briefing images | Original, licensed or map-derived | Mission briefings | Medium |
| A12 | Status/commendation icons | SVG | UI | Low |

Prefer procedural geometry and map-derived overlays where practical. Use licensed imagery only when provenance and license are documented.

## 3. VFX inventory

| ID | Effect | Trigger | Rules |
|---|---|---|---|
| V01 | Solar-array deployment | Deployment sequence | Eased hinge motion; skippable |
| V02 | Orbit trail | Satellite moving | Derived from actual simulated track |
| V03 | Sensor scan line/swath | Observation opportunity/capture | Match configured approximate swath; label simulated |
| V04 | Target acquisition marker | Target enters capture window | No fake detections |
| V05 | Capture confirmation | Capture completes | Brief and restrained |
| V06 | Downlink beam | Active station transmission | Only active while link is transmitting |
| V07 | Eclipse transition | Sunlight state changes | Derived from engine state |
| V08 | Safe-mode status | Safe mode entered | Clear visual state, no alarm spam |
| V09 | Packet transfer progress | Packet bytes delivered | Reflect actual throughput/progress |
| V10 | Mission completion | Debrief objective met | Restrained celebration, reduced-motion safe |

No explosions, fire spread simulation, disaster spectacle or random particle storms are required. Do not visualize a FIRMS pixel as a burning forest or confirmed perimeter.

## 4. Audio inventory

Use original synthesized or properly licensed sounds. The existing Web Audio implementation should be extended rather than replaced without need.

| ID | Sound | Trigger | Character |
|---|---|---|---|
| S01 | UI confirm | Primary action accepted | Soft, short, neutral |
| S02 | UI back/cancel | Navigation back | Quiet click |
| S03 | Validation pass | Design valid | Subtle positive tone |
| S04 | Validation warning | Warning present | Low-key two-tone cue |
| S05 | Validation fail | Hard constraint failed | Clear, non-startling cue |
| S06 | Deployment | Separation/array unfold | Mechanical latch + restrained servo |
| S07 | Observation acquisition | Target acquired | Short scanner tick |
| S08 | Capture complete | Observation stored | Brief confirmation pulse |
| S09 | Ground station acquired | Contact starts | Soft radio lock tone |
| S10 | Downlink active | Data transfer begins | Low, filtered radio texture |
| S11 | Packet delivered | Packet completes | Small digital confirmation |
| S12 | Critical resource warning | Battery/recorder threshold | Distinct but non-alarming warning |
| S13 | Mission complete | Objective satisfied | Short resolved motif |

Do not play sounds continuously at high volume. Provide independent mute/volume controls if channels exist. Never communicate critical state by sound alone. Test audio manually on at least one desktop browser and one mobile browser if mobile audio is supported.

## 5. UI iconography

Use one consistent icon family. Prefer simple line icons with labels. Do not use emoji as production interface icons. Ensure each icon has accessible text or tooltip.

## 6. Asset provenance

Maintain `docs/ASSET_CREDITS.md` with asset name, creator/source, URL, license, retrieval date, modifications and in-game use. For AI-generated concept references, label them as generated concept art and do not claim NASA authorship. Do not download or embed third-party assets without checking the license.

## 7. Asset delivery and naming

Use predictable lowercase names, descriptive filenames and existing asset folders. Compress raster textures appropriately. Prefer SVG for simple UI marks and procedural geometry for spacecraft components. Keep source files when available. Avoid huge uncompressed textures and duplicate assets.
