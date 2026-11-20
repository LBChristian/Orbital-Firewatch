import { CODEX } from '../../components/Codex';
import { Button, Disclaimer, TopBar } from '../../components/ui';
import { useGame } from '../../game/state/store';

const STEPS = [
  ['Brief', 'Read the objective and look at the real NASA FIRMS detections for the region. Check their data state: HISTORICAL, LIVE, CACHED or SYNTHETIC DEMO.'],
  ['Design', 'Pick an orbit, payload, power, recorder, radio, pointing and launch. Mass, budget and power checks must pass before you can fly.'],
  ['Plan', 'See your simulated ground track and swath. Queue the targets you want, in order, and choose where the first pass aims.'],
  ['Observe', 'During the pass, auto-observe captures queued targets in reach. You can capture, skip or reprioritise by hand.'],
  ['Store and downlink', 'Captures wait in the recorder until a ground station is in view. Delivered data is what scores.'],
  ['Debrief', 'See exactly why each target was delivered, stored, missed or lost, then redesign and fly again.'],
];

export function HowToPlay() {
  const closeInfo = useGame((s) => s.closeInfo);
  return (
    <div className="screen">
      <TopBar>
        <Button variant="ghost" size="sm" onClick={closeInfo}>
          Back
        </Button>
      </TopBar>
      <main className="page howto">
        <h1>How to play</h1>
        <p className="lede">You cannot observe everything. Decide what matters, design for it, and get the data home.</p>
        <ol className="howto-steps">
          {STEPS.map(([t, b]) => (
            <li key={t}>
              <h3>{t}</h3>
              <p>{b}</p>
            </li>
          ))}
        </ol>
        <h2>Keyboard</h2>
        <dl className="kv keys">
          <dt className="mono">Space</dt>
          <dd>Pause or resume</dd>
          <dt className="mono">1 / 2 / 4</dt>
          <dd>Simulation speed (never changes results)</dd>
          <dt className="mono">N</dt>
          <dd>Jump to just before the next pass or contact</dd>
          <dt className="mono">↑ ↓</dt>
          <dd>Select target</dd>
          <dt className="mono">C / S / P</dt>
          <dd>Capture, skip, prioritise the selected target</dd>
          <dt className="mono">D</dt>
          <dd>Begin or stop downlink</dd>
          <dt className="mono">A</dt>
          <dd>Toggle auto-observe</dd>
          <dt className="mono">?</dt>
          <dd>Open the codex</dd>
        </dl>
        <h2>Codex</h2>
        <div className="codex-grid">
          {CODEX.map((c) => (
            <section key={c.id} className="codex-entry">
              <h4>{c.title}</h4>
              <p>{c.body}</p>
            </section>
          ))}
        </div>
        <Disclaimer full />
      </main>
    </div>
  );
}
