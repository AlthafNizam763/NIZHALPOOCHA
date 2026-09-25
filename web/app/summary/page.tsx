'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/state/gameStore';
import { useAuth } from '@/state/authStore';
import { useRoom } from '@/state/roomStore';
import { useT } from '@/hooks/useT';
import { useRequireAuth } from '@/hooks/useRoute';
import { rooms } from '@/services/net';
import { ensureProfile } from '@/services/profile';
import type { I18nKey } from '@/utils/i18n';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Controls';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';

const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

export default function SummaryPage() {
  const ready = useRequireAuth();
  const t = useT();
  const router = useRouter();
  const end = useGame((s) => s.end);
  const user = useAuth((s) => s.user);
  const setProfile = useAuth((s) => s.setProfile);
  const roomAlive = useRoom((s) => !!s.room);

  useEffect(() => {
    if (ready && !end) router.replace('/home');
  }, [ready, end, router]);

  // Stats are written by the server at match end; refresh the local profile.
  useEffect(() => {
    if (!user || user.isDev || !end) return;
    const id = setTimeout(() => void ensureProfile(user).then(setProfile).catch(() => {}), 1500);
    return () => clearTimeout(id);
  }, [user, end, setProfile]);

  if (!end || !user) return null;
  const me = end.players.find((p) => p.id === end.you.id);
  const s = me?.stats;
  const survival = me?.status === 'alive' ? 'summary.survived' : me?.status === 'ejected' ? 'summary.ejected' : me?.status === 'left' ? 'summary.left' : 'summary.eliminated';
  const isCat = end.you.role === 'CAT';

  const rows: [I18nKey, string | number][] = [
    ['summary.role', t(`role.${end.you.role}`)],
    ['summary.survival', t(survival)],
    ...(isCat
      ? ([
          ['summary.kills', s?.kills ?? 0],
          ['summary.sabotages', s?.sabotages ?? 0],
        ] as [I18nKey, number][])
      : ([
          ['summary.tasks', s?.tasksDone ?? 0],
          ['summary.repairs', s?.repairs ?? 0],
        ] as [I18nKey, number][])),
    ['summary.reports', s?.reports ?? 0],
    ['summary.votes', s?.votesCast ?? 0],
    ['summary.correctVotes', s?.correctVotes ?? 0],
    ['end.duration', fmt(end.durationMs)],
  ];

  const backToLobby = () => {
    useGame.getState().reset();
    router.replace(roomAlive ? '/lobby' : '/home');
  };
  const home = () => {
    void rooms.leave().then(() => router.replace('/home'));
  };

  return (
    <Screen title={t('end.summary')} wide>
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <Panel className="p-5">
          <div className="mb-4 flex items-center gap-4">
            {me && <CharacterAvatar appearance={me.appearance} size={80} />}
            <div>
              <div className={`font-display text-3xl ${end.you.won ? 'text-leaf' : 'text-laterite'}`}>{t(end.you.won ? 'end.victory' : 'end.defeat')}</div>
              <div className="text-sm text-rain">{t(`end.${end.winner}`)}</div>
            </div>
          </div>
          <dl className="divide-y divide-line">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 text-sm">
                <dt className="text-mist">{t(k)}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-lamp/50 bg-night p-3 text-center">
              <div className="font-display text-3xl text-lamp">+{end.you.xp}</div>
              <div className="text-xs text-rain">{t('summary.xp')}</div>
            </div>
            <div className="rounded-xl border border-line bg-night p-3 text-center">
              <div className="font-display text-3xl">+{end.you.coins}</div>
              <div className="text-xs text-rain">{t('summary.coins')}</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-rain">{user.isDev ? t('summary.notSaved') : t('summary.saved')}</p>
          <p className="mt-1 text-xs text-rain">
            {t('summary.achievements')}: {t('summary.noAchievements')}
          </p>
        </Panel>

        <Panel className="p-4">
          <div className="mb-2 text-sm uppercase tracking-wide text-rain">{t('summary.players')}</div>
          <ul className="space-y-1.5">
            {end.players.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl bg-night p-1.5">
                <CharacterAvatar appearance={p.appearance} size={36} dim={p.status !== 'alive'} />
                <span className="flex-1 truncate text-sm">{p.name}</span>
                <span className={`text-xs font-semibold ${p.role === 'CAT' ? 'text-lamp' : 'text-leaf'}`}>
                  {t(`role.${p.role}`)}
                  {p.infected && <span className="ml-1 font-normal text-rain">({t('end.infected')})</span>}
                </span>
                <span className="w-24 text-right text-xs text-rain">
                  {p.role === 'CAT'
                    ? p.stats.infections > 0
                      ? `${p.stats.infections} ${t('summary.infections').toLowerCase()}`
                      : `${p.stats.kills} ${t('summary.kills').toLowerCase()}`
                    : `${p.stats.tasksDone} ${t('hud.tasks').toLowerCase()}`}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={home}>
          {t('common.home')}
        </Button>
        {roomAlive && (
          <Button variant="lamp" onClick={backToLobby}>
            {t('end.backToLobby')}
          </Button>
        )}
      </div>
    </Screen>
  );
}
