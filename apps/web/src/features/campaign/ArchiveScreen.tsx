import { MISSIONS } from '@ofw/simulation';
import { Button, TopBar } from '../../components/ui';
import { useGame } from '../../game/state/store';

export function ArchiveScreen() {
  const progress = useGame((s) => s.progress);
  const selectMission = useGame((s) => s.selectMission);
  const go = useGame((s) => s.go);
  const closeInfo = useGame((s) => s.closeInfo);
  return (
    <div className="screen">
      <TopBar>
        <Button variant="ghost" size="sm" onClick={closeInfo}>
          Back
        </Button>
      </TopBar>
      <main className="page">
        <h1>Mission archive</h1>
        <p className="lede">Three missions, each adding one new pressure. Any mission can be flown at any time.</p>
        <ol className="archive-list">
          {MISSIONS.map((m) => {
            const p = progress[m.id];
            return (
              <li key={m.id} className="archive-item">
                <div className="arch-code mono">{m.code}</div>
                <div className="arch-body">
                  <h3>{m.name}</h3>
                  <p className="small">{m.tagline}</p>
                  <p className="tiny muted">
                    {m.regionName} · NASA FIRMS VIIRS NOAA-20, {m.firms.date} · budget {m.budgetCredits} credits
                  </p>
                  <p className="tiny muted">Practises: {m.teaches.join(', ').toLowerCase()}</p>
                </div>
                <div className="arch-status">
                  {p ? (
                    <>
                      <span className={`grade grade-${p.bestGrade} sm`}>{p.bestGrade}</span>
                      <span className="tiny muted">
                        best {p.bestScore} · {p.completed ? 'objective met' : 'not yet met'} · {p.attempts} run{p.attempts === 1 ? '' : 's'}
                      </span>
                    </>
                  ) : (
                    <span className="tiny muted">Not flown</span>
                  )}
                  <Button
                    variant={p?.completed ? undefined : 'primary'}
                    onClick={() => {
                      selectMission(m.id);
                      go('briefing');
                    }}
                  >
                    Open briefing
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
