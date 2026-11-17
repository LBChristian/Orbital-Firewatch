import { CML_LEVELS, SOURCES, type Citation } from '@ofw/simulation';

/** Inline source citation: "CubeSat 101, p. 17" linking to the NASA-listed resource. */
export function Cite({ c }: { c: Pick<Citation, 'source' | 'page'> & Partial<Citation> }) {
  const s = SOURCES[c.source];
  return (
    <a className="cite" href={s.url} target="_blank" rel="noreferrer" title={`${s.title} (${s.publisher}). Opens in a new tab.`}>
      {s.short}, p. {c.page}
    </a>
  );
}

/** A subsystem note from CubeSat 101 with how the game uses it. */
export function SourceNote({ c }: { c: Citation }) {
  return (
    <span className="source-note">
      <span className="source-note-text">{c.note}</span> <Cite c={c} />
      <span className="source-note-game">In this game: {c.inGame}</span>
    </span>
  );
}

/** The CML 1–4 "spine" with the mission's level highlighted. */
export function CmlTrack({ level, reached }: { level: number; reached?: boolean }) {
  return (
    <ol className="cml-track" aria-label={`Concept maturity: this mission works at CML ${level}`}>
      {CML_LEVELS.filter((l) => l.level <= 4).map((l) => {
        const state = l.level < level ? 'past' : l.level === level ? (reached === false ? 'open' : reached ? 'done' : 'now') : 'next';
        return (
          <li key={l.level} className={`cml-step cml-${state}`} aria-current={l.level === level ? 'step' : undefined} title={l.summary}>
            <span className="cml-num mono">CML {l.level}</span>
            <span className="cml-name">{l.name}</span>
          </li>
        );
      })}
    </ol>
  );
}
