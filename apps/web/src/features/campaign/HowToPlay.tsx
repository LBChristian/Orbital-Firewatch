import { CODEX } from '../../components/Codex';
import { Button, Disclaimer, TopBar } from '../../components/ui';
import { useGame } from '../../game/state/store';

const STEPS = [
  ['Brief', 'See the real NASA hot spots and what the mission wants.'],
  ['Build', 'Pick parts. Match your satellite’s shape to what the mission leans on.'],
  ['Plan', 'Choose which targets to capture and where the pass crosses.'],
  ['Capture', 'Fly over. Capture targets while they are in view.'],
  ['Send', 'Send the data when a ground station is in range. Only sent data counts.'],
  ['Debrief', 'See what happened and what to try next.'],
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
        <p className="lede">You cannot capture everything. Pick what matters and get it home.</p>
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
          <dd>Skip ahead to the next pass or station</dd>
          <dt className="mono">↑ ↓</dt>
          <dd>Select target</dd>
          <dt className="mono">C / S / P</dt>
          <dd>Capture, skip, or do the selected target next</dd>
          <dt className="mono">D</dt>
          <dd>Send data, or stop sending</dd>
          <dt className="mono">A</dt>
          <dd>Turn auto-capture on or off</dd>
          <dt className="mono">?</dt>
          <dd>Open the codex</dd>
        </dl>
        <h2>Glossary</h2>
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
