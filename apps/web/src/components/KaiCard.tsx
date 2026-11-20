import type { ReactNode } from 'react';
import { KAI } from '../game/content/kai';

/** Kai's short note: a few labelled lines, never a paragraph. */
export function KaiCard({ lines, children }: { lines: { label: string; text: string }[]; children?: ReactNode }) {
  return (
    <div className="kai-card">
      <div className="kai-face" aria-hidden="true">
        {KAI.initials}
      </div>
      <div className="kai-card-body">
        <span className="tiny muted">
          {KAI.name} · {KAI.role}
        </span>
        <dl className="kai-lines">
          {lines.map((l) => (
            <div key={l.label} className="kai-line">
              <dt>{l.label}</dt>
              <dd>{l.text}</dd>
            </div>
          ))}
        </dl>
        {children}
      </div>
    </div>
  );
}
