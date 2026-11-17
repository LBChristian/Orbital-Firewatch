/**
 * Procedural sound effects generated with the Web Audio API. No audio files, so no licensing
 * issues and nothing to fail to load. The AudioContext is only created after a user gesture.
 */

export type Sfx =
  | 'click'
  | 'hover'
  | 'accept'
  | 'deploy'
  | 'lock'
  | 'capture'
  | 'packet'
  | 'lowBattery'
  | 'storage'
  | 'objective'
  | 'failure'
  | 'reward'
  | 'reject';

interface Levels {
  master: number;
  sfx: number;
  ambient: number;
  muted: boolean;
}

const COOLDOWN_MS: Partial<Record<Sfx, number>> = {
  hover: 60,
  lowBattery: 8000,
  storage: 6000,
  packet: 120,
  lock: 250,
  reject: 400,
  click: 40,
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private ambientNodes: AudioNode[] = [];
  private last: Partial<Record<Sfx, number>> = {};
  private levels: Levels = { master: 0.7, sfx: 0.8, ambient: 0.25, muted: false };
  private ambientWanted = false;

  /** Call from a user gesture. Creates/resumes the context. */
  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.ambBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.ambBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.apply();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.ambientWanted) this.startAmbient();
  }

  get unlocked(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  setLevels(l: Levels): void {
    this.levels = l;
    this.apply();
  }

  private apply(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.levels.muted ? 0 : this.levels.master, t, 0.03);
    this.sfxBus.gain.setTargetAtTime(this.levels.sfx, t, 0.03);
    this.ambBus.gain.setTargetAtTime(this.levels.ambient * 0.5, t, 0.2);
  }

  setAmbient(on: boolean): void {
    this.ambientWanted = on;
    if (on) this.startAmbient();
    else this.stopAmbient();
  }

  private startAmbient(): void {
    if (!this.ctx || this.ambientNodes.length) return;
    const ctx = this.ctx;
    // Low mission-room hum: two detuned sines + band-passed noise, very quiet.
    const g = ctx.createGain();
    g.gain.value = 0.0;
    g.gain.setTargetAtTime(0.18, ctx.currentTime, 2);
    g.connect(this.ambBus);
    const o1 = ctx.createOscillator();
    o1.frequency.value = 55;
    const o2 = ctx.createOscillator();
    o2.frequency.value = 55.6;
    o2.type = 'triangle';
    const og = ctx.createGain();
    og.gain.value = 0.25;
    o1.connect(og);
    o2.connect(og);
    og.connect(g);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 420;
    bp.Q.value = 0.7;
    const ng = ctx.createGain();
    ng.gain.value = 0.05;
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(g);
    o1.start();
    o2.start();
    noise.start();
    this.ambientNodes = [o1, o2, noise, g];
  }

  private stopAmbient(): void {
    for (const n of this.ambientNodes) {
      try {
        if (n instanceof AudioScheduledSourceNode) n.stop();
        n.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.ambientNodes = [];
  }

  private tone(freq: number, start: number, dur: number, opts: { type?: OscillatorType; gain?: number; to?: number; filter?: number } = {}) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(freq, start);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, start + dur);
    const g = ctx.createGain();
    const peak = opts.gain ?? 0.2;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    let node: AudioNode = o;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(this.sfxBus);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  private noise(start: number, dur: number, opts: { gain?: number; freq?: number; q?: number; type?: BiquadFilterType } = {}) {
    const ctx = this.ctx!;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.value = opts.freq ?? 1200;
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.value = opts.gain ?? 0.2;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    src.start(start);
  }

  play(name: Sfx): void {
    if (!this.ctx || this.levels.muted || this.ctx.state !== 'running') return;
    const nowMs = performance.now();
    const cd = COOLDOWN_MS[name] ?? 30;
    if ((this.last[name] ?? -1e9) + cd > nowMs) return;
    this.last[name] = nowMs;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case 'hover':
        this.tone(2400, t, 0.025, { gain: 0.025, type: 'sine' });
        break;
      case 'click':
        this.tone(1320, t, 0.05, { gain: 0.08, type: 'triangle' });
        this.tone(1980, t + 0.03, 0.04, { gain: 0.04, type: 'sine' });
        break;
      case 'accept':
        this.tone(660, t, 0.12, { gain: 0.12, type: 'triangle' });
        this.tone(990, t + 0.12, 0.2, { gain: 0.12, type: 'triangle' });
        break;
      case 'deploy':
        this.noise(t, 0.08, { gain: 0.35, freq: 2500, q: 3 });
        this.tone(180, t, 0.09, { gain: 0.2, type: 'square', filter: 900 });
        this.tone(220, t + 0.12, 0.9, { gain: 0.06, type: 'sawtooth', to: 340, filter: 700 });
        this.noise(t + 1.05, 0.06, { gain: 0.3, freq: 3000, q: 4 });
        break;
      case 'lock':
        this.tone(1400, t, 0.06, { gain: 0.07, to: 2100 });
        this.tone(2100, t + 0.08, 0.06, { gain: 0.06 });
        break;
      case 'capture':
        this.tone(880, t, 0.18, { gain: 0.12, type: 'sine', to: 220 });
        this.noise(t, 0.12, { gain: 0.12, freq: 5000, q: 0.8, type: 'highpass' });
        this.tone(1760, t + 0.02, 0.08, { gain: 0.05, type: 'triangle' });
        break;
      case 'packet':
        for (let i = 0; i < 3; i++) this.tone(2600 + i * 300, t + i * 0.035, 0.025, { gain: 0.04, type: 'square', filter: 4000 });
        break;
      case 'lowBattery':
        this.tone(520, t, 0.16, { gain: 0.1, type: 'triangle' });
        this.tone(390, t + 0.2, 0.22, { gain: 0.1, type: 'triangle' });
        break;
      case 'storage':
        this.tone(460, t, 0.1, { gain: 0.08, type: 'square', filter: 1200 });
        this.tone(460, t + 0.15, 0.1, { gain: 0.08, type: 'square', filter: 1200 });
        break;
      case 'reject':
        this.tone(240, t, 0.12, { gain: 0.08, type: 'square', filter: 900 });
        break;
      case 'objective':
        [523, 659, 784].forEach((f, i) => this.tone(f, t + i * 0.09, 0.22, { gain: 0.1, type: 'triangle' }));
        break;
      case 'failure':
        this.tone(392, t, 0.4, { gain: 0.1, type: 'triangle', to: 262 });
        this.tone(311, t + 0.35, 0.6, { gain: 0.08, type: 'triangle', to: 196 });
        break;
      case 'reward':
        [392, 523, 659, 1047].forEach((f, i) => this.tone(f, t + i * 0.08, 0.35, { gain: 0.09, type: 'triangle' }));
        break;
    }
  }
}

export const audio = new AudioEngine();
export const sfx = (name: Sfx) => audio.play(name);
