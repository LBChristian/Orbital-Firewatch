import type { DesignSpec } from '@ofw/simulation';

/** Five plain-language stats, each scaled 0..1 against the catalog's range. */
export function satStats(spec: DesignSpec): { label: string; value: number; hint: string }[] {
  const clamp = (x: number) => Math.max(0.05, Math.min(1, x));
  return [
    { label: 'View', value: clamp(spec.reachKm / 700), hint: `sees ${Math.round(spec.reachKm)} km either side` },
    { label: 'Detail', value: clamp((spec.detail - 0.4) / 0.6), hint: `image value x${spec.detail}` },
    { label: 'Battery', value: clamp(spec.batteryWh / 180), hint: `${spec.batteryWh} Wh` },
    { label: 'Memory', value: clamp(spec.storageMB / 12000), hint: `${Math.floor(spec.storageMB / spec.dataMBPerCapture)} captures` },
    { label: 'Radio', value: clamp(spec.downlinkMbps / 250), hint: `${spec.downlinkMbps} Mbps` },
  ];
}

/** A five-point stat shape. The text list underneath carries the same information for screen readers. */
export function StatShape({ spec, previous }: { spec: DesignSpec; previous?: DesignSpec }) {
  const stats = satStats(spec);
  const prev = previous ? satStats(previous) : null;
  const R = 70;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [100 + Math.cos(a) * R * v, 95 + Math.sin(a) * R * v] as const;
  };
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).join(',')).join(' ');
  return (
    <figure className="stat-shape">
      <svg viewBox="0 0 200 190" role="img" aria-label={stats.map((s) => `${s.label} ${Math.round(s.value * 10)} of 10`).join(', ')}>
        {[0.33, 0.66, 1].map((r) => (
          <polygon key={r} points={poly([r, r, r, r, r])} className="ss-grid" />
        ))}
        {stats.map((_, i) => {
          const [x, y] = pt(i, 1);
          return <line key={i} x1={100} y1={95} x2={x} y2={y} className="ss-grid" />;
        })}
        {prev && <polygon points={poly(prev.map((s) => s.value))} className="ss-prev" />}
        <polygon points={poly(stats.map((s) => s.value))} className="ss-now" />
        {stats.map((s, i) => {
          const [x, y] = pt(i, 1.22);
          return (
            <text key={s.label} x={x} y={y + 4} textAnchor="middle" className="ss-label">
              {s.label}
            </text>
          );
        })}
      </svg>
      <figcaption className="ss-list">
        {stats.map((s) => (
          <span key={s.label}>
            <strong>{s.label}</strong> {s.hint}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
