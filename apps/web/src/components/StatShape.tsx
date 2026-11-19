import { STAT_LABEL, type StatKey } from '../game/content/missionVoice';

const KEYS: StatKey[] = ['view', 'detail', 'battery', 'memory', 'radio'];

/**
 * Five-point shape of a satellite design. The solid shape is your satellite; the dashed
 * outline is what the mission leans on. Values are also listed as text for screen readers
 * and for anyone who prefers numbers.
 */
export function StatShape({ stats, needs, size = 200, compact = false }: { stats?: Record<StatKey, number>; needs?: Record<StatKey, number>; size?: number; compact?: boolean }) {
  const r = size * 0.34;
  const c = size / 2;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [c + Math.cos(a) * (r * v) / 5, c + Math.sin(a) * (r * v) / 5] as const;
  };
  const poly = (vals: Record<StatKey, number>) => KEYS.map((k, i) => pt(i, vals[k]).join(',')).join(' ');
  const short = (k: StatKey) => {
    const v = stats?.[k];
    const n = needs?.[k];
    if (v === undefined || n === undefined) return '';
    return v + 0.25 >= n ? 'ok' : 'low';
  };
  const label = KEYS.map((k) => `${STAT_LABEL[k].name} ${stats ? Math.round(stats[k]) : '–'}${needs ? ` of ${needs[k]} needed` : ''}`).join(', ');
  return (
    <figure className={`stat-shape${compact ? ' compact' : ''}`}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`Satellite strengths: ${label}`}>
        {[1, 2, 3, 4, 5].map((ring) => (
          <polygon key={ring} points={poly({ view: ring, detail: ring, battery: ring, memory: ring, radio: ring })} className="ss-grid" />
        ))}
        {KEYS.map((k, i) => {
          const [x, y] = pt(i, 5);
          return <line key={k} x1={c} y1={c} x2={x} y2={y} className="ss-axis" />;
        })}
        {needs && <polygon points={poly(needs)} className="ss-need" />}
        {stats && <polygon points={poly(stats)} className="ss-you" />}
        {KEYS.map((k, i) => {
          const [x, y] = pt(i, 6.4);
          return (
            <text key={k} x={x} y={y} className={`ss-label ss-${short(k)}`} textAnchor="middle" dominantBaseline="middle">
              {STAT_LABEL[k].name}
              <title>{STAT_LABEL[k].tech}</title>
            </text>
          );
        })}
      </svg>
      {!compact && (
        <figcaption className="ss-key small">
          {stats && (
            <span>
              <i className="ss-sw-you" aria-hidden="true" /> Your satellite
            </span>
          )}
          {needs && (
            <span>
              <i className="ss-sw-need" aria-hidden="true" /> What this mission leans on
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
