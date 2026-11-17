import { useEffect, useState } from 'react';
import { CodexDrawer } from '../components/Codex';
import { audio } from '../game/audio/sfx';
import { fetchServerStatus } from '../game/data/feed';
import { useGame } from '../game/state/store';
import { TitleScreen } from '../features/title/TitleScreen';
import { BriefingScreen } from '../features/briefing/BriefingScreen';
import { DesignBay } from '../features/satellite-builder/DesignBay';
import { PlanningScreen } from '../features/mission-map/PlanningScreen';
import { DeploySequence } from '../features/deploy/DeploySequence';
import { OperationsScreen } from '../features/operations/OperationsScreen';
import { DebriefScreen } from '../features/debrief/DebriefScreen';
import { ArchiveScreen } from '../features/campaign/ArchiveScreen';
import { HowToPlay } from '../features/campaign/HowToPlay';
import { DataSources } from '../features/campaign/DataSources';
import { SettingsScreen } from '../features/campaign/SettingsScreen';

function Toast() {
  const toast = useGame((s) => s.toast);
  const [visible, setVisible] = useState<typeof toast>(null);
  useEffect(() => {
    if (!toast) return;
    setVisible(toast);
    const t = setTimeout(() => setVisible(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);
  if (!visible) return null;
  return (
    <div className={`toast ${visible.tone}`} role="status" aria-live="polite">
      {visible.text}
    </div>
  );
}

export function App() {
  const screen = useGame((s) => s.screen);
  const settings = useGame((s) => s.settings);
  const setServerStatus = useGame((s) => s.setServerStatus);
  const openCodex = useGame((s) => s.openCodex);
  const codexOpen = useGame((s) => s.codexOpen);

  useEffect(() => {
    audio.setLevels(settings);
    audio.setAmbient(settings.ambient > 0 && !settings.muted);
  }, [settings]);

  useEffect(() => {
    void fetchServerStatus().then(setServerStatus);
  }, [setServerStatus]);

  // Unlock audio on the first user gesture (never autoplay).
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === '?' && !codexOpen) {
        e.preventDefault();
        openCodex();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCodex, codexOpen]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
  }, [settings.reducedMotion]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  return (
    <>
      {screen === 'title' && <TitleScreen />}
      {screen === 'briefing' && <BriefingScreen />}
      {screen === 'design' && <DesignBay />}
      {screen === 'planning' && <PlanningScreen />}
      {screen === 'deploy' && <DeploySequence />}
      {screen === 'operations' && <OperationsScreen />}
      {screen === 'debrief' && <DebriefScreen />}
      {screen === 'archive' && <ArchiveScreen />}
      {screen === 'howto' && <HowToPlay />}
      {screen === 'sources' && <DataSources />}
      {screen === 'settings' && <SettingsScreen />}
      <CodexDrawer />
      <Toast />
    </>
  );
}
