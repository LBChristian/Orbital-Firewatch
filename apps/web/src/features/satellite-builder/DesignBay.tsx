import { KaiCard } from '../../components/KaiCard';
import { StatShape } from '../../components/StatShape';
import { kaiBrief } from '../../game/content/kai';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ALTITUDE_OPTIONS,
  INCLINATION_OPTIONS,
  LOADOUT_KEYS,
  SUBSYSTEMS,
  SUBSYSTEM_CITATIONS,
  cmlLevel,
  computeDesign,
  getMission,
  resolveLoadout,
  validateDesign,
  type DesignCheck,
  type Loadout,
} from '@ofw/simulation';
import { CmlTrack, SourceNote } from '../../components/Citation';
import { InfoTip } from '../../components/Codex';
import { Button, Meter, SimBadge, TopBar, fmtNum } from '../../components/ui';
import { sfx } from '../../game/audio/sfx';
import { useGame } from '../../game/state/store';
import { SatelliteViewer } from '../../three/SatelliteViewer';

const KEY_LABEL: Record<keyof Loadout, string> = {
  busId: 'Bus',
  payloadId: 'Payload',
  solarId: 'Solar arrays',
  batteryId: 'Battery',
  recorderId: 'Recorder',
  commsId: 'Radio',
  pointingId: 'Pointing',
  launchId: 'Launch',
  altitudeId: 'Altitude',
  inclinationId: 'Inclination',
};

type Opt = { id: string; label: string; short: string; description: string; why?: string; massKg?: number; cost?: number };

function optionStats(key: keyof Loadout, id: string): string {
  const all = SUBSYSTEMS.find((s) => s.key === key)?.options as unknown as Record<string, unknown>[] | undefined;
  const o = all?.find((x) => x.id === id) as Record<string, number> | undefined;
  if (!o) return '';
  const parts = [`${o.massKg} kg`, `${o.cost} cr`];
  if ('swathKmAt550' in o) parts.push(`${o.swathKmAt550} km swath`, `${o.dataMB} MB/capture`, `${o.captureWh} Wh/capture`);
  if ('generationW' in o) parts.push(`${o.generationW} W in sun`);
  if ('capacityWh' in o) parts.push(`${o.capacityWh} Wh`);
  if ('capacityMB' in o) parts.push(`${fmtNum(o.capacityMB)} MB`);
  if ('rateMbps' in o) parts.push(`${o.rateMbps} Mbps`, `${o.powerW} W tx`);
  if ('capacityKg' in o) parts.push(`${o.capacityKg} kg capacity`);
  if ('baseLoadW' in o) parts.push(`${o.baseLoadW} W load`, `carries ${o.structureCapacityKg} kg`);
  if ('extraReachKm' in o) parts.push(`+${o.extraReachKm} km reach`);
  return parts.join(' · ');
}

function Picker({ k, label, options, value, launched, onPick, topic }: { k: keyof Loadout; label: string; options: Opt[]; value: string; launched?: string; onPick: (id: string) => void; topic?: string }) {
  const sel = options.find((o) => o.id === value);
  const expert = useGame((s) => s.settings.expertView);
  const changed = launched !== undefined && launched !== value;
  return (
    <fieldset className="picker">
      <legend>
        {label}
        {changed && <span className="changed-dot" title="Changed since your last launch">changed</span>}
        {topic && <InfoTip topic={topic} />}
      </legend>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={o.id === value}
            className={`seg-btn ${o.id === value ? 'on' : ''}`}
            title={`${o.label}: ${o.description}${o.massKg !== undefined ? `\n${optionStats(k, o.id)}` : ''}`}
            onClick={() => {
              sfx('click');
              onPick(o.id);
            }}
          >
            {o.short}
          </button>
        ))}
      </div>
      {sel && (
        <p className="picker-desc small">
          <span>{sel.description}</span>
          {expert && (
            <>
              {" "}{sel.why && <span className="muted">{sel.why}</span>}
              {sel.massKg !== undefined && <span className="mono faint picker-stats">{optionStats(k, sel.id)}</span>}
              <SourceNote c={SUBSYSTEM_CITATIONS[k]} />
            </>
          )}
        </p>
      )}
    </fieldset>
  );
}

const ICON: Record<DesignCheck['level'], string> = { pass: '✓', warn: '!', fail: '✕' };

export function DesignBay() {
  const missionId = useGame((s) => s.missionId);
  const loadout = useGame((s) => s.loadouts[s.missionId]);
  const launched = useGame((s) => s.launchedLoadouts[s.missionId]);
  const setLoadout = useGame((s) => s.setLoadout);
  const patchLoadout = useGame((s) => s.patchLoadout);
  const go = useGame((s) => s.go);
  const reducedMotion = useGame((s) => s.settings.reducedMotion);
  const expert = useGame((s) => s.settings.expertView);
  const m = getMission(missionId);
  const validation = useMemo(() => validateDesign(loadout, m), [loadout, m]);
  const spec = validation.spec;
  const prevSpec = useRef(spec);
  const [ghost, setGhost] = useState(spec);
  const [shown, setShown] = useState(false);
  const r = resolveLoadout(loadout);

  useEffect(() => {
    setGhost(prevSpec.current);
    prevSpec.current = spec;
  }, [spec]);

  const pick = (k: keyof Loadout) => (id: string) => {
    patchLoadout({ [k]: id });
  };
  const changedKeys = launched ? LOADOUT_KEYS.filter((k) => launched[k] !== loadout[k]) : [];
  const fails = validation.checks.filter((c) => c.level === 'fail');
  const warns = validation.checks.filter((c) => c.level === 'warn');
  const recSpec = useMemo(() => computeDesign(m.recommended, m.budgetCredits), [m]);

  const proceed = () => {
    setShown(true);
    if (!validation.ok) {
      sfx('reject');
      return;
    }
    sfx('accept');
    go('planning');
  };

  const loadsW = spec.busLoadW + spec.pointingLoadW;

  return (
    <div className="screen design-screen">
      <TopBar>
        <Button variant="ghost" size="sm" onClick={() => go('briefing')}>
          Back to briefing
        </Button>
      </TopBar>
      <main className="design-grid">
        <section className="design-left" aria-label="Subsystem choices">
          <header className="design-head">
            <h2>Satellite design bay</h2>
            <KaiCard lines={[{ label: "Goal", text: kaiBrief(m).goal }, { label: "Tip", text: kaiBrief(m).tip }]} />
            {expert && (<>
            <p className="small muted">Every value here is a notional game parameter, not a real specification or price. Notes under each choice cite NASA&rsquo;s CubeSat 101 guide.</p>
            <div className="cml-head">
              <CmlTrack level={m.cml.level} />
              <p className="tiny muted">
                Design stage: CML {m.cml.level} {cmlLevel(m.cml.level).name}. {m.cml.focus} <InfoTip topic="cml" />
              </p>
            </div>
            </>)}
          </header>
          <div className="orbit-pickers">
            <Picker k="altitudeId" label="Orbit altitude" options={ALTITUDE_OPTIONS.map((a) => ({ ...a, short: a.label }))} value={loadout.altitudeId} launched={launched?.altitudeId} onPick={pick('altitudeId')} topic="orbit" />
            <Picker
              k="inclinationId"
              label="Orbit inclination"
              options={INCLINATION_OPTIONS.map((a) => ({ ...a, short: `${a.inclinationDeg}°` }))}
              value={loadout.inclinationId}
              launched={launched?.inclinationId}
              onPick={pick('inclinationId')}
              topic="orbit"
            />
          </div>
          {SUBSYSTEMS.map((s) => (
            <Picker
              key={s.key}
              k={s.key}
              label={s.label}
              options={s.options as unknown as Opt[]}
              value={loadout[s.key]}
              launched={launched?.[s.key]}
              onPick={pick(s.key)}
              topic={s.key === 'payloadId' ? 'swath' : s.key === 'recorderId' ? 'storage' : s.key === 'commsId' ? 'downlink' : s.key === 'batteryId' || s.key === 'solarId' ? 'power' : undefined}
            />
          ))}
        </section>

        <section className="design-center" aria-label="Satellite preview">
          <div className="viewer-wrap">
            <SatelliteViewer loadout={loadout} reducedMotion={reducedMotion} />
            <div className="viewer-caption">
              <span className="small">Notional smallsat · {r.bus.label.toLowerCase()} · {r.payload.label.toLowerCase()} payload</span>
              <SimBadge>FICTIONAL SPACECRAFT</SimBadge>
            </div>
          </div>
          {!expert ? (
            <StatShape spec={spec} previous={launched ? validateDesign(launched, m).spec : undefined} />
          ) : (
          <div className="spec-strip">
            <div>
              <span className="muted small">Orbital period</span>
              <span className="mono">{spec.periodMin.toFixed(1)} min</span>
            </div>
            <div>
              <span className="muted small">Swath / reach</span>
              <span className="mono">
                {spec.swathKm} km / ±{Math.round(spec.reachKm)} km
              </span>
            </div>
            <div>
              <span className="muted small">Per capture</span>
              <span className="mono">
                {spec.dataMBPerCapture} MB · {spec.captureWh.toFixed(1)} Wh · {spec.captureS} s
              </span>
            </div>
            <div>
              <span className="muted small">Detail multiplier</span>
              <span className="mono">x{spec.detail}</span>
            </div>
            <div>
              <span className="muted small">Downlink</span>
              <span className="mono">{fmtNum(spec.downlinkMBPerMin)} MB/min</span>
            </div>
          </div>
          )}
          {changedKeys.length > 0 && (
            <p className="small changed-line">
              Changed since your last launch: {changedKeys.map((k) => KEY_LABEL[k]).join(', ')}.
            </p>
          )}
        </section>

        <aside className="design-right" aria-label="Engineering budget">
          <div className="panel">
            <div className="panel-head">
              <h4>Engineering budget</h4>
              <span className="tiny muted">dashed = before last change</span>
            </div>
            <div className="panel-body budget">
              <Meter label="Launch mass" value={spec.massKg} max={spec.launchCapacityKg} ghost={ghost.massKg} display={`${spec.massKg} / ${spec.launchCapacityKg} kg`} tone={spec.massKg > spec.launchCapacityKg ? 'crit' : spec.massMarginFrac < 0.1 ? 'warn' : undefined} />
              <Meter label="Bus structure" value={spec.subsystemMassKg} max={spec.structureCapacityKg} ghost={ghost.subsystemMassKg} display={`${spec.subsystemMassKg} / ${spec.structureCapacityKg} kg`} tone={spec.subsystemMassKg > spec.structureCapacityKg ? 'crit' : undefined} />
              <Meter label="Credits" value={spec.cost} max={spec.budget} ghost={ghost.cost} mark={recSpec.cost} display={`${spec.cost} / ${spec.budget} cr`} tone={spec.cost > spec.budget ? 'crit' : spec.budgetMarginFrac < 0.05 ? 'warn' : undefined} title="White tick: recommended design cost" />
              <Meter label="Solar generation (sunlight)" value={spec.solarW} max={240} ghost={ghost.solarW} mark={loadsW} display={`${spec.solarW} W`} tone={spec.orbitAvgBalanceW < 0 ? 'crit' : spec.orbitAvgBalanceW < 15 ? 'warn' : 'go'} title="White tick: continuous housekeeping load" />
              <Meter label="Battery" value={spec.batteryWh} max={200} ghost={ghost.batteryWh} display={`${spec.batteryWh} Wh · ~${spec.capturesPerFullBattery} captures`} />
              <Meter label="Payload draw while capturing" value={spec.payloadPowerW} max={120} ghost={ghost.payloadPowerW} display={`${spec.payloadPowerW} W`} />
              <Meter label="Recorder" value={spec.storageMB} max={12000} ghost={ghost.storageMB} display={`${fmtNum(spec.storageMB)} MB · ${spec.capturesPerFullStorage} captures`} />
              <Meter label="Downlink rate" value={spec.downlinkMbps} max={260} ghost={ghost.downlinkMbps} display={`${spec.downlinkMbps} Mbps · ${spec.radioPowerW} W`} />
              <Meter label="Sensor swath" value={spec.swathKm} max={720} ghost={ghost.swathKm} display={`${spec.swathKm} km`} />
              <Meter label="Data per capture" value={spec.dataMBPerCapture} max={900} ghost={ghost.dataMBPerCapture} display={`${spec.dataMBPerCapture} MB`} />
              <p className="tiny muted">
                Pointing: {r.pointing.label.toLowerCase()}
                {r.pointing.edgeFactor < 1 ? `, edge captures x${r.pointing.edgeFactor}` : `, +${r.pointing.extraReachKm} km reach`}. Orbit-average power balance {spec.orbitAvgBalanceW >= 0 ? '+' : ''}
                {spec.orbitAvgBalanceW.toFixed(0)} W.
              </p>
            </div>
          </div>

          <div className="panel validation" aria-live="polite">
            <div className="panel-head">
              <h4>Design checks</h4>
              <span className={`tiny ${fails.length ? 'txt-crit' : warns.length ? 'txt-warn' : 'txt-go'}`}>
                {fails.length ? `${fails.length} failing` : warns.length ? `${warns.length} warning${warns.length > 1 ? 's' : ''}` : 'all passing'}
              </span>
            </div>
            <ul className={`checks ${shown ? 'shown' : ''}`}>
              {(shown ? validation.checks : validation.checks.filter((c) => c.level !== 'pass')).map((c) => (
                <li key={c.id} className={`check ${c.level}`}>
                  <span className="check-icon" aria-label={c.level}>
                    {ICON[c.level]}
                  </span>
                  <span>
                    <strong>{c.label}.</strong> <span className="muted">{c.detail}</span>
                  </span>
                </li>
              ))}
              {!shown && validation.checks.every((c) => c.level === 'pass') && <li className="check-hint small muted">Press Validate design to see every check.</li>}
            </ul>
            <div className="panel-body row-gap">
              <Button
                onClick={() => {
                  setShown(true);
                  sfx(!validation.ok ? 'reject' : validation.checks.some((c) => c.level === 'warn') ? 'warn' : 'lock');
                }}
              >
                Validate design
              </Button>
              <Button variant="ghost" onClick={() => setLoadout({ ...m.recommended })}>
                Reset to recommended
              </Button>
            </div>
          </div>
          <Button variant="primary" size="big" onClick={proceed} disabled={shown && !validation.ok} sound={false}>
            {validation.ok ? 'Continue to mission plan' : 'Fix failing checks to continue'}
          </Button>
        </aside>
      </main>
    </div>
  );
}
