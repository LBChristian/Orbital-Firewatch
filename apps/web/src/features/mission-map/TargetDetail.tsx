import { formatLatLon, formatMet, type MissionGeometry, type TargetGroup } from '@ofw/simulation';
import { InfoTip } from '../../components/Codex';
import { DISCLAIMER_SAFETY, StateBadge, fmtUtc } from '../../components/ui';

export function TargetDetail({ t, geometry, fetchedAtUtc, children }: { t: TargetGroup; geometry?: MissionGeometry | null; fetchedAtUtc?: string; children?: React.ReactNode }) {
  const p = t.priority;
  const w = p.weights;
  const windows = geometry?.windows.filter((x) => x.targetId === t.id) ?? [];
  const sat = [...new Set(t.members.map((m) => m.satellite).filter(Boolean))].join(', ');
  const inst = [...new Set(t.members.map((m) => m.instrument).filter(Boolean))].join(', ');
  const ver = [...new Set(t.members.map((m) => m.version).filter(Boolean))].join(', ');
  const dn = [...new Set(t.members.map((m) => m.daynight).filter(Boolean))].map((d) => (d === 'D' ? 'day' : d === 'N' ? 'night' : d)).join(', ');
  return (
    <div className="target-detail">
      <div className="td-head">
        <h3>{t.callsign}</h3>
        <StateBadge state={t.state} />
      </div>
      {t.zone && <p className="small zone-tag">{t.zone.toLowerCase()}</p>}

      <section>
        <h4 className="td-sub">
          Game priority <span className="mono">{p.total}</span> / 100 <InfoTip topic="priority" />
        </h4>
        <table className="prio-table">
          <tbody>
            <tr>
              <td>FRP rank in loaded data</td>
              <td className="mono">{p.frpRank.toFixed(2)}</td>
              <td className="mono faint">x{w.frpRank}</td>
            </tr>
            <tr>
              <td>Confidence cue ({t.bestConfidence})</td>
              <td className="mono">{p.confidence.toFixed(2)}</td>
              <td className="mono faint">x{w.confidence}</td>
            </tr>
            <tr>
              <td>Recency</td>
              <td className="mono">{p.recency.toFixed(2)}</td>
              <td className="mono faint">x{w.recency}</td>
            </tr>
            <tr>
              <td>Objective relevance</td>
              <td className="mono">{p.objective.toFixed(2)}</td>
              <td className="mono faint">x{w.objective}</td>
            </tr>
          </tbody>
        </table>
        <p className="tiny muted">A game ranking rule only. Not fire severity, threat level or public-safety risk.</p>
      </section>

      {geometry && (
        <section>
          <h4 className="td-sub">Simulated opportunity</h4>
          {windows.length === 0 ? (
            <p className="small txt-warn">Never within reach ({Math.round(geometry.reachKm)} km) of this ground track.</p>
          ) : (
            <ul className="small plain">
              {windows.map((x) => (
                <li key={x.startStep}>
                  {x.passIndex >= 0 ? `Pass ${x.passIndex + 1}` : 'Off-pass'}: {formatMet(x.startStep, geometry.stepS)} for {(x.endStep - x.startStep + 1) * geometry.stepS} s, closest{' '}
                  {Math.round(x.minDistKm)} km{x.offNadir ? ' (off-nadir, needs pointing reach)' : ''}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {children}

      <section>
        <h4 className="td-sub">
          NASA FIRMS source records <InfoTip topic="firms" />
        </h4>
        <dl className="kv small">
          <dt>Detections</dt>
          <dd className="mono">{t.members.length} pixel(s) within {t.spreadKm} km</dd>
          <dt>Acquired (UTC)</dt>
          <dd className="mono">
            {fmtUtc(t.earliestAcqUtc)}
            {t.latestAcqUtc !== t.earliestAcqUtc && <> to {fmtUtc(t.latestAcqUtc)}</>}
          </dd>
          {fetchedAtUtc && (
            <>
              <dt>Retrieved</dt>
              <dd className="mono">{fmtUtc(fetchedAtUtc)}</dd>
            </>
          )}
          <dt>Satellite / instrument</dt>
          <dd>
            {sat || 'n/a'} / {inst || 'n/a'}
            {t.members[0]?.instrumentDerivedFromProduct ? ' (from product name)' : ''}
          </dd>
          <dt>Product / version</dt>
          <dd className="mono">
            {t.members[0]?.product} / {ver || 'n/a'}
          </dd>
          <dt>Day / night</dt>
          <dd>{dn || 'n/a'}</dd>
          <dt>Total FRP</dt>
          <dd className="mono">
            {t.sumFrpMW} MW (max pixel {t.maxFrpMW} MW) <InfoTip topic="frp" />
          </dd>
        </dl>
        <div className="det-table-wrap">
          <table className="det-table small">
            <thead>
              <tr>
                <th>Lat, lon</th>
                <th>UTC</th>
                <th>Conf.</th>
                <th>FRP MW</th>
                <th>Scan x track km</th>
              </tr>
            </thead>
            <tbody>
              {t.members.slice(0, 12).map((d) => (
                <tr key={d.id}>
                  <td className="mono">{formatLatLon(d.latitude, d.longitude, 3)}</td>
                  <td className="mono">
                    {d.acqDate.slice(5)} {d.acqTime.slice(0, 2)}:{d.acqTime.slice(2)}
                  </td>
                  <td>{d.confidenceRaw ?? d.confidence}</td>
                  <td className="mono">{d.frpMW ?? 'n/a'}</td>
                  <td className="mono">
                    {d.scanKm ?? '?'} x {d.trackKm ?? '?'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {t.members.length > 12 && <p className="tiny muted">+{t.members.length - 12} more detections in this group.</p>}
        </div>
        <p className="tiny muted">
          Thermal-anomaly pixels; the group is a game grouping, not a fire perimeter. {DISCLAIMER_SAFETY}
        </p>
      </section>
    </div>
  );
}
