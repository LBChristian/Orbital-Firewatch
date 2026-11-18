import type { MissionDef } from '../config/missions';
import type { DesignSpec } from '../design';
import type { TargetGroup } from '../firms/targets';
import type { MissionGeometry } from './geometry';

/**
 * Deterministic mission engine. State advances in fixed simulated steps (mission.stepSeconds).
 * Real-time speed (pause / 1x / 2x / 4x / coast) only changes how many steps the UI asks
 * for per frame; it never changes dt or any physical calculation.
 *
 * Player commands are applied at step boundaries and logged with their step index, so
 * replaying the same commands reproduces the exact same state, events and score.
 */

export type PacketStatus = 'CAPTURED' | 'STORED' | 'QUEUED' | 'TRANSMITTING' | 'DELIVERED' | 'EXPIRED/LOST';

export interface Packet {
  id: string;
  targetId: string;
  callsign: string;
  captureStep: number;
  sizeMB: number;
  sentMB: number;
  /** Observation value = GAME PRIORITY x detail multiplier x edge factor. */
  value: number;
  detail: number;
  edge: boolean;
  status: PacketStatus;
  prioritized: boolean;
  deliveredStep?: number;
  lostReason?: string;
}

export type TargetRunStatus = 'PENDING' | 'IN_WINDOW' | 'CAPTURING' | 'CAPTURED' | 'SKIPPED';

export type Severity = 'info' | 'good' | 'warn' | 'critical';

export type EventType =
  | 'mission-start'
  | 'pass-start'
  | 'pass-end'
  | 'window-open'
  | 'window-closing'
  | 'window-closed'
  | 'capture-start'
  | 'capture-complete'
  | 'capture-failed'
  | 'capture-rejected'
  | 'storage-warning'
  | 'packet-lost'
  | 'contact-start'
  | 'contact-end'
  | 'downlink-start'
  | 'downlink-stop'
  | 'packet-delivered'
  | 'battery-low'
  | 'safe-mode'
  | 'safe-mode-exit'
  | 'eclipse-enter'
  | 'eclipse-exit'
  | 'objective-complete'
  | 'command'
  | 'mission-end';

export interface GameEvent {
  step: number;
  type: EventType;
  severity: Severity;
  message: string;
  targetId?: string;
  packetId?: string;
}

export type Command =
  | { type: 'capture'; targetId: string }
  | { type: 'skip'; targetId: string }
  | { type: 'unskip'; targetId: string }
  | { type: 'prioritize'; targetId: string }
  | { type: 'prioritizePacket'; packetId: string }
  | { type: 'setAutoObserve'; on: boolean }
  | { type: 'setAutoDownlink'; on: boolean }
  | { type: 'beginDownlink' }
  | { type: 'stopDownlink' }
  | { type: 'setOverwrite'; on: boolean }
  | { type: 'endMission' };

export interface LoggedCommand {
  step: number;
  command: Command;
}

export interface RunStats {
  energyUsedWh: number;
  energyGeneratedWh: number;
  captureEnergyWh: number;
  radioEnergyWh: number;
  capturesStarted: number;
  capturesFailed: number;
  capturesRejectedStorage: number;
  capturesRejectedPower: number;
  minBatteryWh: number;
  safeModeSteps: number;
  downlinkMB: number;
  contactSteps: number;
  downlinkSteps: number;
  packetsLost: number;
  peakStorageMB: number;
  storageFullAtStep?: number;
  safeModeAtStep?: number;
}

export interface CaptureInProgress {
  targetId: string;
  startStep: number;
  endStep: number;
  sizeMB: number;
  energyWh: number;
}

export interface RunConfig {
  mission: MissionDef;
  spec: DesignSpec;
  targets: TargetGroup[];
  geometry: MissionGeometry;
  /** Initial target queue (planning order). */
  queue: string[];
  autoObserve: boolean;
  autoDownlink: boolean;
}

export interface RunState {
  step: number;
  ended: boolean;
  batteryWh: number;
  storageUsedMB: number;
  packets: Packet[];
  targetStatus: Record<string, TargetRunStatus>;
  queue: string[];
  autoObserve: boolean;
  autoDownlink: boolean;
  overwriteLowest: boolean;
  downlinkRequested: boolean;
  transmitting: boolean;
  capture: CaptureInProgress | null;
  safeMode: boolean;
  events: GameEvent[];
  commandLog: LoggedCommand[];
  stats: RunStats;
  objectiveMet: boolean;
  /** Steps at which each target became reachable at least once. */
  everInReach: Record<string, boolean>;
  windowClosingWarned: Record<string, number>;
  prevPass: number;
  prevStation: number;
  prevSunlit: number;
  storageWarned: boolean;
  batteryWarned: boolean;
  /** Queued targets auto-observe could not capture because the recorder was full. */
  blockedByStorage: string[];
  /** Queued targets auto-observe could not capture for lack of energy. */
  blockedByPower: string[];
  autoFullWarnedPass: number;
}

export const SAFE_MODE_ENTER_FRAC = 0.15;
export const SAFE_MODE_EXIT_FRAC = 0.35;
export const BATTERY_WARN_FRAC = 0.3;
export const STORAGE_WARN_FRAC = 0.8;
/** Lookahead for "window closing" warnings, s. */
export const WINDOW_CLOSING_WARN_S = 20;
/** Fraction of half-swath beyond which a capture counts as an edge capture. */
export const EDGE_FRACTION = 0.7;

export function formatMet(step: number, stepS: number): string {
  const t = Math.max(0, Math.round(step * stepS));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export class MissionRun {
  readonly config: RunConfig;
  state: RunState;
  private replay: LoggedCommand[];
  private replayIdx = 0;
  private targetIndex = new Map<string, number>();
  private targetById = new Map<string, TargetGroup>();
  /** Increments on every mutation; UIs can use it to re-render. */
  version = 0;

  constructor(config: RunConfig, replay: LoggedCommand[] = []) {
    this.config = config;
    this.replay = [...replay].sort((a, b) => a.step - b.step);
    config.targets.forEach((t, i) => {
      this.targetIndex.set(t.id, i);
      this.targetById.set(t.id, t);
    });
    const targetStatus: Record<string, TargetRunStatus> = {};
    const everInReach: Record<string, boolean> = {};
    for (const t of config.targets) {
      targetStatus[t.id] = 'PENDING';
      everInReach[t.id] = false;
    }
    this.state = {
      step: 0,
      ended: false,
      batteryWh: config.spec.batteryWh,
      storageUsedMB: 0,
      packets: [],
      targetStatus,
      queue: config.queue.filter((id) => this.targetById.has(id)),
      autoObserve: config.autoObserve,
      autoDownlink: config.autoDownlink,
      overwriteLowest: false,
      downlinkRequested: false,
      transmitting: false,
      capture: null,
      safeMode: false,
      events: [],
      commandLog: [],
      stats: {
        energyUsedWh: 0,
        energyGeneratedWh: 0,
        captureEnergyWh: 0,
        radioEnergyWh: 0,
        capturesStarted: 0,
        capturesFailed: 0,
        capturesRejectedStorage: 0,
        capturesRejectedPower: 0,
        minBatteryWh: config.spec.batteryWh,
        safeModeSteps: 0,
        downlinkMB: 0,
        contactSteps: 0,
        downlinkSteps: 0,
        packetsLost: 0,
        peakStorageMB: 0,
      },
      objectiveMet: false,
      everInReach,
      windowClosingWarned: {},
      prevPass: -1,
      prevStation: -1,
      prevSunlit: -1,
      storageWarned: false,
      batteryWarned: false,
      blockedByStorage: [],
      blockedByPower: [],
      autoFullWarnedPass: -2,
    };
    this.emit('mission-start', 'info', `${config.mission.code} ${config.mission.name}: mission clock started.`);
  }

  // helpers

  get geometry(): MissionGeometry {
    return this.config.geometry;
  }

  target(id: string): TargetGroup | undefined {
    return this.targetById.get(id);
  }

  distanceKm(targetId: string, step = this.state.step): number {
    const j = this.targetIndex.get(targetId);
    if (j === undefined) return Infinity;
    const k = Math.min(step, this.geometry.nSteps - 1);
    return this.geometry.targetDist[k * this.config.targets.length + j];
  }

  inReach(targetId: string, step = this.state.step): boolean {
    return this.distanceKm(targetId, step) <= this.geometry.reachKm;
  }

  /** Steps until the current window closes for a target (0 if not in reach). */
  stepsUntilWindowCloses(targetId: string, step = this.state.step): number {
    let k = step;
    while (k < this.geometry.nSteps && this.inReach(targetId, k)) k++;
    return k - step;
  }

  private emit(type: EventType, severity: Severity, message: string, extra: { targetId?: string; packetId?: string } = {}) {
    this.state.events.push({ step: this.state.step, type, severity, message, ...extra });
  }

  private name(targetId: string): string {
    return this.targetById.get(targetId)?.callsign ?? targetId;
  }

  // commands

  /** Apply a player command now (at the current step boundary) and log it for replay. */
  command(cmd: Command): { ok: boolean; message: string } {
    if (this.state.ended) return { ok: false, message: 'Mission has ended.' };
    this.state.commandLog.push({ step: this.state.step, command: cmd });
    const r = this.applyCommand(cmd);
    this.version++;
    return r;
  }

  private applyCommand(cmd: Command): { ok: boolean; message: string } {
    const s = this.state;
    switch (cmd.type) {
      case 'capture':
        return this.startCapture(cmd.targetId, true);
      case 'skip': {
        if (!this.targetById.has(cmd.targetId)) return { ok: false, message: 'Unknown target.' };
        const st = s.targetStatus[cmd.targetId];
        if (st === 'CAPTURED' || st === 'CAPTURING') return { ok: false, message: 'Already captured.' };
        s.targetStatus[cmd.targetId] = 'SKIPPED';
        s.queue = s.queue.filter((q) => q !== cmd.targetId);
        this.emit('command', 'info', `${this.name(cmd.targetId)} skipped by operator.`, { targetId: cmd.targetId });
        return { ok: true, message: 'Target skipped.' };
      }
      case 'unskip': {
        if (s.targetStatus[cmd.targetId] !== 'SKIPPED') return { ok: false, message: 'Target is not skipped.' };
        s.targetStatus[cmd.targetId] = this.inReach(cmd.targetId) ? 'IN_WINDOW' : 'PENDING';
        if (!s.queue.includes(cmd.targetId)) s.queue.push(cmd.targetId);
        this.emit('command', 'info', `${this.name(cmd.targetId)} restored to the queue.`, { targetId: cmd.targetId });
        return { ok: true, message: 'Target restored.' };
      }
      case 'prioritize': {
        if (!this.targetById.has(cmd.targetId)) return { ok: false, message: 'Unknown target.' };
        if (s.targetStatus[cmd.targetId] === 'SKIPPED') {
          s.targetStatus[cmd.targetId] = this.inReach(cmd.targetId) ? 'IN_WINDOW' : 'PENDING';
        }
        s.queue = [cmd.targetId, ...s.queue.filter((q) => q !== cmd.targetId)];
        this.emit('command', 'info', `${this.name(cmd.targetId)} moved to the top of the capture queue.`, { targetId: cmd.targetId });
        return { ok: true, message: 'Target prioritised.' };
      }
      case 'prioritizePacket': {
        const p = s.packets.find((p) => p.id === cmd.packetId);
        if (!p || p.status === 'DELIVERED' || p.status === 'EXPIRED/LOST') return { ok: false, message: 'Packet not available.' };
        s.packets.forEach((q) => (q.prioritized = q.id === p.id));
        this.emit('command', 'info', `Packet ${p.id} (${p.callsign}) set to transmit next.`, { packetId: p.id });
        return { ok: true, message: 'Packet will transmit next.' };
      }
      case 'setAutoObserve':
        s.autoObserve = cmd.on;
        this.emit('command', 'info', `Auto-observe ${cmd.on ? 'enabled' : 'disabled'}.`);
        return { ok: true, message: `Auto-observe ${cmd.on ? 'on' : 'off'}.` };
      case 'setAutoDownlink':
        s.autoDownlink = cmd.on;
        this.emit('command', 'info', `Auto-downlink ${cmd.on ? 'enabled' : 'disabled'}.`);
        return { ok: true, message: `Auto-downlink ${cmd.on ? 'on' : 'off'}.` };
      case 'beginDownlink': {
        if (this.geometry.station[Math.min(s.step, this.geometry.nSteps - 1)] < 0) {
          return { ok: false, message: 'No ground station in view.' };
        }
        s.downlinkRequested = true;
        this.emit('command', 'info', 'Operator commanded downlink.');
        return { ok: true, message: 'Downlink commanded.' };
      }
      case 'stopDownlink':
        s.downlinkRequested = false;
        s.autoDownlink = false;
        this.emit('command', 'info', 'Operator stopped downlink (auto-downlink off).');
        return { ok: true, message: 'Downlink stopped.' };
      case 'setOverwrite':
        s.overwriteLowest = cmd.on;
        this.emit('command', cmd.on ? 'warn' : 'info', cmd.on ? 'Recorder policy: OVERWRITE lowest-value stored packet when full (operator choice).' : 'Recorder policy: REJECT new captures when full.');
        return { ok: true, message: 'Recorder policy updated.' };
      case 'endMission':
        this.finish('Operator ended the mission early.');
        return { ok: true, message: 'Mission ended.' };
    }
  }

  private startCapture(targetId: string, manual: boolean): { ok: boolean; message: string } {
    const s = this.state;
    const spec = this.config.spec;
    const t = this.targetById.get(targetId);
    if (!t) return { ok: false, message: 'Unknown target.' };
    const reject = (msg: string, sev: Severity = 'warn') => {
      if (manual) this.emit('capture-rejected', sev, `${t.callsign}: ${msg}`, { targetId });
      return { ok: false, message: msg };
    };
    if (s.capture) return reject('payload busy with another capture.', 'info');
    const st = s.targetStatus[targetId];
    if (st === 'CAPTURED') return reject('already captured.', 'info');
    if (!this.inReach(targetId)) {
      return reject(`out of reach (${Math.round(this.distanceKm(targetId))} km from track, reach ${Math.round(spec.reachKm)} km).`, 'info');
    }
    if (s.safeMode) return reject('spacecraft in SAFE MODE (low battery). Captures locked out.');
    if (s.batteryWh < spec.captureWh) {
      s.stats.capturesRejectedPower++;
      return reject(`not enough energy (${spec.captureWh.toFixed(1)} Wh needed).`);
    }
    const size = spec.dataMBPerCapture;
    const value = t.priority.total * spec.detail;
    if (s.storageUsedMB + size > spec.storageMB) {
      if (s.overwriteLowest) {
        // Free lowest-value STORED packets that are worth less than the new capture.
        const candidates = s.packets
          .filter((p) => p.status === 'STORED' && p.value < value * spec.edgeFactor)
          .sort((a, b) => a.value - b.value || a.captureStep - b.captureStep);
        let freed = 0;
        const toDrop: Packet[] = [];
        for (const c of candidates) {
          if (s.storageUsedMB - freed + size <= spec.storageMB) break;
          toDrop.push(c);
          freed += c.sizeMB;
        }
        if (s.storageUsedMB - freed + size > spec.storageMB) {
          s.stats.capturesRejectedStorage++;
          if (s.stats.storageFullAtStep === undefined) s.stats.storageFullAtStep = s.step;
          return reject('recorder full and no lower-value packet to overwrite.');
        }
        for (const p of toDrop) {
          p.status = 'EXPIRED/LOST';
          p.lostReason = `Overwritten by ${t.callsign} (operator overwrite policy).`;
          s.storageUsedMB -= p.sizeMB;
          s.stats.packetsLost++;
          this.emit('packet-lost', 'warn', `Packet ${p.id} (${p.callsign}) overwritten to make room for ${t.callsign}.`, { packetId: p.id, targetId: p.targetId });
        }
      } else {
        s.stats.capturesRejectedStorage++;
        if (s.stats.storageFullAtStep === undefined) s.stats.storageFullAtStep = s.step;
        // Rejections are always reported, including auto-observe ones, so the cause is visible.
        this.emit('capture-rejected', 'critical', `${t.callsign}: RECORDER FULL (${Math.round(s.storageUsedMB)} / ${spec.storageMB} MB). Capture rejected.`, { targetId });
        return { ok: false, message: 'Recorder full.' };
      }
    }
    // Commit: energy and storage are reserved at capture start.
    s.batteryWh -= spec.captureWh;
    s.stats.energyUsedWh += spec.captureWh;
    s.stats.captureEnergyWh += spec.captureWh;
    s.storageUsedMB += size;
    s.stats.peakStorageMB = Math.max(s.stats.peakStorageMB, s.storageUsedMB);
    s.stats.capturesStarted++;
    const steps = Math.max(1, Math.ceil(spec.captureS / this.geometry.stepS));
    s.capture = { targetId, startStep: s.step, endStep: s.step + steps, sizeMB: size, energyWh: spec.captureWh };
    s.targetStatus[targetId] = 'CAPTURING';
    this.emit('capture-start', 'info', `${t.callsign}: capture started (${spec.captureS} s, ${size} MB, ${spec.captureWh.toFixed(1)} Wh).${manual ? '' : ' [auto]'}`, { targetId });
    return { ok: true, message: 'Capture started.' };
  }

  // stepping

  /** Advance up to n steps. Returns number of steps processed. */
  advance(n: number): number {
    let done = 0;
    while (done < n && !this.state.ended) {
      this.processStep();
      done++;
    }
    if (done > 0) this.version++;
    return done;
  }

  /** Run to the end (used by tests, replays and balance scripts). */
  runToEnd(): void {
    while (!this.state.ended) this.processStep();
    this.version++;
  }

  /** True when something is happening that the player should watch at normal speed. */
  isActive(step = this.state.step): boolean {
    const g = this.geometry;
    const k = Math.min(step, g.nSteps - 1);
    if (this.state.capture) return true;
    if (g.passAt[k] >= 0) return true;
    if (g.station[k] >= 0 && this.state.packets.some((p) => p.status !== 'DELIVERED' && p.status !== 'EXPIRED/LOST')) return true;
    return false;
  }

  /**
   * Steps until the next thing worth watching (for "skip to next event"): a pass start, a new
   * station coming into view (including hand-overs between stations), or a window opening for
   * a target that has not been captured or skipped.
   */
  stepsToNextEvent(): number {
    const g = this.geometry;
    const s = this.state;
    let next = g.nSteps;
    for (const w of g.windows) {
      if (w.startStep > s.step && w.startStep < next) {
        const st = s.targetStatus[w.targetId];
        if (st !== 'CAPTURED' && st !== 'SKIPPED') next = w.startStep;
      }
    }
    for (let k = s.step + 1; k < next; k++) {
      if (g.passAt[k] >= 0 && g.passAt[k - 1] < 0) return k - s.step;
      if (g.station[k] >= 0 && g.station[k] !== g.station[k - 1]) return k - s.step;
    }
    return next - s.step;
  }

  private processStep(): void {
    const s = this.state;
    const g = this.geometry;
    const spec = this.config.spec;
    const dt = g.stepS;
    const k = s.step;

    // 1. Replay commands scheduled for this step.
    while (this.replayIdx < this.replay.length && this.replay[this.replayIdx].step <= k) {
      const c = this.replay[this.replayIdx++];
      s.commandLog.push({ step: k, command: c.command });
      this.applyCommand(c.command);
      if (s.ended) return;
    }

    // 2. Geometry-driven transitions.
    const pass = g.passAt[k];
    if (pass !== s.prevPass) {
      if (s.prevPass >= 0) this.emit('pass-end', 'info', `Pass ${s.prevPass + 1} over the region ended.`);
      if (pass >= 0) this.emit('pass-start', 'info', `Pass ${pass + 1} of ${g.passes.length} over ${this.config.mission.regionName} started.`);
      s.prevPass = pass;
    }
    const stIdx = g.station[k];
    if (stIdx !== s.prevStation) {
      if (s.prevStation >= 0) {
        this.emit('contact-end', 'info', `Contact with ${this.config.mission.groundStations[s.prevStation].name} ended.`);
        s.downlinkRequested = false;
      }
      if (stIdx >= 0) this.emit('contact-start', 'good', `Contact with ${this.config.mission.groundStations[stIdx].name} acquired.`);
      s.prevStation = stIdx;
    }
    const lit = g.sunlit[k];
    if (lit !== s.prevSunlit) {
      if (s.prevSunlit !== -1) {
        this.emit(lit ? 'eclipse-exit' : 'eclipse-enter', 'info', lit ? 'Sunlight: arrays generating.' : 'Eclipse: running on battery.');
      }
      s.prevSunlit = lit;
    }

    // 3. Target windows.
    const closingSteps = Math.ceil(WINDOW_CLOSING_WARN_S / dt);
    for (const t of this.config.targets) {
      const st = s.targetStatus[t.id];
      const reach = this.inReach(t.id, k);
      if (reach) s.everInReach[t.id] = true;
      if (st === 'PENDING' && reach) {
        s.targetStatus[t.id] = 'IN_WINDOW';
        this.emit('window-open', 'info', `${t.callsign} entered reach (${Math.round(this.distanceKm(t.id, k))} km from track).`, { targetId: t.id });
      } else if (st === 'IN_WINDOW' && !reach) {
        s.targetStatus[t.id] = 'PENDING';
        const queued = s.queue.includes(t.id);
        this.emit('window-closed', queued ? 'warn' : 'info', `${t.callsign} left reach${queued ? ' without being captured' : ''}.`, { targetId: t.id });
      } else if (st === 'IN_WINDOW' && s.queue.includes(t.id)) {
        const left = this.stepsUntilWindowCloses(t.id, k);
        if (left <= closingSteps && s.windowClosingWarned[t.id] !== g.passAt[k]) {
          s.windowClosingWarned[t.id] = g.passAt[k];
          this.emit('window-closing', 'warn', `${t.callsign}: window closes in ${left * dt} s.`, { targetId: t.id });
        }
      }
    }

    // 4. Capture completion.
    if (s.capture && k >= s.capture.endStep) {
      const c = s.capture;
      const t = this.targetById.get(c.targetId)!;
      const d = this.distanceKm(c.targetId, k);
      s.capture = null;
      if (d <= g.reachKm) {
        const edge = d > g.swathHalfKm * EDGE_FRACTION;
        const value = Math.round(t.priority.total * spec.detail * (edge ? spec.edgeFactor : 1) * 10) / 10;
        const p: Packet = {
          id: `PKT-${String(s.packets.length + 1).padStart(3, '0')}`,
          targetId: t.id,
          callsign: t.callsign,
          captureStep: k,
          sizeMB: c.sizeMB,
          sentMB: 0,
          value,
          detail: spec.detail,
          edge,
          status: 'STORED',
          prioritized: false,
        };
        s.packets.push(p);
        s.targetStatus[t.id] = 'CAPTURED';
        s.queue = s.queue.filter((q) => q !== t.id);
        this.emit('capture-complete', 'good', `${t.callsign} captured: ${p.id} stored (${c.sizeMB} MB, value ${value}${edge ? `, edge x${spec.edgeFactor}` : ''}).`, { targetId: t.id, packetId: p.id });
      } else {
        s.storageUsedMB -= c.sizeMB;
        s.stats.capturesFailed++;
        s.targetStatus[t.id] = 'PENDING';
        this.emit('capture-failed', 'warn', `${t.callsign} left reach before the ${spec.captureS} s capture finished. Energy spent, no data.`, { targetId: t.id });
      }
    }

    // 5. Auto-observe: capture the first queued target that is in reach.
    if (!s.capture && s.autoObserve && !s.safeMode) {
      const steps = Math.ceil(spec.captureS / dt);
      for (const id of s.queue) {
        if (s.targetStatus[id] !== 'IN_WINDOW') continue;
        // Do not start a capture that cannot finish inside the window.
        if (this.stepsUntilWindowCloses(id, k) <= steps) continue;
        const storageFull = s.storageUsedMB + spec.dataMBPerCapture > spec.storageMB;
        if (storageFull && !s.overwriteLowest) {
          if (!s.blockedByStorage.includes(id)) s.blockedByStorage.push(id);
          if (s.stats.storageFullAtStep === undefined) s.stats.storageFullAtStep = k;
          if (s.autoFullWarnedPass !== g.passAt[k]) {
            s.autoFullWarnedPass = g.passAt[k];
            s.stats.capturesRejectedStorage++;
            this.emit('capture-rejected', 'critical', `RECORDER FULL (${Math.round(s.storageUsedMB)} / ${spec.storageMB} MB): auto-observe cannot capture ${this.name(id)}. Downlink or enable overwrite.`, { targetId: id });
          }
          break;
        }
        if (s.batteryWh < spec.captureWh) {
          if (!s.blockedByPower.includes(id)) s.blockedByPower.push(id);
          break;
        }
        const r = this.startCapture(id, false);
        if (r.ok) break;
      }
    }

    // 6. Downlink.
    const inContact = stIdx >= 0;
    if (inContact) s.stats.contactSteps++;
    const pending = s.packets.filter((p) => p.status === 'STORED' || p.status === 'QUEUED' || p.status === 'TRANSMITTING');
    const wantTx = inContact && (s.autoDownlink || s.downlinkRequested) && !s.safeMode && pending.length > 0;
    if (wantTx && !s.transmitting) this.emit('downlink-start', 'good', `Downlink started at ${spec.downlinkMbps} Mbps (${pending.length} packet${pending.length === 1 ? '' : 's'} queued).`);
    if (!wantTx && s.transmitting) {
      const why = !inContact ? 'contact lost' : s.safeMode ? 'SAFE MODE' : pending.length === 0 ? 'all packets delivered' : 'stopped by operator';
      this.emit('downlink-stop', pending.length === 0 ? 'good' : 'warn', `Downlink stopped (${why}).`);
    }
    s.transmitting = wantTx;
    if (wantTx) {
      s.stats.downlinkSteps++;
      let budget = (spec.downlinkMbps * dt) / 8;
      const order = [...pending].sort(
        (a, b) => Number(b.prioritized) - Number(a.prioritized) || b.value - a.value || a.captureStep - b.captureStep,
      );
      for (const p of order) p.status = 'QUEUED';
      for (const p of order) {
        if (budget <= 0) break;
        const need = p.sizeMB - p.sentMB;
        const send = Math.min(need, budget);
        p.sentMB += send;
        budget -= send;
        s.stats.downlinkMB += send;
        if (p.sentMB >= p.sizeMB - 1e-9) {
          p.sentMB = p.sizeMB;
          p.status = 'DELIVERED';
          p.deliveredStep = k;
          p.prioritized = false;
          s.storageUsedMB -= p.sizeMB;
          this.emit('packet-delivered', 'good', `${p.id} (${p.callsign}) delivered to ground. +${p.value} value.`, { packetId: p.id, targetId: p.targetId });
        } else {
          p.status = 'TRANSMITTING';
        }
      }
      this.checkObjective();
    } else {
      for (const p of pending) p.status = 'STORED';
    }
    if (s.storageUsedMB < 1e-6) s.storageUsedMB = 0;

    // 7. Power.
    const gen = lit ? spec.solarW : 0;
    const load = spec.busLoadW + spec.pointingLoadW + (s.transmitting ? spec.radioPowerW : 0);
    const hours = dt / 3600;
    s.stats.energyUsedWh += load * hours;
    if (s.transmitting) s.stats.radioEnergyWh += spec.radioPowerW * hours;
    const before = s.batteryWh;
    s.batteryWh = Math.min(spec.batteryWh, Math.max(0, s.batteryWh + (gen - load) * hours));
    s.stats.energyGeneratedWh += Math.max(0, s.batteryWh - before + load * hours);
    s.stats.minBatteryWh = Math.min(s.stats.minBatteryWh, s.batteryWh);

    // 8. Safe mode and warnings.
    const frac = s.batteryWh / spec.batteryWh;
    if (!s.safeMode && frac < SAFE_MODE_ENTER_FRAC) {
      s.safeMode = true;
      if (s.stats.safeModeAtStep === undefined) s.stats.safeModeAtStep = k;
      this.emit('safe-mode', 'critical', `SAFE MODE: battery ${Math.round(frac * 100)}%. Captures and downlink locked out until ${Math.round(SAFE_MODE_EXIT_FRAC * 100)}%.`);
    } else if (s.safeMode && frac >= SAFE_MODE_EXIT_FRAC) {
      s.safeMode = false;
      this.emit('safe-mode-exit', 'good', `Battery recovered to ${Math.round(frac * 100)}%. Safe mode cleared.`);
    }
    if (s.safeMode) s.stats.safeModeSteps++;
    if (!s.batteryWarned && frac < BATTERY_WARN_FRAC) {
      s.batteryWarned = true;
      this.emit('battery-low', 'warn', `Battery low: ${Math.round(frac * 100)}%.`);
    } else if (s.batteryWarned && frac > 0.5) s.batteryWarned = false;
    const sfrac = s.storageUsedMB / spec.storageMB;
    if (!s.storageWarned && sfrac >= STORAGE_WARN_FRAC) {
      s.storageWarned = true;
      this.emit('storage-warning', 'warn', `Recorder ${Math.round(sfrac * 100)}% full (${Math.round(s.storageUsedMB)} / ${spec.storageMB} MB).`);
    } else if (s.storageWarned && sfrac < 0.6) s.storageWarned = false;

    // 9. Advance.
    s.step = k + 1;
    if (s.step >= g.nSteps) this.finish('Mission window closed.');
  }

  private checkObjective(): void {
    if (this.state.objectiveMet) return;
    const p = objectiveProgress(this.config, this.state);
    if (p.met) {
      this.state.objectiveMet = true;
      this.emit('objective-complete', 'good', `OBJECTIVE COMPLETE: ${this.config.mission.objective.text}`);
    }
  }

  private finish(reason: string): void {
    const s = this.state;
    if (s.ended) return;
    if (s.capture) {
      const t = this.targetById.get(s.capture.targetId)!;
      s.storageUsedMB -= s.capture.sizeMB;
      s.stats.capturesFailed++;
      s.targetStatus[t.id] = 'PENDING';
      this.emit('capture-failed', 'warn', `${t.callsign}: capture interrupted by mission end.`, { targetId: t.id });
      s.capture = null;
    }
    for (const p of s.packets) {
      if (p.status === 'QUEUED' || p.status === 'TRANSMITTING') p.status = 'STORED';
    }
    s.transmitting = false;
    const undelivered = s.packets.filter((p) => p.status === 'STORED');
    this.checkObjective();
    s.ended = true;
    this.emit(
      'mission-end',
      s.objectiveMet ? 'good' : 'critical',
      `${reason} ${s.objectiveMet ? 'Objective met.' : 'Objective NOT met.'}${undelivered.length ? ` ${undelivered.length} packet(s) still on board, never delivered.` : ''}`,
    );
  }
}

export interface ObjectiveProgress {
  met: boolean;
  /** 0..1 */
  fraction: number;
  detail: string;
  zones?: { id: string; label: string; delivered: number; required: number }[];
}

export function objectiveProgress(config: RunConfig, state: RunState): ObjectiveProgress {
  const obj = config.mission.objective;
  const delivered = state.packets.filter((p) => p.status === 'DELIVERED');
  const deliveredTargets = new Set(delivered.map((p) => p.targetId));
  if (obj.type === 'deliverCount') {
    const n = deliveredTargets.size;
    return { met: n >= obj.count, fraction: Math.min(1, n / obj.count), detail: `${n} / ${obj.count} target groups delivered` };
  }
  if (obj.type === 'deliverValue') {
    const v = delivered.reduce((a, p) => a + p.value, 0);
    return { met: v >= obj.value, fraction: Math.min(1, v / obj.value), detail: `${Math.round(v)} / ${obj.value} value delivered` };
  }
  const zones = (config.mission.zones ?? []).map((z) => {
    const n = config.targets.filter((t) => t.zone === z.label && deliveredTargets.has(t.id)).length;
    return { id: z.id, label: z.label, delivered: n, required: obj.perZone };
  });
  const fraction = zones.length ? zones.reduce((a, z) => a + Math.min(1, z.delivered / z.required), 0) / zones.length : 0;
  return {
    met: zones.length > 0 && zones.every((z) => z.delivered >= z.required),
    fraction,
    detail: zones.map((z) => `${z.label} ${z.delivered}/${z.required}`).join(' · '),
    zones,
  };
}
