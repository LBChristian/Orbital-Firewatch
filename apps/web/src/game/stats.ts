import type { DesignSpec } from '@ofw/simulation';
import type { StatKey } from './content/missionVoice';

/**
 * A 1–5 summary of a design for players who do not read specs. Each score maps one real
 * engine quantity, so the shape never disagrees with what the simulation does.
 */
export function designStats(spec: DesignSpec): Record<StatKey, number> {
  const clamp = (x: number) => Math.max(1, Math.min(5, x));
  return {
    // Reach from the ground track: 75 km (narrow) to 400 km (wide + precision pointing).
    view: clamp(spec.reachKm / 80),
    // Value multiplier per capture: about 0.57 (wide) to 0.95 (high detail).
    detail: clamp((spec.detail - 0.45) / 0.11),
    // Stored energy only. Solar panels recharge in daylight but cannot help at night.
    battery: clamp(spec.batteryWh / 36),
    // 2 GB to 12 GB on a log scale.
    memory: clamp(1 + (4 * Math.log(spec.storageMB / 2000)) / Math.log(6)),
    // 20 to 250 Mbps on a log scale.
    radio: clamp(1 + (4 * Math.log(spec.downlinkMbps / 20)) / Math.log(12.5)),
  };
}
