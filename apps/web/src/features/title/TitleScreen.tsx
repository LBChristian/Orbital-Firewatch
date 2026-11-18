import { useEffect, useState } from 'react';
import { MISSIONS } from '@ofw/simulation';
import { Button, DISCLAIMER_SHORT, fmtUtc } from '../../components/ui';
import { sfx } from '../../game/audio/sfx';
import { loadManifest, type SnapshotManifest } from '../../game/data/feed';
import { useGame } from '../../game/state/store';
import { EarthVignette } from '../../three/EarthVignette';

export function TitleScreen() {
  const go = useGame((s) => s.go);
  const openInfo = useGame((s) => s.openInfo);
  const selectMission = useGame((s) => s.selectMission);
  const progress = useGame((s) => s.progress);
  const server = useGame((s) => s.serverStatus);
  const reducedMotion = useGame((s) => s.settings.reducedMotion);
  const loadouts = useGame((s) => s.loadouts);
  const [manifest, setManifest] = useState<SnapshotManifest | null>(null);
  const snapDates = manifest?.snapshots.length
    ? ([
        manifest.snapshots.map((s) => s.acquisitionDate).sort()[0],
        manifest.snapshots.map((s) => s.acquisitionDate).sort().at(-1)!,
        manifest.snapshots.map((s) => s.retrievedAtUtc).sort().at(-1)!,
      ] as const)
    : null;
  useEffect(() => {
    void loadManifest().then(setManifest);
  }, []);

  const next = MISSIONS.find((m) => !progress[m.id]?.completed) ?? MISSIONS[0];
  const start = () => {
    sfx('accept');
    selectMission(next.id);
    go('briefing');
  };

  return (
    <main className="title-screen">
      <div className="title-earth">
        <EarthVignette mode="title" loadout={loadouts[MISSIONS[0].id]} reducedMotion={reducedMotion} />
      </div>
      <div className="title-content">
        <div className="title-block">
          <h1 className="game-title">
            <span>ORBITAL</span>
            <span>FIREWATCH</span>
          </h1>
          <p className="tagline">One pass. One opportunity. Make it count.</p>
          <p className="title-pitch">
            Design a small Earth-observation satellite, fly it over real NASA FIRMS thermal-anomaly detections, and bring the most valuable data home before power,
            storage and contact time run out.
          </p>
        </div>
        <nav className="title-menu" aria-label="Main menu">
          <Button variant="primary" size="big" onClick={start} sound={false}>
            {progress[MISSIONS[0].id] ? `Start mission ${next.code}` : 'Start mission'}
          </Button>
          <div className="title-secondary">
            <Button onClick={() => openInfo('archive')}>Mission archive</Button>
            <Button onClick={() => openInfo('howto')}>How to play</Button>
            <Button onClick={() => openInfo('sources')}>Data &amp; sources</Button>
            <Button onClick={() => openInfo('settings')}>Settings</Button>
          </div>
        </nav>
        <section className="feed-panel" aria-label="Data feed status">
          <div className="feed-row">
            <span className="feed-dot" data-on={server ? 'yes' : 'no'} aria-hidden="true" />
            <span>{server ? (server.keyConfigured ? 'Live FIRMS feed available' : 'Game server online, no FIRMS key') : 'Game server offline: static data only'}</span>
          </div>
          <div className="tiny muted">
            Bundled snapshots: NASA FIRMS VIIRS NOAA-20
            {snapDates && <>, acquisitions {snapDates[0]} to {snapDates[1]} (UTC), last retrieved {fmtUtc(snapDates[2])}</>}.
            {server?.lastRetrievalUtc && <> Last live retrieval {fmtUtc(server.lastRetrievalUtc)}.</>}
          </div>
        </section>
        <footer className="title-foot">
          <p className="disclaimer-line">{DISCLAIMER_SHORT}</p>
          <p className="disclaimer-line">Educational simulation. Not for emergency response.</p>
        </footer>
      </div>
    </main>
  );
}
