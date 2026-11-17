import { resolveLoadout, type Loadout, type ResolvedLoadout } from './config/catalog';
import type { MissionDef } from './config/missions';
import { bboxCenter } from './geo';
import { maxReachableLatitudeDeg, orbitalPeriodS, worstCaseSunlitFraction } from './orbit/orbit';

/** Derived engineering budget for a loadout. All values are notional game parameters. */
export interface DesignSpec {
  massKg: number;
  subsystemMassKg: number;
  structureCapacityKg: number;
  launchCapacityKg: number;
  massMarginFrac: number;
  cost: number;
  budget: number;
  budgetMarginFrac: number;
  payloadPowerW: number;
  busLoadW: number;
  pointingLoadW: number;
  radioPowerW: number;
  solarW: number;
  batteryWh: number;
  storageMB: number;
  downlinkMbps: number;
  /** MB delivered per minute of contact. */
  downlinkMBPerMin: number;
  swathKm: number;
  /** Max distance from ground track at which a target can be captured, km. */
  reachKm: number;
  dataMBPerCapture: number;
  captureS: number;
  captureWh: number;
  /** Combined detail multiplier (payload x altitude). */
  detail: number;
  detailTier: string;
  edgeFactor: number;
  altitudeKm: number;
  inclinationDeg: number;
  periodMin: number;
  /** Worst-case sunlit fraction and orbit-average energy balance. */
  sunlitFrac: number;
  orbitAvgBalanceW: number;
  eclipseEnergyWh: number;
  capturesPerFullStorage: number;
  capturesPerFullBattery: number;
}

export function computeDesign(loadout: Loadout, budget: number): DesignSpec {
  const r = resolveLoadout(loadout);
  return computeDesignResolved(r, budget);
}

export function computeDesignResolved(r: ResolvedLoadout, budget: number): DesignSpec {
  const subsystemMassKg =
    r.payload.massKg + r.solar.massKg + r.battery.massKg + r.recorder.massKg + r.comms.massKg + r.pointing.massKg;
  const massKg = r.bus.massKg + subsystemMassKg;
  const cost =
    r.bus.cost + r.payload.cost + r.solar.cost + r.battery.cost + r.recorder.cost + r.comms.cost + r.pointing.cost + r.launch.cost + r.altitude.cost;
  const altitudeKm = r.altitude.altitudeKm;
  const swathKm = Math.round((r.payload.swathKmAt550 * altitudeKm) / 550);
  const reachKm = swathKm / 2 + r.pointing.extraReachKm;
  const periodS = orbitalPeriodS(altitudeKm);
  const sunlitFrac = worstCaseSunlitFraction(altitudeKm);
  const busLoadW = r.bus.baseLoadW;
  const pointingLoadW = r.pointing.loadW;
  const continuous = busLoadW + pointingLoadW;
  const orbitAvgBalanceW = r.solar.generationW * sunlitFrac - continuous;
  const eclipseEnergyWh = (continuous * (1 - sunlitFrac) * periodS) / 3600;
  const captureWh = r.payload.captureWh + r.pointing.extraCaptureWh;
  return {
    massKg,
    subsystemMassKg,
    structureCapacityKg: r.bus.structureCapacityKg,
    launchCapacityKg: r.launch.capacityKg,
    massMarginFrac: (r.launch.capacityKg - massKg) / r.launch.capacityKg,
    cost,
    budget,
    budgetMarginFrac: (budget - cost) / budget,
    payloadPowerW: r.payload.powerW,
    busLoadW,
    pointingLoadW,
    radioPowerW: r.comms.powerW,
    solarW: r.solar.generationW,
    batteryWh: r.battery.capacityWh,
    storageMB: r.recorder.capacityMB,
    downlinkMbps: r.comms.rateMbps,
    downlinkMBPerMin: (r.comms.rateMbps * 60) / 8,
    swathKm,
    reachKm,
    dataMBPerCapture: r.payload.dataMB,
    captureS: r.payload.captureS + r.pointing.extraCaptureS,
    captureWh,
    detail: Math.round(r.payload.detail * r.altitude.detailFactor * 1000) / 1000,
    detailTier: r.payload.detailTier,
    edgeFactor: r.pointing.edgeFactor,
    altitudeKm,
    inclinationDeg: r.inclination.inclinationDeg,
    periodMin: periodS / 60,
    sunlitFrac,
    orbitAvgBalanceW,
    eclipseEnergyWh,
    capturesPerFullStorage: Math.floor(r.recorder.capacityMB / r.payload.dataMB),
    capturesPerFullBattery: Math.floor((r.battery.capacityWh * 0.85) / captureWh),
  };
}

export type CheckLevel = 'pass' | 'warn' | 'fail';

export interface DesignCheck {
  id: string;
  level: CheckLevel;
  label: string;
  detail: string;
}

export interface DesignValidation {
  ok: boolean;
  checks: DesignCheck[];
  spec: DesignSpec;
}

export function validateDesign(loadout: Loadout, mission: MissionDef): DesignValidation {
  const r = resolveLoadout(loadout);
  const s = computeDesignResolved(r, mission.budgetCredits);
  const checks: DesignCheck[] = [];
  const add = (id: string, level: CheckLevel, label: string, detail: string) => checks.push({ id, level, label, detail });

  // Launch mass
  if (s.massKg > s.launchCapacityKg) {
    add('mass', 'fail', 'Launch mass exceeded', `${s.massKg} kg exceeds ${r.launch.label} capacity of ${s.launchCapacityKg} kg.`);
  } else if (s.massMarginFrac < 0.1) {
    add('mass', 'warn', 'Thin mass margin', `${s.massKg} / ${s.launchCapacityKg} kg (${Math.round(s.massMarginFrac * 100)}% margin). Aim for 10% or more.`);
  } else {
    add('mass', 'pass', 'Launch mass OK', `${s.massKg} / ${s.launchCapacityKg} kg (${Math.round(s.massMarginFrac * 100)}% margin).`);
  }

  // Bus structure
  if (s.subsystemMassKg > s.structureCapacityKg) {
    add('structure', 'fail', 'Bus overloaded', `Subsystems weigh ${s.subsystemMassKg} kg; the ${r.bus.label} carries ${s.structureCapacityKg} kg. Use a larger bus or lighter parts.`);
  } else {
    add('structure', 'pass', 'Bus structure OK', `${s.subsystemMassKg} / ${s.structureCapacityKg} kg of subsystem capacity used.`);
  }

  // Budget
  if (s.cost > s.budget) {
    add('budget', 'fail', 'Over budget', `${s.cost} credits exceeds the mission budget of ${s.budget}.`);
  } else if (s.budgetMarginFrac < 0.05) {
    add('budget', 'warn', 'Budget nearly spent', `${s.cost} / ${s.budget} credits.`);
  } else {
    add('budget', 'pass', 'Within budget', `${s.cost} / ${s.budget} credits (${s.budget - s.cost} spare).`);
  }

  // Launch altitude
  if (!r.launch.allowedAltitudesKm.includes(s.altitudeKm)) {
    add('launch-orbit', 'fail', 'Launch cannot reach orbit', `${r.launch.label} only reaches ${r.launch.allowedAltitudesKm.join(' / ')} km. Pick another launch or altitude.`);
  } else {
    add('launch-orbit', 'pass', 'Launch reaches orbit', `${r.launch.label} can deliver to ${s.altitudeKm} km.`);
  }

  // Inclination vs region latitude
  const reachLat = maxReachableLatitudeDeg(s.inclinationDeg);
  const unreachable = mission.aimPoints.filter((a) => Math.abs(a.lat) > reachLat);
  const c = bboxCenter(mission.bbox);
  if (unreachable.length === mission.aimPoints.length) {
    add('coverage', 'fail', 'Orbit never reaches the region', `A ${s.inclinationDeg}° orbit's ground track only reaches ±${reachLat.toFixed(1)}° latitude; the region is near ${Math.abs(c.lat).toFixed(1)}°${c.lat >= 0 ? 'N' : 'S'}.`);
  } else if (unreachable.length > 0) {
    add('coverage', 'warn', 'Some aim points unreachable', `${unreachable.map((u) => u.label).join(', ')} lie beyond ±${reachLat.toFixed(1)}°.`);
  } else {
    add('coverage', 'pass', 'Region within orbit reach', `Ground track reaches ±${reachLat.toFixed(1)}°; region centre ${Math.abs(c.lat).toFixed(1)}°${c.lat >= 0 ? 'N' : 'S'}.`);
  }

  // Power balance
  if (s.orbitAvgBalanceW < 0) {
    add('power', 'fail', 'Negative power balance', `Arrays average ${(s.solarW * s.sunlitFrac).toFixed(0)} W over an orbit but housekeeping needs ${(s.busLoadW + s.pointingLoadW).toFixed(0)} W. The battery would drain.`);
  } else if (s.orbitAvgBalanceW < 15) {
    add('power', 'warn', 'Slow recharge', `Only +${s.orbitAvgBalanceW.toFixed(0)} W orbit-average surplus. The battery will recover slowly after captures.`);
  } else {
    add('power', 'pass', 'Power balance positive', `+${s.orbitAvgBalanceW.toFixed(0)} W orbit-average surplus for captures and downlink.`);
  }

  // Battery vs eclipse
  if (s.batteryWh * 0.6 < s.eclipseEnergyWh) {
    add('battery', 'fail', 'Battery cannot survive eclipse', `Eclipse needs ${s.eclipseEnergyWh.toFixed(0)} Wh; usable battery is ${(s.batteryWh * 0.6).toFixed(0)} Wh.`);
  } else {
    add('battery', s.capturesPerFullBattery < 8 ? 'warn' : 'pass', s.capturesPerFullBattery < 8 ? 'Small capture budget' : 'Battery OK', `About ${s.capturesPerFullBattery} captures per full charge (${s.captureWh.toFixed(1)} Wh each); eclipse uses ${s.eclipseEnergyWh.toFixed(0)} Wh.`);
  }

  // Storage
  if (s.capturesPerFullStorage < 3) {
    add('storage', 'warn', 'Recorder holds few captures', `Only ${s.capturesPerFullStorage} captures fit (${s.dataMBPerCapture} MB each).`);
  } else {
    add('storage', 'pass', 'Recorder capacity', `${s.capturesPerFullStorage} captures fit (${s.dataMBPerCapture} MB each).`);
  }

  // Downlink
  const perContact = s.downlinkMBPerMin * 5;
  add(
    'downlink',
    perContact < s.dataMBPerCapture * 3 ? 'warn' : 'pass',
    perContact < s.dataMBPerCapture * 3 ? 'Slow downlink' : 'Downlink rate',
    `${s.downlinkMbps} Mbps moves ${Math.round(s.downlinkMBPerMin)} MB per contact minute (~${Math.floor(perContact / s.dataMBPerCapture)} captures in a 5-minute contact).`,
  );

  return { ok: !checks.some((c) => c.level === 'fail'), checks, spec: s };
}
