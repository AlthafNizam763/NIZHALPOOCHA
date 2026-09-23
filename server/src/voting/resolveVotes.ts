import type { VoteResult } from '@nizhal/shared';

export type VoteMap = ReadonlyMap<string, string | 'skip'>;

/**
 * Pure vote resolution.
 *  - no votes            → no_votes (nobody ejected)
 *  - top count is shared → tie (nobody ejected)
 *  - top is 'skip'       → skipped
 *  - otherwise           → ejected
 */
export function resolveVotes(votes: VoteMap): Pick<VoteResult, 'ejectedId' | 'outcome' | 'tally'> {
  const tally: Record<string, number> = {};
  for (const target of votes.values()) tally[target] = (tally[target] ?? 0) + 1;

  const entries = Object.entries(tally);
  if (entries.length === 0) return { ejectedId: null, outcome: 'no_votes', tally };

  const max = Math.max(...entries.map(([, n]) => n));
  const top = entries.filter(([, n]) => n === max);
  if (top.length > 1) return { ejectedId: null, outcome: 'tie', tally };

  const [winner] = top[0] as [string, number];
  if (winner === 'skip') return { ejectedId: null, outcome: 'skipped', tally };
  return { ejectedId: winner, outcome: 'ejected', tally };
}
