import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { DataState } from '@ofw/simulation';
import { sfx } from '../game/audio/sfx';
import { useGame, type Screen } from '../game/state/store';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'warn' | 'danger' | 'ghost';
  size?: 'sm' | 'big';
  kbd?: string;
  sound?: boolean;
};

export function Button({ variant, size, kbd, sound = true, className, onClick, children, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={['btn', variant, size, className].filter(Boolean).join(' ')}
      onClick={(e) => {
        if (sound) sfx('click');
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
      {kbd && <span className="kbd" aria-hidden="true">{kbd}</span>}
    </button>
  );
}

const STATE_TITLE: Record<DataState, string> = {
  LIVE: 'Retrieved from NASA FIRMS during this session',
  CACHED: 'NASA FIRMS data retrieved earlier and reused',
  HISTORICAL: 'NASA FIRMS data for a fixed past date (not real-time)',
  'SYNTHETIC DEMO': 'Invented training data, not NASA observations',
};

export function StateBadge({ state }: { state: DataState }) {
  const cls = state === 'SYNTHETIC DEMO' ? 'SYNTHETIC' : state;
  return (
    <span className={`state-badge state-${cls}`} title={STATE_TITLE[state]}>
      {state}
    </span>
  );
}

export function SimBadge({ children = 'SIMULATED / APPROXIMATE' }: { children?: ReactNode }) {
  return <span className="sim-badge" title="Game simulation output, not NASA data">{children}</span>;
}

export function Meter({
  label,
  value,
  max,
  display,
  tone,
  mark,
  ghost,
  title,
}: {
  label: ReactNode;
  value: number;
  max: number;
  display: ReactNode;
  tone?: 'warn' | 'crit' | 'go';
  mark?: number;
  ghost?: number;
  title?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="meter" title={title}>
      <div className="meter-top">
        <span className="label">{label}</span>
        <span className="mono">{display}</span>
      </div>
      <div className="meter-track" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} aria-label={typeof label === 'string' ? label : undefined}>
        {ghost !== undefined && <div className="meter-ghost" style={{ width: `${Math.max(0, Math.min(100, (ghost / max) * 100))}%` }} />}
        <div className={`meter-fill ${tone ?? ''}`} style={{ width: `${pct}%` }} />
        {mark !== undefined && <div className="meter-mark" style={{ left: `${Math.min(100, (mark / max) * 100)}%` }} />}
      </div>
    </div>
  );
}

export const DISCLAIMER_SHORT = 'Independent educational project using NASA data. Not affiliated with or endorsed by NASA.';
export const DISCLAIMER_SAFETY =
  'Educational simulation only. FIRMS active-fire/thermal-anomaly detections have limitations and must not be used to protect life or property.';

export function Disclaimer({ full = false }: { full?: boolean }) {
  return (
    <p className="disclaimer-line">
      {DISCLAIMER_SHORT} {full && DISCLAIMER_SAFETY}
    </p>
  );
}

const FLOW: { screen: Screen; label: string }[] = [
  { screen: 'briefing', label: 'Briefing' },
  { screen: 'design', label: 'Design' },
  { screen: 'planning', label: 'Plan' },
  { screen: 'operations', label: 'Operate' },
  { screen: 'debrief', label: 'Debrief' },
];

export function TopBar({ children, title }: { children?: ReactNode; title?: ReactNode }) {
  const screen = useGame((s) => s.screen);
  const go = useGame((s) => s.go);
  const openInfo = useGame((s) => s.openInfo);
  const openCodex = useGame((s) => s.openCodex);
  const missionId = useGame((s) => s.missionId);
  const idx = FLOW.findIndex((f) => f.screen === screen);
  return (
    <header className="topbar">
      <button className="brand" onClick={() => go('title')} aria-label="Orbital Firewatch: back to title screen">
        ORBITAL FIREWATCH
      </button>
      {idx >= 0 && (
        <nav className="crumbs" aria-label="Mission steps">
          <span className="mono faint">{missionId.slice(0, 3).toUpperCase()}</span>
          {FLOW.map((f, i) => (
            <span key={f.screen} className={i === idx ? 'on' : undefined} aria-current={i === idx ? 'step' : undefined}>
              {i > 0 && <span aria-hidden="true">/ </span>}
              {f.label}
            </span>
          ))}
        </nav>
      )}
      {title}
      <span className="spacer" />
      {children}
      <Button variant="ghost" size="sm" onClick={() => openCodex()} aria-label="Open the help codex" kbd="?">
        Help
      </Button>
      <Button variant="ghost" size="sm" onClick={() => openInfo('sources')}>
        Data &amp; sources
      </Button>
      <Button variant="ghost" size="sm" onClick={() => openInfo('settings')}>
        Settings
      </Button>
    </header>
  );
}

export function fmtNum(n: number, digits = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtAge(seconds: number | undefined): string {
  if (seconds === undefined) return '';
  if (seconds < 90) return `${Math.round(seconds)} s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
  if (seconds < 172800) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / 86400).toFixed(1)} days`;
}

export function fmtUtc(iso: string | undefined): string {
  if (!iso) return 'unknown';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}
