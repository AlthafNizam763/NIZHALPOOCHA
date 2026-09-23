'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { useRequireAuth } from '@/hooks/useRoute';
import { firebaseEnabled } from '@/services/firebase';
import { leaderboard, type LeaderMetric, type LeaderRow } from '@/services/profile';
import { Screen } from '@/components/ui/Screen';
import { Panel, Segmented } from '@/components/ui/Controls';

type Tab = 'world' | 'local' | 'friends';

export default function LeaderboardPage() {
  const ready = useRequireAuth();
  const t = useT();
  const uid = useAuth((s) => s.user?.uid);
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
  return (
    <Screen title={t('lb.title')} back="/home">
      <div className="mb-3 flex flex-wrap gap-2">
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
      <div className="mb-3 overflow-x-auto">
        <Segmented
          value={metric}
          onChange={setMetric}
          options={(['xp', 'games', 'wins', 'tasks', 'investigations'] as const).map((m) => ({ value: m, label: t(`lb.${m}`) }))}
        />
      </div>
      <Panel className="p-2">
        {!firebaseEnabled ? (
          <p className="p-3 text-sm text-rain">{t('lb.needFirebase')}</p>
        ) : tab !== 'world' ? (
          <p className="p-3 text-sm text-rain">{t('lb.unavailable')}</p>
        ) : failed ? (
          <p className="p-3 text-sm text-laterite">{t('err.SERVER_ERROR')}</p>
        ) : rows === null ? (
          <p className="p-3 text-sm text-rain">{t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="p-3 text-sm text-rain">{t('lb.empty')}</p>
        ) : (
          <ol>
            {rows.map((r, i) => (
              <li key={r.uid} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${r.uid === uid ? 'bg-panel-2' : ''}`}>
                <span className={`w-7 font-display text-lg ${i < 3 ? 'text-lamp' : 'text-rain'}`}>{i + 1}</span>
                <span className="flex-1 truncate">{r.name}</span>
                <span className="font-semibold tabular-nums">{r.value}</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </Screen>
  );
}
