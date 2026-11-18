# SPACECRAFT AND WORLD OBJECT CATALOG

## 1. Art direction principles

The player spacecraft is fictional and educational. It should look like a plausible small Earth-observation satellite, not a replica of a named operational NASA spacecraft. All visible parts should communicate a real system choice or provide necessary world context. Keep the existing procedural Three.js model as the base; improve it incrementally.

## 2. Spacecraft assemblies

| Assembly | Visible objects | Gameplay relationship | Required visual states |
|---|---|---|---|
| Main bus | Box/hexagonal chassis, structural rails, equipment panels | Bus mass, housekeeping power, structural capacity | Idle, deployment, active, safe mode |
| Payload | Optical/thermal instrument housing, aperture, baffle, radiator | Payload type, swath, detail, capture time/energy | Idle, target acquisition, capture |
| Solar power | One or more hinged solar-array wings, cell grid, hinge/root bracket | Generation W, mass and deployed area | Stowed, unfolding, deployed, eclipse |
| Battery | Internal module, status indicator | Capacity Wh, charge/discharge | Charging, discharging, low reserve |
| Recorder | Internal avionics/storage bay; optional external panel for readability | Storage MB, queue state | Available, near full, full |
| Communications | Patch antenna or dish, feed/boom, radio module | Mbps, power draw, contact availability | Idle, acquiring, transmitting |
| Attitude/pointing | Reaction-wheel/pointing module represented visually but not physically simulated unless model exists | Pointing accuracy, slew/capture penalty | Stable, slewing, pointing |
| Thermal | Radiator panels and heat straps | Visualizes thermal design choice only unless a thermal model is explicitly implemented | Normal, thermal status warning if supported |
| Launch interface | Separation ring / adapter | Launch compatibility and mass | Attached, separation |

Do not show a part as an active mechanical subsystem if the simulation does not model it. Use tooltips to explain “visual representation” versus “simulated effect.”

## 3. Satellite model detail levels

- Silhouette: recognizable satellite with bus, payload, solar panels and antenna at small scale.
- Medium: panel hinges, aperture, radiator, antenna feed, bus rails and selected labels.
- Close-up: restrained panel seams, bolts and thermal blankets only if performance remains acceptable.

Prioritize silhouette and readable component differences over micro-detail. The model must update when the player changes payload, array, battery, recorder, radio or pointing choices. Ensure the model's geometry does not claim that a hidden component has a physical size that the balance model does not represent.

## 4. World and map objects

| Object | Purpose | Behavior |
|---|---|---|
| Earth globe / map | Geographic context | Existing textures and map projections; preserve layer credits/date |
| Ground track | Shows satellite subpoint path | Derived from simulation geometry |
| Sensor swath | Shows approximate observation corridor | Derived from payload and altitude; label as approximate |
| Target detection | Shows FIRMS pixel/cluster | Preserve confidence and source data; never imply perimeter |
| Mission zone | Defines objective geography | Explicit mission config geometry |
| Ground station | Shows notional contact point | Clearly label notional; contact state derived from geometry |
| Contact arc/line | Shows communication visibility | Derived from station visibility model |
| Eclipse boundary | Shows sunlight/shadow state | Derived from current simplified sun/shadow model |
| Orbit/pass marker | Distinguishes pass segments | Derived from multi-pass geometry |

## 5. Operations status objects

- Satellite status: nominal / reserve / safe mode, based on actual engine state.
- Battery indicator: current Wh and percentage; generation/consumption separate.
- Recorder: used/capacity MB and packet queue.
- Link: station, contact window, Mbps and transmission state.
- Target state: unobserved, queued, in-window, capturing, captured/stored, delivered, skipped, unreachable or failed, only if those exact states exist in the engine.
- Mission event marker: deterministic event with simulation timestamp.

## 6. Visual state rules

- Cyan: simulated spacecraft/data path and selected active system.
- Amber: attention, expiring window, constrained resource.
- Red: actual critical condition (safe mode, invalid design, contact lost where applicable).
- Green: validated or delivered success.
- Neutral: inactive or informational.

Color must never be the only distinction. Pair with labels, icons, patterns or shapes. Avoid blinking for noncritical states.

## 7. 3D animation list

1. Deployment: satellite separates from launch adapter; arrays unfold with eased but physically plausible timing.
2. Orbit idle: slow, restrained orientation relative to Earth; no random tumbling.
3. Payload acquisition: pointing mechanism moves only if pointing is part of the current simulation representation.
4. Observation: a scan footprint/line appears over the ground track when capture occurs.
5. Downlink: antenna points toward station and a narrow data-link beam appears only during active transmission.
6. Eclipse: solar panels visually enter shadow; do not make them glow as if generating power in eclipse.
7. Safe mode: reduce nonessential visual activity and clearly show state.

## 8. Accessibility and performance

- Respect reduced motion.
- Avoid excessive post-processing and full-screen particle systems.
- Use instancing or merged geometry for repeated details.
- Dispose of geometries, materials, textures and renderers on unmount.
- Preserve WebGL fallback and test it.
- Do not make any critical status available only in 3D; duplicate it in accessible 2D UI.
