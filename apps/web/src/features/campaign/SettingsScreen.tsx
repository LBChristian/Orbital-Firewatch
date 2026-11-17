import { Button, TopBar } from '../../components/ui';
import { audio, sfx } from '../../game/audio/sfx';
import { useGame, type Settings } from '../../game/state/store';

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

function Toggle({ label, k, hint }: { label: string; k: 'muted' | 'reducedMotion' | 'mapDim' | 'coach'; hint: string }) {
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

export function SettingsScreen() {
  const closeInfo = useGame((s) => s.closeInfo);
  const setSettings = useGame((s) => s.setSettings);
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
          <Toggle label="Show coaching tips" k="coach" hint="Short hints during Mission 01." />
        </section>
        <section className="settings-group">
          <h3>Progress</h3>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm('Clear your mission scores on this device?')) {
                try {
                  localStorage.removeItem('ofw.progress');
                } catch {
                  /* ignore */
                }
                useGame.setState({ progress: {} });
                setSettings({});
              }
            }}
          >
            Clear mission scores
          </Button>
        </section>
      </main>
    </div>
  );
}
