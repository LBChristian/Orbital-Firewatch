import { useEffect, useState } from 'react';
import { SOURCES } from '@ofw/simulation';
import { Button, DISCLAIMER_SAFETY, DISCLAIMER_SHORT, StateBadge, TopBar, fmtUtc } from '../../components/ui';
import { fetchServerStatus, loadManifest, type SnapshotManifest } from '../../game/data/feed';
import { useGame } from '../../game/state/store';

export function DataSources() {
  const closeInfo = useGame((s) => s.closeInfo);
  const server = useGame((s) => s.serverStatus);
  const setServerStatus = useGame((s) => s.setServerStatus);
  const [manifest, setManifest] = useState<SnapshotManifest | null>(null);
  useEffect(() => {
    void loadManifest().then(setManifest);
    void fetchServerStatus().then(setServerStatus);
  }, [setServerStatus]);
  return (
    <div className="screen">
      <TopBar>
        <Button variant="ghost" size="sm" onClick={closeInfo}>
          Back
        </Button>
      </TopBar>
      <main className="page sources">
        <h1>Data sources and limitations</h1>
        <p className="lede">{DISCLAIMER_SHORT}</p>
        <div className="callout crit">
          <strong>Not for emergencies.</strong> {DISCLAIMER_SAFETY} This game is not an alert, evacuation, dispatch, wildfire-response or public-safety tool.
        </div>

        <h2>Challenge 13 resources used</h2>
        <p className="small">These two documents are listed on the official Space Apps 2026 "Space Mission Design Game" Resources tab. FIRMS and GIBS are additional NASA data services and are not on that list.</p>
        <ul className="plain states-list">
          {Object.values(SOURCES).map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title}
              </a>
              <span className="tiny muted block">
                {s.authors}. {s.publisher}.{' '}
                {s.id === 'cubesat101'
                  ? 'Used for the subsystem notes in the design bay (each cites a page) and the codex.'
                  : 'Used to frame the campaign as CML 2, 3 and 4, shown on the briefing, design bay and debrief.'}
              </span>
            </li>
          ))}
        </ul>

        <h2>What is real and what is simulated</h2>
        <table className="det-table src-table">
          <thead>
            <tr>
              <th>Layer</th>
              <th>Source</th>
              <th>Shown as</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Thermal-anomaly detections</td>
              <td>NASA FIRMS (LANCE), VIIRS 375 m active fire product</td>
              <td>Orange square pixels with state badge and UTC acquisition time</td>
            </tr>
            <tr>
              <td>Background imagery</td>
              <td>NASA GIBS WMTS: Corrected Reflectance True Color on the mission date (MODIS Terra for M01, VIIRS NOAA-20 for M02 and M03, chosen after checking tile coverage); Blue Marble fallback; Reference Features overlay</td>
              <td>Map tiles, credited in the map corner with layer and date</td>
            </tr>
            <tr>
              <td>3D Earth textures</td>
              <td>NASA GIBS WMS: Blue Marble Next Generation, VIIRS Black Marble (2016)</td>
              <td>Title and deploy scenes</td>
            </tr>
            <tr>
              <td>Target groups, GAME PRIORITY</td>
              <td>Game logic</td>
              <td>Reticle markers, labelled game grouping</td>
            </tr>
            <tr>
              <td>Your satellite, orbit, swath, captures, packets, stations, score</td>
              <td>Game simulation (fictional)</td>
              <td>Cyan simulation layers labelled SIMULATED / APPROXIMATE</td>
            </tr>
            <tr>
              <td>Synthetic training points</td>
              <td>Seeded generator (invented)</td>
              <td>Violet hollow diamonds, SYNTHETIC DEMO; never labelled NASA</td>
            </tr>
          </tbody>
        </table>

        <h2>Data states</h2>
        <ul className="plain states-list">
          <li>
            <StateBadge state="LIVE" /> retrieved from FIRMS during this session (server needs a MAP_KEY).
          </li>
          <li>
            <StateBadge state="CACHED" /> an earlier FIRMS response reused; cache age is shown.
          </li>
          <li>
            <StateBadge state="HISTORICAL" /> FIRMS data for a fixed past date; the bundled mission snapshots use this.
          </li>
          <li>
            <StateBadge state="SYNTHETIC DEMO" /> invented points for training only.
          </li>
        </ul>

        <h2>Bundled snapshot</h2>
        {manifest ? (
          <dl className="kv small">
            <dt>Provider / product</dt>
            <dd>
              {manifest.product}: NASA FIRMS VIIRS NOAA-20 375 m, Collection 2 NRT
            </dd>
            {manifest.snapshots.map((s) => (
              <div key={s.missionId} className="contents">
                <dt>{s.missionId.slice(0, 3).toUpperCase()}</dt>
                <dd>
                  {s.regionName}: {s.rowCount} rows acquired {s.acquisitionDate} (UTC), copied verbatim. Retrieved{' '}
                  <span className="mono">{fmtUtc(s.retrievedAtUtc)}</span> from <span className="mono wrap">{s.sourceUrl}</span>. Imagery: {s.imagery.layerId}, {s.imagery.date}
                  {s.imagery.dateMatchesAcquisition ? ' (same date)' : ' (different date)'}.
                </dd>
              </div>
            ))}
            <dt>Notes</dt>
            <dd>{manifest.usageNotes}</dd>
          </dl>
        ) : (
          <p className="muted small">Snapshot manifest could not be loaded.</p>
        )}

        <h2>Game server</h2>
        <p className="small">
          {server ? server.message : 'The game server is not reachable. The game still runs from the bundled static snapshot.'}
          {server?.lastRetrievalUtc && ` Last live retrieval ${fmtUtc(server.lastRetrievalUtc)}.`}
        </p>

        <h2>Known limitations</h2>
        <ul className="small limits">
          <li>FIRMS detections can miss fires under cloud or smoke and can include non-fire hot sources. Confidence is categorical, not a probability. FRP is a radiative measurement, not a danger score.</li>
          <li>The player orbit is a circular two-body model on a spherical, rotating Earth. It ignores J2, drag, eccentricity and attitude dynamics. The first pass is aimed by construction.</li>
          <li>Swath, reach, power, storage, radio and cost values are fictional game-balance parameters.</li>
          <li>Ground stations are notional locations, not real facilities.</li>
          <li>The player satellite is fictional and is not the VIIRS satellite that made the detections.</li>
        </ul>

        <h2>Credits</h2>
        <p className="small">
          NASA FIRMS (Fire Information for Resource Management System), LANCE. NASA GIBS (Global Imagery Browse Services). Fonts: IBM Plex (SIL Open Font License). Libraries: React, Leaflet, Three.js, Zustand,
          Express, Zod, csv-parse. Satellite model and sound effects are generated procedurally by this project. Full list in docs/ASSET_CREDITS.md.
        </p>
      </main>
    </div>
  );
}
