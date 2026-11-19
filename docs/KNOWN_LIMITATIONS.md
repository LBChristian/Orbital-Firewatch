# Known Limitations

- **Challenge compliance:** the listed resources used are guidance documents (CubeSat 101, CMLs), not datasets; confirm with organisers that this satisfies the rule. FIRMS and GIBS are not on the list.
- **Live FIRMS path not exercised:** it was tested only against mocked responses; no MAP_KEY was available.
- **Orbit:** circular two-body orbit on a spherical Earth with no J2, drag or eccentricity. The first pass is aimed by construction. "97.6° sun-synchronous-like" is a label only.
- **Coverage:** 2D great-circle reach test. No instrument geometry, off-nadir distortion model, terrain, clouds or illumination constraint on optical captures.
- **Power:** fixed sun direction, cylindrical shadow, constant array output in sunlight, lump capture energy.
- **Stations:** notional locations; simple elevation mask; no link budget, weather or scheduling conflicts.
- **Detections:** axis-aligned footprint squares. Clustering is greedy and seed-dependent (deterministic). Live data in a mission region may give an unbalanced mission.
- **Missions:** M01–M07 and M09 have one main pass (2–2.5 h simulated). M08 and M10 run 3.6 h, so the orbit makes consecutive passes, but the mission objectives, operations UI and debrief do not yet treat passes separately (Update 1 Stage D/F).
- **Balance:** each documented strategy is one deterministic auto-operated run (docs/BALANCE_REPORT.md). Manual play can differ. M04 uses a 35% battery reserve rule instead of safe mode, because a single pass cannot capture enough to reach the 15% safe-mode threshold.
- **M06 imagery:** MODIS Terra on 2026-11-16 has a diagonal swath gap across the region at mission zoom (seen in the browser). NOAA-20 was blank that far north in November.
- **Rendering:** the game pauses when the browser stops animation frames (hidden tab or minimised window).
- **Untested:** the WebGL-unavailable fallbacks (2D satellite and Earth SVG) are implemented but were not tested on a non-WebGL device. Playwright end-to-end tests are not included; UI flows were checked manually in a browser.
- **Bundle size:** the JS bundle is about 1.18 MB (329 kB gzip), mostly Three.js and Leaflet.
