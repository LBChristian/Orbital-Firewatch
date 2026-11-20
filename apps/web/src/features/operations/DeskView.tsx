import type { MutableRefObject } from 'react';
import type { Command, Contact, FirmsFeedEnvelope, MissionRun } from '@ofw/simulation';
import { Button } from '../../components/ui';
import { KAI, cardLine, kaiNow, roomFor, stars } from '../../game/content/kai';
import { MissionMap, type MapHandle, type TargetVisual } from '../mission-map/MissionMap';

export type Speed = 0 | 1 | 2 | 4;

interface Props {
  run: MissionRun;
  env?: FirmsFeedEnvelope;
  speed: Speed;
  setSpeed: (s: Speed) => void;
  cmd: (c: Command) => void;
  skipToNext: () => void;
  canSkip: boolean;
  finishRun: () => void;
  needsDownlink: boolean;
  contactNow?: Contact;
  contactNext?: Contact;
  visuals: Record<string, TargetVisual>;
  selected: string | null;
  setSelected: (id: string | null) => void;
  mapHandle: MutableRefObject<MapHandle | null>;
  onExpert: () => void;
}

/**
 * The simple mission desk: map, a short stack of target cards, three gauges, Kai's one line
 * and one obvious action. All numbers come from the same run state as the expert view.
 */
export function DeskView(p: Props) {
  const { run } = p;
  const { mission: m, spec, targets, geometry: g } = run.config;
  const s = run.state;
  const k = Math.min(s.step, g.nSteps - 1);
  const passNow = g.passAt[k];
  const batFrac = s.batteryWh / spec.batteryWh;
  const stoFrac = s.storageUsedMB / spec.storageMB;

  const inView = targets.filter((t) => s.targetStatus[t.id] === 'IN_WINDOW' || s.targetStatus[t.id] === 'CAPTURING');
  const upcoming = targets
    .map((t) => ({ t, w: g.windows.find((w) => w.targetId === t.id && w.startStep > s.step) }))
    .filter((x) => x.w && s.targetStatus[x.t.id] === 'PENDING' && s.queue.includes(x.t.id))
    .sort((a, b) => a.w!.startStep - b.w!.startStep)
    .slice(0, 3);
  const done = s.packets.filter((x) => x.status !== 'EXPIRED/LOST');
  const room = roomFor(run);
  const kai = kaiNow(run);
  const best = inView.find((t) => s.targetStatus[t.id] === 'IN_WINDOW' && s.queue.includes(t.id));
  const mins = (step: number) => Math.max(1, Math.round(((step - s.step) * g.stepS) / 60));

  const main: { label: string; act: () => void; disabled?: boolean } = s.ended
    ? { label: 'Open debrief', act: p.finishRun }
    : p.needsDownlink
      ? { label: 'Send data', act: () => p.cmd({ type: 'beginDownlink' }) }
      : best && !s.capture && !s.safeMode
        ? { label: `Capture ${best.callsign}`, act: () => p.cmd({ type: 'capture', targetId: best.id }) }
        : { label: 'Skip ahead', act: p.skipToNext, disabled: !p.canSkip };

  const gauge = (_icon: string, label: string, frac: number, tone: string, text: string) => (
    <span className="desk-gauge" title={`${label}: ${text}`}>
      <span className="desk-glabel">{label}</span>
      <span className="desk-bar" aria-hidden="true">
        <span style={{ width: `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%` }} className={tone} />
      </span>
      <span className="tiny">{text}</span>
    </span>
  );

  return (
    <div className="desk">
      <header className="desk-top">
        <div className="desk-id">
          <span className="mono faint">{m.code}</span> <strong>{m.name}</strong>
          <span className="desk-chip">{passNow >= 0 ? `Pass ${passNow + 1} of ${g.passes.length}` : g.passes.some((x) => x.startStep > s.step) ? 'Between passes' : 'Passes done'}</span>
        </div>
        <div className="desk-gauges">
          {gauge('ti-battery-3', 'Battery', batFrac, batFrac < 0.3 ? 'crit' : batFrac < 0.5 ? 'warn' : 'go', `${Math.round(batFrac * 100)}%`)}
          {gauge('ti-database', 'Memory', stoFrac, stoFrac > 0.9 ? 'crit' : stoFrac > 0.7 ? 'warn' : 'go', `${Math.round(stoFrac * 100)}% full`)}
          <span className="desk-gauge" title="Radio link">
            <span className="desk-glabel">Link</span>
            <span className="tiny">{s.transmitting ? 'Sending' : p.contactNow ? 'Station in view' : p.contactNext ? `Link in ${mins(p.contactNext.startStep)} min` : 'No more links'}</span>
          </span>
          {!g.sunlit[k] && (
            <span className="desk-gauge txt-amber" title="In Earth's shadow: the solar panels make no power">
              <span className="desk-glabel txt-amber">In shadow</span>
            </span>
          )}
        </div>
        <div className="desk-controls" role="group" aria-label="Speed">
          {([0, 1, 4] as Speed[]).map((v) => (
            <Button key={v} size="sm" aria-pressed={p.speed === v} onClick={() => p.setSpeed(v)}>
              {v === 0 ? 'Pause' : `${v}×`}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={p.onExpert}>
            Expert view
          </Button>
          <Button size="sm" variant="ghost" onClick={() => p.cmd({ type: 'endMission' })} disabled={s.ended}>
            End
          </Button>
        </div>
      </header>

      <div className="desk-grid">
        <section className="desk-map">
          {p.env && (
            <MissionMap
              mission={m}
              detections={p.env.detections}
              targets={targets}
              fitTo="pass"
              targetVisual={p.visuals}
              selectedId={p.selected}
              onSelect={p.setSelected}
              geometry={g}
              altitudeKm={spec.altitudeKm}
              swathHalfKm={spec.swathKm / 2}
              reachKm={spec.reachKm}
              inclinationDeg={spec.inclinationDeg}
              handleRef={p.mapHandle}
              legendOpen={false}
            />
          )}
        </section>

        <aside className="desk-calls" aria-label="Targets">
          <p className="desk-head">
            {inView.length > 0 ? (
              <>
                <strong>{inView.length} in view</strong> · room for {room.n} ({room.limit})
              </>
            ) : (
              'Nothing in view right now'
            )}
          </p>
          {inView.map((t) => {
            const capturing = s.targetStatus[t.id] === 'CAPTURING';
            const left = run.stepsUntilWindowCloses(t.id) * g.stepS;
            return (
              <article key={t.id} className={`call ${best?.id === t.id ? 'call-top' : ''}`} aria-label={`${t.callsign}, ${stars(t)} of 3 stars`}>
                <div className="call-row">
                  <strong>{t.callsign}</strong>
                  <span className="call-stars" aria-hidden="true">
                    {'★'.repeat(stars(t))}
                  </span>
                </div>
                <p className="tiny muted">
                  {cardLine(t)}
                  {t.zone ? ` · ${t.zone.toLowerCase()}` : ''}
                </p>
                <div className="call-row">
                  <span className={`tiny ${left <= 20 ? 'txt-amber' : 'muted'}`}>
                    {capturing ? 'capturing…' : `${left} s left`}
                  </span>
                  {!capturing && (
                    <span className="row-gap">
                      <Button size="sm" onClick={() => p.cmd({ type: 'skip', targetId: t.id })}>
                        Skip
                      </Button>
                      <Button size="sm" variant="primary" disabled={!!s.capture || s.safeMode} onClick={() => p.cmd({ type: 'capture', targetId: t.id })}>
                        Capture
                      </Button>
                    </span>
                  )}
                </div>
              </article>
            );
          })}
          {upcoming.length > 0 && <p className="desk-head muted">Coming up</p>}
          {upcoming.map(({ t, w }) => (
            <article key={t.id} className="call call-later">
              <div className="call-row">
                <span>{t.callsign}</span>
                <span className="tiny muted">
                  in {mins(w!.startStep)} min · {'★'.repeat(stars(t))}
                </span>
              </div>
            </article>
          ))}
          {done.length > 0 && (
            <p className="desk-head muted">
              Captured {done.length} · sent {done.filter((x) => x.status === 'DELIVERED').length}
            </p>
          )}
        </aside>
      </div>

      <footer className={`desk-kai tone-${kai.tone}`}>
        <div className="kai-face" aria-hidden="true">
          {KAI.initials}
        </div>
        <div className="kai-says" aria-live="polite">
          <span className="tiny muted">
            {KAI.name} · {KAI.role}
          </span>
          <p>{kai.text}</p>
        </div>
        <Button variant="primary" onClick={main.act} disabled={main.disabled} sound={false}>
          {main.label}
        </Button>
      </footer>
    </div>
  );
}
