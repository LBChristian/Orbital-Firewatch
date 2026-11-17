import { useEffect, useRef, useState } from 'react';
import { getMission, resolveLoadout } from '@ofw/simulation';
import { Button } from '../../components/ui';
import { useGame } from '../../game/state/store';
import { EarthVignette } from '../../three/EarthVignette';

const DURATION_MS = 3000;

export function DeploySequence() {
  const missionId = useGame((s) => s.missionId);
  const loadout = useGame((s) => s.loadouts[s.missionId]);
  const startRun = useGame((s) => s.startRun);
  const go = useGame((s) => s.go);
  const notify = useGame((s) => s.notify);
  const reducedMotion = useGame((s) => s.settings.reducedMotion);
  const m = getMission(missionId);
  const r = resolveLoadout(loadout);
  const started = useRef(false);
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      const err = startRun();
      if (err) {
        notify(err, 'critical');
        go('planning');
        return;
      }
    }
    const t1 = setTimeout(() => setLine(1), 700);
    const t2 = setTimeout(() => setLine(2), 1500);
    const t3 = setTimeout(() => go('operations'), reducedMotion ? 600 : DURATION_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') go('operations');
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('keydown', onKey);
    };
  }, [startRun, go, notify, reducedMotion]);

  const lines = [
    `${r.launch.label} separation · ${r.altitude.label} · ${r.inclination.inclinationDeg}°`,
    `Solar arrays deploying · ${r.solar.label.toLowerCase()}`,
    `Inserted on track for ${m.code} ${m.name}`,
  ];
  return (
    <main className="deploy-screen">
      <EarthVignette mode="deploy" loadout={loadout} inclinationDeg={r.inclination.inclinationDeg} reducedMotion={reducedMotion} />
      <div className="deploy-hud">
        {lines.slice(0, line + 1).map((l) => (
          <p key={l} className="mono deploy-line">
            {l}
          </p>
        ))}
        <p className="tiny muted">Simulated deployment of a fictional spacecraft.</p>
      </div>
      <div className="deploy-skip">
        <Button variant="ghost" onClick={() => go('operations')} kbd="Esc">
          Skip
        </Button>
      </div>
    </main>
  );
}
