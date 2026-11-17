import type { Loadout } from '@ofw/simulation';

/** Static 2D illustration used when WebGL is unavailable. Reflects the main equipment choices. */
export function SatelliteFallback({ loadout }: { loadout: Loadout }) {
  const panels = loadout.solarId === 'solar-high' ? 4 : loadout.solarId === 'solar-standard' ? 3 : 2;
  const pw = 46;
  const bw = loadout.busId === 'bus-medium' ? 92 : 72;
  const cx = 300;
  const wing = (side: number) =>
    Array.from({ length: panels }, (_, i) => (
      <rect key={`${side}-${i}`} x={side < 0 ? cx - bw / 2 - 20 - (i + 1) * (pw + 4) : cx + bw / 2 + 20 + i * (pw + 4)} y={110} width={pw} height={80} fill="#122650" stroke="#9aa3ad" strokeWidth="1.5" />
    ));
  const lensW = loadout.payloadId === 'payload-high' ? 26 : loadout.payloadId === 'payload-wide' ? 50 : 34;
  const lensH = loadout.payloadId === 'payload-high' ? 44 : 22;
  return (
    <figure className="sat-fallback">
      <svg viewBox="0 0 600 320" role="img" aria-label="Illustration of your notional satellite (WebGL unavailable)">
        <line x1={cx - bw / 2 - 20} y1={150} x2={cx + bw / 2 + 20} y2={150} stroke="#9aa3ad" strokeWidth="3" />
        {wing(-1)}
        {wing(1)}
        <rect x={cx - bw / 2} y={95} width={bw} height={110} rx={6} fill="#b8913f" stroke="#e1c47a" />
        <rect x={cx - lensW / 2} y={205} width={lensW} height={lensH} fill="#2a2f36" />
        {loadout.commsId === 'comms-high' && <path d={`M ${cx + 20} 230 q 30 30 60 0`} fill="none" stroke="#e8ecf1" strokeWidth="4" />}
        <circle cx={cx - 20} cy={180} r={3} fill="#3fd0e0" />
        <circle cx={cx - 10} cy={180} r={3} fill="#5cd69c" />
      </svg>
      <figcaption className="tiny muted">WebGL is unavailable, so a 2D illustration is shown. The notional satellite is fictional.</figcaption>
    </figure>
  );
}
