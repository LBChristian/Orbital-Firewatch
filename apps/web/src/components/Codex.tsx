import { useEffect, useRef } from 'react';
import { SOURCES } from '@ofw/simulation';
import { useGame } from '../game/state/store';
import { Button, DISCLAIMER_SAFETY } from './ui';

export const CODEX: { id: string; title: string; body: string }[] = [
  {
    id: 'loop',
    title: 'How a mission works',
    body: 'Read the briefing, design a satellite that fits the budget and launch mass, plan which targets to queue, then fly the pass. A target only counts once it has been captured inside your swath, kept in the recorder, and sent to a ground station during a contact window.',
  },
  {
    id: 'firms',
    title: 'What a FIRMS detection is',
    body: 'NASA FIRMS reports satellite-detected active-fire and thermal-anomaly pixels. A point marks the centre of a hot pixel (about 375 m across at nadir for VIIRS, larger toward the scan edge). It can be a wildfire, an agricultural burn, a gas flare, a volcano or another hot surface. Clouds can hide fires. A detection is not a fire perimeter and says nothing about danger to people.',
  },
  {
    id: 'frp',
    title: 'FRP (Fire Radiative Power)',
    body: 'The radiant energy released by the hot pixel, in megawatts, as measured by the sensor. The game uses its rank within the loaded data as one input to GAME PRIORITY. FRP is not a danger, damage or severity score.',
  },
  {
    id: 'confidence',
    title: 'Confidence',
    body: 'A categorical detection-quality flag from the FIRMS product (low, nominal, high). It is not a probability that a fire exists. The game treats it as a qualitative cue and leaves out groups whose detections are all low confidence.',
  },
  {
    id: 'priority',
    title: 'GAME PRIORITY',
    body: 'A transparent game rule from 0 to 100: 45% FRP rank within the loaded data, 25% confidence cue, 15% recency (loses value over 48 hours behind the newest record), 15% mission objective relevance. It ranks targets for the game only.',
  },
  {
    id: 'groups',
    title: 'Target groups',
    body: 'Nearby detections (within 12 km of the brightest one) are grouped into one game target, such as TG-03. A group is a game convenience, not a burned area or fire boundary.',
  },
  {
    id: 'orbit',
    title: 'Orbit, altitude and inclination',
    body: 'Your satellite flies a circular orbit. Period follows T = 2π√(a³/μ): about 94 minutes at 450 km and 99 minutes at 700 km. Inclination limits how far north or south the ground track reaches (±30°, ±53°, or nearly pole to pole at 97.6°) and sets the angle at which the track crosses a region. Higher orbits widen the swath and lengthen station contacts but reduce detail.',
  },
  {
    id: 'pass',
    title: 'Orbital pass',
    body: 'A pass is a stretch of time when the ground track is over or near the mission region. Between passes the Earth turns beneath the orbit, so the next track lands about 24° of longitude further west. Missions here give you one main pass.',
  },
  {
    id: 'swath',
    title: 'Swath and reach',
    body: 'The swath is the strip of ground the sensor can see on either side of the ground track. A target can be captured while its distance to the track (great-circle) is within half the swath, plus 120 km with precision pointing. Captures in the outer 30% of the swath lose value with basic pointing.',
  },
  {
    id: 'detail',
    title: 'Detail tier',
    body: 'Each payload profile has a notional detail multiplier (wide 0.6, balanced 0.85, high 1.0) and altitude adjusts it (450 km x1.0, 550 km x0.95, 700 km x0.85). An observation is worth GAME PRIORITY x detail. These are game values, not measured resolutions.',
  },
  {
    id: 'power',
    title: 'Power and safe mode',
    body: 'Arrays generate power only in sunlight. The bus and pointing system draw power all the time, captures cost a burst of energy, and the radio draws power while transmitting. If the battery drops below 15% the spacecraft enters SAFE MODE: no captures or downlink until it recovers to 35%.',
  },
  {
    id: 'storage',
    title: 'Recorder (storage)',
    body: 'Each capture creates a data packet that occupies recorder space until it is delivered. When the recorder is full, new captures are rejected. You can choose to overwrite the lowest-value stored packet instead; the game never deletes data silently.',
  },
  {
    id: 'downlink',
    title: 'Downlink and contact windows',
    body: 'Packets reach the ground only while a ground station sees the satellite above its minimum elevation angle. Delivered megabytes = radio rate (Mbps) x contact seconds / 8. Packets go highest-value first unless you pick one to send next. The stations are notional game locations.',
  },
  {
    id: 'states',
    title: 'Data states',
    body: 'LIVE: fetched from FIRMS during this session. CACHED: an earlier FIRMS response reused. HISTORICAL: FIRMS data for a fixed past date. SYNTHETIC DEMO: invented training points, never NASA data. Every target shows its state and UTC acquisition time.',
  },
  {
    id: 'cml',
    title: 'Concept Maturity Levels (CML)',
    body: 'A JPL scale for how mature a mission concept is, from CML 1 (cocktail napkin) to CML 9 (ready for critical design review). The campaign walks the early steps: M01 tests initial feasibility (CML 2), M02 explores the trade space (CML 3), M03 commits to a point design with margins (CML 4). Real teams loop back from point design to trade space when a design fails, which is what the redesign button is for. Source: ' + SOURCES.cml.title + ', ' + SOURCES.cml.authors + ', ' + SOURCES.cml.year + '.',
  },
  {
    id: 'cubesat101',
    title: 'From NASA CubeSat 101',
    body: 'NASA’s guide for first-time small-satellite teams. Points this game draws on: a small satellite is anything under 300 kg; the attitude system points arrays at the Sun or a camera at Earth; build and test the ground station early; any Earth-imaging sensor needs a NOAA remote-sensing determination; every mission needs an orbital debris assessment before flight. Each design-bay choice cites the page it comes from.',
  },
  {
    id: 'score',
    title: 'Score',
    body: 'Observations 35%, data delivered 25%, mission objective 20%, resource efficiency 10%, engineering margin 10%. The debrief shows the inputs to each. The score rates your mission design and operations, not any real fire or response.',
  },
  {
    id: 'safety',
    title: 'Responsible use',
    body: `${DISCLAIMER_SAFETY} This game is not an alert, evacuation, dispatch or emergency-response tool.`,
  },
];

export function CodexDrawer() {
  const open = useGame((s) => s.codexOpen);
  const topic = useGame((s) => s.codexTopic);
  const close = useGame((s) => s.closeCodex);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const el = topic ? ref.current?.querySelector<HTMLElement>(`[data-topic="${topic}"]`) : null;
    (el ?? ref.current?.querySelector<HTMLElement>('button'))?.focus();
    el?.scrollIntoView({ block: 'center' });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, topic, close]);
  if (!open) return null;
  return (
    <>
      <div className="codex-backdrop" onClick={close} />
      <aside className="codex" role="dialog" aria-modal="true" aria-label="Help codex" ref={ref}>
        <div className="panel-head">
          <h3>Codex</h3>
          <Button variant="ghost" size="sm" onClick={close} kbd="Esc">
            Close
          </Button>
        </div>
        <div className="codex-body">
          {CODEX.map((c) => (
            <section key={c.id} className={`codex-entry ${topic === c.id ? 'focus' : ''}`} data-topic={c.id} tabIndex={-1}>
              <h4>{c.title}</h4>
              <p>{c.body}</p>
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}

export function InfoTip({ topic, label = 'What is this?' }: { topic: string; label?: string }) {
  const openCodex = useGame((s) => s.openCodex);
  return (
    <button className="info-tip" onClick={() => openCodex(topic)} aria-label={`${label} Open codex: ${topic}`} title={label}>
      ?
    </button>
  );
}
