import { useCallback, useEffect, useMemo } from 'react';
import { CML_CITATION, chapterOf, cmlLevel, formatBBox, getMission, orbitalPeriodS } from '@ofw/simulation';
import { Cite, CmlTrack } from '../../components/Citation';
import { InfoTip } from '../../components/Codex';
import { Button, DISCLAIMER_SAFETY, StateBadge, TopBar, fmtAge, fmtUtc } from '../../components/ui';
import { sfx } from '../../game/audio/sfx';
import { loadFeed } from '../../game/data/feed';
import { buildMissionTargets, useGame, type FeedMode } from '../../game/state/store';
import { MissionMap } from '../mission-map/MissionMap';

export function BriefingScreen() {
  const missionId = useGame((s) => s.missionId);
  const feed = useGame((s) => s.feed);
  const setFeed = useGame((s) => s.setFeed);
  const targets = useGame((s) => s.targets);
  const setTargets = useGame((s) => s.setTargets);
  const go = useGame((s) => s.go);
  const server = useGame((s) => s.serverStatus);
  const notify = useGame((s) => s.notify);
  const m = getMission(missionId);
  const chapter = chapterOf(m.id);

  const load = useCallback(
    async (mode: FeedMode, refresh = false) => {
      setFeed({ status: 'loading', mode, error: undefined, notes: [] });
      try {
        const r = await loadFeed(m, mode, refresh);
        const t = buildMissionTargets(m, r.envelope);
        setFeed({ status: 'ready', mode, envelope: r.envelope, notes: r.notes });
        setTargets(t);
        if (r.notes.length) notify(r.notes[r.notes.length - 1], 'warn');
      } catch (e) {
        setFeed({ status: 'error', mode, error: (e as Error).message });
        setTargets([]);
      }
    },
    [m, setFeed, setTargets, notify],
  );

  useEffect(() => {
    if (feed.status === 'idle') void load(feed.mode);
  }, [feed.status, feed.mode, load]);

  const env = feed.envelope;
  const zoneCounts = useMemo(() => (m.zones ?? []).map((z) => ({ label: z.label, n: targets.filter((t) => t.zone === z.label).length })), [m, targets]);
  const tooFew = feed.status === 'ready' && targets.length < 3;

  return (
    <div className="screen">
      <TopBar />
      <main className="page briefing">
        <header className="briefing-head">
          <div>
            <p className="mission-code mono">
              Mission {m.code} · Chapter {chapter.numeral} {chapter.title} · difficulty {'▮'.repeat(m.difficulty)}
              {'▯'.repeat(3 - m.difficulty)}
            </p>
            <h1>{m.name}</h1>
            <p className="lede">{m.tagline}</p>
          </div>
          <div className="briefing-actions">
            <Button variant="ghost" onClick={() => go('campaign')}>
              Campaign
            </Button>
            <Button
              variant="primary"
              size="big"
              disabled={feed.status !== 'ready' || targets.length === 0}
              sound={false}
              onClick={() => {
                sfx('accept');
                go('design');
              }}
            >
              Accept mission
            </Button>
          </div>
        </header>

        <div className="briefing-grid">
          <section className="briefing-text">
            <h3>Objective</h3>
            <p className="objective-line">{m.objective.text}</p>
            {m.secondary && m.secondary.length > 0 && (
              <p className="small">
                <strong>Optional: </strong>
                {m.secondary.map((o) => o.text).join(' ')} <span className="muted">Meeting every optional goal earns the Science commendation.</span>
              </p>
            )}
            <p>{m.briefing}</p>

            <h3>Constraints</h3>
            <dl className="kv">
              <dt>Mission window</dt>
              <dd className="mono">
                {m.durationHours} h simulated, about {(m.durationHours * 3600 / orbitalPeriodS(550)).toFixed(1)} orbits at 550 km
              </dd>
              <dt>Budget</dt>
              <dd className="mono">{m.budgetCredits} credits (notional)</dd>
              <dt>Launch mass</dt>
              <dd>Set by your launch option: 110 / 170 / 380 kg</dd>
              <dt>Passes</dt>
              <dd>{m.durationHours >= 3 ? 'Planned across consecutive orbits; the plan screen shows each pass your orbit actually makes' : 'One planned pass over the region; extra passes depend on your orbit'}</dd>
              <dt>Ground stations</dt>
              <dd>{m.groundStations.map((g) => g.name).join(', ')}</dd>
              <dt>Success</dt>
              <dd>{m.objective.text}</dd>
            </dl>
            <p className="small muted">{m.constraintsNote}</p>
            {m.balanceStatus === 'provisional' && (
              <p className="callout info small">
                <strong>Objective provisional.</strong> This mission's NASA data and orbit geometry are final, but its objective and recommended design have not been
                balance-tested yet and may change.
              </p>
            )}

            <h3>Concept maturity stage</h3>
            <CmlTrack level={m.cml.level} />
            <p className="small">
              <strong>
                CML {m.cml.level} {cmlLevel(m.cml.level).name}:
              </strong>{' '}
              {cmlLevel(m.cml.level).summary} <Cite c={CML_CITATION} />
            </p>
            <p className="small muted">In this mission: {m.cml.focus}</p>

            <h3>You will practise</h3>
            <ul className="teach-list">
              {m.teaches.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>

            <div className="callout">
              <strong>What the points are.</strong> Each point is a NASA FIRMS thermal-anomaly detection: a hot satellite pixel, not a fire boundary and not a danger
              rating. Some may be agricultural burns, flares or other hot surfaces; clouds can hide others. <InfoTip topic="firms" />
              {m.dataCaveat && (
                <>
                  <br />
                  <strong>This region.</strong> {m.dataCaveat}
                </>
              )}
              <br />
              <span className="small">{DISCLAIMER_SAFETY}</span>
            </div>
          </section>

          <section className="briefing-data">
            <div className="panel">
              <div className="panel-head">
                <h4>Target data</h4>
                {env && <StateBadge state={env.state} />}
              </div>
              <div className="panel-body brief-map-wrap">
                <MissionMap
                  mission={m}
                  detections={env?.detections ?? []}
                  targets={targets}
                  compact
                 
                  fitTo="region"
                />
              </div>
              <div className="panel-body">
                {feed.status === 'loading' && <p className="muted">Loading FIRMS detections for {m.regionName}…</p>}
                {feed.status === 'error' && (
                  <div className="callout crit">
                    <p>{feed.error}</p>
                    <div className="row-gap">
                      <Button size="sm" onClick={() => load('snapshot')}>
                        Retry
                      </Button>
                      <Button size="sm" onClick={() => load('synthetic')}>
                        Use SYNTHETIC DEMO training data
                      </Button>
                    </div>
                  </div>
                )}
                {env && feed.status === 'ready' && (
                  <dl className="kv small">
                    <dt>Region</dt>
                    <dd>
                      {m.regionName}
                      <br />
                      <span className="mono muted">{formatBBox(m.bbox)}</span>
                    </dd>
                    <dt>Source</dt>
                    <dd>
                      {env.source} · {env.product}
                      {env.detections[0]?.satellite && ` · satellite ${env.detections[0].satellite}`}
                      {env.detections[0]?.instrument && ` · ${env.detections[0].instrument}`}
                    </dd>
                    <dt>Acquired</dt>
                    <dd className="mono">
                      {env.acquisitionWindowUtc ? `${fmtUtc(env.acquisitionWindowUtc.from)} to ${fmtUtc(env.acquisitionWindowUtc.to)}` : 'no detections'}
                    </dd>
                    <dt>Retrieved</dt>
                    <dd className="mono">
                      {fmtUtc(env.fetchedAtUtc)}
                      {env.staleAgeSeconds !== undefined && ` (cache age ${fmtAge(env.staleAgeSeconds)})`}
                    </dd>
                    <dt>Detections</dt>
                    <dd className="mono">
                      {env.count} valid → {targets.length} target groups
                      {zoneCounts.length > 0 && ` (${zoneCounts.map((z) => `${z.label.toLowerCase()} ${z.n}`).join(', ')})`}
                    </dd>
                  </dl>
                )}
                {tooFew && (
                  <div className="callout">
                    Only {targets.length} target group(s) in this data. The mission works best with the bundled snapshot.
                  </div>
                )}
                {env?.warnings.length ? (
                  <details className="warnings">
                    <summary className="small">Data notes ({env.warnings.length})</summary>
                    <ul className="small muted">
                      {env.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
              <div className="panel-body feed-modes" role="group" aria-label="Choose target data">
                <Button size="sm" aria-pressed={feed.mode === 'snapshot'} onClick={() => load('snapshot')}>
                  Mission snapshot ({m.firms.date})
                </Button>
                <Button
                  size="sm"
                  aria-pressed={feed.mode === 'live'}
                  disabled={!server?.keyConfigured}
                  title={server?.keyConfigured ? 'Request the latest 24 h of FIRMS detections' : 'Needs a FIRMS MAP_KEY on the game server'}
                  onClick={() => load('live', feed.mode === 'live')}
                >
                  {feed.mode === 'live' ? 'Refresh live data' : 'Latest live data'}
                </Button>
                <Button size="sm" aria-pressed={feed.mode === 'synthetic'} onClick={() => load('synthetic')}>
                  Synthetic training
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
