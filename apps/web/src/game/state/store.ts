import { create } from 'zustand';
import {
  LEGACY_PROGRESS_KEY,
  MISSIONS,
  SAVE_KEY,
  SAVE_VERSION,
  buildTargetGroups,
  computeScore,
  createRun,
  getMission,
  loadSave,
  missionTargetOptions,
  recordRun,
  resolveAssist,
  type FirmsFeedEnvelope,
  type FirmsStatus,
  type Loadout,
  type MissionDef,
  type MissionRun,
  type AssistSetting,
  type ProgressMap,
  type ScoreReport,
  type TargetGroup,
} from '@ofw/simulation';

export type Screen =
  | 'title'
  | 'briefing'
  | 'design'
  | 'planning'
  | 'deploy'
  | 'operations'
  | 'debrief'
  | 'campaign'
  | 'howto'
  | 'sources'
  | 'settings';

export type FeedMode = 'snapshot' | 'live' | 'synthetic';

export interface FeedState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  mode: FeedMode;
  envelope?: FirmsFeedEnvelope;
  error?: string;
  notes: string[];
}

export interface Settings {
  master: number;
  sfx: number;
  ambient: number;
  muted: boolean;
  reducedMotion: boolean;
  mapDim: boolean;
  coach: boolean;
  /** Practice setting: open every mission without changing saved progress. */
  unlockAll: boolean;
  /** Assisted observation: follow the mission default, or force on/off. */
  assistObserve: AssistSetting;
  /** Assisted downlink: follow the mission default, or force on/off. */
  assistDownlink: AssistSetting;
  /** Show the detailed panels (numbers, units, event log) instead of the simple desk. */
  expertView: boolean;
}

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const DEFAULT_SETTINGS: Settings = {
  master: 0.7,
  sfx: 0.8,
  ambient: 0.25,
  muted: false,
  reducedMotion: !!prefersReducedMotion,
  mapDim: true,
  coach: true,
  unlockAll: false,
  assistObserve: 'mission',
  assistDownlink: 'mission',
  expertView: false,
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Load the versioned save, migrating or recovering if needed. Never throws. */
function loadProgress(): { progress: ProgressMap; notice?: string } {
  const loaded = loadSave(readRaw(SAVE_KEY), readRaw(LEGACY_PROGRESS_KEY));
  if (loaded.source === 'migrated') {
    save(SAVE_KEY, loaded.save);
    try {
      localStorage.removeItem(LEGACY_PROGRESS_KEY);
    } catch {
      /* ignore */
    }
  }
  if (loaded.source === 'recovered') {
    try {
      if (loaded.discarded !== undefined) localStorage.setItem(`${SAVE_KEY}.unreadable`, loaded.discarded);
      localStorage.removeItem(LEGACY_PROGRESS_KEY);
    } catch {
      /* ignore */
    }
    save(SAVE_KEY, loaded.save);
    return { progress: {}, notice: 'Saved progress could not be read and was reset. A copy was kept in browser storage.' };
  }
  return { progress: loaded.save.progress };
}

export function saveProgress(progress: ProgressMap) {
  save(SAVE_KEY, { version: SAVE_VERSION, progress });
}

const initialProgress = loadProgress();

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: settings stay in memory */
  }
}

export interface GameState {
  screen: Screen;
  /** Screen to return to from info screens. */
  returnTo: Screen;
  missionId: string;
  feed: FeedState;
  targets: TargetGroup[];
  loadouts: Record<string, Loadout>;
  /** Last validated loadout per mission (for "changed since last launch"). */
  launchedLoadouts: Record<string, Loadout>;
  aimId: string;
  queue: string[];
  run: MissionRun | null;
  report: ScoreReport | null;
  progress: ProgressMap;
  settings: Settings;
  serverStatus: FirmsStatus | null;
  codexOpen: boolean;
  codexTopic?: string;
  toast: { id: number; text: string; tone: 'info' | 'warn' | 'good' | 'critical' } | null;

  go: (s: Screen) => void;
  openInfo: (s: Screen) => void;
  closeInfo: () => void;
  selectMission: (id: string) => void;
  setFeed: (f: Partial<FeedState>) => void;
  setTargets: (t: TargetGroup[]) => void;
  setLoadout: (l: Loadout) => void;
  patchLoadout: (p: Partial<Loadout>) => void;
  setAim: (id: string) => void;
  setQueue: (q: string[]) => void;
  startRun: () => string | null;
  finishRun: () => void;
  setSettings: (s: Partial<Settings>) => void;
  setServerStatus: (s: FirmsStatus | null) => void;
  openCodex: (topic?: string) => void;
  closeCodex: () => void;
  notify: (text: string, tone?: 'info' | 'warn' | 'good' | 'critical') => void;
}

export function mission(state: Pick<GameState, 'missionId'>): MissionDef {
  return getMission(state.missionId);
}

export function buildMissionTargets(m: MissionDef, env: FirmsFeedEnvelope): TargetGroup[] {
  return buildTargetGroups(env.detections, missionTargetOptions(m));
}

export const useGame = create<GameState>((set, get) => ({
  screen: 'title',
  returnTo: 'title',
  missionId: MISSIONS[0].id,
  feed: { status: 'idle', mode: 'snapshot', notes: [] },
  targets: [],
  loadouts: Object.fromEntries(MISSIONS.map((m) => [m.id, { ...m.recommended }])),
  launchedLoadouts: {},
  aimId: MISSIONS[0].aimPoints[0].id,
  queue: [],
  run: null,
  report: null,
  progress: initialProgress.progress,
  settings: load('ofw.settings', DEFAULT_SETTINGS),
  serverStatus: null,
  codexOpen: false,
  toast: initialProgress.notice ? { id: 1, text: initialProgress.notice, tone: 'warn' } : null,

  go: (screen) => set({ screen }),
  openInfo: (screen) => set((s) => ({ returnTo: ['howto', 'sources', 'settings'].includes(s.screen) ? s.returnTo : s.screen, screen })),
  closeInfo: () => set((s) => ({ screen: s.returnTo })),
  selectMission: (id) => {
    const m = getMission(id);
    set({ missionId: id, aimId: m.aimPoints[0].id, targets: [], queue: [], run: null, report: null, feed: { status: 'idle', mode: get().feed.mode === 'synthetic' ? 'snapshot' : get().feed.mode, notes: [] } });
  },
  setFeed: (f) => set((s) => ({ feed: { ...s.feed, ...f } })),
  setTargets: (targets) => set({ targets, queue: targets.map((t) => t.id) }),
  setLoadout: (l) => set((s) => ({ loadouts: { ...s.loadouts, [s.missionId]: l } })),
  patchLoadout: (p) => set((s) => ({ loadouts: { ...s.loadouts, [s.missionId]: { ...s.loadouts[s.missionId], ...p } } })),
  setAim: (aimId) => set({ aimId }),
  setQueue: (queue) => set({ queue }),
  startRun: () => {
    const s = get();
    const m = getMission(s.missionId);
    const loadout = s.loadouts[s.missionId];
    const assist = resolveAssist(m.id, s.settings.assistObserve, s.settings.assistDownlink);
    const run = createRun(m, loadout, s.targets, { aimId: s.aimId, queue: s.queue, autoObserve: assist.observe, autoDownlink: assist.downlink });
    if ('error' in run) return run.error;
    set({ run, report: null, launchedLoadouts: { ...s.launchedLoadouts, [s.missionId]: { ...loadout } } });
    return null;
  },
  finishRun: () => {
    const s = get();
    if (!s.run) return;
    const report = computeScore(s.run);
    // Synthetic training data never counts toward the campaign.
    const synthetic = s.feed.envelope?.state === 'SYNTHETIC DEMO';
    const progress = synthetic
      ? s.progress
      : recordRun(s.progress, s.missionId, { score: report.total, grade: report.grade, success: report.success, commendations: report.commendations.filter((c) => c.met).map((c) => c.id), atUtc: new Date().toISOString() });
    if (!synthetic) saveProgress(progress);
    set({ report, progress, screen: 'debrief' });
  },
  setSettings: (p) => {
    const settings = { ...get().settings, ...p };
    save('ofw.settings', settings);
    set({ settings });
  },
  setServerStatus: (serverStatus) => set({ serverStatus }),
  openCodex: (topic) => set({ codexOpen: true, codexTopic: topic }),
  closeCodex: () => set({ codexOpen: false }),
  notify: (text, tone = 'info') => set({ toast: { id: Date.now() + Math.random(), text, tone } }),
}));
