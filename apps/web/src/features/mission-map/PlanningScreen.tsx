import { useMemo, useState } from 'react';
import { computeDesign, computeGeometry, formatMet, getMission, isGeometryError } from '@ofw/simulation';
import { InfoTip } from '../../components/Codex';
import { Button, SimBadge, StateBadge, TopBar, fmtNum } from '../../components/ui';
import { sfx } from '../../game/audio/sfx';
import { useGame } from '../../game/state/store';
import { MissionMap, type TargetVisual } from './MissionMap';
import { TargetDetail } from './TargetDetail';
import { KaiCard } from '../../components/KaiCard';
import { kaiBrief, stars } from '../../game/content/kai';

type StatusFilter = 'all' | 'queued' | 'reachable' | 'unreachable';

export function PlanningScreen() {
  const missionId = useGame((s) => s.missionId);
  const loadout = useGame((s) => s.loadouts[s.missionId]);
  const targets = useGame((s) => s.targets);
  const env = useGame((s) => s.feed.envelope);
  const aimId = useGame((s) => s.aimId);
  const setAim = useGame((s) => s.setAim);
  const queue = useGame((s) => s.queue);
  const setQueue = useGame((s) => s.setQueue);
  const go = useGame((s) => s.go);
  const expert = useGame((s) => s.settings.expertView);
  const coach = useGame((s) => s.settings.coach);
  const setSettings = useGame((s) => s.setSettings);
  const m = getMission(missionId);
  const spec = useMemo(() => computeDesign(loadout, m.budgetCredits), [loadout, m]);
  const geo = useMemo(() => computeGeometry(m, spec, targets, aimId), [m, spec, targets, aimId]);
  const geometry = isGeometryError(geo) ? null : geo;
  const [selected, setSelected] = useState<string | null>(null);
  const [conf, setConf] = useState<'all' | 'high' | 'nominal'>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const reach = useMemo(() => {
    const r: Record<string, { pass: number; km: number } | null> = {};
    for (const t of targets) {
      const w = geometry?.windows.find((x) => x.targetId === t.id);
      r[t.id] = w ? { pass: w.passIndex, km: Math.round(w.minDistKm) } : null;
    }
    return r;
  }, [targets, geometry]);
  const minDist = useMemo(() => {
    const d: Record<string, number> = {};
    if (!geometry) return d;
    targets.forEach((t, j) => {
      let best = Infinity;
      for (let k = 0; k < geometry.nSteps; k += 2) best = Math.min(best, geometry.targetDist[k * targets.length + j]);
      d[t.id] = Math.round(best);
    });
    return d;
  }, [targets, geometry]);

  const ordered = useMemo(() => {
    const q = queue.map((id) => targets.find((t) => t.id === id)!).filter(Boolean);
    const rest = targets.filter((t) => !queue.includes(t.id));
    return [...q, ...rest];
  }, [queue, targets]);
  const visible = ordered.filter((t) => {
    if (conf !== 'all' && t.bestConfidence !== conf) return false;
    if (status === 'queued' && !queue.includes(t.id)) return false;
    if (status === 'reachable' && !reach[t.id]) return false;
    if (status === 'unreachable' && reach[t.id]) return false;
    return true;
  });

  const visuals = useMemo(() => {
    const v: Record<string, TargetVisual> = {};
    for (const t of targets) v[t.id] = !reach[t.id] ? 'unreachable' : queue.includes(t.id) ? 'queued' : 'available';
    return v;
  }, [targets, reach, queue]);

  const queuedReachable = queue.filter((id) => reach[id]);
  const plannedMB = queuedReachable.length * spec.dataMBPerCapture;
  const plannedWh = queuedReachable.length * spec.captureWh;
  const contacts = geometry?.contacts ?? [];
  // Per-pass outlook: reachable groups, zones touched, and whether the pass is in sunlight.
  const passPlan = (geometry?.passes ?? []).map((p) => {
    const ids = targets.filter((t) => geometry!.windows.some((w) => w.targetId === t.id && w.passIndex === p.index)).map((t) => t.id);
    let lit = 0;
    for (let i = p.startStep; i <= p.endStep; i++) lit += geometry!.sunlit[i];
    const zones = [...new Set(targets.filter((t) => ids.includes(t.id) && t.zone).map((t) => t.zone!))];
    return { p, n: ids.length, queued: ids.filter((id) => queue.includes(id)).length, zones, sunlit: lit / (p.endStep - p.startStep + 1) };
  });
  const reserveFrac = (() => {
    const find = (c: typeof m.objective): number | undefined => (c.type === 'minBattery' ? c.frac : c.type === 'all' ? c.conditions.map((x) => find(x as typeof m.objective)).find((x) => x !== undefined) : undefined);
    return find(m.objective);
  })();
  const usableWh = spec.batteryWh * (1 - (reserveFrac ?? 0.15));
  const contactCapMB = contacts.reduce((a, c) => a + ((c.endStep - c.startStep + 1) * (geometry?.stepS ?? 2) * spec.downlinkMbps) / 8, 0);

  const toggle = (id: string) => setQueue(queue.includes(id) ? queue.filter((q) => q !== id) : [...queue, id]);
  const move = (id: string, d: -1 | 1) => {
    const i = queue.indexOf(id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= queue.length) return;
    const q = [...queue];
    [q[i], q[j]] = [q[j], q[i]];
    setQueue(q);
  };
  const sel = targets.find((t) => t.id === selected);

  return (
    <div className="screen plan-screen">
      <TopBar>
        <Button variant="ghost" size="sm" onClick={() => go('design')}>
          Back to design
        </Button>
        <Button
          variant="primary"
          disabled={!geometry || queue.length === 0}
          sound={false}
          onClick={() => {
            sfx('deploy');
            go('deploy');
          }}
        >
          Launch mission
        </Button>
      </TopBar>
      <main className="plan-grid">
        <section className="plan-list" aria-label="Target queue">
          <div className="list-head">
            <h3>Capture queue</h3>
            <p className="tiny muted">Ticked targets get captured, top first.</p>
            {expert && <div className="filters">
              <label>
                <span className="sr-only">Confidence filter</span>
                <select value={conf} onChange={(e) => setConf(e.target.value as typeof conf)}>
                  <option value="all">All confidence</option>
                  <option value="high">High only</option>
                  <option value="nominal">Nominal only</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Status filter</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
                  <option value="all">All targets</option>
                  <option value="queued">Queued</option>
                  <option value="reachable">Reachable</option>
                  <option value="unreachable">Out of reach</option>
                </select>
              </label>
            </div>}
          </div>
          <ol className="target-list">
            {visible.map((t) => {
              const q = queue.indexOf(t.id);
              const rr = reach[t.id];
              return (
                <li key={t.id} className={`trow ${selected === t.id ? 'sel' : ''} ${rr ? '' : 'unreach'}`}>
                  <input type="checkbox" checked={q >= 0} onChange={() => toggle(t.id)} aria-label={`Queue ${t.callsign}`} />
                  <button className="trow-main" onClick={() => setSelected(t.id)} aria-pressed={selected === t.id}>
                    <span className="trow-top">
                      <span className="callsign">{t.callsign}</span>
                      <span className="mono prio" title="GAME PRIORITY">
                        {expert ? t.priority.total : <span className="call-stars" aria-label={`${stars(t)} of 3 stars`}>{'★'.repeat(stars(t))}</span>}
                      </span>
                    </span>
                    {!expert ? (
                      <span className="tiny muted">{rr ? (geometry && geometry.passes.length > 1 ? `in view on pass ${rr.pass + 1}` : 'in view') : 'out of reach'}</span>
                    ) : (
                    <span className="tiny muted">
                      {q >= 0 ? `#${q + 1} · ` : 'not queued · '}
                      {rr ? `pass ${rr.pass + 1}, ${rr.km} km from track` : `out of reach (${minDist[t.id] ?? '?'} km)`}
                      {t.zone ? ` · ${t.zone.toLowerCase()}` : ''}
                    </span>
                    )}
                  </button>
                  {q >= 0 && (
                    <span className="reorder">
                      <button onClick={() => move(t.id, -1)} aria-label={`Move ${t.callsign} up`} disabled={q === 0}>
                        ▲
                      </button>
                      <button onClick={() => move(t.id, 1)} aria-label={`Move ${t.callsign} down`} disabled={q === queue.length - 1}>
                        ▼
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="row-gap list-foot">
            <Button size="sm" onClick={() => setQueue([...targets].sort((a, b) => b.priority.total - a.priority.total).map((t) => t.id))}>
              Queue all by priority
            </Button>
            <Button size="sm" onClick={() => setQueue(targets.filter((t) => reach[t.id]).map((t) => t.id))}>
              Queue reachable only
            </Button>
          </div>
        </section>

        <section className="plan-map">
          {env && (
            <MissionMap
              mission={m}
              detections={env.detections}
              targets={targets}
             
              fitTo="pass"
              targetVisual={visuals}
              selectedId={selected}
              onSelect={setSelected}
              geometry={geometry}
              altitudeKm={spec.altitudeKm}
              swathHalfKm={spec.swathKm / 2}
              reachKm={spec.reachKm}
              inclinationDeg={spec.inclinationDeg}
            />
          )}
          {coach && m.difficulty === 1 && (
            <div className="coach" role="note">
              <p>
                <strong>Read the plan.</strong> The cyan band is your sensor swath along the simulated ground track. Targets inside it can be captured on the pass;
                ones marked ∅ never come within reach. Green dashed circles show where each ground station can hear the satellite.
              </p>
              <Button size="sm" variant="ghost" onClick={() => setSettings({ coach: false })}>
                Hide tips
              </Button>
            </div>
          )}
        </section>

        <aside className="plan-side">
          {m.aimPoints.length > 1 && (
            <fieldset className="picker aim">
              <legend>
                First-pass aim point <InfoTip topic="pass" />
              </legend>
              {m.aimPoints.map((a) => (
                <label key={a.id} className={`aim-opt ${aimId === a.id ? 'on' : ''}`}>
                  <input type="radio" name="aim" checked={aimId === a.id} onChange={() => setAim(a.id)} />
                  <span>
                    <strong>{a.label}</strong>
                    <span className="tiny muted">{a.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <KaiCard
            lines={[
              { label: "Reach", text: geometry ? `${Object.values(reach).filter(Boolean).length} of ${targets.length} targets come into view${geometry.passes.length > 1 ? ` over ${geometry.passes.length} passes` : ""}.` : "This orbit never reaches the region. Change it in the design bay." },
              { label: "Fits", text: `About ${Math.min(Math.floor(spec.storageMB / spec.dataMBPerCapture), Math.floor(usableWh / spec.captureWh))} captures before memory or battery runs out. You queued ${queuedReachable.length}.` },
              { label: "Tip", text: kaiBrief(m).tip },
            ]}
          />
          <details className="more" open={expert}>
            <summary>Plan details</summary>
          <div className="panel">
            <div className="panel-head">
              <h4>Predicted plan</h4>
              <SimBadge />
            </div>
            <div className="panel-body">
              {!geometry ? (
                <p className="txt-crit small">{(geo as { error: string }).error} Go back to the design bay and change the inclination.</p>
              ) : (
                <dl className="kv small">
                  <dt>Passes</dt>
                  <dd className="mono">
                    {geometry.passes.length} over the region ({geometry.passes.map((p) => formatMet(p.startStep, geometry.stepS)).join(', ')})
                  </dd>
                  {passPlan.length > 1 && (
                    <>
                      <dt>Per pass</dt>
                      <dd className="mono">
                        {passPlan.map((x) => (
                          <span key={x.p.index} className="block">
                            {x.p.index + 1}: {x.n} reachable, {x.queued} queued{x.zones.length ? ` · ${x.zones.map((z) => z.toLowerCase()).join(', ')}` : ''}
                            {x.sunlit < 0.5 ? ' · eclipse' : ''}
                          </span>
                        ))}
                      </dd>
                    </>
                  )}
                  {passPlan.length === 1 && passPlan[0].sunlit < 0.5 && (
                    <>
                      <dt>Light</dt>
                      <dd className="txt-warn">The pass is in Earth's shadow: captures run on battery only.</dd>
                    </>
                  )}
                  <dt>Reachable</dt>
                  <dd className="mono">
                    {Object.values(reach).filter(Boolean).length} / {targets.length} target groups
                  </dd>
                  <dt>Queued + reachable</dt>
                  <dd className="mono">
                    {queuedReachable.length} → {fmtNum(plannedMB)} MB, {plannedWh.toFixed(0)} Wh
                  </dd>
                  <dt>Recorder</dt>
                  <dd className={`mono ${plannedMB > spec.storageMB ? 'txt-warn' : ''}`}>{fmtNum(spec.storageMB)} MB</dd>
                  <dt>Battery</dt>
                  <dd className={`mono ${plannedWh > usableWh ? 'txt-warn' : ''}`}>
                    {spec.batteryWh} Wh; {Math.round(usableWh)} Wh above the {reserveFrac !== undefined ? `${Math.round(reserveFrac * 100)}% reserve rule` : '15% safe-mode line'}
                    {plannedWh > usableWh ? ' (planned captures exceed it before any recharge)' : ''}
                  </dd>
                  <dt>Contacts</dt>
                  <dd className="mono">
                    {contacts.length === 0
                      ? 'none'
                      : contacts.map((c) => (
                          <span key={c.startStep} className="block">
                            {m.groundStations.find((g) => g.id === c.stationId)?.name.replace(' (notional)', '')} at {formatMet(c.startStep, geometry.stepS)}, {(c.endStep - c.startStep + 1) * geometry.stepS} s
                          </span>
                        ))}
                  </dd>
                  <dt>Downlink capacity</dt>
                  <dd className={`mono ${contactCapMB < Math.min(plannedMB, spec.storageMB) ? 'txt-warn' : ''}`}>{fmtNum(contactCapMB)} MB over all contacts</dd>
                </dl>
              )}
            </div>
          </div>
          </details>
          {sel ? (
            <div className="panel">
              <div className="panel-body">
                <TargetDetail t={sel} geometry={geometry} fetchedAtUtc={env?.fetchedAtUtc} />
              </div>
            </div>
          ) : (
            <p className="small muted side-hint">Select a target on the map or in the queue to see its NASA source fields and priority breakdown.</p>
          )}
          {env && (
            <p className="tiny muted">
              Targets: <StateBadge state={env.state} /> {env.product}, {env.count} detections.
            </p>
          )}
        </aside>
      </main>
    </div>
  );
}
