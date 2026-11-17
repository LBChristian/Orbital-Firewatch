import L from 'leaflet';
import { EARTH_RADIUS_KM, type FirmsDetection } from '@ofw/simulation';

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

export interface ImageryOption {
  id: string;
  label: string;
  date?: string;
  url: string;
  maxNativeZoom: number;
  attribution: string;
}

/** Verified against the GIBS WMTS GetCapabilities (EPSG:3857), see docs/DATA_PROVENANCE.md. */
export function trueColor(layerId: string, label: string, date: string): ImageryOption {
  return {
    id: layerId,
    label,
    date,
    url: `${GIBS}/${layerId}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    maxNativeZoom: 9,
    attribution: `Imagery: NASA GIBS, ${label}, ${date}`,
  };
}

export const BLUE_MARBLE: ImageryOption = {
  id: 'BlueMarble_ShadedRelief_Bathymetry',
  label: 'Blue Marble Shaded Relief + Bathymetry (static)',
  url: `${GIBS}/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`,
  maxNativeZoom: 8,
  attribution: 'Imagery: NASA GIBS, Blue Marble Shaded Relief and Bathymetry (static, not date-specific)',
};

export const REFERENCE_FEATURES = `${GIBS}/Reference_Features_15m/default/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png`;

/** Destination point given start, bearing (rad) and distance (km) on the sphere. */
export function destination(lat: number, lon: number, bearing: number, km: number): [number, number] {
  const d = km / EARTH_RADIUS_KM;
  const p1 = (lat * Math.PI) / 180;
  const l1 = (lon * Math.PI) / 180;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(bearing));
  const l2 = l1 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [(p2 * 180) / Math.PI, (((l2 * 180) / Math.PI + 540) % 360) - 180];
}

export function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  return Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl));
}

/** Corridor polygon of half-width km around a track segment (no antimeridian crossing). */
export function corridor(points: [number, number][], halfKm: number): [number, number][] {
  if (points.length < 2) return [];
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const br = bearing(a[0], a[1], b[0], b[1]);
    left.push(destination(points[i][0], points[i][1], br - Math.PI / 2, halfKm));
    right.push(destination(points[i][0], points[i][1], br + Math.PI / 2, halfKm));
  }
  // Keep the polygon on the same side of the antimeridian as the track
  const fix = (p: [number, number]): [number, number] => {
    const ref = points[0][1];
    let lon = p[1];
    while (lon - ref > 180) lon -= 360;
    while (lon - ref < -180) lon += 360;
    return [p[0], lon];
  };
  return [...left.map(fix), ...right.reverse().map(fix)];
}

/**
 * Canvas layer that draws FIRMS detections as small square pixels (scaled to the reported
 * scan x track footprint when zoomed in). Synthetic points are hollow violet diamonds.
 */
export class PixelLayer extends L.Layer {
  private canvas?: HTMLCanvasElement;
  private points: FirmsDetection[] = [];
  private highlight = new Set<string>();

  setPoints(points: FirmsDetection[], highlight: Set<string> = new Set()) {
    this.points = points;
    this.highlight = highlight;
    this.redraw();
  }

  onAdd(map: L.Map): this {
    this.canvas = L.DomUtil.create('canvas', 'pixel-layer leaflet-zoom-hide') as HTMLCanvasElement;
    map.getPanes().overlayPane.appendChild(this.canvas);
    map.on('moveend zoomend resize viewreset', this.redraw, this);
    this.redraw();
    return this;
  }

  onRemove(map: L.Map): this {
    map.off('moveend zoomend resize viewreset', this.redraw, this);
    this.canvas?.remove();
    this.canvas = undefined;
    return this;
  }

  /** Nearest detection within px of a container point. */
  hitTest(pt: L.Point, px = 7): FirmsDetection | undefined {
    const map = (this as unknown as { _map?: L.Map })._map;
    if (!map) return undefined;
    let best: FirmsDetection | undefined;
    let bestD = px;
    for (const d of this.points) {
      const p = map.latLngToContainerPoint([d.latitude, d.longitude]);
      const dist = p.distanceTo(pt);
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    return best;
  }

  redraw = () => {
    const map = (this as unknown as { _map?: L.Map & { _mapPane?: HTMLElement } })._map;
    // The map may have been removed (screen change) while an event was queued.
    if (!map || !this.canvas || !map._mapPane) return;
    const size = map.getSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = this.canvas;
    c.width = size.x * dpr;
    c.height = size.y * dpr;
    c.style.width = `${size.x}px`;
    c.style.height = `${size.y}px`;
    L.DomUtil.setPosition(c, map.containerPointToLayerPoint([0, 0]));
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size.x, size.y);
    const zoom = map.getZoom();
    for (const d of this.points) {
      const p = map.latLngToContainerPoint([d.latitude, d.longitude]);
      if (p.x < -20 || p.y < -20 || p.x > size.x + 20 || p.y > size.y + 20) continue;
      const mpp = (40075016.686 * Math.cos((d.latitude * Math.PI) / 180)) / Math.pow(2, zoom + 8);
      const wPx = ((d.scanKm ?? 0.375) * 1000) / mpp;
      const hPx = ((d.trackKm ?? 0.375) * 1000) / mpp;
      const w = Math.max(4, wPx);
      const h = Math.max(4, hPx);
      const hl = this.highlight.has(d.id);
      if (d.state === 'SYNTHETIC DEMO') {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(Math.PI / 4);
        g.strokeStyle = '#b28dff';
        g.lineWidth = 1.5;
        g.strokeRect(-w / 2, -w / 2, w, w);
        g.restore();
      } else {
        g.fillStyle = hl ? '#ffd2b8' : d.confidence === 'low' ? 'rgba(255,107,61,0.5)' : '#ff6b3d';
        g.fillRect(p.x - w / 2, p.y - h / 2, w, h);
        g.strokeStyle = 'rgba(7,13,24,0.85)';
        g.lineWidth = 1;
        g.strokeRect(p.x - w / 2, p.y - h / 2, w, h);
      }
    }
  };
}
