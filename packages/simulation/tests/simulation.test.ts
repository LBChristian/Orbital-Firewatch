import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EARTH_RADIUS_KM,
  MISSIONS,
  MissionRun,
  buildTargetGroups,
  clusterDetections,
  computeDesign,
  computeGeometry,
  computeScore,
  createRun,
  haversineKm,
  isGeometryError,
  normalizeFirmsRecords,
  orbitalPeriodS,
  orbitalSpeedKmS,
  parseCsv,
  solveInsertion,
  subSatellitePoint,
  trackSegments,
  validateDesign,
  type Loadout,
  type MissionDef,
  type TargetGroup,
} from '../src/index';

const ROOT = path.resolve(__dirname, '../../..');

function targetsFor(m: MissionDef): TargetGroup[] {
  const csv = fs.readFileSync(path.join(ROOT, 'apps/web/public', m.firms.snapshotFile), 'utf8');
  const { detections } = normalizeFirmsRecords(parseCsv(csv), m.firms.product, 'HISTORICAL');
  return buildTargetGroups(detections, { clusterRadiusKm: m.clusterRadiusKm, maxTargets: m.maxTargets, zones: m.zones, excludeLowOnly: true });
}

function mustRun(m: MissionDef, loadout: Loadout, targets: TargetGroup[], opts = {}): MissionRun {
  const r = createRun(m, loadout, targets, opts);
  if ('error' in r) throw new Error(r.error);
  return r;
}

const M1 = MISSIONS[0];
const M3 = MISSIONS[2];

describe('orbit model', () => {
  it('computes circular orbital periods from T = 2π sqrt(a³/μ)', () => {
    // ISS-like 400 km: ~92.4 min
    expect(orbitalPeriodS(400) / 60).toBeCloseTo(92.4, 0);
    // 550 km: ~95.6 min
    expect(orbitalPeriodS(550) / 60).toBeCloseTo(95.6, 0);
    // Geostationary radius: period ~ one sidereal day (86164 s) within 0.1%
    expect(Math.abs(orbitalPeriodS(42164.17 - EARTH_RADIUS_KM) - 86164.1) / 86164.1).toBeLessThan(1e-3);
  });

  it('computes circular speed ~7.6 km/s at 550 km', () => {
    expect(orbitalSpeedKmS(550)).toBeCloseTo(7.59, 1);
  });

  it('haversine distance matches known values', () => {
    // 1° of longitude at the equator on the 6371.0088 km sphere
    expect(haversineKm(0, 0, 0, 1)).toBeCloseTo(111.195, 2);
    expect(haversineKm(10, 20, 10, 20)).toBe(0);
    // Antipodal points: half the circumference
    expect(haversineKm(0, 0, 0, 180)).toBeCloseTo(Math.PI * EARTH_RADIUS_KM, 3);
  });

  it('insertion solve places the sub-satellite point on the aim point at the aim time', () => {
    for (const inc of [30, 53, 97.6]) {
      for (const branch of ['ascending', 'descending'] as const) {
        const o = solveInsertion(550, inc, -17, 30.5, 360, branch);
        expect(o).not.toBeNull();
        const p = subSatellitePoint(o!, 360);
        expect(haversineKm(p.lat, p.lon, -17, 30.5)).toBeLessThan(0.01);
      }
    }
  });

  it('refuses insertion when inclination cannot reach the aim latitude', () => {
    expect(solveInsertion(550, 30, 40.6, -122.7, 360, 'descending')).toBeNull();
  });

  it('produces a continuous ground track across the longitude wrap', () => {
    const o = solveInsertion(550, 53, 0, 179, 600, 'ascending')!;
    const stepS = 2;
    const lat: number[] = [];
    const lon: number[] = [];
    for (let t = 0; t < 2 * 3600; t += stepS) {
      const p = subSatellitePoint(o, t);
      lat.push(p.lat);
      lon.push(p.lon);
    }
    // Ground speed bound: consecutive samples are never further apart than v*dt (+ Earth rotation)
    const maxStep = (orbitalSpeedKmS(550) * (EARTH_RADIUS_KM / (EARTH_RADIUS_KM + 550)) + 0.47) * stepS * 1.05;
    let wraps = 0;
    for (let i = 1; i < lat.length; i++) {
      expect(haversineKm(lat[i - 1], lon[i - 1], lat[i], lon[i])).toBeLessThan(maxStep);
      if (Math.abs(lon[i] - lon[i - 1]) > 180) wraps++;
    }
    expect(wraps).toBeGreaterThan(0);
    // Segments never contain a jump across the antimeridian
    const segs = trackSegments(lat, lon, 0, lat.length - 1);
    expect(segs.length).toBe(wraps + 1);
    for (const s of segs) for (let i = 1; i < s.length; i++) expect(Math.abs(s[i][1] - s[i - 1][1])).toBeLessThan(180);
  });
});

describe('FIRMS normalisation and targets', () => {
  it('normalises real snapshot rows and keeps raw values', () => {
    const csv = fs.readFileSync(path.join(ROOT, 'apps/web/public', M1.firms.snapshotFile), 'utf8');
    const rows = parseCsv(csv);
    const { detections, rejected, warnings } = normalizeFirmsRecords(rows, 'VIIRS_NOAA20_NRT', 'HISTORICAL');
    expect(rejected).toBe(0);
    expect(detections.length).toBe(rows.length);
    const d = detections[0];
    expect(d.raw.latitude).toBe(rows[0].latitude);
    expect(d.acqUtc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/);
    expect(d.instrument).toBe('VIIRS');
    expect(d.instrumentDerivedFromProduct).toBe(true);
    expect(warnings.some((w) => w.includes('instrument'))).toBe(true);
  });

  it('rejects malformed rows, maps confidence categories and removes duplicates', () => {
    const csv = [
      'latitude,longitude,acq_date,acq_time,confidence,frp,instrument',
      '10,20,2026-11-16,0130,n,5.5,VIIRS',
      '10,20,2026-11-16,0130,n,5.5,VIIRS',
      '95,20,2026-11-16,0130,h,1,VIIRS',
      'abc,20,2026-11-16,0130,h,1,VIIRS',
      '11,21,bad-date,0130,h,1,VIIRS',
      '12,22,2026-11-16,2599,h,1,VIIRS',
      '13,23,2026-11-16,45,high,,VIIRS',
      '14,24,2026-11-16,1200,l,2,VIIRS',
    ].join('\n');
    const { detections, rejected, warnings } = normalizeFirmsRecords(parseCsv(csv), 'VIIRS_NOAA20_NRT', 'LIVE');
    expect(rejected).toBe(4);
    expect(detections.length).toBe(3);
    expect(detections.map((d) => d.confidence)).toEqual(['nominal', 'high', 'low']);
    expect(detections[1].acqTime).toBe('0045');
    expect(detections[1].frpMW).toBeUndefined();
    expect(warnings.some((w) => w.includes('duplicate'))).toBe(true);
  });

  it('parses an empty response without crashing', () => {
    expect(parseCsv('')).toEqual([]);
    expect(normalizeFirmsRecords(parseCsv('latitude,longitude,acq_date\n'), 'X', 'LIVE').detections).toEqual([]);
  });

  it('clusters deterministically and never invents detections', () => {
    const t1 = targetsFor(M1);
    const t2 = targetsFor(M1);
    expect(t1.map((t) => t.id)).toEqual(t2.map((t) => t.id));
    const csv = fs.readFileSync(path.join(ROOT, 'apps/web/public', M1.firms.snapshotFile), 'utf8');
    const { detections } = normalizeFirmsRecords(parseCsv(csv), 'VIIRS_NOAA20_NRT', 'HISTORICAL');
    const clusters = clusterDetections(detections, 12);
    expect(clusters.reduce((a, c) => a + c.length, 0)).toBe(detections.length);
    for (const t of t1) {
      expect(t.priority.total).toBeGreaterThanOrEqual(0);
      expect(t.priority.total).toBeLessThanOrEqual(100);
      for (const m of t.members) expect(detections.some((d) => d.id === m.id)).toBe(true);
    }
  });
});

describe('design validation', () => {
  it('flags mass, budget, structure and launch-orbit failures', () => {
    const ok = validateDesign(M1.recommended, M1);
    expect(ok.ok).toBe(true);
    const heavy = validateDesign(
      { ...M1.recommended, payloadId: 'payload-high', solarId: 'solar-high', batteryId: 'battery-extended', recorderId: 'recorder-large', commsId: 'comms-high', pointingId: 'pointing-precision' },
      M1,
    );
    expect(heavy.checks.find((c) => c.id === 'structure')?.level).toBe('fail');
    expect(heavy.checks.find((c) => c.id === 'mass')?.level).toBe('fail');
    const orbit = validateDesign({ ...M1.recommended, altitudeId: 'alt-700' }, M1);
    expect(orbit.checks.find((c) => c.id === 'launch-orbit')?.level).toBe('fail');
    const poor = validateDesign(M1.recommended, { ...M1, budgetCredits: 50 });
    expect(poor.checks.find((c) => c.id === 'budget')?.level).toBe('fail');
    const lowInc = validateDesign({ ...M1.recommended, inclinationId: 'inc-30' }, M1);
    expect(lowInc.checks.find((c) => c.id === 'coverage')?.level).toBe('fail');
  });

  it('sums component mass and cost', () => {
    const s = computeDesign(M1.recommended, 150);
    expect(s.massKg).toBe(40 + 20 + 9 + 7 + 3 + 5 + 2);
    expect(s.cost).toBe(18 + 18 + 10 + 5 + 6 + 9 + 3 + 15);
  });
});

describe('coverage and eligibility', () => {
  it('uses great-circle distance to the track and is deterministic', () => {
    const targets = targetsFor(M1);
    const spec = computeDesign(M1.recommended, M1.budgetCredits);
    const g1 = computeGeometry(M1, spec, targets, 'center');
    const g2 = computeGeometry(M1, spec, targets, 'center');
    if (isGeometryError(g1) || isGeometryError(g2)) throw new Error('geometry');
    expect(Array.from(g1.targetDist.slice(0, 500))).toEqual(Array.from(g2.targetDist.slice(0, 500)));
    const k = g1.windows[0].closestStep;
    const j = g1.targetIds.indexOf(g1.windows[0].targetId);
    const t = targets[j];
    expect(g1.targetDist[k * targets.length + j]).toBeCloseTo(haversineKm(g1.lat[k], g1.lon[k], t.lat, t.lon), 2);
  });

  it('a narrower swath makes fewer targets eligible', () => {
    const targets = targetsFor(M1);
    const reachable = (payloadId: string) => {
      const spec = computeDesign({ ...M1.recommended, payloadId }, M1.budgetCredits);
      const g = computeGeometry(M1, spec, targets, 'center');
      if (isGeometryError(g)) throw new Error(g.error);
      return new Set(g.windows.map((w) => w.targetId)).size;
    };
    expect(reachable('payload-wide')).toBeGreaterThan(reachable('payload-high'));
  });
});

describe('resources', () => {
  it('captures consume configured energy and storage; storage never exceeds capacity', () => {
    const targets = targetsFor(M3);
    const run = mustRun(M3, M3.recommended, targets);
    const spec = run.config.spec;
    let maxStorage = 0;
    while (!run.state.ended) {
      run.advance(1);
      maxStorage = Math.max(maxStorage, run.state.storageUsedMB);
      expect(run.state.batteryWh).toBeGreaterThanOrEqual(0);
      expect(run.state.batteryWh).toBeLessThanOrEqual(spec.batteryWh + 1e-9);
    }
    expect(maxStorage).toBeLessThanOrEqual(spec.storageMB + 1e-9);
    expect(run.state.stats.captureEnergyWh).toBeCloseTo(run.state.stats.capturesStarted * spec.captureWh, 6);
    // In M03 the recommended recorder fills up
    expect(run.state.stats.capturesRejectedStorage).toBeGreaterThan(0);
  });

  it('downlink is bounded by rate x contact time and consumes radio energy', () => {
    const targets = targetsFor(M3);
    const run = mustRun(M3, M3.recommended, targets);
    run.runToEnd();
    const spec = run.config.spec;
    const dt = run.config.geometry.stepS;
    const contactS = run.config.geometry.contacts.reduce((a, c) => a + (c.endStep - c.startStep + 1) * dt, 0);
    expect(run.state.stats.downlinkMB).toBeLessThanOrEqual((spec.downlinkMbps * contactS) / 8 + 1e-6);
    expect(run.state.stats.downlinkMB).toBeLessThanOrEqual((spec.downlinkMbps * run.state.stats.downlinkSteps * dt) / 8 + 1e-6);
    expect(run.state.stats.radioEnergyWh).toBeCloseTo((spec.radioPowerW * run.state.stats.downlinkSteps * dt) / 3600, 6);
    expect(run.state.stats.radioEnergyWh).toBeGreaterThan(0);
  });

  it('manual capture outside reach is rejected and costs nothing', () => {
    const targets = targetsFor(M1);
    const run = mustRun(M1, M1.recommended, targets, { autoObserve: false });
    const before = run.state.batteryWh;
    const r = run.command({ type: 'capture', targetId: targets[0].id });
    expect(r.ok).toBe(false);
    expect(run.state.batteryWh).toBe(before);
    expect(run.state.storageUsedMB).toBe(0);
  });
});

describe('determinism, pause and speed', () => {
  it('pausing (advancing zero steps) freezes all simulation state', () => {
    const run = mustRun(M1, M1.recommended, targetsFor(M1));
    run.advance(200);
    const snap = JSON.stringify(run.state);
    run.advance(0);
    expect(JSON.stringify(run.state)).toBe(snap);
  });

  it('speed (steps per frame) does not change the outcome', () => {
    const targets = targetsFor(M3);
    const a = mustRun(M3, M3.recommended, targets);
    while (!a.state.ended) a.advance(1);
    const b = mustRun(M3, M3.recommended, targets);
    while (!b.state.ended) b.advance(37);
    const c = mustRun(M3, M3.recommended, targets);
    c.runToEnd();
    expect(computeScore(b).total).toBe(computeScore(a).total);
    expect(JSON.stringify(b.state.events)).toBe(JSON.stringify(a.state.events));
    expect(JSON.stringify(c.state.packets)).toBe(JSON.stringify(a.state.packets));
  });

  it('same config + data + commands reproduces the identical score and event log', () => {
    const targets = targetsFor(M3);
    const live = mustRun(M3, M3.recommended, targets, { autoObserve: true });
    live.advance(150);
    live.command({ type: 'prioritize', targetId: targets[5].id });
    live.advance(20);
    live.command({ type: 'skip', targetId: targets[1].id });
    live.command({ type: 'setOverwrite', on: true });
    live.advance(500);
    live.command({ type: 'setAutoDownlink', on: false });
    live.runToEnd();
    const replay = mustRun(M3, M3.recommended, targets, { autoObserve: true, replay: live.state.commandLog });
    replay.runToEnd();
    expect(JSON.stringify(replay.state.events)).toBe(JSON.stringify(live.state.events));
    expect(computeScore(replay)).toEqual(computeScore(live));
  });

  it('"next event" never jumps past a target window, pass start or station hand-over', () => {
    for (const m of MISSIONS) {
      const t = targetsFor(m);
      const run = mustRun(m, { ...m.recommended, payloadId: 'payload-wide' }, t);
      const g = run.config.geometry;
      const firstWindow = Math.min(...g.windows.map((w) => w.startStep));
      const n = run.stepsToNextEvent();
      expect(n).toBeLessThanOrEqual(firstWindow);
      const k = n;
      const isEvent =
        g.windows.some((w) => w.startStep === k) || (g.passAt[k] >= 0 && g.passAt[k - 1] < 0) || (g.station[k] >= 0 && g.station[k] !== g.station[k - 1]);
      expect(isEvent).toBe(true);
    }
  });

  it('debrief score reconciles with the event log', () => {
    const targets = targetsFor(M1);
    const run = mustRun(M1, M1.recommended, targets);
    run.runToEnd();
    const r = computeScore(run);
    const deliveredEvents = run.state.events.filter((e) => e.type === 'packet-delivered').length;
    expect(r.counts.DELIVERED).toBe(deliveredEvents);
    expect(r.categories.reduce((a, c) => a + c.points, 0)).toBeCloseTo(r.total, -0.5);
    expect(r.success).toBe(true);
    expect(r.analyst.length).toBeGreaterThan(0);
  });
});

describe('campaign balance', () => {
  it('Mission 01 succeeds with the recommended loadout', () => {
    const run = mustRun(M1, M1.recommended, targetsFor(M1));
    run.runToEnd();
    expect(computeScore(run).success).toBe(true);
  });

  it('Mission 02 forces a coverage trade-off: recommended fails, a wide swath between the fronts succeeds', () => {
    const m = MISSIONS[1];
    const t = targetsFor(m);
    const base = mustRun(m, m.recommended, t);
    base.runToEnd();
    expect(computeScore(base).success).toBe(false);
    const wide = mustRun(m, { ...m.recommended, payloadId: 'payload-wide' }, t, { aimId: 'center' });
    wide.runToEnd();
    expect(computeScore(wide).success).toBe(true);
  });

  it('Mission 03 forces a storage/downlink trade-off: recommended fails, a faster radio succeeds', () => {
    const t = targetsFor(M3);
    const base = mustRun(M3, M3.recommended, t);
    base.runToEnd();
    const r = computeScore(base);
    expect(r.success).toBe(false);
    expect(r.analyst.some((n) => n.id === 'storage' || n.id === 'radio-limit')).toBe(true);
    const fast = mustRun(M3, { ...M3.recommended, commsId: 'comms-high' }, t);
    fast.runToEnd();
    expect(computeScore(fast).success).toBe(true);
  });
});
