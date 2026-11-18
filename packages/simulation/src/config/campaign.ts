/**
 * Campaign structure, unlock rules and the versioned save format.
 *
 * Unlocks depend only on completion (primary objective met and debrief reached),
 * never on grade or score. Pure functions: no storage access here.
 */

export interface CampaignChapter {
  id: string;
  numeral: string;
  title: string;
  summary: string;
  missionIds: string[];
  /** 'sequential': each mission needs the previous one. 'any': all open at once. */
  order: 'sequential' | 'any';
  /** Chapters that must be fully complete first. */
  requires: string[];
}

export const CHAPTERS: CampaignChapter[] = [
  {
    id: 'ch1',
    numeral: 'I',
    title: 'FIRST LIGHT',
    summary: 'Learn the loop, then the two trades every mission makes: where you can look, and how much you can bring home.',
    missionIds: ['m01-first-pass', 'm02-split-front', 'm03-data-bottleneck'],
    order: 'sequential',
    requires: [],
  },
  {
    id: 'ch2',
    numeral: 'II',
    title: 'OPERATIONAL PRESSURE',
    summary: 'Four missions, each built around one constraint: eclipse power, contact time, latitude reach and target triage. Fly them in any order.',
    missionIds: ['m04-shadow-line', 'm05-dead-air', 'm06-polar-watch', 'm07-signal-triage'],
    order: 'any',
    requires: ['ch1'],
  },
  {
    id: 'ch3',
    numeral: 'III',
    title: 'MISSION ASSURANCE',
    summary: 'Longer missions across more than one pass, hard engineering limits, and a final mission that uses everything.',
    missionIds: ['m08-second-look', 'm09-hard-limits', 'm10-final-firewatch'],
    order: 'sequential',
    requires: ['ch2'],
  },
];

export const CAMPAIGN_MISSION_IDS = CHAPTERS.flatMap((c) => c.missionIds);

export type CommendationId = 'complete' | 'engineering' | 'science' | 'operations' | 'perfect';

export interface MissionProgress {
  completed: boolean;
  bestScore: number;
  bestGrade: string;
  attempts: number;
  commendations: CommendationId[];
  /** ISO time of the first completion. */
  firstCompletedAtUtc?: string;
}

export type ProgressMap = Record<string, MissionProgress>;

export type MissionStatus = 'locked' | 'available' | 'completed';

export interface MissionAvailability {
  status: MissionStatus;
  /** Why the mission is locked, in player terms. */
  requirement?: string;
}

export function chapterOf(missionId: string): CampaignChapter {
  const c = CHAPTERS.find((ch) => ch.missionIds.includes(missionId));
  if (!c) throw new Error(`Mission ${missionId} is not in the campaign`);
  return c;
}

const code = (id: string) => id.slice(0, 3).toUpperCase();
const done = (p: ProgressMap, id: string) => p[id]?.completed === true;

export function chapterComplete(p: ProgressMap, chapterId: string): boolean {
  const c = CHAPTERS.find((ch) => ch.id === chapterId);
  return !!c && c.missionIds.every((id) => done(p, id));
}

export function chapterUnlocked(p: ProgressMap, chapterId: string): boolean {
  const c = CHAPTERS.find((ch) => ch.id === chapterId);
  return !!c && c.requires.every((r) => chapterComplete(p, r));
}

/**
 * Status of one mission. `unlockAll` is the practice setting that opens every mission
 * without touching saved progress.
 */
export function missionAvailability(p: ProgressMap, missionId: string, unlockAll = false): MissionAvailability {
  if (done(p, missionId)) return { status: 'completed' };
  if (unlockAll) return { status: 'available' };
  const c = chapterOf(missionId);
  const missing = c.requires.flatMap((r) => CHAPTERS.find((ch) => ch.id === r)!.missionIds).filter((id) => !done(p, id));
  if (missing.length > 0) {
    return { status: 'locked', requirement: `Complete ${missing.map(code).join(', ')} to open Chapter ${c.numeral}.` };
  }
  if (c.order === 'sequential') {
    const i = c.missionIds.indexOf(missionId);
    if (i > 0 && !done(p, c.missionIds[i - 1])) {
      return { status: 'locked', requirement: `Complete ${code(c.missionIds[i - 1])} first.` };
    }
  }
  return { status: 'available' };
}

/** First mission in campaign order that is open and not yet complete; else the first mission. */
export function nextMissionId(p: ProgressMap, unlockAll = false): string {
  return CAMPAIGN_MISSION_IDS.find((id) => missionAvailability(p, id, unlockAll).status === 'available') ?? CAMPAIGN_MISSION_IDS[0];
}

/** Free Operations opens once M10 is complete. */
export function sandboxUnlocked(p: ProgressMap): boolean {
  return done(p, 'm10-final-firewatch');
}

/** Record one finished run. Grade never removes a completion. */
export function recordRun(
  p: ProgressMap,
  missionId: string,
  run: { score: number; grade: string; success: boolean; commendations?: CommendationId[]; atUtc: string },
): ProgressMap {
  const prev = p[missionId];
  const better = !prev || run.score >= prev.bestScore;
  const commendations = [...new Set([...(prev?.commendations ?? []), ...(run.commendations ?? [])])];
  const completed = (prev?.completed ?? false) || run.success;
  return {
    ...p,
    [missionId]: {
      completed,
      bestScore: better ? run.score : prev!.bestScore,
      bestGrade: better ? run.grade : prev!.bestGrade,
      attempts: (prev?.attempts ?? 0) + 1,
      commendations,
      firstCompletedAtUtc: prev?.firstCompletedAtUtc ?? (run.success ? run.atUtc : undefined),
    },
  };
}

/* Save format */

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'ofw.save';
/** Version 1 stored only the progress map under this key. */
export const LEGACY_PROGRESS_KEY = 'ofw.progress';

export interface SaveData {
  version: typeof SAVE_VERSION;
  progress: ProgressMap;
}

export interface LoadedSave {
  save: SaveData;
  /** What happened while loading, for a one-line notice. */
  source: 'new' | 'current' | 'migrated' | 'recovered';
  /** Raw text that could not be read, kept so it can be backed up. */
  discarded?: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const COMMENDATIONS: CommendationId[] = ['complete', 'engineering', 'science', 'operations', 'perfect'];

/** Keep only well-formed entries for known missions. */
function cleanProgress(raw: unknown): ProgressMap | null {
  if (!isObj(raw)) return null;
  const out: ProgressMap = {};
  for (const [id, v] of Object.entries(raw)) {
    if (!CAMPAIGN_MISSION_IDS.includes(id) || !isObj(v)) continue;
    if (typeof v.completed !== 'boolean' || typeof v.bestScore !== 'number' || typeof v.bestGrade !== 'string' || typeof v.attempts !== 'number') continue;
    out[id] = {
      completed: v.completed,
      bestScore: Math.max(0, Math.min(100, v.bestScore)),
      bestGrade: v.bestGrade,
      attempts: Math.max(0, Math.floor(v.attempts)),
      commendations: Array.isArray(v.commendations) ? (v.commendations.filter((c) => COMMENDATIONS.includes(c as CommendationId)) as CommendationId[]) : [],
      firstCompletedAtUtc: typeof v.firstCompletedAtUtc === 'string' ? v.firstCompletedAtUtc : undefined,
    };
  }
  return out;
}

/**
 * Read the save from raw storage strings. Never throws. A corrupt current save is
 * replaced by an empty one (the raw text is returned for backup); a version-1
 * progress map is migrated.
 */
export function loadSave(current: string | null, legacy: string | null): LoadedSave {
  const empty: SaveData = { version: SAVE_VERSION, progress: {} };
  if (current !== null) {
    try {
      const parsed: unknown = JSON.parse(current);
      if (isObj(parsed) && parsed.version === SAVE_VERSION) {
        const progress = cleanProgress(parsed.progress);
        if (progress) return { save: { version: SAVE_VERSION, progress }, source: 'current' };
      }
    } catch {
      /* fall through to recovery */
    }
    return { save: empty, source: 'recovered', discarded: current };
  }
  if (legacy !== null) {
    try {
      const progress = cleanProgress(JSON.parse(legacy));
      if (progress) return { save: { version: SAVE_VERSION, progress }, source: 'migrated' };
    } catch {
      /* fall through */
    }
    return { save: empty, source: 'recovered', discarded: legacy };
  }
  return { save: empty, source: 'new' };
}
