import { S2C, type VoiceChannel, type VoicePeer, type VoiceRoster, type VoiceSignal } from '@nizhal/shared';
import type { Outbox } from '../game/outbox';

export interface VoiceMember {
  id: string;
  connected: boolean;
  /** null = this player may not talk right now. */
  channel: VoiceChannel | null;
}

/**
 * Server side of voice chat. Audio is peer-to-peer; this class is the gatekeeper:
 * it tells each opted-in player which peers they may connect to and relays
 * signalling only between players in the same channel. Honest clients drop any
 * connection the moment a peer disappears from their roster, so a phase change
 * (e.g. meeting → play) or a death silences the right people immediately.
 */
export class VoiceManager {
  private readonly joined = new Map<string, { muted: boolean }>();
  private readonly lastSent = new Map<string, string>();

  constructor(
    private readonly outbox: Outbox,
    private readonly roster: () => { enabled: boolean; members: VoiceMember[] },
  ) {}

  has(id: string): boolean {
    return this.joined.has(id);
  }

  join(id: string): void {
    if (!this.joined.has(id)) this.joined.set(id, { muted: false });
    this.lastSent.delete(id); // always send a fresh roster on (re)join
    this.sync();
  }

  leave(id: string): void {
    if (!this.joined.delete(id)) return;
    this.lastSent.delete(id);
    this.sync();
  }

  setMuted(id: string, muted: boolean): boolean {
    const j = this.joined.get(id);
    if (!j) return false;
    j.muted = muted;
    this.sync();
    return true;
  }

  /** Current peers a player may exchange audio with. */
  peersOf(id: string): VoicePeer[] {
    return this.compute().get(id)?.peers ?? [];
  }

  /** Relays one signalling message if both players share a channel right now. */
  relay(from: string, to: string, data: VoiceSignal): boolean {
    if (from === to || !this.peersOf(from).some((p) => p.id === to)) return false;
    this.outbox.toPlayer(to, S2C.VOICE_SIGNAL, { from, data });
    return true;
  }

  private compute(): Map<string, VoiceRoster> {
    const { enabled, members } = this.roster();
    const byId = new Map(members.map((m) => [m.id, m]));
    const result = new Map<string, VoiceRoster>();
    for (const id of this.joined.keys()) {
      const me = byId.get(id);
      const channel = enabled && me?.connected ? me.channel : null;
      const peers: VoicePeer[] = [];
      if (channel) {
        for (const [otherId, state] of this.joined) {
          const other = byId.get(otherId);
          if (otherId !== id && other?.connected && other.channel === channel) peers.push({ id: otherId, muted: state.muted });
        }
      }
      result.set(id, { enabled, channel, peers });
    }
    return result;
  }

  /** Pushes a roster to every opted-in player whose channel or peers changed. */
  sync(): void {
    for (const [id, roster] of this.compute()) {
      const key = JSON.stringify(roster);
      if (this.lastSent.get(id) === key) continue;
      this.lastSent.set(id, key);
      this.outbox.toPlayer(id, S2C.VOICE_ROSTER, roster);
    }
  }
}
