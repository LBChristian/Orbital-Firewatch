import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import L from 'leaflet';
import {
  stationFootprintKm,
  trackSegments,
  type FirmsDetection,
  type MissionDef,
  type MissionGeometry,
  type TargetGroup,
} from '@ofw/simulation';
import { useGame } from '../../game/state/store';
import { BLUE_MARBLE, PixelLayer, REFERENCE_FEATURES, bearing, corridor, destination, trueColor, type ImageryOption } from './mapLayers';

export type TargetVisual = 'queued' | 'available' | 'inwindow' | 'capturing' | 'stored' | 'delivered' | 'missed' | 'skipped' | 'lost' | 'unreachable';

export interface MapHandle {
  setSatellite(step: number, passStart: number): void;
  flash(targetId: string, kind: 'capture' | 'fail'): void;
  packet(stationIndex: number, step: number): void;
  focusTarget(id: string): void;
}

const VISUAL_GLYPH: Record<TargetVisual, string> = {
  queued: '',
  available: '',
  inwindow: '◎',
  capturing: '◉',
  stored: '▣',
  delivered: '✓',
  missed: '✕',
  skipped: '–',
  lost: '✕',
  unreachable: '∅',
};

interface Props {
  mission: MissionDef;
  detections: FirmsDetection[];
  targets: TargetGroup[];
  fitTo: 'region' | 'pass';
  compact?: boolean;
  targetVisual?: Record<string, TargetVisual>;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onDetection?: (d: FirmsDetection | null) => void;
  geometry?: MissionGeometry | null;
  altitudeKm?: number;
  swathHalfKm?: number;
  reachKm?: number;
  handleRef?: MutableRefObject<MapHandle | null>;
  showLegend?: boolean;
  legendOpen?: boolean;
}

export function MissionMap(props: Props) {
  const {
    mission,
    detections,
    targets,
    fitTo,
    compact,
    targetVisual,
    selectedId,
    onSelect,
    onDetection,
    geometry,
    altitudeKm = 550,
    swathHalfKm,
    reachKm,
    handleRef,
    showLegend = !compact,
    legendOpen = true,
  } = props;
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layers = useRef<{
    pixels: PixelLayer;
    targets: L.LayerGroup;
    track: L.LayerGroup;
    stations: L.LayerGroup;
    live: L.LayerGroup;
    fx: L.LayerGroup;
    sat?: L.Marker;
    scan?: L.Polyline;
    trail?: L.Polyline;
  } | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const fitRef = useRef<() => void>(() => {});
  const missionImagery = useMemo(() => trueColor(mission.imagery.layerId, mission.imagery.label, mission.imagery.date), [mission]);
  const [imagery, setImagery] = useState<ImageryOption | null>(missionImagery);
  const [imageryNote, setImageryNote] = useState<string>('');
  const mapDim = useGame((s) => s.settings.mapDim);
  const reducedMotion = useGame((s) => s.settings.reducedMotion);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onDetRef = useRef(onDetection);
  onDetRef.current = onDetection;

  // create map once
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, {
      zoomControl: !compact,
      attributionControl: false,
      worldCopyJump: true,
      minZoom: 2,
      maxZoom: 12,
      zoomSnap: 0.25,
      preferCanvas: false,
      keyboard: true,
      scrollWheelZoom: !compact,
    });
    mapRef.current = map;
    map.createPane('imagery');
    map.getPane('imagery')!.style.zIndex = '150';
    map.createPane('reference');
    map.getPane('reference')!.style.zIndex = '160';
    map.createPane('sim');
    map.getPane('sim')!.style.zIndex = '420';
    map.createPane('targets');
    map.getPane('targets')!.style.zIndex = '620';
    map.createPane('satellite');
    map.getPane('satellite')!.style.zIndex = '650';
    L.tileLayer(REFERENCE_FEATURES, { pane: 'reference', maxNativeZoom: 9, maxZoom: 12, opacity: 0.55 }).addTo(map);
    const pixels = new PixelLayer({ pane: 'overlayPane' });
    pixels.addTo(map);
    const group = (pane: string) => L.layerGroup([], { pane }).addTo(map);
    layers.current = { pixels, targets: group('targets'), track: group('sim'), stations: group('sim'), live: group('satellite'), fx: group('satellite') };
    const b = mission.bbox;
    fitRef.current = () =>
      map.fitBounds(
        [
          [b.south, b.west],
          [b.north, b.east],
        ],
        { padding: compact ? [8, 8] : [40, 40], animate: false },
      );
    fitRef.current();
    // Keep Leaflet's size in sync with its container (layout can settle after mount) and
    // re-fit the view until the player pans or zooms by hand.
    let userMoved = false;
    const markMoved = () => (userMoved = true);
    map.on('dragstart', markMoved);
    el.current.addEventListener('wheel', markMoved, { passive: true });
    const ro = new ResizeObserver(() => {
      if (mapRef.current !== map) return;
      map.invalidateSize({ pan: false });
      if (!userMoved) fitRef.current();
    });
    ro.observe(el.current);
    map.on('remove', () => ro.disconnect());
    map.on('click', (e: L.LeafletMouseEvent) => {
      const hit = pixels.hitTest(e.containerPoint);
      onDetRef.current?.(hit ?? null);
      if (!hit) onSelectRef.current?.(null);
    });
    return () => {
      ro.disconnect();
      mapRef.current = null;
      map.remove();
      layers.current = null;
      markers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id, compact]);

  // imagery with fallback chain: true colour (date) -> Blue Marble -> neutral
  useEffect(() => {
    setImagery(missionImagery);
    setImageryNote('');
  }, [missionImagery]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !imagery) return;
    let ok = 0;
    let bad = 0;
    const layer = L.tileLayer(imagery.url, { pane: 'imagery', maxNativeZoom: imagery.maxNativeZoom, maxZoom: 12, crossOrigin: true });
    layer.on('tileload', () => ok++);
    layer.on('tileerror', () => {
      bad++;
      if (bad >= 4 && ok === 0) fallback();
    });
    const timer = setTimeout(() => {
      if (ok === 0 && bad > 0) fallback();
    }, 6000);
    const fallback = () => {
      clearTimeout(timer);
      if (imagery.id !== BLUE_MARBLE.id) {
        setImageryNote(`${imagery.label} for ${imagery.date} did not load; showing the static Blue Marble layer instead.`);
        setImagery(BLUE_MARBLE);
      } else {
        setImageryNote('NASA GIBS imagery is unavailable; showing a neutral background. Gameplay is unaffected.');
        setImagery(null);
      }
    };
    layer.addTo(map);
    return () => {
      clearTimeout(timer);
      layer.remove();
    };
  }, [imagery]);

  // detections (NASA source layer)
  const highlight = useMemo(() => {
    const t = targets.find((x) => x.id === selectedId);
    return new Set(t?.members.map((m) => m.id) ?? []);
  }, [targets, selectedId]);
  useEffect(() => {
    layers.current?.pixels.setPoints(detections, highlight);
  }, [detections, highlight]);

  // target group markers (game-generated)
  useEffect(() => {
    const L_ = layers.current;
    if (!L_) return;
    L_.targets.clearLayers();
    markers.current.clear();
    for (const t of targets) {
      const v = targetVisual?.[t.id] ?? 'available';
      const sel = t.id === selectedId;
      const synthetic = t.state === 'SYNTHETIC DEMO';
      const icon = L.divIcon({
        className: '',
        html: `<div class="tg tg-${v}${sel ? ' tg-sel' : ''}${synthetic ? ' tg-syn' : ''}${reducedMotion ? ' still' : ''}"><span class="tg-ring"></span><span class="tg-label">${t.callsign}<i>${VISUAL_GLYPH[v]}</i></span></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const mk = L.marker([t.lat, t.lon], { icon, pane: 'targets', keyboard: true, title: `${t.callsign}: game priority ${t.priority.total}, ${v}`, riseOnHover: true });
      mk.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRef.current?.(t.id);
      });
      mk.addTo(L_.targets);
      markers.current.set(t.id, mk);
    }
  }, [targets, targetVisual, selectedId, reducedMotion]);

  // simulated track, swath, reach and stations
  useEffect(() => {
    const L_ = layers.current;
    const map = mapRef.current;
    if (!L_ || !map) return;
    L_.track.clearLayers();
    L_.stations.clearLayers();
    for (const g of mission.groundStations) {
      const r = stationFootprintKm(altitudeKm, g.minElevationDeg) * 1000;
      L.circle([g.lat, g.lon], { radius: r, pane: 'sim', color: '#5cd69c', weight: 1, dashArray: '2 6', fillColor: '#5cd69c', fillOpacity: 0.04, interactive: false }).addTo(L_.stations);
      L.marker([g.lat, g.lon], {
        pane: 'sim',
        icon: L.divIcon({ className: '', html: `<div class="gs"><span class="gs-tri"></span><span class="gs-label">${g.name}</span></div>`, iconSize: [16, 16], iconAnchor: [8, 8] }),
        title: `${g.name}: notional ground station, min elevation ${g.minElevationDeg}°`,
      }).addTo(L_.stations);
    }
    if (!geometry) return;
    // Full mission ground track (faint)
    for (const seg of trackSegments(geometry.lat, geometry.lon, 0, geometry.nSteps - 1, 10)) {
      L.polyline(seg, { pane: 'sim', color: '#3fd0e0', weight: 1, opacity: 0.35, dashArray: '4 6', interactive: false }).addTo(L_.track);
    }
    // Pass sections: swath + reach corridors, solid track
    for (const p of geometry.passes) {
      const from = Math.max(0, p.startStep - 60);
      const to = Math.min(geometry.nSteps - 1, p.endStep + 60);
      for (const seg of trackSegments(geometry.lat, geometry.lon, from, to, 3)) {
        if (reachKm && swathHalfKm && reachKm > swathHalfKm + 1) {
          L.polygon(corridor(seg, reachKm), { pane: 'sim', color: '#3fd0e0', weight: 1, dashArray: '6 5', fill: false, opacity: 0.7, interactive: false }).addTo(L_.track);
        }
        if (swathHalfKm) {
          L.polygon(corridor(seg, swathHalfKm), { pane: 'sim', color: '#3fd0e0', weight: 1, opacity: 0.8, fillColor: '#3fd0e0', fillOpacity: 0.12, interactive: false }).addTo(L_.track);
        }
        L.polyline(seg, { pane: 'sim', color: '#3fd0e0', weight: 2, opacity: 0.95, interactive: false }).addTo(L_.track);
      }
      // Direction chevron at pass midpoint
      const mid = Math.round((p.startStep + p.endStep) / 2);
      const br = bearing(geometry.lat[mid], geometry.lon[mid], geometry.lat[mid + 1], geometry.lon[mid + 1]);
      L.marker([geometry.lat[mid], geometry.lon[mid]], {
        pane: 'sim',
        interactive: false,
        icon: L.divIcon({ className: '', html: `<div class="chev" style="transform:rotate(${(br * 180) / Math.PI}deg)">▲</div><div class="pass-tag">Pass ${p.index + 1}</div>`, iconSize: [14, 14], iconAnchor: [7, 7] }),
      }).addTo(L_.track);
    }
    if (fitTo === 'pass' && geometry.passes.length) {
      const p = geometry.passes[0];
      const pts: [number, number][] = [];
      for (let k = p.startStep; k <= p.endStep; k += 10) pts.push([geometry.lat[k], geometry.lon[k]]);
      const b = mission.bbox;
      pts.push([b.south, b.west], [b.north, b.east]);
      const bounds = L.latLngBounds(pts);
      fitRef.current = () => map.fitBounds(bounds, { padding: [30, 30], animate: false });
      fitRef.current();
    }
  }, [geometry, swathHalfKm, reachKm, mission, altitudeKm, fitTo]);

  // imperative handle for operations
  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      setSatellite(step, passStart) {
        const L_ = layers.current;
        if (!L_ || !geometry) return;
        const k = Math.min(step, geometry.nSteps - 2);
        const lat = geometry.lat[k];
        const lon = geometry.lon[k];
        const br = bearing(lat, lon, geometry.lat[k + 1], geometry.lon[k + 1]);
        const deg = (br * 180) / Math.PI;
        if (!L_.sat) {
          L_.sat = L.marker([lat, lon], {
            pane: 'satellite',
            interactive: false,
            icon: L.divIcon({
              className: '',
              html: `<div class="sat-mk"><svg viewBox="-16 -16 32 32" width="34" height="34"><rect x="-14" y="-3" width="9" height="6" fill="#16305e" stroke="#9aa3ad"/><rect x="5" y="-3" width="9" height="6" fill="#16305e" stroke="#9aa3ad"/><rect x="-4.5" y="-5" width="9" height="10" rx="1.5" fill="#d4ad55" stroke="#f3dc9a"/><path d="M0 -12 L3 -7 L-3 -7 Z" fill="#3fd0e0"/></svg></div>`,
              iconSize: [34, 34],
              iconAnchor: [17, 17],
            }),
          }).addTo(L_.live);
          L_.scan = L.polyline([], { pane: 'satellite', color: '#e6fbff', weight: 2, opacity: 0.85, interactive: false }).addTo(L_.live);
          L_.trail = L.polyline([], { pane: 'satellite', color: '#3fd0e0', weight: 3, opacity: 0.9, interactive: false }).addTo(L_.live);
        }
        L_.sat.setLatLng([lat, lon]);
        const svg = (L_.sat.getElement()?.querySelector('.sat-mk') as HTMLElement | null) ?? null;
        if (svg) svg.style.transform = `rotate(${deg}deg)`;
        if (swathHalfKm) {
          L_.scan!.setLatLngs([destination(lat, lon, br - Math.PI / 2, swathHalfKm), [lat, lon], destination(lat, lon, br + Math.PI / 2, swathHalfKm)]);
        }
        const trail: [number, number][] = [];
        const from = Math.max(passStart, k - 400);
        let prev: number | null = null;
        for (let i = from; i <= k; i += 2) {
          if (prev !== null && Math.abs(geometry.lon[i] - prev) > 180) trail.length = 0;
          trail.push([geometry.lat[i], geometry.lon[i]]);
          prev = geometry.lon[i];
        }
        L_.trail!.setLatLngs(trail);
      },
      flash(targetId, kind) {
        const L_ = layers.current;
        const t = targets.find((x) => x.id === targetId);
        if (!L_ || !t) return;
        const fx = L.marker([t.lat, t.lon], {
          pane: 'satellite',
          interactive: false,
          icon: L.divIcon({ className: '', html: `<div class="fx-${kind}${reducedMotion ? ' still' : ''}"></div>`, iconSize: [80, 80], iconAnchor: [40, 40] }),
        }).addTo(L_.fx);
        setTimeout(() => fx.remove(), 1300);
      },
      packet(stationIndex, step) {
        const L_ = layers.current;
        const map = mapRef.current;
        const g = mission.groundStations[stationIndex];
        if (!L_ || !map || !g || !geometry || reducedMotion) return;
        const k = Math.min(step, geometry.nSteps - 1);
        const from = L.latLng(geometry.lat[k], geometry.lon[k]);
        const to = L.latLng(g.lat, g.lon);
        const mk = L.marker(from, { pane: 'satellite', interactive: false, icon: L.divIcon({ className: '', html: '<div class="pkt"></div>', iconSize: [8, 8], iconAnchor: [4, 4] }) }).addTo(L_.fx);
        const t0 = performance.now();
        const anim = () => {
          const u = Math.min(1, (performance.now() - t0) / 700);
          mk.setLatLng([from.lat + (to.lat - from.lat) * u, from.lng + (to.lng - from.lng) * u]);
          if (u < 1) requestAnimationFrame(anim);
          else mk.remove();
        };
        requestAnimationFrame(anim);
      },
      focusTarget(id) {
        const t = targets.find((x) => x.id === id);
        if (t && mapRef.current) mapRef.current.panTo([t.lat, t.lon], { animate: !reducedMotion });
      },
    };
    return () => {
      if (handleRef) handleRef.current = null;
    };
  }, [handleRef, geometry, targets, swathHalfKm, mission, reducedMotion]);

  // reset satellite layers when geometry changes
  useEffect(() => {
    const L_ = layers.current;
    if (!L_) return;
    L_.live.clearLayers();
    L_.sat = undefined;
    L_.scan = undefined;
    L_.trail = undefined;
  }, [geometry]);

  const synthetic = detections.some((d) => d.state === 'SYNTHETIC DEMO');
  return (
    <div className={`mission-map ${compact ? 'compact' : ''} ${mapDim ? 'dim' : ''} ${imagery ? '' : 'neutral'}`}>
      <div ref={el} className="map-canvas" role="application" aria-label={`Map of ${mission.regionName} with FIRMS detections and game targets`} />
      {showLegend && (
        <details className="map-legend" open={legendOpen}>
          <summary>Legend</summary>
          <div className="lg-group">
            <span className="lg-title">NASA source data</span>
            {!synthetic ? (
              <span>
                <i className="lg-px" /> FIRMS detection (pixel, not a fire boundary)
              </span>
            ) : (
              <span>
                <i className="lg-syn" /> SYNTHETIC DEMO point (not NASA data)
              </span>
            )}
          </div>
          <div className="lg-group">
            <span className="lg-title">Game simulation</span>
            <span>
              <i className="lg-tg" /> Target group (game grouping)
            </span>
            {geometry && (
              <>
                <span>
                  <i className="lg-track" /> Simulated ground track
                </span>
                <span>
                  <i className="lg-swath" /> Sensor swath (approximate)
                </span>
                {reachKm && swathHalfKm && reachKm > swathHalfKm + 1 && (
                  <span>
                    <i className="lg-reach" /> Pointing reach
                  </span>
                )}
              </>
            )}
            <span>
              <i className="lg-gs" /> Notional ground station and contact range
            </span>
          </div>
        </details>
      )}
      {!compact && (
        <button
          className="imagery-toggle"
          onClick={() => {
            setImageryNote('');
            setImagery(imagery?.id === missionImagery.id ? BLUE_MARBLE : missionImagery);
          }}
          title="Switch background imagery"
        >
          {imagery?.id === missionImagery.id ? 'Imagery: mission day' : 'Imagery: Blue Marble'}
        </button>
      )}
      <div className="map-credits">
        {imagery ? imagery.attribution : 'Neutral background (imagery unavailable)'} · Detections: NASA LANCE FIRMS · Simulation layers are fictional
        {imageryNote && <div className="map-note">{imageryNote}</div>}
      </div>
    </div>
  );
}
