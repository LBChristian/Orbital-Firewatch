import type { ObjectiveCondition } from '../config/missions';
import type { RunConfig, RunState } from './engine';

/**
 * Pure objective evaluators. Every result is computed from run state only, so the
 * debrief, the operations HUD and replays always agree.
 */

export interface ConditionResult {
  met: boolean;
  /** 0..1 progress, for meters. Constraints are 1 while they hold and 0 once broken. */
  fraction: number;
  detail: string;
  /** 'delivery' conditions can only become true; 'constraint' conditions can only break. */
  kind: 'delivery' | 'constraint';
  zones?: { id: string; label: string; delivered: number; required: number }[];
}

export interface ObjectiveProgress {
  met: boolean;
  /** 0..1 */
  fraction: number;
  detail: string;
  zones?: { id: string; label: string; delivered: number; required: number }[];
  /** One result per top-level condition. */
  parts: ConditionResult[];
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function evaluateCondition(c: ObjectiveCondition, config: RunConfig, state: RunState): ConditionResult {
  const delivered = state.packets.filter((p) => p.status === 'DELIVERED');
  const deliveredTargets = new Set(delivered.map((p) => p.targetId));
  const s = state.stats;
  switch (c.type) {
    case 'deliverCount': {
      const n = deliveredTargets.size;
      return { kind: 'delivery', met: n >= c.count, fraction: Math.min(1, n / c.count), detail: `${n} / ${c.count} target groups delivered` };
    }
    case 'deliverValue': {
      const v = delivered.reduce((a, p) => a + p.value, 0);
      return { kind: 'delivery', met: v >= c.value, fraction: Math.min(1, v / c.value), detail: `${Math.round(v)} / ${c.value} value delivered` };
    }
    case 'zones': {
      const defs = (config.mission.zones ?? []).filter((z) => !c.zoneIds || c.zoneIds.includes(z.id));
      const zones = defs.map((z) => ({
        id: z.id,
        label: z.label,
        delivered: config.targets.filter((t) => t.zone === z.label && deliveredTargets.has(t.id)).length,
        required: c.perZone,
      }));
      const fraction = zones.length ? zones.reduce((a, z) => a + Math.min(1, z.delivered / z.required), 0) / zones.length : 0;
      return {
        kind: 'delivery',
        met: zones.length > 0 && zones.every((z) => z.delivered >= z.required),
        fraction,
        detail: zones.map((z) => `${z.label} ${z.delivered}/${z.required}`).join(' · '),
        zones,
      };
    }
    case 'deliverFromPasses': {
      const passes = new Set(delivered.map((p) => p.passIndex).filter((i) => i >= 0));
      return {
        kind: 'delivery',
        met: passes.size >= c.passes,
        fraction: Math.min(1, passes.size / c.passes),
        detail: `data from ${passes.size} / ${c.passes} passes delivered`,
      };
    }
    case 'deliverTopPriority': {
      // The board is already in GAME PRIORITY order.
      const top = config.targets.slice(0, c.count);
      const n = top.filter((t) => deliveredTargets.has(t.id)).length;
      return {
        kind: 'delivery',
        met: top.length > 0 && n >= top.length,
        fraction: top.length ? n / top.length : 0,
        detail: `${n} / ${top.length} top-priority groups delivered (${top.map((t) => t.callsign).join(', ')})`,
      };
    }
    case 'deliverConfidence': {
      const got = c.categories.filter((cat) => config.targets.some((t) => t.bestConfidence === cat && deliveredTargets.has(t.id)));
      return {
        kind: 'delivery',
        met: got.length === c.categories.length,
        fraction: got.length / c.categories.length,
        detail: `confidence delivered: ${c.categories.map((cat) => `${cat} ${got.includes(cat) ? 'yes' : 'no'}`).join(', ')}`,
      };
    }
    case 'noSafeMode': {
      const ok = s.safeModeAtStep === undefined;
      return { kind: 'constraint', met: ok, fraction: ok ? 1 : 0, detail: ok ? 'no safe mode' : 'safe mode entered' };
    }
    case 'minBattery': {
      const min = s.minBatteryWh / config.spec.batteryWh;
      const ok = min >= c.frac - 1e-9;
      return { kind: 'constraint', met: ok, fraction: ok ? 1 : 0, detail: `lowest battery ${pct(min)} (limit ${pct(c.frac)})` };
    }
    case 'noDataLost': {
      const lost = s.packetsLost + s.capturesRejectedStorage;
      const ok = lost === 0;
      return {
        kind: 'constraint',
        met: ok,
        fraction: ok ? 1 : 0,
        detail: ok ? 'no data lost to the recorder' : `${s.packetsLost} overwritten, ${s.capturesRejectedStorage} rejected (recorder full)`,
      };
    }
    case 'all': {
      const parts = c.conditions.map((x) => evaluateCondition(x, config, state));
      return {
        kind: parts.some((p) => p.kind === 'delivery') ? 'delivery' : 'constraint',
        met: parts.every((p) => p.met),
        fraction: parts.length ? parts.reduce((a, p) => a + p.fraction, 0) / parts.length : 0,
        detail: parts.map((p) => p.detail).join(' · '),
        zones: parts.find((p) => p.zones)?.zones,
      };
    }
  }
}

export function objectiveProgress(config: RunConfig, state: RunState): ObjectiveProgress {
  const obj = config.mission.objective;
  const parts = obj.type === 'all' ? obj.conditions.map((c) => evaluateCondition(c, config, state)) : [evaluateCondition(obj, config, state)];
  const all = obj.type === 'all' ? evaluateCondition(obj, config, state) : parts[0];
  return { met: all.met, fraction: all.fraction, detail: all.detail, zones: all.zones, parts };
}

/** True if the objective includes conditions that can still be broken after it is met. */
export function hasConstraints(c: ObjectiveCondition): boolean {
  return c.type === 'all' ? c.conditions.some(hasConstraints) : c.type === 'noSafeMode' || c.type === 'minBattery' || c.type === 'noDataLost';
}

export interface SecondaryResult {
  id: string;
  text: string;
  met: boolean;
  detail: string;
}

export function secondaryProgress(config: RunConfig, state: RunState): SecondaryResult[] {
  return (config.mission.secondary ?? []).map((o) => {
    const r = evaluateCondition(o.condition, config, state);
    return { id: o.id, text: o.text, met: r.met, detail: r.detail };
  });
}
