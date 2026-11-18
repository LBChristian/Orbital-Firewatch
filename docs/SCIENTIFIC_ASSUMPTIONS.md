# Scientific Assumptions

Everything about the player's satellite is an **educational approximation**, labelled SIMULATED / APPROXIMATE in the game. It is not flight-grade.

## Earth and constants (`packages/simulation/src/constants.ts`)

- Spherical Earth, mean radius R = 6371.0088 km.
- μ = 398600.4418 km³/s².
- Sidereal rotation ω = 7.2921159e-5 rad/s.
- Data units are decimal: 1 MB = 10⁶ bytes, and delivered MB = Mbps × seconds / 8.

## Orbit

- Circular two-body orbit: a = R + h, period T = 2π√(a³/μ), mean motion n = √(μ/a³). This gives about 93.6 min at 450 km, 95.6 min at 550 km and 98.8 min at 700 km. The tests check 400 km (~92.4 min) and geostationary radius (~86164 s).
- The orbital-plane position is rotated by inclination and RAAN, then into Earth-fixed coordinates by θ = ωt (θ = 0 at mission start). The sub-satellite point is converted to latitude and longitude.
- **Insertion is a game convenience.** RAAN and the initial argument of latitude are solved so the ground track crosses the chosen aim point about 6 minutes after mission start, on the configured branch. If |aim latitude| exceeds the reachable latitude (i, or 180° − i for retrograde orbits), the design is invalid.
- **Omitted:** eccentricity, J2 nodal precession and apsidal rotation (so "sun-synchronous-like" 97.6° is only a label), drag, solar radiation pressure, third bodies, precession and nutation, polar motion, launch dispersions, attitude dynamics, SPICE ephemerides and orbit determination.
- The track is sampled every 2 s, about 14 km of ground travel per step, which is much smaller than the narrowest reach (75 km). Antimeridian crossings are split into separate segments, and this is tested.

## Coverage

- Effective swath = payload swath at 550 km × (altitude / 550). Reach = swath/2 + pointing extra reach (precision pointing adds 120 km).
- A target is eligible while its great-circle distance (haversine) to the sub-satellite point is within reach. This is a 2D cross-track approximation, not an instrument footprint model.
- Captures beyond 70% of the half-swath count as edge captures (×0.85 with basic pointing).
- A capture must still be in reach when it completes (capture time 4–9 s, +3 s with precision pointing), otherwise it fails.

## Power

- Battery in Wh, power in W, ΔWh = W × hours, clamped to [0, capacity].
- Sunlight uses a cylindrical Earth-shadow model. The sun direction is fixed for the mission, from the date's solar declination (Cooper's equation) and a chosen local solar time at the aim point. Earth's orbital motion during a 2–3 h mission (~0.1°) is ignored.
- Loads: continuous bus housekeeping + pointing, the radio while transmitting, and a lump energy cost per capture (covering cooler, slew and processing).
- Safe mode starts below 15% and clears at 35%. In safe mode no captures or downlink are possible.
- Energy bookkeeping (Update 1). Generated energy is the array output for every sunlit step, counted in full even when the battery is full. Used energy is every load: housekeeping, pointing, radio and captures. Whatever the clamp removes is booked as curtailed (battery full) or unmet (battery empty). The balance always closes: final = initial + generated − used − curtailed + unmet. Before Update 1, generation was undercounted while the battery was full; the battery state itself was always correct.

## Passes

- A pass is a contiguous stretch of steps with the sub-satellite point inside the region radius plus reach and margin. Longer missions (M08, M10: 3.6 h) contain consecutive orbits. Earth rotation, sunlight and station visibility are computed for every step, so the second pass crosses a different strip, about 24° further west at 550 km.
- Each packet records the pass it was captured on, and the recorder keeps data between passes.

## Storage and downlink

- Storage is reserved when a capture starts and released if the capture fails.
- When the recorder is full, captures are rejected unless the player turns on "overwrite lowest-value". The game never deletes data silently.
- Ground-station visibility uses the elevation angle from the station's position on the sphere (minimum 10–15°). Stations are notional.
- Packets transmit highest value first, unless the player picks one to send next. Partial progress is kept across contacts.

## FIRMS interpretation

- Each detection is a VIIRS 375 m thermal-anomaly pixel and is drawn as a square. When zoomed in, the square is sized by the reported scan × track. These squares are axis-aligned approximations; true pixel orientation is not modelled.
- Confidence (low / nominal / high) is a categorical quality flag. FRP (MW) is a radiative measurement.
- Target groups are greedy 12 km clusters seeded by the highest-FRP pixel. They are not fire perimeters.

## GAME PRIORITY (0–100)

100 × (0.45 × FRP percentile rank in the loaded data + 0.25 × confidence cue [high 1, nominal 0.7, low 0.35] + 0.15 × recency [1 − hours behind newest record / 48] + 0.15 × objective relevance [1 inside a mission zone, 0.5 outside; 1 if there are no zones]). This is a game rule. It is not severity, threat or risk.

## Score

| Category | Weight | Formula |
|---|---|---|
| Observations | 35% | captured value / sum of top-N GAME PRIORITY (N per mission) |
| Delivered | 25% | delivered value / captured value |
| Objective | 20% | mission progress fraction |
| Efficiency | 10% | 0.4 × packet yield + 0.3 × (no safe mode ? 1 : 0.3) + 0.3 × min(1, budget margin / 20%) |
| Margin | 10% | mean of min(1, mass margin / 10%), min(1, lowest battery / 30%), recorder never full (1 : 0.3) |

Observation value = GAME PRIORITY × payload detail × altitude detail × edge factor. A grade above C requires the objective to be met.

## Objectives and commendations

- **Primary objective.** One condition, or several that must all hold. Delivery conditions only ever become true: deliver N groups, deliver a value, groups per zone, data from N distinct passes, the top N GAME PRIORITY groups, or one group per confidence category. Constraint conditions hold until something breaks them: no safe mode, a battery floor, or no data lost to the recorder. If a constraint breaks after the objective was met, the engine logs OBJECTIVE LOST and the mission does not count as complete.
- **Secondary objectives** are optional and use the same conditions.
- **Commendations** never gate progress:
  - Mission Complete: primary objective met.
  - Engineering: every design check at PASS, with no warnings.
  - Science: every secondary objective met. Missions with none instead need at least the reference number of groups delivered.
  - Operations: no safe mode, no lost or rejected data, no failed captures, and every packet delivered.
  - Perfect: all four of the above.
- **Target policy.** Chapter I keeps its original rule: groups whose best confidence is low are left off the board. M07 includes them and reserves board slots by confidence: 2 low and 1 high, the only high group in its snapshot. The rest of the board is filled by GAME PRIORITY as before.

All component values (mass, cost, W, Wh, MB, Mbps, swath) are **notional game parameters** (`isNotional: true`).
