import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../auth/firebaseAdmin';
import { createLogger } from '../utils/logger';
import type { MatchSummary } from '../game/Match';

const log = createLogger('db');

/**
 * Persists a finished match and increments each player's lifetime statistics.
 * Live match state never touches Firestore — only this end-of-match write.
 *
 * Collections:
 *   matches/{matchId}                 match record (roles revealed post-game)
 *   matchPlayers/{matchId}_{uid}      per-player result (queried for history)
 *   users/{uid}.stats                 lifetime counters (server-only fields)
 *   leaderboard/{uid}                 public leaderboard projection (no roles)
 */
export async function saveMatch(summary: MatchSummary, isDevUid: (uid: string) => boolean): Promise<void> {
  const db = adminDb();
  if (!db) {
    log.debug(`match ${summary.matchId} not persisted (Firebase Admin not configured)`);
    return;
  }
  const players = summary.players.filter((p) => !isDevUid(p.id));
  if (players.length === 0) return;

  const batch = db.batch();
  const durationMs = summary.endedAt - summary.startedAt;
  batch.set(db.collection('matches').doc(summary.matchId), {
    roomCode: summary.roomCode,
    mapId: summary.mapId,
    mode: summary.mode,
    winner: summary.winner,
    reason: summary.reason,
    startedAt: new Date(summary.startedAt),
    endedAt: new Date(summary.endedAt),
    durationMs,
    playerIds: summary.players.map((p) => p.id),
    players: summary.players.map((p) => ({
      uid: p.id,
      name: p.name,
      role: p.role,
      status: p.status,
      won: p.won,
      stats: p.stats,
      xp: p.xp,
    })),
  });

  for (const p of players) {
    const isCat = p.role === 'CAT';
    batch.set(db.collection('matchPlayers').doc(`${summary.matchId}_${p.id}`), {
      matchId: summary.matchId,
      uid: p.id,
      role: p.role,
      won: p.won,
      status: p.status,
      stats: p.stats,
      xp: p.xp,
      coins: p.coins,
      winner: summary.winner,
      endedAt: new Date(summary.endedAt),
      durationMs,
    });

    const inc = FieldValue.increment;
    batch.set(
      db.collection('users').doc(p.id),
      {
        stats: {
          gamesPlayed: inc(1),
          wins: inc(p.won ? 1 : 0),
          losses: inc(p.won ? 0 : 1),
          tasksCompleted: inc(p.stats.tasksDone),
          catsIdentified: inc(p.stats.correctVotes),
          catGames: inc(isCat ? 1 : 0),
          catWins: inc(isCat && p.won ? 1 : 0),
          kills: inc(p.stats.kills),
          sabotages: inc(p.stats.sabotages),
          reports: inc(p.stats.reports),
          investigations: inc(0),
        },
        xp: inc(p.xp),
        coins: inc(p.coins),
        lastMatchAt: new Date(summary.endedAt),
      },
      { merge: true },
    );

    batch.set(
      db.collection('leaderboard').doc(p.id),
      {
        uid: p.id,
        name: p.name,
        xp: inc(p.xp),
        games: inc(1),
        wins: inc(p.won ? 1 : 0),
        tasks: inc(p.stats.tasksDone),
        investigations: inc(0),
        updatedAt: new Date(summary.endedAt),
      },
      { merge: true },
    );
  }

  try {
    await batch.commit();
    log.info(`match ${summary.matchId} persisted (${players.length} players)`);
  } catch (err) {
    log.error(`failed to persist match ${summary.matchId}`, err);
  }
}
