# UI / UX SPECIFICATION — UPDATE 1

## 1. Overall interface direction

Mission-control utility with editorial clarity. Use a restrained dark neutral base, readable typography, strong spacing and a limited accent palette. Avoid excessive glowing panels, pill overload, decorative data, fake telemetry and generic AI dashboard styling. The interface should look designed for a player making operational decisions, not like a wall of admin widgets.

## 2. Global navigation

- Title screen: Start campaign, Continue, Mission archive, Free Operations (locked until M10), How to Play, Data & Sources, Settings.
- Campaign screen: three chapter groups; each mission card displays ID, title, region, core lesson, status and unlock requirement.
- Global top bar: game title/brand, current mission context, back navigation and pause where appropriate.
- Keep primary action consistent and in a predictable location.

## 3. Campaign screen

Each mission entry should show:
- Mission ID and title.
- Region and date (historical acquisition date where fixed data exists).
- One-sentence engineering challenge.
- Status: Locked, Available, In Progress, Completed.
- Commendations earned as secondary metadata.
- Clear unlock requirement for locked missions.

Do not hide chapter content behind a horizontal carousel. A vertical campaign list or chapter grid is acceptable. Ensure keyboard navigation and visible focus states.

## 4. Briefing

Required content:
- Mission objective and optional objectives.
- Region map with target zones and data state.
- NASA FIRMS source/product and acquisition date.
- Retrieval timestamp, source row count and target-group count.
- GIBS layer name/date shown separately.
- Engineering constraints and recommended starting design.
- Educational disclaimer and source link.

Use concise sections with progressive disclosure. The player should understand the problem before entering the design bay.

## 5. Design bay

- Keep component choices grouped by subsystem: bus/structure, payload, power, storage, communications, pointing, launch/orbit.
- For each choice show mass, cost, power, capacity/rate/swath as applicable, with units.
- Show total mass, budget, power generation/load, storage and link capability in a persistent summary.
- Distinguish Pass, Warning and Fail. Explain what the constraint means and which gameplay consequence follows.
- Update the 3D model when a component changes, but do not make model animation block controls.
- Provide Reset to recommended and compare-with-previous options if already supported or safely added.
- Do not invent component statistics. Use the existing catalog and mark all game values as notional.

## 6. Mission planning

- Map is primary. Show target groups, mission zones, ground track, sensor swath/reach, station markers and pass/contact windows.
- Keep target filters and queue visible without obscuring map geography.
- For M02, make the two fronts visually distinct and explain reach/inclination.
- For M06, clearly show reachable latitude versus unreachable latitude.
- For M08/M10, show separate passes and the relationship between observation windows and downlink contacts.
- Display planned observations, estimated data MB and energy Wh against actual capacities. Label estimates as simulation predictions.

## 7. Deployment

- Short, skippable scene.
- Show spacecraft separation and solar-array deployment.
- No long unskippable cinematic.
- Respect reduced motion and reduced visual effects.

## 8. Operations console

### Layout

- Main map/globe: dominant central area.
- Left rail: mission timeline, target queue and next opportunity.
- Right rail: spacecraft resources, contact and packet queue.
- Bottom strip: event timeline and simulation controls.
- On narrower screens, convert rails into tabs/drawers; do not shrink map until unusable.

### Persistent telemetry

- Mission elapsed time.
- Current pass and next pass if applicable.
- Battery Wh and percentage; generated and consumed energy where available.
- Recorder used/capacity MB.
- Ground station/contact state and time remaining.
- Radio rate and delivered MB.
- Current target/window status.

### Actions

- Capture/Observe, Skip, Prioritize next, Begin downlink, automation toggles, overwrite toggle and speed controls only where the engine supports them.
- Explain that overwrite can discard stored observations and require explicit confirmation.
- Provide pause and step/next-event support.
- Do not default every mission to full automation. Assistance should be intentional and adjustable.
- Ensure actions are keyboard accessible and have clear disabled reasons.

## 9. Debrief

- Outcome summary and grade.
- Primary objective completion.
- Commendations earned and remaining criteria.
- Score categories and formulas.
- Captured/stored/delivered/skipped/unreachable target breakdown.
- Power, storage and downlink reconciliation.
- Causal timeline with key events.
- Mission Analyst explanation based on engine events.
- Recommended redesign or operational change.
- Buttons: Replay, Redesign, Return to Campaign, Continue (when unlocked).

Do not display a generic AI-generated paragraph. Every insight must map to an actual measured event or state.

## 10. Data & Sources

A dedicated page explains:
- NASA FIRMS source and product.
- NASA GIBS imagery layer and date.
- LIVE/CACHED/HISTORICAL/SYNTHETIC DEMO labels.
- What a thermal anomaly is and what it is not.
- Why a detection is not a perimeter or a verified incident boundary.
- Why GAME PRIORITY is only a game score.
- Non-affiliation and educational-use disclaimer.

## 11. Settings and accessibility

- Master/music/effects volume if separate channels exist.
- Test sound.
- Reduced motion.
- Map dimming/contrast if existing functionality supports it.
- Coaching tips toggle.
- Assisted observation and assisted downlink toggles.
- Text scale or compact mode if feasible.
- Keyboard controls reference.

Minimum: keyboard navigation, visible focus, semantic labels, no color-only state, sufficient contrast, reduced motion, no essential information in sound only, and no interaction requiring hover only.

## 12. Responsive and performance targets

Test at 1440×900, 1280×720, 1024×768, 768×1024 and 375×812. Avoid horizontal overflow. At mobile widths, prioritize map, mission status and action access; collapse secondary panels into tabs. Preserve the existing WebGL fallback and ensure the 2D game remains playable.
