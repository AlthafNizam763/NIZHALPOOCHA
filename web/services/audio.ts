'use client';
import { useSettings } from '@/state/settingsStore';

/**
 * Original procedural sound design (Web Audio, no external assets).
 * Ambience: monsoon rain, insects, distant thunder, far-off auto horn.
 * SFX never reveal roles: kill sounds are only played on the killer's and
 * victim's own devices.
 */
export type Sfx =
  | 'click'
  | 'interact'
  | 'taskDone'
  | 'warning'
  | 'sabotage'
  | 'report'
  | 'meeting'
  | 'vote'
  | 'result'
  | 'kill'
  | 'victory'
  | 'defeat'
  | 'thunder'
  | 'reveal'
  // Story intro / tutorial cues
  | 'thunderClose'
  | 'powerDown'
  | 'flicker'
  | 'static'
  | 'pumpStall'
  | 'vanish'
  | 'stinger'
  | 'heartbeat'
  | 'whoosh';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private ambience!: GainNode;
  private noise: AudioBuffer | null = null;
  private ambienceNodes: AudioNode[] = [];
  private ambienceTimers: number[] = [];
  private droneNodes: { osc: OscillatorNode[]; gain: GainNode } | null = null;
  private unsub: (() => void) | null = null;

  /** Must be called from a user gesture on iOS/Safari. */
  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.ambience = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.ambience.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoise();
      this.applyVolumes();
      this.unsub = useSettings.subscribe(() => this.applyVolumes());
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const s = useSettings.getState();
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.masterVolume, t, 0.05);
    this.sfx.gain.setTargetAtTime(s.sfxVolume, t, 0.05);
    this.ambience.gain.setTargetAtTime(s.musicVolume * 0.6, t, 0.2);
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, at = 0, dest?: AudioNode, slideTo?: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest ?? this.sfx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseBurst(dur: number, filterFreq: number, gain: number, at = 0, type: BiquadFilterType = 'lowpass', dest?: AudioNode) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest ?? this.sfx);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  play(name: Sfx): void {
    if (!this.ctx) return;
    switch (name) {
      case 'click':
        this.tone(660, 0.06, 'sine', 0.12);
        break;
      case 'interact':
        this.tone(520, 0.08, 'triangle', 0.15);
        this.tone(780, 0.1, 'triangle', 0.1, 0.05);
        break;
      case 'taskDone':
        [523, 659, 784].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.18, i * 0.08));
        break;
      case 'warning':
        this.tone(440, 0.15, 'square', 0.06);
        this.tone(330, 0.2, 'square', 0.06, 0.16);
        break;
      case 'sabotage':
        for (let i = 0; i < 4; i++) {
          this.tone(880, 0.12, 'square', 0.05, i * 0.3);
          this.tone(622, 0.12, 'square', 0.05, i * 0.3 + 0.15);
        }
        break;
      case 'report':
        this.noiseBurst(0.4, 300, 0.5);
        this.tone(110, 0.5, 'sine', 0.4, 0, undefined, 55);
        break;
      case 'meeting':
        // Temple-bell-like partials
        [392, 784, 1176, 1568].forEach((f, i) => this.tone(f, 2.2 - i * 0.4, 'sine', 0.16 / (i + 1)));
        break;
      case 'vote':
        this.tone(900, 0.05, 'square', 0.06);
        break;
      case 'result':
        this.tone(330, 0.4, 'triangle', 0.15);
        this.tone(262, 0.6, 'triangle', 0.15, 0.3);
        break;
      case 'kill':
        this.noiseBurst(0.25, 500, 0.35);
        this.tone(180, 0.35, 'sine', 0.3, 0, undefined, 60);
        break;
      case 'victory':
        [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.16, i * 0.12));
        break;
      case 'defeat':
        [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.14, i * 0.18));
        break;
      case 'thunder':
        this.noiseBurst(2.8, 180, 0.7, 0.05, 'lowpass', this.ambience);
        this.noiseBurst(1.2, 90, 0.8, 0.25, 'lowpass', this.ambience);
        break;
      case 'reveal':
        this.tone(220, 1.2, 'sawtooth', 0.05, 0, undefined, 110);
        this.noiseBurst(1.0, 2000, 0.08, 0.1, 'bandpass');
        break;
      case 'thunderClose':
        this.noiseBurst(0.18, 5000, 0.5, 0, 'highpass', this.ambience);
        this.noiseBurst(3.2, 220, 0.9, 0.04, 'lowpass', this.ambience);
        this.noiseBurst(1.6, 80, 1, 0.2, 'lowpass', this.ambience);
        break;
      case 'powerDown':
        this.noiseBurst(0.05, 3000, 0.4, 0, 'highpass');
        this.tone(140, 1.1, 'sawtooth', 0.06, 0.02, undefined, 28);
        break;
      case 'flicker':
        for (let i = 0; i < 5; i++) {
          const at = i * 0.09 + Math.random() * 0.05;
          this.tone(100, 0.04, 'square', 0.05, at);
          this.noiseBurst(0.04, 4000, 0.06, at, 'highpass');
        }
        break;
      case 'static':
        this.noiseBurst(1.3, 3200, 0.3, 0, 'bandpass');
        this.tone(60, 1.2, 'square', 0.02);
        break;
      case 'pumpStall':
        // A motor chugging slower and slower, then a sigh of air.
        for (let i = 0, at = 0; i < 7; i++, at += 0.18 + i * 0.07) this.tone(72 - i * 4, 0.12, 'sine', 0.35 - i * 0.03, at);
        this.noiseBurst(0.9, 700, 0.12, 2.1, 'bandpass');
        break;
      case 'vanish':
        this.noiseBurst(0.5, 1800, 0.12, 0, 'bandpass');
        this.tone(900, 0.45, 'sine', 0.05, 0, undefined, 260);
        break;
      case 'stinger':
        [233, 247, 370, 494].forEach((f, i) => this.tone(f, 1.8, 'sawtooth', 0.025, i * 0.02));
        this.noiseBurst(0.6, 900, 0.18, 0, 'bandpass');
        this.tone(55, 2, 'sine', 0.35, 0, undefined, 40);
        break;
      case 'heartbeat':
        this.tone(58, 0.16, 'sine', 0.5);
        this.tone(52, 0.18, 'sine', 0.4, 0.24);
        break;
      case 'whoosh':
        this.noiseBurst(0.7, 600, 0.2, 0, 'bandpass');
        break;
    }
  }

  startAmbience(): void {
    if (!this.ctx || this.ambienceNodes.length) return;
    const ctx = this.ctx;
    // Rain bed: two filtered noise layers
    for (const [freq, q, gain] of [
      [1400, 0.6, 0.22],
      [5200, 0.8, 0.08],
    ] as const) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(f).connect(g).connect(this.ambience);
      src.start();
      this.ambienceNodes.push(src, f, g);
    }
    // Insects: sparse high chirps
    this.ambienceTimers.push(
      window.setInterval(() => {
        if (Math.random() < 0.55) for (let i = 0; i < 3; i++) this.tone(4200 + Math.random() * 600, 0.03, 'sine', 0.012, i * 0.06, this.ambience);
      }, 1400),
    );
    // Distant thunder + auto-rickshaw horn, rarely
    this.ambienceTimers.push(
      window.setInterval(() => {
        const r = Math.random();
        if (r < 0.18) this.play('thunder');
        else if (r < 0.26) {
          this.tone(520, 0.12, 'square', 0.012, 0, this.ambience);
          this.tone(520, 0.12, 'square', 0.012, 0.18, this.ambience);
        }
      }, 9000),
    );
  }

  /** Low, uneasy pad under the story intro. */
  startDrone(): void {
    if (!this.ctx || this.droneNodes) return;
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 4);
    gain.connect(this.ambience);
    const osc = [55, 55.6, 82.4].map((f) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(gain);
      o.start();
      return o;
    });
    this.droneNodes = { osc, gain };
  }

  stopDrone(): void {
    if (!this.ctx || !this.droneNodes) return;
    const { osc, gain } = this.droneNodes;
    const t = this.ctx.currentTime;
    gain.gain.setTargetAtTime(0.0001, t, 0.4);
    osc.forEach((o) => o.stop(t + 2));
    this.droneNodes = null;
  }

  stopAmbience(): void {
    for (const n of this.ambienceNodes) {
      if (n instanceof AudioBufferSourceNode) n.stop();
      n.disconnect();
    }
    this.ambienceNodes = [];
    this.ambienceTimers.forEach((id) => clearInterval(id));
    this.ambienceTimers = [];
  }

  dispose(): void {
    this.stopDrone();
    this.stopAmbience();
    this.unsub?.();
  }
}

export const audio = new AudioEngine();
