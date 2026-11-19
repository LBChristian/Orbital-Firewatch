# Balance Report: Update 1 missions

Recorded on 2026-11-20 from `npm run balance`. Each row runs the deterministic engine against the mission's bundled FIRMS snapshot, with auto-observe and auto-downlink on.

The rows come from `packages/simulation/src/config/balance.ts`. `packages/simulation/tests/balance.test.ts` runs every row and fails if the result changes. The same tests check that:

- every listed design passes hard validation (no FAIL check);
- every mission has at least two winning strategies and at least one losing one;
- the recommended loadout can win with at most a planning choice: an aim point, or a trimmed queue;
- the optional goals can be met by at least one listed strategy.

M01–M03 are unchanged by Update 1. Their balance output is identical to the pre-update baseline.

How to read the tables:
- **Plan** means the planner choices the strategy uses: aim point and queue. "Default" is the first aim point with every target queued, which is what the game starts with.
- **Min battery** is the lowest battery level reached during the run.
- **Optional goal** says whether the mission's optional goals were also met. These goals never gate progress.

## Design rule

The recommended design can complete every new mission. In M04, M06, M08 and M10 it does so only with a planning decision: trimming the capture queue or choosing an aim point. Flying the defaults fails. Automation therefore never solves those missions on its own, which is what Update 1 asks for.

## M04 SHADOW LINE

**Objective:** deliver 8 groups and keep the battery at or above the 35% operations reserve.

The pass is just before dawn, at the end of about 35 minutes in shadow, so every capture comes out of the battery.

| Strategy | Plan | Result | Min battery | Optional goal (≥50%) |
|---|---|---|---|---|
| Recommended (standard battery) | default | **fail**: 12 delivered | 29% | no |
| Recommended | queue trimmed to top 14 | **success** 95 S | 44% | no |
| Extended battery | default | **success** 98 S | 64% | yes |
| Larger arrays only | default | **fail** | 33% | no |
| Extended battery + wide swath | default | **success** 100 S | 59% | yes |

**Lesson:** the arrays cannot help in shadow. You must either carry more stored energy or capture less.

## M05 DEAD AIR

**Objective:** deliver 500 value.

There is one notional station at a 20° minimum elevation, giving about 330 s of contact.

| Strategy | Result | Delivered | Optional goal (top 3) |
|---|---|---|---|
| Recommended | **success** 90 S | 527 (4 packets left on board) | no |
| Low-rate radio | **fail** | 79 | no |
| High-rate radio | **success** 100 S | 784 | yes |
| Wide swath | **success** 91 S | 561 | yes |
| High-detail payload | **fail** | 259 | no |
| Northern aim point | **fail** | 0 | no |

**Lesson:** delivered data is limited by radio rate × contact time. There are two ways out: a faster radio, or smaller packets.

## M06 POLAR WATCH

**Objective:** 2 groups in each latitude band.

The 53° orbit is refused outright: its ground track never reaches 58° N.

| Strategy | Plan | Result | Bands (south / north) | Optional goal (11 groups) |
|---|---|---|---|---|
| Recommended (97.6°) | centre aim (default) | **fail** | 9 / 1 | no |
| Recommended | northern aim | **success** 100 S | 9 / 2 | yes |
| 70° inclination | default | **fail** | 9 / 0 | no |
| Wide swath | default | **success** 93 S | 10 / 3 | yes |
| Precision pointing | default | **success** 99 S | 9 / 3 | yes |
| High-detail payload | default | **fail** | 3 / 1 | no |

**Lesson:** an orbit's inclination sets how far north it can reach, but reaching a latitude is not the same as covering it. The 70° orbit gets to 70° N, yet its track turns back before it covers the north band.

## M07 SIGNAL TRIAGE

**Objective:** deliver 320 value.

The contact now comes after the pass, so the 2 GB recorder is the limit.

| Strategy | Result | Delivered | Optional goal (one of each confidence) |
|---|---|---|---|
| Recommended (small recorder) | **success** 76 B | 331 | no |
| Medium recorder | **success** 83 A | 447 | no |
| Wide swath | **success** 81 A | 390 | no |
| High-detail payload | **fail** | 166 | no |
| Western aim point | **fail** | 65 | no |
| 30° orbit + wide swath | **success** 79 B | 345 | yes |

The optional goal needs the only high-confidence group (TG-01, near 100° E) and a low-confidence group near 107° E in the same pass. That takes a 30° orbit with a wide swath, or the "Mekong valley" aim point with a wide swath and precision pointing.

## M08 SECOND LOOK

**Objective:** 2 groups in each zone, from data captured on at least 2 passes.

| Strategy | Plan | Result | Kimberley / Queensland | Passes with delivered data |
|---|---|---|---|---|
| Recommended (wide swath) | Kimberley first (default) | **fail** | 15 / 0 | 1 |
| Recommended | Queensland first | **success** 75 B | 4 / 2 | 2 |
| Balanced payload | Queensland first | **fail** | 1 / 0 | 1 |
| Balanced + precision pointing | Queensland first | **success** 79 B | 3 / 2 | 2 |
| Balanced + 30° orbit | Queensland first | **success** 95 S | 10 / 2 | 2 (optional goal met) |

**Lesson:** Earth turns about 24° under the orbit each revolution. Going east first lets the next orbit reach the Kimberley; going west first puts it over the ocean.

## M09 HARD LIMITS

**Objective:** deliver 6 groups.

The budget is 88 credits, launched on the 110 kg rideshare.

| Strategy | Cost | Result | Delivered | Optional goal |
|---|---|---|---|---|
| Recommended (wide swath, compact arrays) | 76 | **success** 80 A | 8 | yes |
| Balanced payload | 84 (budget warning) | **fail** | 5 | yes |
| Wide swath + small recorder | 73 | **success** 78 B | 8 | no |
| Wide swath + precision pointing | 87 (budget warning) | **success** 84 A | 9 | no |
| Low-rate radio | 71 | **fail** | 1 | yes |

These designs are blocked at launch by a hard failure:
- the high-detail payload exceeds the budget;
- the balanced payload with precision pointing exceeds the budget;
- the medium bus exceeds both mass and budget.

No single preset wins every category.

## M10 FINAL FIREWATCH

**Objective:** 2 groups in each of three zones, from data captured on at least 2 passes.

| Strategy | Plan | Result | West / Central / East |
|---|---|---|---|
| Recommended (wide swath, precision pointing, large recorder) | central zone first (default) | **fail** | 0 / 6 / 2 |
| Recommended | east zone first | **success** 87 A | 3 / 2 / 8 |
| Without precision pointing | east first | **fail** | 1 / 0 / 8 |
| 30° orbit + wide swath | east first | **success** 85 A (optional goal met) | 4 / 2 / 8 |
| Balanced payload | east first | **fail** | 0 / 0 / 6 |

**Lesson:** the capstone needs three things to line up: the right first pass, enough reach to cover the central zone, and the second orbit to cover the west zone.

## Known balance caveats

- Each result comes from one deterministic run with auto-observe on. A player who captures and downlinks by hand can do better or worse.
- In M04 and M06 some strategies fall close to the battery limits (M06 with precision pointing reaches 23%). Safe mode, at 15%, is not reached by any listed strategy.
- Every mission's targets come from one day of FIRMS data. Changing the snapshot requires re-running this report and its tests.
