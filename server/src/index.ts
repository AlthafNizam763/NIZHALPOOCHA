import { createServer } from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@nizhal/shared';
import { config } from './utils/config';
import { createLogger } from './utils/logger';
import { realClock } from './utils/clock';
import { authenticateSocket, type SocketData } from './auth/socketAuth';
import { getAdminApp } from './auth/firebaseAdmin';
import { RoomManager } from './rooms/RoomManager';
import { registerHandlers, userRoom } from './sockets/registerHandlers';
import { saveMatch } from './database/matchRepository';
import type { Outbox } from './game/outbox';

const log = createLogger('server');

const app = express();
app.disable('x-powered-by');
const http = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(http, {
  cors: { origin: config.corsOrigins, credentials: true },
  // Small payloads; reject anything suspiciously large.
  maxHttpBufferSize: 16 * 1024,
  pingInterval: 10_000,
  pingTimeout: 8_000,
  connectionStateRecovery: undefined,
});

const outbox: Outbox = {
  toPlayer(playerId, event, ...args) {
    // Typed at the call site; Socket.IO's emit overloads can't express the generic spread.
    (io.to(userRoom(playerId)).emit as (ev: string, ...a: unknown[]) => boolean)(event, ...args);
  },
};

const rooms = new RoomManager({
  outbox,
  clock: realClock,
  onMatchEnd: (summary) => void saveMatch(summary, (uid) => uid.startsWith('dev_')),
});

getAdminApp();
if (config.allowDevAuth) log.warn('ALLOW_DEV_AUTH is on — unsigned dev identities are accepted. Do not use in production.');

io.use((socket, next) => void authenticateSocket(socket, next));
registerHandlers(io, rooms);

app.get('/health', (_req, res) => {
  res.json({ ok: true, maintenance: config.maintenance, ...rooms.stats(), uptime: process.uptime() });
});

app.get('/', (_req, res) => {
  res.type('text/plain').send('Nizhalpoocha game server');
});

http.listen(config.port, () => {
  log.info(`listening on :${config.port} (CORS: ${config.corsOrigins.join(', ')})`);
});

function shutdown(signal: string) {
  log.info(`${signal} received, shutting down`);
  rooms.shutdown();
  io.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
