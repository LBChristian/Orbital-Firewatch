import { CHAPTERS, chapterUnlocked, getMission, missionAvailability, type MissionStatus } from '@ofw/simulation';
import { Button, TopBar } from '../../components/ui';
import { useGame } from '../../game/state/store';

const STATUS_LABEL: Record<MissionStatus, string> = {
  locked: 'Locked',
  available: 'Available',
  completed: 'Completed',
};

const COMMENDATION_LABEL: Record<string, string> = {
  complete: 'Mission Complete',
  engineering: 'Engineering',
  science: 'Science',
  operations: 'Operations',
  perfect: 'Perfect Mission',
};

export function CampaignScreen() {
  const progress = useGame((s) => s.progress);
  const unlockAll = useGame((s) => s.settings.unlockAll);
  const selectMission = useGame((s) => s.selectMission);
  const go = useGame((s) => s.go);
  return (
    <div className="screen">
      <TopBar>
        <Button variant="ghost" size="sm" onClick={() => go('title')}>
          Main menu
        </Button>
      </TopBar>
      <main className="page campaign">
        <h1>Campaign</h1>
        <p className="lede">
          Ten missions in three chapters. A mission counts as complete when its primary objective is met; your grade never locks anything.
        </p>
        {unlockAll && (
          <p className="callout info small">Practice setting on: every mission is open. Saved progress is unchanged. Turn it off in Settings.</p>
        )}
        {CHAPTERS.map((ch) => {
          const open = unlockAll || chapterUnlocked(progress, ch.id);
          return (
            <section key={ch.id} className="chapter" aria-labelledby={`${ch.id}-title`}>
              <header className="chapter-head">
                <p className="mono tiny muted">CHAPTER {ch.numeral}</p>
                <h2 id={`${ch.id}-title`}>{ch.title}</h2>
                <p className="small muted">{ch.summary}</p>
                <p className="tiny faint">{ch.order === 'any' ? 'Fly these missions in any order.' : 'Fly these missions in order.'}</p>
              </header>
              <ol className="archive-list" data-open={open}>
                {ch.missionIds.map((id) => {
                  const m = getMission(id);
                  const p = progress[id];
                  const a = missionAvailability(progress, id, unlockAll);
                  const locked = a.status === 'locked';
                  return (
                    <li key={id} className={`archive-item status-${a.status}`}>
                      <div className="arch-code mono">{m.code}</div>
                      <div className="arch-body">
                        <h3>{m.name}</h3>
                        <p className="small">{m.tagline}</p>
                        <p className="tiny muted">
                          {m.regionName} · NASA FIRMS acquisition {m.firms.date} (UTC)
                        </p>
                        {m.balanceStatus === 'provisional' && (
                          <p className="tiny faint">Objective provisional: data is final, balance testing is still to come.</p>
                        )}
                        {p && p.commendations.length > 0 && (
                          <p className="tiny muted">Commendations: {p.commendations.map((c) => COMMENDATION_LABEL[c] ?? c).join(', ')}</p>
                        )}
                      </div>
                      <div className="arch-status">
                        <span className={`mission-status mono tiny status-${a.status}`}>
                          <span aria-hidden="true">{a.status === 'completed' ? '✓ ' : a.status === 'locked' ? '▪ ' : '○ '}</span>
                          {STATUS_LABEL[a.status]}
                        </span>
                        {p && (
                          <span className="tiny muted">
                            best {p.bestScore} ({p.bestGrade}) · {p.attempts} run{p.attempts === 1 ? '' : 's'}
                          </span>
                        )}
                        {locked ? (
                          <span className="tiny muted unlock-req">{a.requirement}</span>
                        ) : (
                          <Button
                            variant={a.status === 'completed' ? undefined : 'primary'}
                            onClick={() => {
                              selectMission(id);
                              go('briefing');
                            }}
                          >
                            {a.status === 'completed' ? 'Fly again' : 'Open briefing'}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </main>
    </div>
  );
}
