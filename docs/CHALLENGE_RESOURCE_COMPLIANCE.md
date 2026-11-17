# Challenge Resource Compliance

**Status: two listed resources are now used in gameplay (CubeSat 101, Concept Maturity Levels). Confirm with the organisers that guidance documents count toward the data-source rule, since neither is a dataset.**

## What was checked

- Page: https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/
- Checked on: 2026-11-18. The page reported last publication on 2026-11-13.
- Section: "NASA Data & Resources" (Resources tab).

## Resources listed on the official page

| Resource | URL |
|---|---|
| Design and Develop Science Missions | https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf |
| General Mission Analysis Tool (GMAT) | https://software.nasa.gov/software/GSC-19468-1 |
| Concept Maturity Levels (CMLs) | https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299 |
| Mission Design Lab (MDL) | https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/ |
| NASA Mission Viz | https://nasa.github.io/mission-viz/ |
| A Learning Game About Telescopes (Webb) | https://science.nasa.gov/mission/webb/game-build-it-yourself/ |
| CubeSat 101 | https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf |
| CSA Digital Games and Activities (partner agency) | https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp |

**NASA FIRMS and NASA GIBS are not on this list.** The game must not claim that FIRMS or GIBS satisfies the Global Award data-source rule for Challenge 13. Confirm the exact rule wording with the organisers.

(FIRMS does appear to be relevant to a different 2026 challenge, "Harmonization of MODIS and VIIRS Hot Spots". That does not change Challenge 13 compliance.)

## How each source enters the game today

| Source | Listed for CH13? | How it enters gameplay | Where visible | Attribution |
|---|---|---|---|---|
| NASA FIRMS VIIRS NOAA-20 | No | Real target locations (bundled snapshot or live via server) | Briefing, planning, operations maps; target detail | Map credits, target detail, Data & sources |
| NASA GIBS WMTS / WMS | No | Map imagery; 3D Earth textures | Map corner credit, title / deploy scenes | Map credits, Data & sources |

## Listed resources used in the game

| Resource | How it enters gameplay | Where visible | Attribution |
|---|---|---|---|
| CubeSat 101 (NASA CSLI, rev. Oct 2017) | Each of the 10 design-bay choices carries a paraphrased note with the printed page it comes from (pp. 4, 9, 11, 16–17, 20, 22, 41, 51, 54–55, 66, 69) and how the game simplifies it | Design bay (under every choice), codex entry "From NASA CubeSat 101", Data & sources | Linked citation "CubeSat 101, p. N" |
| Concept Maturity Levels (Wessen, Borden, Ziemer, Kwok; AIAA SPACE 2013) | Campaign framed as CML 2 Initial Feasibility (M01), CML 3 Trade Space (M02), CML 4 Point Design (M03), using the paper's level definitions (p. 2); failed missions point to the CML 2–4 feedback loop (p. 3) | Briefing, design bay header, debrief "Concept maturity" panel, codex, Data & sources | Linked citation "Concept Maturity Levels, p. 2–3" |

Code: `packages/simulation/src/config/references.ts` (citations, tested in `tests/references.test.ts`). Text was extracted from the source PDFs on 2026-11-18 and page numbers checked against it.

## Further options (not implemented)

These options use listed resources honestly. None of them is implemented yet.

1. **GMAT.** Use GMAT offline to produce reference orbital periods and ground tracks for the three orbit presets. Ship those numbers as validation fixtures in `packages/simulation/tests`, and show a "checked against GMAT" note in the scientific assumptions panel. This takes more effort, but it is a genuine engineering use of a listed tool.
2. **NASA Mission Viz.** Link from the debrief to Mission Viz for real mission timelines as further reading. This is weak on its own.


