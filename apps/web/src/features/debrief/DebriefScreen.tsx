import { useEffect, useMemo, useState } from 'react';
import { CAMPAIGN_MISSION_IDS, CML_CITATION, CML_ITERATION_NOTE, cmlLevel, formatMet, getMission, missionAvailability, type GameEvent } from '@ofw/simulation';
import { Cite, CmlTrack } from '../../components/Citation';
import { Button, Meter, SimBadge, StateBadge, TopBar, fmtNum } from '../../components/ui';
import { sfx } from '../../game/audio/sfx';
import { useGame } from '../../game/state/store';

const TIMELINE_TYPES = new Set<GameEvent['type']>([
  'pass-start',
  'pass-end',
  'capture-complete',
  'capture-failed',
  'capture-rejected',
  'storage-warning',
  'packet-lost',
  'contact-start',
  'contact-end',
  'downlink-start',
  'downlink-stop',
  'packet-delivered',
  'battery-low',
  'safe-mode',
  'safe-mode-exit',
  'objective-complete',
  'objective-lost',
  'mission-end',
  'command',
]);

const OUTCOME_CLASS: Record<string, string> = {
  DELIVERED: 'txt-go',
  'STORED, NOT DELIVERED': 'txt-warn',
  'LOST (OVERWRITTEN)': 'txt-crit',
  'MISSED: NEVER IN REACH': 'muted',
  'MISSED: RECORDER FULL': 'txt-crit',
  'MISSED: LOW ENERGY': 'txt-crit',
  'MISSED: IN REACH, NOT CAPTURED': 'txt-warn',
  SKIPPED: 'muted',
};

export function DebriefScreen() {
  const report = useGame((s) => s.report);
  const run = useGame((s) => s.run);
  const missionId = useGame((s) => s.missionId);
  const env = useGame((s) => s.feed.envelope);
  const go = useGame((s) => s.go);
  const selectMission = useGame((s) => s.selectMission);
  const progress = useGame((s) => s.progress[s.missionId]);
  const [showAll, setShowAll] = useState(false);
  const m = getMission(missionId);
  const allProgress = useGame((s) => s.progress);
  const unlockAll = useGame((s) => s.settings.unlockAll);
  // The next mission in campaign order, only if it is open now.
  const nextId = CAMPAIGN_MISSION_IDS[CAMPAIGN_MISSION_IDS.indexOf(m.id) + 1];
  const next = nextId && missionAvailability(allProgress, nextId, unlockAll).status !== 'locked' ? getMission(nextId) : undefined;

  useEffect(() => {
    if (report) sfx(report.success ? 'reward' : 'failure');
  }, [report]);

  const events = useMemo(() => {
    if (!run) return [];
    const ev = run.state.events.filter((e) => TIMELINE_TYPES.has(e.type));
    return showAll ? ev : ev.filter((e) => e.severity !== 'info' || e.type === 'pass-start' || e.type === 'contact-start');
  }, [run, showAll]);

  if (!report || !run) {
    return (
      <div className="screen">
        <TopBar />
        <main className="page">
          <p>No debrief yet. Fly a mission first.</p>
          <Button onClick={() => go('briefing')}>Go to briefing</Button>
        </main>
      </div>
    );
  }
  const g = run.config.geometry;
  const spec = run.config.spec;

  return (
    <div className="screen">
      <TopBar />
      <main className="page debrief">
        <header className={`debrief-head ${report.success ? 'win' : 'lose'}`}>
          <div>
            <p className="mono faint">
              {m.code} {m.name} debrief
            </p>
            <h1>{report.success ? 'Mission objective met' : 'Mission incomplete'}</h1>
            <p className="lede">{report.objective.detail}. {m.objective.text}</p>
            {env?.state === 'SYNTHETIC DEMO' && <p className="small txt-syn">Flown on SYNTHETIC DEMO training data; not recorded in mission progress.</p>}
          </div>
          <div className="grade-block" aria-label={`Score ${report.total} of 100, grade ${report.grade}`}>
            <span className={`grade grade-${report.grade}`}>{report.grade}</span>
            <span className="mono score">{report.total}</span>
            <span className="tiny muted">of 100{progress ? ` · best ${progress.bestScore}` : ''}</span>
          </div>
        </header>

        <div className="debrief-actions">
          <Button
            variant="primary"
            onClick={() => go('deploy')}
          >
            Replay mission
          </Button>
          <Button onClick={() => go('design')}>Redesign satellite</Button>
          <Button onClick={() => go('planning')}>Change plan</Button>
          {next && (
            <Button
              onClick={() => {
                selectMission(next.id);
                go('briefing');
              }}
            >
              Next mission: {next.name.toLowerCase()}
            </Button>
          )}
          <Button onClick={() => go('campaign')}>Campaign</Button>
          <Button variant="ghost" onClick={() => go('title')}>
            Main menu
          </Button>
        </div>

        <div className="debrief-grid">
          <section className="panel">
            <div className="panel-head">
              <h3>How the score was calculated</h3>
              <SimBadge>GAME SCORE</SimBadge>
            </div>
            <div className="panel-body score-cats">
              {report.categories.map((c) => (
                <div key={c.id} className="score-cat">
                  <Meter label={`${c.label} (${Math.round(c.weight * 100)}%)`} value={c.fraction} max={1} display={`${c.points.toFixed(1)} pts`} tone={c.fraction >= 0.75 ? 'go' : c.fraction >= 0.4 ? undefined : 'warn'} />
                  <p className="tiny muted">
                    <span className="mono">{c.formula}</span>. {c.explanation}
                  </p>
                </div>
              ))}
              <p className="tiny muted">
                Total = sum of category points ({report.categories.map((c) => c.points.toFixed(1)).join(' + ')} = {report.total}). A grade above C needs the objective met. The score rates your
                mission design and operations, not any real fire.
              </p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Mission analyst</h3>
              <span className="tiny muted">from this run's event log</span>
            </div>
            <ul className="analyst">
              {report.analyst.slice(0, 4).map((n) => (
                <li key={n.id} className={`note note-${n.severity}`}>
                  <p>{n.finding}</p>
                  <p className="small">
                    <strong>Redesign: </strong>
                    {n.suggestion}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel span-2">
            <div className="panel-head">
              <h3>Commendations</h3>
              <span className="tiny muted">optional; never needed to progress</span>
            </div>
            <ul className="commendations">
              {report.commendations.map((c) => (
                <li key={c.id} className={c.met ? 'earned' : 'missed'}>
                  <p>
                    <span aria-hidden="true">{c.met ? '✓ ' : '○ '}</span>
                    <strong>{c.label}</strong> <span className="tiny muted">{c.met ? 'earned' : 'not earned'}</span>
                  </p>
                  <p className="small muted">{c.criterion}</p>
                  <p className="small">{c.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel span-2">
            <div className="panel-head">
              <h3>Concept maturity</h3>
              <Cite c={CML_CITATION} />
            </div>
            <div className="panel-body cml-debrief">
              <CmlTrack level={m.cml.level} reached={report.success} />
              {report.success ? (
                <p className="small">
                  In game terms your concept holds up at <strong>CML {m.cml.level} {cmlLevel(m.cml.level).name}</strong>: {cmlLevel(m.cml.level).summary.charAt(0).toLowerCase() + cmlLevel(m.cml.level).summary.slice(1)}
                  {next ? ` Next, ${next.name.toLowerCase()} works at CML ${next.cml.level} ${cmlLevel(next.cml.level).name}.` : ''}
                </p>
              ) : (
                <p className="small">
                  Not there yet. {CML_ITERATION_NOTE} Use the analyst notes above, go back to the design bay, and fly again.
                </p>
              )}
              <p className="tiny muted">CMLs are a JPL scale for real mission concepts. The game borrows the stages to frame each mission; passing a game mission is not a CML assessment.</p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Results</h3>
            </div>
            <div className="panel-body">
              <dl className="kv small results-kv">
                <dt>Observation value captured</dt>
                <dd className="mono">
                  {report.capturedValue} (reference {report.referenceValue})
                </dd>
                <dt>Value delivered</dt>
                <dd className="mono">{report.deliveredValue}</dd>
                <dt>Captures stored</dt>
                <dd className="mono">
                  {run.state.packets.length} ({run.state.stats.capturesStarted} started, {run.state.stats.capturesFailed} failed)
                </dd>
                <dt>Delivered</dt>
                <dd className="mono">{report.counts.DELIVERED} target groups</dd>
                <dt>Lost to storage</dt>
                <dd className="mono">
                  {report.counts['MISSED: RECORDER FULL']} rejected, {report.counts['LOST (OVERWRITTEN)']} overwritten
                </dd>
                <dt>Missed: orbit / swath</dt>
                <dd className="mono">{report.counts['MISSED: NEVER IN REACH']} never in reach</dd>
                <dt>Missed: in reach</dt>
                <dd className="mono">
                  {report.counts['MISSED: IN REACH, NOT CAPTURED']} not captured, {report.counts['MISSED: LOW ENERGY']} low energy, {report.counts.SKIPPED} skipped
                </dd>
                <dt>Energy</dt>
                <dd className="mono">
                  {report.energy.usedWh.toFixed(0)} Wh used ({report.energy.captureWh.toFixed(0)} captures, {report.energy.radioWh.toFixed(0)} radio); {report.energy.remainingWh.toFixed(0)} / {report.energy.capacityWh} Wh left; lowest{' '}
                  {Math.round(report.energy.minFrac * 100)}%
                </dd>
                <dt>Downlink</dt>
                <dd className="mono">
                  {fmtNum(report.downlink.sentMB)} of {fmtNum(report.downlink.capacityMB)} MB possible ({Math.round(report.downlink.capacityUtilization * 100)}%); radio on {Math.round(report.downlink.activeS)} of{' '}
                  {Math.round(report.downlink.contactS)} s contact
                </dd>
                <dt>Recorder</dt>
                <dd className="mono">
                  peak {fmtNum(report.storage.peakMB)} / {fmtNum(report.storage.capacityMB)} MB; {fmtNum(report.storage.remainingOnBoardMB)} MB never sent
                </dd>
                <dt>Budget margin</dt>
                <dd className="mono">
                  {report.budget.budget - report.budget.cost} credits ({Math.round(report.budget.marginFrac * 100)}%)
                </dd>
                <dt>Mass margin</dt>
                <dd className="mono">
                  {report.mass.capacityKg - report.mass.massKg} kg ({Math.round(report.mass.marginFrac * 100)}%)
                </dd>
                <dt>Design</dt>
                <dd className="small">
                  {spec.altitudeKm} km, {spec.inclinationDeg}°, {spec.detailTier.toLowerCase()} payload, {spec.swathKm} km swath, {fmtNum(spec.storageMB)} MB recorder, {spec.downlinkMbps} Mbps radio
                </dd>
              </dl>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Targets</h3>
              {env && <StateBadge state={env.state} />}
            </div>
            <div className="det-table-wrap">
              <table className="det-table small">
                <thead>
                  <tr>
                    <th>Target</th>
                    <th>Priority</th>
                    <th>Outcome</th>
                    <th>Value</th>
                    <th>Closest</th>
                  </tr>
                </thead>
                <tbody>
                  {report.targets.map((t) => (
                    <tr key={t.targetId}>
                      <td>
                        {t.callsign}
                        {t.zone && <span className="tiny muted"> {t.zone.toLowerCase()}</span>}
                      </td>
                      <td className="mono">{t.priority}</td>
                      <td className={OUTCOME_CLASS[t.outcome]}>{t.outcome.toLowerCase()}</td>
                      <td className="mono">{t.value || '–'}</td>
                      <td className="mono">{t.minDistanceKm} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel span-2">
            <div className="panel-head">
              <h3>Causal timeline</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Key events only' : 'Show every event'}
              </Button>
            </div>
            <ol className="causal">
              {events.map((e, i) => (
                <li key={i} className={`ev ev-${e.severity}`}>
                  <span className="mono faint">{formatMet(e.step, g.stepS)}</span>
                  <span>{e.message}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    </div>
  );
}
