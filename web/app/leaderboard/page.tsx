'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { useRequireAuth } from '@/hooks/useRoute';
import { firebaseEnabled } from '@/services/firebase';
import { leaderboard, type LeaderMetric, type LeaderRow } from '@/services/profile';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Panel, Segmented, Spinner } from '@/components/ui/Controls';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { IconTrophy } from '@/components/home/icons';

type Tab = 'world' | 'local' | 'friends';

/** Podium order on screen: 2nd, 1st, 3rd. */
const PODIUM = [
  { index: 1, block: 'h-16', ring: 'border-mist', medal: 'bg-mist text-ink' },
  { index: 0, block: 'h-24', ring: 'border-lamp', medal: 'bg-lamp text-ink' },
  { index: 2, block: 'h-12', ring: 'border-gold-deep', medal: 'bg-gold-deep text-paper' },
] as const;

function Podium({ rows, uid }: { rows: LeaderRow[]; uid?: string }) {
  return (
    <div className="mb-3 grid grid-cols-3 items-end gap-2 px-1 pt-2" aria-hidden>
      {PODIUM.map(({ index, block, ring, medal }) => {
        const r = rows[index];
        if (!r) return <div key={index} />;
        const mine = r.uid === uid;
        return (
          <div key={r.uid} className="flex min-w-0 flex-col items-center text-center">
            {index === 0 && <IconTrophy className="mb-1 h-7 w-7 text-lamp" />}
            <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-display text-lg font-extrabold ${ring} ${medal}`}>{index + 1}</span>
            <span className={`mt-1 w-full truncate font-display text-sm font-bold leading-tight ${mine ? 'text-lamp' : 'text-paper'}`}>{r.name}</span>
            <span className="font-display text-base font-extrabold tabular-nums text-lamp">{r.value}</span>
            <div className={`mt-1 w-full rounded-t-xl border-2 border-b-0 ${mine ? 'border-lamp bg-lamp/15' : 'border-line bg-panel-2'} ${block}`} />
          </div>
        );
      })}
    </div>
  );
}

export default function LeaderboardPage() {
  const ready = useRequireAuth();
  const t = useT();
  const router = useRouter();
  const uid = useAuth((s) => s.user?.uid);
  const appearance = useAuth((s) => s.profile?.appearance);
  const [tab, setTab] = useState<Tab>('world');
  const [metric, setMetric] = useState<LeaderMetric>('xp');
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (tab !== 'world' || !firebaseEnabled) return;
    setRows(null);
    setFailed(false);
    leaderboard(metric)
      .then(setRows)
      .catch(() => setFailed(true));
  }, [tab, metric]);

  if (!ready) return null;
  const art = appearance ? <CharacterAvatar appearance={appearance} size={72} mood="suspicious" blink /> : <IconTrophy className="h-12 w-12 text-lamp" />;
  return (
    <Screen title={t('lb.title')} back="/home">
      <div className="mb-2 flex flex-wrap gap-2">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'world', label: t('lb.world') },
            { value: 'local', label: t('lb.local') },
            { value: 'friends', label: t('lb.friends') },
          ]}
        />
      </div>
      <div className="scrollbar-thin mb-4 overflow-x-auto">
        <Segmented
          value={metric}
          onChange={setMetric}
          options={(['xp', 'games', 'wins', 'tasks', 'investigations'] as const).map((m) => ({ value: m, label: t(`lb.${m}`) }))}
        />
      </div>
      {!firebaseEnabled ? (
        <EmptyState title={t('lb.title')} hint={t('lb.needFirebase')} art={art} />
      ) : tab !== 'world' ? (
        <EmptyState
          title={t(tab === 'local' ? 'lb.local' : 'lb.friends')}
          hint={t('lb.unavailable')}
          art={art}
          action={
            <Button variant="secondary" onClick={() => setTab('world')}>
              {t('lb.world')}
            </Button>
          }
        />
      ) : failed ? (
        <Notice tone="danger">{t('err.SERVER_ERROR')}</Notice>
      ) : rows === null ? (
        <div className="flex justify-center py-10">
          <div className="surface flex items-center gap-3 rounded-full px-5 py-2.5 text-sm font-semibold text-mist" role="status">
            <Spinner className="h-6 w-8" />
            {t('common.loading')}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title={t('lb.empty')} art={art} action={<Button onClick={() => router.push('/home')}>{t('common.home')}</Button>} />
      ) : (
        <Panel className="p-2 pt-3">
          <Podium rows={rows} uid={uid} />
          <ol className="space-y-1">
            {rows.map((r, i) => {
              const mine = r.uid === uid;
              return (
                <li
                  key={r.uid}
                  className={`flex min-h-11 items-center gap-3 rounded-xl border-2 px-3 py-1.5 ${mine ? 'border-lamp bg-lamp/10' : 'border-transparent odd:bg-ink/40'}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold tabular-nums ${
                      i < 3 ? 'bg-lamp/15 text-lamp' : 'text-rain'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className={`min-w-0 flex-1 truncate font-semibold ${mine ? 'text-lamp' : 'text-paper'}`}>{r.name}</span>
                  <span className="font-display text-lg font-bold tabular-nums text-paper">{r.value}</span>
                </li>
              );
            })}
          </ol>
        </Panel>
      )}
    </Screen>
  );
}
