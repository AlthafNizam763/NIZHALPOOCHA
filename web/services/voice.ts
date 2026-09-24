'use client';
import { C2S, type VoiceJoinResult, type VoiceRoster, type VoiceSignal } from '@nizhal/shared';
import { useVoice, type VoiceError } from '@/state/voiceStore';
import { useSettings } from '@/state/settingsStore';
import { useAuth } from '@/state/authStore';
import { emitVoiceSignal, request } from './net';

/**
 * Peer-to-peer voice chat (WebRTC mesh, audio only).
 *
 * The server decides who may talk to whom (see server VoiceManager) and sends a
 * roster whenever that changes; this client connects to exactly the peers in the
 * roster and tears down every connection that disappears from it. The peer with
 * the lower id always makes the offer, so each pair negotiates exactly once.
 */

interface PeerLink {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  pendingIce: RTCIceCandidateInit[];
  analyser: AnalyserNode | null;
  initiator: boolean;
}

const SPEAKING_THRESHOLD = 0.035;

class VoiceClient {
  private local: MediaStream | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private ctx: AudioContext | null = null;
  private links = new Map<string, PeerLink>();
  private iceServers: RTCIceServer[] = [];
  private meterTimer: ReturnType<typeof setInterval> | null = null;
  private unsubSettings: (() => void) | null = null;
  private wantVoice = false;
  /** Signals that arrive while our own join is still in flight (peers may offer first). */
  private earlySignals: { from: string; data: VoiceSignal }[] = [];
  private lastRoster: VoiceRoster | null = null;

  private get myId(): string {
    return useAuth.getState().user?.uid ?? '';
  }

  // ── Lifecycle ────────────────────────────────────────────────────────
  async join(): Promise<void> {
    const store = useVoice.getState();
    if (store.status === 'on' || store.status === 'connecting') return;
    const fail = (error: VoiceError) => {
      this.stopLocal();
      useVoice.getState().set({ status: 'error', error });
      this.wantVoice = false;
    };
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
      return fail(window.isSecureContext === false ? 'insecure' : 'unsupported');
    }
    this.wantVoice = true;
    store.set({ status: 'connecting', error: null });
    try {
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch (err) {
      const name = (err as DOMException).name;
      return fail(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'nomic');
    }
    const r = await request<VoiceJoinResult>(C2S.VOICE_JOIN);
    if (!r.ok) return fail('server');
    this.iceServers = r.data.iceServers as RTCIceServer[];
    this.ctx = new AudioContext();
    // Created after an await, so some browsers start it suspended; the meters need it running.
    void this.ctx.resume().catch(() => {});
    this.localAnalyser = this.analyse(this.local);
    this.applyMic();
    this.applyVolume();
    this.unsubSettings ??= useSettings.subscribe(() => {
      this.applyVolume();
      this.applyMic();
    });
    this.meterTimer = setInterval(() => this.meter(), 120);
    useVoice.getState().set({ status: 'on' });
    if (useVoice.getState().muted) void request(C2S.VOICE_MUTE, { muted: true });
    // The roster and peers' offers may have arrived before our join was acknowledged.
    if (this.lastRoster) this.onRoster(this.lastRoster);
    const early = this.earlySignals.splice(0);
    for (const sig of early) await this.onSignal(sig.from, sig.data);
  }

  async leave(notifyServer = true): Promise<void> {
    this.wantVoice = false;
    if (notifyServer) void request(C2S.VOICE_LEAVE);
    this.teardown();
    useVoice.getState().set({ status: 'off', error: null, channel: null, peers: [], speaking: [] });
  }

  /** After a socket reconnect the server has forgotten us; re-join if we were in voice. */
  async resume(): Promise<void> {
    if (!this.wantVoice) return;
    this.teardown();
    useVoice.getState().set({ status: 'off' });
    this.wantVoice = true;
    await this.join();
  }

  private teardown(): void {
    this.earlySignals = [];
    this.lastRoster = null;
    for (const id of [...this.links.keys()]) this.closeLink(id);
    if (this.meterTimer) clearInterval(this.meterTimer);
    this.meterTimer = null;
    this.stopLocal();
    void this.ctx?.close();
    this.ctx = null;
    this.localAnalyser = null;
  }

  private stopLocal(): void {
    this.local?.getTracks().forEach((t) => t.stop());
    this.local = null;
  }

  // ── Mic control ─────────────────────────────────────────────────────
  setMuted(muted: boolean): void {
    useVoice.getState().set({ muted });
    this.applyMic();
    if (useVoice.getState().status === 'on') void request(C2S.VOICE_MUTE, { muted });
  }

  setTalking(talking: boolean): void {
    if (useVoice.getState().talking === talking) return;
    useVoice.getState().set({ talking });
    this.applyMic();
  }

  private applyMic(): void {
    const { muted, talking } = useVoice.getState();
    const ptt = useSettings.getState().pushToTalk;
    const live = !muted && (!ptt || talking);
    this.local?.getAudioTracks().forEach((t) => (t.enabled = live));
  }

  private applyVolume(): void {
    const s = useSettings.getState();
    const v = Math.max(0, Math.min(1, s.voiceVolume * s.masterVolume));
    for (const l of this.links.values()) l.audio.volume = v;
  }

  // ── Roster & signalling (from the server) ────────────────────────────
  onRoster(r: VoiceRoster): void {
    this.lastRoster = r;
    useVoice.getState().set({ enabled: r.enabled, channel: r.channel, peers: r.peers });
    if (useVoice.getState().status !== 'on') return;
    const wanted = new Set(r.peers.map((p) => p.id));
    for (const id of [...this.links.keys()]) if (!wanted.has(id)) this.closeLink(id);
    for (const id of wanted) if (!this.links.has(id) && this.myId < id) this.openLink(id, true);
  }

  async onSignal(from: string, data: VoiceSignal): Promise<void> {
    const status = useVoice.getState().status;
    if (status === 'connecting') {
      if (this.earlySignals.length < 200) this.earlySignals.push({ from, data });
      return;
    }
    if (status !== 'on') return;
    try {
      if (data.type === 'offer') {
        // The server only relays between players who share a channel, so an offer is trusted.
        // A new offer always means the other side started a fresh connection: replace ours.
        this.closeLink(from);
        const link = this.openLink(from, false);
        await link.pc.setRemoteDescription({ type: 'offer', sdp: data.sdp });
        await this.flushIce(link);
        const answer = await link.pc.createAnswer();
        await link.pc.setLocalDescription(answer);
        emitVoiceSignal(from, { type: 'answer', sdp: answer.sdp ?? '' });
      } else if (data.type === 'answer') {
        const link = this.links.get(from);
        if (!link || link.pc.signalingState !== 'have-local-offer') return;
        await link.pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
        await this.flushIce(link);
      } else {
        const link = this.links.get(from);
        if (!link) return;
        if (link.pc.remoteDescription) await link.pc.addIceCandidate(data.candidate);
        else link.pendingIce.push(data.candidate);
      }
    } catch (err) {
      console.warn('[voice] signalling error', err);
    }
  }

  private async flushIce(link: PeerLink): Promise<void> {
    const pending = link.pendingIce.splice(0);
    for (const c of pending) await link.pc.addIceCandidate(c).catch(() => {});
  }

  // ── Peer connections ────────────────────────────────────────────────
  private openLink(id: string, initiator: boolean): PeerLink {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const audio = new Audio();
    audio.autoplay = true;
    audio.setAttribute('playsinline', '');
    const link: PeerLink = { pc, audio, pendingIce: [], analyser: null, initiator };
    this.links.set(id, link);
    this.local?.getTracks().forEach((t) => pc.addTrack(t, this.local!));

    pc.onicecandidate = (e) => {
      if (e.candidate) emitVoiceSignal(id, { type: 'ice', candidate: e.candidate.toJSON() as { candidate: string } });
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      audio.srcObject = stream;
      this.applyVolume();
      void audio.play().catch(() => {});
      link.analyser = this.analyse(stream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && this.links.get(id) === link) {
        this.closeLink(id);
        // Retry once the roster still lists this peer.
        setTimeout(() => {
          const stillPeer = useVoice.getState().peers.some((p) => p.id === id);
          if (stillPeer && !this.links.has(id) && this.myId < id && useVoice.getState().status === 'on') this.openLink(id, true);
        }, 1500);
      }
    };

    if (initiator) {
      void (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          emitVoiceSignal(id, { type: 'offer', sdp: offer.sdp ?? '' });
        } catch (err) {
          console.warn('[voice] offer failed', err);
        }
      })();
    }
    return link;
  }

  private closeLink(id: string): void {
    const link = this.links.get(id);
    if (!link) return;
    this.links.delete(id);
    link.pc.onicecandidate = null;
    link.pc.ontrack = null;
    link.pc.onconnectionstatechange = null;
    link.pc.close();
    link.audio.srcObject = null;
  }

  // ── Speaking indicators ─────────────────────────────────────────────
  private analyse(stream: MediaStream): AnalyserNode | null {
    if (!this.ctx) return null;
    try {
      const src = this.ctx.createMediaStreamSource(stream);
      const a = this.ctx.createAnalyser();
      a.fftSize = 512;
      src.connect(a);
      return a;
    } catch {
      return null;
    }
  }

  private level(a: AnalyserNode | null): number {
    if (!a) return 0;
    const buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    return Math.sqrt(sum / buf.length);
  }

  private meter(): void {
    const speaking: string[] = [];
    const liveMic = this.local?.getAudioTracks().some((t) => t.enabled) ?? false;
    if (liveMic && this.level(this.localAnalyser) > SPEAKING_THRESHOLD) speaking.push(this.myId);
    for (const [id, l] of this.links) if (this.level(l.analyser) > SPEAKING_THRESHOLD) speaking.push(id);
    const prev = useVoice.getState().speaking;
    if (prev.length !== speaking.length || prev.some((id, i) => id !== speaking[i])) useVoice.getState().set({ speaking });
  }

  /** Debug/testing helper: connection state per peer. */
  linkStates(): Record<string, string> {
    return Object.fromEntries([...this.links].map(([id, l]) => [id, l.pc.connectionState]));
  }
}

export const voice = new VoiceClient();

// Push-to-talk on desktop: hold V.
if (typeof window !== 'undefined') {
  const isTyping = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    return t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA';
  };
  window.addEventListener('keydown', (e) => {
    if (e.key?.toLowerCase() === 'v' && !e.repeat && !isTyping(e) && useSettings.getState().pushToTalk) voice.setTalking(true);
  });
  window.addEventListener('keyup', (e) => {
    if (e.key?.toLowerCase() === 'v') voice.setTalking(false);
  });
  window.addEventListener('blur', () => voice.setTalking(false));
}
