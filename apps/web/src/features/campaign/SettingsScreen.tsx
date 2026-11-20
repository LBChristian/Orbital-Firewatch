import { Button, TopBar } from '../../components/ui';
import { audio, sfx } from '../../game/audio/sfx';
import { useGame, saveProgress, type Settings } from '../../game/state/store';
import { LEGACY_PROGRESS_KEY } from '@ofw/simulation';

function Slider({ label, k }: { label: string; k: 'master' | 'sfx' | 'ambient' }) {
  const v = useGame((s) => s.settings[k]);
  const setSettings = useGame((s) => s.setSettings);
  return (
    <label className="slider">
      <span>{label}</span>
      <input type="range" min={0} max={1} step={0.05} value={v} onChange={(e) => setSettings({ [k]: Number(e.target.value) } as Partial<Settings>)} />
      <span className="mono">{Math.round(v * 100)}%</span>
    </label>
  );
}

function Toggle({ label, k, hint }: { label: string; k: 'muted' | 'reducedMotion' | 'mapDim' | 'coach' | 'unlockAll' | 'expertView'; hint: string }) {
  const v = useGame((s) => s.settings[k]);
  const setSettings = useGame((s) => s.setSettings);
  return (
    <label className="toggle">
      <input type="checkbox" checked={v} onChange={(e) => setSettings({ [k]: e.target.checked } as Partial<Settings>)} />
      <span>
        {label}
        <span className="tiny muted block">{hint}</span>
      </span>
    </label>
  );
}

function Assist({ label, k, hint }: { label: string; k: 'assistObserve' | 'assistDownlink'; hint: string }) {
  const v = useGame((s) => s.settings[k]);
  const setSettings = useGame((s) => s.setSettings);
  return (
    <div className="assist-row">
      <span>
        {label}
        <span className="tiny muted block">{hint}</span>
      </span>
      <span className="row-gap" role="radiogroup" aria-label={label}>
        {(['mission', 'on', 'off'] as const).map((opt) => (
          <Button key={opt} size="sm" role="radio" aria-checked={v === opt} aria-pressed={v === opt} onClick={() => setSettings({ [k]: opt } as Partial<Settings>)}>
            {opt === 'mission' ? 'Mission default' : opt === 'on' ? 'Always on' : 'Always off'}
          </Button>
        ))}
      </span>
    </div>
  );
}

export function SettingsScreen() {
  const closeInfo = useGame((s) => s.closeInfo);
  return (
    <div className="screen">
      <TopBar>
        <Button variant="ghost" size="sm" onClick={closeInfo}>
          Back
        </Button>
      </TopBar>
      <main className="page settings">
        <h1>Settings</h1>
        <section className="settings-group">
          <h3>Sound</h3>
          <p className="small muted">Sound starts only after you interact with the game. The game is fully playable muted.</p>
          <Toggle label="Mute all sound" k="muted" hint="Silences every effect and the ambient loop." />
          <Slider label="Master volume" k="master" />
          <Slider label="Effects volume" k="sfx" />
          <Slider label="Ambient volume" k="ambient" />
          <div className="row-gap">
            <Button
              onClick={() => {
                audio.unlock();
                setTimeout(() => sfx('capture'), 50);
              }}
            >
              Test sound
            </Button>
            <Button
              onClick={() => {
                audio.unlock();
                setTimeout(() => sfx('lowBattery'), 50);
              }}
            >
              Test warning
            </Button>
          </div>
        </section>
        <section className="settings-group">
          <h3>Display</h3>
          <Toggle label="Reduce motion" k="reducedMotion" hint="Stops pulsing, idle rotation and the deployment animation." />
          <Toggle label="Dim map imagery" k="mapDim" hint="Darkens satellite imagery so data layers stand out." />
          <Toggle label="Expert view" k="expertView" hint="Show every number, unit, source and log on every screen. Off keeps things short." />
          <Toggle label="Show coaching tips" k="coach" hint="Short hints in early missions and when an action is waiting on you." />
        </section>
        <section className="settings-group">
          <h3>Assistance</h3>
          <p className="small muted">
            Chapter I starts with both assists on. From Chapter II you start downlinks yourself (press D or Begin downlink when a station is in view). You can switch
            either assist during a mission; the setting below only chooses how each mission starts.
          </p>
          <Assist label="Assisted observation" k="assistObserve" hint="Auto-observe captures queued targets as they come into reach." />
          <Assist label="Assisted downlink" k="assistDownlink" hint="Auto-downlink sends stored packets whenever a station is in view." />
        </section>
        <section className="settings-group">
          <h3>Progress</h3>
          <Toggle label="Open all missions (practice)" k="unlockAll" hint="Lets you fly any mission now. Saved completions and scores are not changed." />
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm('Clear campaign progress, scores and commendations on this device? This cannot be undone.')) {
                try {
                  localStorage.removeItem(LEGACY_PROGRESS_KEY);
                } catch {
                  /* ignore */
                }
                saveProgress({});
                useGame.setState({ progress: {} });
              }
            }}
          >
            Clear campaign progress
          </Button>
        </section>
      </main>
    </div>
  );
}
