import { randomAppearance, type ServerToClientEvents } from '@nizhal/shared';
import type { Clock, TimerHandle } from '../src/utils/clock';
import type { Outbox } from '../src/game/outbox';

/** Deterministic clock: timers fire only when advance() is called. */
export class ManualClock implements Clock {
  private t = 1_000_000;
  private seq = 0;
  private timers = new Map<number, { at: number; fn: () => void; every: number | null }>();

  now(): number {
    return this.t;
  }
  setTimeout(fn: () => void, ms: number): TimerHandle {
    const id = ++this.seq;
    this.timers.set(id, { at: this.t + ms, fn, every: null });
    return { cancel: () => this.timers.delete(id) };
  }
  setInterval(fn: () => void, ms: number): TimerHandle {
    const id = ++this.seq;
    this.timers.set(id, { at: this.t + ms, fn, every: ms });
    return { cancel: () => this.timers.delete(id) };
  }
  advance(ms: number): void {
    const target = this.t + ms;
    for (;;) {
      let next: [number, { at: number; fn: () => void; every: number | null }] | null = null;
      for (const e of this.timers) if (e[1].at <= target && (!next || e[1].at < next[1].at)) next = e;
      if (!next) break;
      const [id, timer] = next;
      this.t = timer.at;
      if (timer.every) timer.at += timer.every;
      else this.timers.delete(id);
      timer.fn();
    }
    this.t = target;
  }
}

export interface Sent {
  to: string;
  event: keyof ServerToClientEvents;
  payload: unknown;
}

export class RecordingOutbox implements Outbox {
  sent: Sent[] = [];
  toPlayer<E extends keyof ServerToClientEvents>(playerId: string, event: E, ...args: Parameters<ServerToClientEvents[E]>): void {
    // Deep copy so later mutation can't hide what was actually sent.
    this.sent.push({ to: playerId, event, payload: args[0] === undefined ? undefined : JSON.parse(JSON.stringify(args[0])) });
  }
  for(id: string, event?: keyof ServerToClientEvents): Sent[] {
    return this.sent.filter((s) => s.to === id && (!event || s.event === event));
  }
  last<T>(id: string, event: keyof ServerToClientEvents): T {
    const all = this.for(id, event);
    if (!all.length) throw new Error(`no ${event} sent to ${id}`);
    return all[all.length - 1]!.payload as T;
  }
  clear(): void {
    this.sent = [];
  }
}

export function members(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player${i}`,
    appearance: randomAppearance(),
    slot: i,
    connected: true,
  }));
}
