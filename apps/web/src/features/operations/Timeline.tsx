import { memo, useMemo } from 'react';
import { formatMet, type GameEvent, type MissionGeometry, type MissionRun } from '@ofw/simulation';

const W = 1000;

/** Static mission tape: eclipse, passes, contacts and queued target windows. */
const TapeStatic = memo(function TapeStatic({ geometry, queuedIds }: { geometry: MissionGeometry; queuedIds: string[] }) {
  const n = geometry.nSteps;
  const x = (k: number) => (k / n) * W;
  const eclipse = useMemo(() => {
    const spans: [number, number][] = [];
    let start = -1;
    for (let k = 0; k < n; k++) {
      if (!geometry.sunlit[k] && start < 0) start = k;
      if ((geometry.sunlit[k] || k === n - 1) && start >= 0) {
        spans.push([start, k]);
        start = -1;
      }
    }
    return spans;
  }, [geometry, n]);
  const qset = new Set(queuedIds);
  const wins = geometry.windows.filter((w) => qset.has(w.targetId));
  return (
    <g>
      {eclipse.map(([a, b]) => (
        <rect key={a} x={x(a)} y={0} width={Math.max(1, x(b) - x(a))} height={56} className="tape-eclipse" />
      ))}
      {geometry.passes.map((p) => (
        <g key={p.index}>
          <rect x={x(p.startStep)} y={6} width={Math.max(2, x(p.endStep) - x(p.startStep))} height={14} className="tape-pass" />
          <text x={x(p.startStep) + 3} y={17} className="tape-txt">
            P{p.index + 1}
          </text>
        </g>
      ))}
      {geometry.contacts.map((c) => (
        <rect key={`${c.stationId}-${c.startStep}`} x={x(c.startStep)} y={24} width={Math.max(2, x(c.endStep) - x(c.startStep))} height={10} className="tape-contact" />
      ))}
      {wins.map((w) => (
        <rect key={`${w.targetId}-${w.startStep}`} x={x(w.startStep)} y={38} width={Math.max(1.5, x(w.endStep) - x(w.startStep))} height={6} className="tape-window" />
      ))}
    </g>
  );
});

const MARK: Partial<Record<GameEvent['type'], string>> = {
  'capture-complete': 'tape-ev-capture',
  'packet-delivered': 'tape-ev-deliver',
  'capture-rejected': 'tape-ev-bad',
  'capture-failed': 'tape-ev-bad',
  'safe-mode': 'tape-ev-bad',
  'packet-lost': 'tape-ev-bad',
};

export function Timeline({ run, queuedIds }: { run: MissionRun; queuedIds: string[] }) {
  const g = run.config.geometry;
  const x = (k: number) => (k / g.nSteps) * W;
  const marks = run.state.events.filter((e) => MARK[e.type]);
  return (
    <div className="tape" aria-label={`Mission timeline, ${formatMet(run.state.step, g.stepS)} of ${formatMet(g.nSteps, g.stepS)}`}>
      <svg viewBox={`0 0 ${W} 56`} preserveAspectRatio="none" role="img" aria-hidden="true">
        <TapeStatic geometry={g} queuedIds={queuedIds} />
        {marks.map((e, i) => (
          <rect key={i} x={x(e.step) - 1} y={46} width={2.5} height={8} className={MARK[e.type]} />
        ))}
        <rect x={0} y={0} width={x(run.state.step)} height={56} className="tape-past" />
        <line x1={x(run.state.step)} x2={x(run.state.step)} y1={0} y2={56} className="tape-head" />
      </svg>
      <div className="tape-legend tiny">
        <span>
          <i className="k-pass" /> pass over region
        </span>
        <span>
          <i className="k-contact" /> ground contact
        </span>
        <span>
          <i className="k-window" /> queued target in reach
        </span>
        <span>
          <i className="k-eclipse" /> eclipse
        </span>
        <span>
          <i className="k-capture" /> capture
        </span>
        <span>
          <i className="k-deliver" /> delivered
        </span>
        <span className="mono tape-end">
          {formatMet(run.state.step, g.stepS)} / {formatMet(g.nSteps, g.stepS)}
        </span>
      </div>
    </div>
  );
}
