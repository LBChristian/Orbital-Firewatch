import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { formatMet, objectiveProgress, type Command, type GameEvent, type MissionRun } from '@ofw/simulation';
import { InfoTip } from '../../components/Codex';
import { Button, Meter, SimBadge, StateBadge, fmtNum } from '../../components/ui';
import { sfx } from '../../game/audio/sfx';
import { useGame } from '../../game/state/store';
import { MissionMap, type MapHandle, type TargetVisual } from '../mission-map/MissionMap';
import { TargetDetail } from '../mission-map/TargetDetail';
import { Timeline } from './Timeline';
import { DeskView } from './DeskView';

type Speed = 0 | 1 | 2 | 4;

/** Simulated seconds per real second at 1x, by activity. Never changes dt or physics. */
const RATE = { focus: 6, pass: 10, contact: 20, coast: 300 };

function phase(run: MissionRun): keyof typeof RATE {
  const s = run.state;
  const g = run.config.geometry;
  const k = Math.min(s.step, g.nSteps - 1);
  if (s.capture) return 'focus';
  if (run.config.targets.some((t) => s.targetStatus[t.id] === 'IN_WINDOW')) return 'focus';
  if (g.passAt[k] >= 0) return 'pass';
  if (g.station[k] >= 0 && s.packets.some((p) => p.status === 'STORED' || p.status === 'QUEUED' || p.status === 'TRANSMITTING')) return 'contact';
  return 'coast';
}

const PHASE_LABEL: Record<keyof typeof RATE, string> = { focus: 'Targets in reach', pass: 'Over region', contact: 'Ground contact', coast: 'Coasting' };

export function OperationsScreen() {
  const run = useGame((s) => s.run);
  const go = useGame((s) => s.go);
  if (!run) {
    return (
      <main className="page">
        <p>No mission is running.</p>
        <Button onClick={() => go('planning')}>Back to plan</Button>
      </main>
    );
  }
  return <Operations run={run} />;
}

function Operations({ run }: { run: MissionRun }) {
  const finishRun = useGame((s) => s.finishRun);
  const env = useGame((s) => s.feed.envelope);
  const coach = useGame((s) => s.settings.coach);
  const setSettings = useGame((s) => s.setSettings);
  const notify = useGame((s) => s.notify);
  const openCodex = useGame((s) => s.openCodex);
  const expert = useGame((s) => s.settings.expertView);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [speed, setSpeed] = useState<Speed>(1);
  const speedRef = useRef<Speed>(1);
  speedRef.current = speed;
  const [selected, setSelected] = useState<string | null>(run.state.queue[0] ?? null);
  const mapHandle = useRef<MapHandle | null>(null);
  const lastEvent = useRef(0);
  const endTimer = useRef<number | null>(null);
  const { mission: m, spec, targets, geometry: g } = run.config;
  const s = run.state;

  const handleEvents = useCallback(
    (events: GameEvent[]) => {
      for (const e of events) {
        switch (e.type) {
          case 'capture-start':
            break;
          case 'capture-complete':
            sfx('capture');
            if (e.targetId) mapHandle.current?.flash(e.targetId, 'capture');
            break;
          case 'capture-failed':
            sfx('reject');
            if (e.targetId) mapHandle.current?.flash(e.targetId, 'fail');
            notify(e.message, 'warn');
            break;
          case 'capture-rejected':
            sfx(e.severity === 'critical' ? 'storage' : 'reject');
            if (e.severity !== 'info') notify(e.message, e.severity === 'critical' ? 'critical' : 'warn');
            break;
          case 'window-open':
            if (e.targetId && run.state.queue.includes(e.targetId)) sfx('lock');
            break;
          case 'window-closing':
            notify(e.message, 'warn');
            break;
          case 'packet-delivered':
            sfx('packet');
            mapHandle.current?.packet(Math.max(0, g.station[Math.min(e.step, g.nSteps - 1)]), e.step);
            break;
          case 'storage-warning':
            sfx('storage');
            notify(e.message, 'warn');
            break;
          case 'battery-low':
            sfx('lowBattery');
            notify(e.message, 'warn');
            break;
          case 'safe-mode':
            sfx('lowBattery');
            notify(e.message, 'critical');
            break;
          case 'downlink-start':
            sfx('downlink');
            break;
          case 'objective-complete':
            sfx('objective');
            notify(e.message, 'good');
            break;
          case 'objective-lost':
            sfx('lowBattery');
            notify(e.message, 'critical');
            break;
          case 'contact-start':
          case 'pass-start':
            sfx('lock');
            break;
          case 'packet-lost':
            notify(e.message, 'warn');
            break;
          case 'mission-end':
            sfx(run.state.objectiveMet ? 'objective' : 'failure');
            break;
        }
      }
    },
    [g, notify, run],
  );

  // main loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let budget = 0;
    let lastRender = 0;
    const passStartOf = () => {
      const k = Math.min(run.state.step, g.nSteps - 1);
      const p = g.passAt[k] >= 0 ? g.passes[g.passAt[k]] : null;
      return p ? p.startStep : Math.max(0, k - 200);
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const sp = speedRef.current;
      if (sp > 0 && !run.state.ended) {
        budget += dt;
        let iter = 0;
        while (iter < 900 && !run.state.ended) {
          const cost = g.stepS / (RATE[phase(run)] * sp);
          if (budget < cost) break;
          run.advance(1);
          budget -= cost;
          iter++;
        }
      } else budget = 0;
      mapHandle.current?.setSatellite(run.state.step, passStartOf());
      // The link beam is drawn only while the engine is actually transmitting.
      mapHandle.current?.setLink(run.state.transmitting ? g.station[Math.min(run.state.step, g.nSteps - 1)] : -1, run.state.step);
      if (run.state.events.length > lastEvent.current) {
        const fresh = run.state.events.slice(lastEvent.current);
        lastEvent.current = run.state.events.length;
        handleEvents(fresh);
      }
      if (now - lastRender > 90) {
        lastRender = now;
        force();
      }
      if (run.state.ended && endTimer.current === null) {
        endTimer.current = window.setTimeout(() => finishRun(), 2200);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (endTimer.current !== null) clearTimeout(endTimer.current);
    };
  }, [run, g, handleEvents, finishRun]);

  const cmd = useCallback(
    (c: Command) => {
      const r = run.command(c);
      if (!r.ok) {
        sfx('reject');
        notify(r.message, 'warn');
      } else sfx('click');
      force();
    },
    [run, notify],
  );

  const k = Math.min(s.step, g.nSteps - 1);
  const stationIdx = g.station[k];
  const pending = s.packets.filter((p) => p.status === 'STORED' || p.status === 'QUEUED' || p.status === 'TRANSMITTING');
  const firstInReach = s.queue.find((id) => s.targetStatus[id] === 'IN_WINDOW');
  const sel = targets.find((t) => t.id === selected) ?? null;
  const ph = phase(run);
  const objective = objectiveProgress(run.config, s);
  const passNow = g.passAt[k];
  const passesLeft = g.passes.filter((p) => p.startStep > s.step).length + (passNow >= 0 ? 1 : 0);

  // Link and pass outlook, all read from precomputed geometry.
  const contactNow = g.contacts.find((c) => c.startStep <= s.step && s.step <= c.endStep);
  const contactNext = g.contacts.find((c) => c.startStep > s.step);
  const pendingMB = pending.reduce((a, p) => a + (p.sizeMB - p.sentMB), 0);
  const capMB = (steps: number) => (spec.downlinkMbps * steps * g.stepS) / 8;
  const stationName = (id: string) => m.groundStations.find((x) => x.id === id)?.name.replace(' (notional)', '') ?? id;
  const passCur = passNow >= 0 ? g.passes[passNow] : undefined;
  const passNext = g.passes.find((p) => p.startStep > s.step);
  const litFrac = (p: { startStep: number; endStep: number }) => {
    let lit = 0;
    for (let i = p.startStep; i <= p.endStep; i++) lit += g.sunlit[i];
    return lit / (p.endStep - p.startStep + 1);
  };
  const reserveFrac = (() => {
    const find = (c: typeof m.objective): number | undefined => (c.type === 'minBattery' ? c.frac : c.type === 'all' ? c.conditions.map((x) => find(x as typeof m.objective)).find((x) => x !== undefined) : undefined);
    return find(m.objective);
  })();
  const needsDownlink = !!contactNow && pending.length > 0 && !s.transmitting && !s.autoDownlink && !s.safeMode && !s.ended;
  const toggleOverwrite = () => {
    if (!s.overwriteLowest) {
      const ok = window.confirm(
        'Turn on OVERWRITE WHEN FULL?\n\nWhen the recorder is full, a new capture will permanently delete the lowest-value stored packet that is worth less than it. Deleted packets cannot be delivered. You can turn this off again at any time.',
      );
      if (!ok) return;
    }
    cmd({ type: 'setOverwrite', on: !s.overwriteLowest });
  };

  const doCapture = useCallback(() => {
    const id = selected && run.state.targetStatus[selected] !== 'CAPTURED' ? selected : firstInReach;
    if (!id) {
      sfx('reject');
      notify('No target selected or in reach.', 'warn');
      return;
    }
    cmd({ type: 'capture', targetId: id });
  }, [selected, firstInReach, cmd, notify, run]);

  const skipToNext = useCallback(() => {
    const n = run.stepsToNextEvent();
    const lead = Math.round(30 / g.stepS);
    // Stop 30 s before the event; if already inside that lead, go straight to the event.
    const steps = n > lead ? n - lead : n;
    if (steps > 0) run.advance(steps);
    force();
  }, [run, g]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const order = run.config.targets.map((t) => t.id);
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setSpeed((sp) => (sp === 0 ? 1 : 0));
          break;
        case '1':
        case '2':
        case '4':
          setSpeed(Number(e.key) as Speed);
          break;
        case '0':
          setSpeed(0);
          break;
        case 'c':
        case 'C':
          doCapture();
          break;
        case 's':
        case 'S':
          if (selected) cmd({ type: 'skip', targetId: selected });
          break;
        case 'p':
        case 'P':
          if (selected) cmd({ type: 'prioritize', targetId: selected });
          break;
        case 'd':
        case 'D':
          cmd(run.state.transmitting ? { type: 'stopDownlink' } : { type: 'beginDownlink' });
          break;
        case 'a':
        case 'A':
          cmd({ type: 'setAutoObserve', on: !run.state.autoObserve });
          break;
        case 'n':
        case 'N':
          if (phase(run) !== 'focus') skipToNext();
          break;
        case 'ArrowDown':
        case 'ArrowUp': {
          e.preventDefault();
          const i = selected ? order.indexOf(selected) : -1;
          const j = e.key === 'ArrowDown' ? Math.min(order.length - 1, i + 1) : Math.max(0, i - 1);
          setSelected(order[j]);
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run, selected, cmd, doCapture, skipToNext]);

  const visualsRaw = useMemo(() => {
    const v: Record<string, TargetVisual> = {};
    for (const t of targets) {
      const st = s.targetStatus[t.id];
      const p = s.packets.find((x) => x.targetId === t.id);
      if (p?.status === 'DELIVERED') v[t.id] = 'delivered';
      else if (p?.status === 'EXPIRED/LOST') v[t.id] = 'lost';
      else if (p) v[t.id] = 'stored';
      else if (st === 'CAPTURING') v[t.id] = 'capturing';
      else if (st === 'IN_WINDOW') v[t.id] = 'inwindow';
      else if (st === 'SKIPPED') v[t.id] = 'skipped';
      else if (!g.windows.some((w) => w.targetId === t.id && w.endStep >= s.step)) v[t.id] = s.everInReach[t.id] ? 'missed' : 'unreachable';
      else v[t.id] = s.queue.includes(t.id) ? 'queued' : 'available';
    }
    return v;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets, s.step, s.packets.length, s.events.length, s.queue]);
  // Keep the same object while no target changes state, so the map does not rebuild markers every frame.
  const visualsKey = targets.map((t) => visualsRaw[t.id]).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visuals = useMemo(() => visualsRaw, [visualsKey]);

  const batFrac = s.batteryWh / spec.batteryWh;
  const stoFrac = s.storageUsedMB / spec.storageMB;
  const recent = s.events.slice(-7).reverse();

  const statusText = (id: string): string => {
    const v = visuals[id];
    const d = Math.round(run.distanceKm(id));
    if (v === 'inwindow') return `in reach · ${d} km · closes in ${run.stepsUntilWindowCloses(id) * g.stepS} s`;
    if (v === 'capturing') return 'capturing…';
    if (v === 'stored') return `stored · ${s.packets.find((p) => p.targetId === id)?.status.toLowerCase()}`;
    if (v === 'delivered') return 'delivered';
    if (v === 'lost') return 'packet lost (overwritten)';
    if (v === 'skipped') return 'skipped';
    if (v === 'missed') return 'window passed, not captured';
    if (v === 'unreachable') return 'never in reach';
    const w = g.windows.find((x) => x.targetId === id && x.startStep > s.step);
    return w ? `opens ${formatMet(w.startStep, g.stepS)} · ${d} km now` : `${d} km`;
  };

  if (!expert) {
    return (
      <DeskView
        run={run}
        env={env}
        speed={speed}
        setSpeed={setSpeed}
        cmd={cmd}
        skipToNext={skipToNext}
        canSkip={!s.ended && ph !== 'focus'}
        finishRun={finishRun}
        needsDownlink={needsDownlink}
        contactNow={contactNow}
        contactNext={contactNext}
        visuals={visuals}
        selected={selected}
        setSelected={setSelected}
        mapHandle={mapHandle}
        onExpert={() => setSettings({ expertView: true })}
      />
    );
  }

  return (
    <div className="ops-screen">
      <header className="ops-top">
        <div className="ops-id">
          <span className="mono faint">{m.code}</span>
          <strong>{m.name}</strong>
        </div>
        <div className="ops-clock mono" aria-label="Mission elapsed time">
          {formatMet(s.step, g.stepS)}
        </div>
        <div className="ops-pass">
          <span className={`phase phase-${ph}`}>{PHASE_LABEL[ph]}</span>
          <span className="small muted">
            {passNow >= 0 ? `Pass ${passNow + 1} of ${g.passes.length}` : `${passesLeft} pass${passesLeft === 1 ? '' : 'es'} remaining`}
          </span>
        </div>
        <div className="ops-objective" title={m.objective.text}>
          <Meter label="Objective" value={objective.fraction} max={1} display={objective.detail} tone={objective.met ? 'go' : 'warn'} />
        </div>
        <div className="ops-speed" role="group" aria-label="Simulation speed">
          {([0, 1, 2, 4] as Speed[]).map((v) => (
            <Button key={v} size="sm" aria-pressed={speed === v} onClick={() => setSpeed(v)} title={v === 0 ? 'Pause (Space)' : `${v}x speed (${v})`}>
              {v === 0 ? 'Pause' : `${v}×`}
            </Button>
          ))}
          <Button size="sm" onClick={skipToNext} disabled={s.ended || ph === 'focus'} kbd="N" title={ph === 'focus' ? 'Targets are in reach: watch this part' : 'Coast to 30 s before the next pass, contact or target window'}>
            Next event
          </Button>
        </div>
        <div className="ops-data">{env && <StateBadge state={env.state} />}</div>
        <Button size="sm" variant="ghost" onClick={() => setSettings({ expertView: false })}>
          Simple view
        </Button>
        <Button size="sm" variant="ghost" onClick={() => openCodex()}>
          Help
        </Button>
        <Button size="sm" variant="danger" onClick={() => cmd({ type: 'endMission' })} disabled={s.ended}>
          End mission
        </Button>
      </header>

      <div className="ops-grid">
        <aside className="ops-left" aria-label="Target queue">
          <div className="list-head">
            <h4>Targets</h4>
            <span className="tiny muted">↑↓ select · C capture · S skip · P priority</span>
          </div>
          <ol className="target-list ops-list">
            {targets.map((t) => {
              const qi = s.queue.indexOf(t.id);
              return (
                <li key={t.id} className={`trow v-${visuals[t.id]} ${selected === t.id ? 'sel' : ''}`}>
                  <button className="trow-main" onClick={() => setSelected(t.id)} aria-pressed={selected === t.id}>
                    <span className="trow-top">
                      <span className="callsign">
                        {t.callsign}
                        {qi >= 0 && <span className="qpos mono">#{qi + 1}</span>}
                      </span>
                      <span className="mono prio">{t.priority.total}</span>
                    </span>
                    <span className="tiny trow-status">{statusText(t.id)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <section className="ops-map">
          {env && (
            <MissionMap
              mission={m}
              detections={env.detections}
              targets={targets}
             
              fitTo="pass"
              targetVisual={visuals}
              selectedId={selected}
              onSelect={setSelected}
              geometry={g}
              altitudeKm={spec.altitudeKm}
              swathHalfKm={spec.swathKm / 2}
              reachKm={spec.reachKm}
              inclinationDeg={spec.inclinationDeg}
              handleRef={mapHandle}
              legendOpen={false}
            />
          )}
          {s.safeMode && <div className="map-alert crit">SAFE MODE: battery below {Math.round(15)}%. Captures and downlink locked out.</div>}
          {!s.safeMode && stationIdx >= 0 && !needsDownlink && <div className="map-alert go">{m.groundStations[stationIdx].name} in view{s.transmitting ? `: transmitting at ${spec.downlinkMbps} Mbps` : ''}</div>}
          {needsDownlink && (
            <div className="map-alert warn" role="status">
              {m.groundStations[stationIdx].name} in view and {fmtNum(pendingMB)} MB waiting. Auto-downlink is off: press D or Begin downlink.
            </div>
          )}
          {coach && m.difficulty === 1 && !s.ended && (
            <div className="coach ops-coach" role="note">
              {ph === 'coast' && s.step < (g.passes[0]?.startStep ?? 0) && <p>The satellite is approaching the region. Auto-observe will capture queued targets as they enter the swath, or select one and press Capture.</p>}
              {ph === 'focus' && <p>Targets are inside your swath. Each capture uses the payload for {spec.captureS} s, {spec.dataMBPerCapture} MB of recorder and {spec.captureWh.toFixed(1)} Wh.</p>}
              {ph === 'pass' && <p>Over the region. Watch the window countdowns in the target list.</p>}
              {ph === 'contact' && <p>A ground station can hear the satellite. Stored packets downlink highest value first; delivered data is what scores.</p>}
              {ph === 'coast' && s.step >= (g.passes[0]?.startStep ?? 0) && <p>Coasting between events. Press Next event (N) to jump ahead. Speed never changes the outcome.</p>}
              <Button size="sm" variant="ghost" onClick={() => setSettings({ coach: false })}>
                Hide tips
              </Button>
            </div>
          )}
          {s.ended && (
            <div className={`end-banner ${s.objectiveMet ? 'win' : 'lose'}`} role="alert">
              <h2>{s.objectiveMet ? 'Objective met' : 'Objective not met'}</h2>
              <p className="small">{s.events[s.events.length - 1]?.message}</p>
              <Button variant="primary" onClick={() => finishRun()}>
                Open debrief
              </Button>
            </div>
          )}
        </section>

        <aside className="ops-right" aria-label="Spacecraft telemetry">
          <div className="panel tele">
            <div className="panel-head">
              <h4>Spacecraft</h4>
              <span className={`health ${s.safeMode ? 'crit' : batFrac < 0.3 || stoFrac > 0.8 ? 'warn' : 'ok'}`}>{s.safeMode ? 'Safe mode' : batFrac < 0.3 || stoFrac > 0.8 ? 'Caution' : 'Nominal'}</span>
            </div>
            <div className="panel-body tele-body">
              <Meter label={<>Battery <InfoTip topic="power" /></>} value={s.batteryWh} max={spec.batteryWh} mark={spec.batteryWh * 0.15} display={`${s.batteryWh.toFixed(0)} / ${spec.batteryWh} Wh`} tone={batFrac < 0.15 ? 'crit' : batFrac < 0.3 ? 'warn' : 'go'} title="Tick: safe-mode threshold (15%)" />
              <p className="tiny tele-line">
                <span className={g.sunlit[k] ? 'txt-amber' : 'muted'}>{g.sunlit[k] ? `☀ Sunlight +${spec.solarW} W` : '● Eclipse: on battery'}</span>
                <span className="muted"> · load {spec.busLoadW + spec.pointingLoadW + (s.transmitting ? spec.radioPowerW : 0)} W</span>
              </p>
              {reserveFrac !== undefined && (
                <p className={`tiny tele-line ${s.stats.minBatteryWh / spec.batteryWh < reserveFrac ? 'txt-crit' : ''}`}>
                  Reserve rule {Math.round(reserveFrac * 100)}%: lowest so far {Math.round((s.stats.minBatteryWh / spec.batteryWh) * 100)}%
                  {s.stats.minBatteryWh / spec.batteryWh < reserveFrac ? ' (broken)' : ''}
                </p>
              )}
              <Meter label={<>Recorder <InfoTip topic="storage" /></>} value={s.storageUsedMB} max={spec.storageMB} mark={spec.storageMB * 0.8} display={`${fmtNum(s.storageUsedMB)} / ${fmtNum(spec.storageMB)} MB`} tone={stoFrac >= 1 - 1e-9 ? 'crit' : stoFrac > 0.8 ? 'warn' : undefined} />
              <p className="tiny tele-line">
                <span className={stationIdx >= 0 ? 'txt-go' : 'muted'}>{stationIdx >= 0 ? `Link up: ${m.groundStations[stationIdx].name.replace(' (notional)', '')}` : 'No ground station in view'}</span>
                <span className="muted"> · radio {s.transmitting ? `TX ${spec.downlinkMbps} Mbps` : 'idle'}</span>
              </p>
              <p className="tiny muted">
                Payload {s.capture ? <span className="txt-signal">capturing {targets.find((t) => t.id === s.capture!.targetId)?.callsign}</span> : 'ready'} · mass {spec.massKg} kg (fixed after launch)
              </p>
            </div>
          </div>

          <div className="panel link">
            <div className="panel-head">
              <h4>Passes and contacts</h4>
              <span className="tiny muted">from the orbit model</span>
            </div>
            <div className="panel-body">
              <dl className="kv tiny">
                <dt>Pass</dt>
                <dd>
                  {passCur
                    ? `${passNow + 1} of ${g.passes.length} now, ends in ${(passCur.endStep - s.step) * g.stepS} s`
                    : passNext
                      ? `${passNext.index + 1} of ${g.passes.length} at ${formatMet(passNext.startStep, g.stepS)} (in ${Math.round(((passNext.startStep - s.step) * g.stepS) / 60)} min)`
                      : 'no more passes'}
                  {(passCur ?? passNext) && litFrac((passCur ?? passNext)!) < 0.5 ? ' · in eclipse' : ''}
                </dd>
                <dt>Contact</dt>
                <dd>
                  {contactNow
                    ? `${stationName(contactNow.stationId)}: ${(contactNow.endStep - s.step) * g.stepS} s left, about ${fmtNum(capMB(contactNow.endStep - s.step))} MB capacity`
                    : contactNext
                      ? `${stationName(contactNext.stationId)} at ${formatMet(contactNext.startStep, g.stepS)}, ${(contactNext.endStep - contactNext.startStep + 1) * g.stepS} s, about ${fmtNum(capMB(contactNext.endStep - contactNext.startStep + 1))} MB`
                      : 'no more contacts'}
                </dd>
                <dt>Waiting</dt>
                <dd className={contactNow && pendingMB > capMB(contactNow.endStep - s.step) ? 'txt-warn' : ''}>
                  {fmtNum(pendingMB)} MB in {pending.length} packet{pending.length === 1 ? '' : 's'}
                </dd>
              </dl>
              <p className="tiny faint">Capacity = radio rate x seconds left / 8. Simulation estimate.</p>
            </div>
          </div>

          <div className="panel modes">
            <div className="panel-body row-gap">
              <Button size="sm" aria-pressed={s.autoObserve} onClick={() => cmd({ type: 'setAutoObserve', on: !s.autoObserve })} kbd="A">
                Auto-observe
              </Button>
              <Button size="sm" aria-pressed={s.autoDownlink} onClick={() => cmd({ type: 'setAutoDownlink', on: !s.autoDownlink })}>
                Auto-downlink
              </Button>
              <Button size="sm" aria-pressed={s.overwriteLowest} onClick={toggleOverwrite} title="When the recorder is full, overwrite the lowest-value stored packet instead of rejecting the new capture. Asks for confirmation.">
                Overwrite when full
              </Button>
            </div>
          </div>

          <div className="panel packets">
            <div className="panel-head">
              <h4>
                Data packets <InfoTip topic="downlink" />
              </h4>
              <span className="tiny muted">
                {s.packets.filter((p) => p.status === 'DELIVERED').length} delivered · {pending.length} waiting
              </span>
            </div>
            <ul className="packet-list">
              {s.packets.length === 0 && <li className="tiny muted">No captures yet.</li>}
              {[...s.packets].reverse().map((p) => (
                <li key={p.id} className={`pkt-row st-${p.status.replace('/', '-')}`}>
                  <span className="mono">{p.id}</span>
                  <span>{p.callsign}</span>
                  <span className="mono">{p.status === 'TRANSMITTING' ? `${Math.round((p.sentMB / p.sizeMB) * 100)}%` : `${p.sizeMB} MB`}</span>
                  <span className="pkt-status">{p.status}</span>
                  {(p.status === 'STORED' || p.status === 'QUEUED') && (
                    <button className="link-btn" onClick={() => cmd({ type: 'prioritizePacket', packetId: p.id })} aria-label={`Send ${p.id} next`}>
                      {p.prioritized ? 'next' : 'send next'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {sel && (
            <div className="panel">
              <div className="panel-body">
                <TargetDetail t={sel} geometry={g} fetchedAtUtc={env?.fetchedAtUtc}>
                  <p className={`small eligibility ${visuals[sel.id] === 'inwindow' ? 'txt-go' : ''}`}>
                    Now: {Math.round(run.distanceKm(sel.id))} km from the track; reach is {Math.round(spec.reachKm)} km
                    {spec.reachKm > spec.swathKm / 2 + 1 ? ` (swath ${spec.swathKm / 2} km + pointing)` : ' (half-swath)'}.{' '}
                    {visuals[sel.id] === 'inwindow' ? 'Eligible for capture.' : 'Not eligible right now.'}
                  </p>
                </TargetDetail>
              </div>
            </div>
          )}
        </aside>
      </div>

      <footer className="ops-bottom">
        <div className="action-bar" role="toolbar" aria-label="Mission actions">
          <Button variant="primary" onClick={doCapture} disabled={s.ended || !!s.capture || s.safeMode} kbd="C" sound={false}>
            Capture {sel && s.targetStatus[sel.id] !== 'CAPTURED' ? sel.callsign : firstInReach ? targets.find((t) => t.id === firstInReach)?.callsign : ''}
          </Button>
          <Button onClick={() => selected && cmd({ type: 'skip', targetId: selected })} disabled={!selected || s.ended} kbd="S">
            Skip
          </Button>
          <Button onClick={() => selected && cmd({ type: 'prioritize', targetId: selected })} disabled={!selected || s.ended} kbd="P">
            Prioritize next
          </Button>
          {s.transmitting ? (
            <Button variant="warn" onClick={() => cmd({ type: 'stopDownlink' })} kbd="D">
              Stop downlink
            </Button>
          ) : (
            <Button onClick={() => cmd({ type: 'beginDownlink' })} disabled={stationIdx < 0 || pending.length === 0 || s.ended} kbd="D">
              Begin downlink
            </Button>
          )}
          <SimBadge />
        </div>
        <Timeline run={run} queuedIds={s.queue} />
        <ol className="event-log" aria-live="polite" aria-label="Recent mission events">
          {recent.map((e, i) => (
            <li key={s.events.length - i} className={`ev ev-${e.severity}`}>
              <span className="mono faint">{formatMet(e.step, g.stepS)}</span> {e.message}
            </li>
          ))}
        </ol>
      </footer>
    </div>
  );
}
