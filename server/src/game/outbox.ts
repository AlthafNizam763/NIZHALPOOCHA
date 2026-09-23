import type { ServerToClientEvents } from '@nizhal/shared';

/**
 * Transport abstraction the match engine uses to talk to players. The socket
 * layer implements it with per-user Socket.IO rooms; tests implement it in memory.
 * Everything is addressed to a single player so private data can never be
 * accidentally broadcast.
 */
export interface Outbox {
  toPlayer<E extends keyof ServerToClientEvents>(
    playerId: string,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void;
}
