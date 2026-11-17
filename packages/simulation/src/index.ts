export * from './constants';
export * from './geo';
export * from './rng';
export * from './firms/types';
export * from './firms/normalize';
export * from './firms/targets';
export * from './firms/synthetic';
export * from './orbit/orbit';
export * from './config/catalog';
export * from './config/missions';
export * from './config/references';
export * from './design';
export * from './engine/geometry';
export * from './engine/engine';
export * from './engine/scoring';

import type { Loadout } from './config/catalog';
import type { MissionDef } from './config/missions';
import { computeDesign } from './design';
import type { TargetGroup } from './firms/targets';
import { MissionRun, type LoggedCommand } from './engine/engine';
import { computeGeometry, isGeometryError } from './engine/geometry';

export interface CreateRunOptions {
  aimId?: string;
  /** Initial queue. Defaults to all targets by GAME PRIORITY. */
  queue?: string[];
  autoObserve?: boolean;
  autoDownlink?: boolean;
  replay?: LoggedCommand[];
}

/** Build geometry and a fresh deterministic run. */
export function createRun(
  mission: MissionDef,
  loadout: Loadout,
  targets: TargetGroup[],
  opts: CreateRunOptions = {},
): MissionRun | { error: string } {
  const spec = computeDesign(loadout, mission.budgetCredits);
  const geometry = computeGeometry(mission, spec, targets, opts.aimId ?? mission.aimPoints[0].id);
  if (isGeometryError(geometry)) return geometry;
  return new MissionRun(
    {
      mission,
      spec,
      targets,
      geometry,
      queue: opts.queue ?? targets.map((t) => t.id),
      autoObserve: opts.autoObserve ?? true,
      autoDownlink: opts.autoDownlink ?? true,
    },
    opts.replay ?? [],
  );
}
