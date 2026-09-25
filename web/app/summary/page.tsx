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
import { Badge, Panel, SectionTitle } from '@/components/ui/Controls';
import { Notice } from '@/components/ui/Feedback';
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

  const won = end.you.won;

  return (
    <Screen title={t('end.summary')} wide>
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <Panel kasavu className="p-5 pt-7">
          <div className="mb-4 flex items-center gap-4">
            {me && (
              <div className={`relative shrink-0 overflow-hidden rounded-2xl border-2 bg-ink/70 px-2 pt-2 ${won ? 'border-leaf/60' : 'border-laterite/60'}`}>
                <span
                  aria-hidden
                  className={`absolute inset-0 ${won ? 'bg-[radial-gradient(ellipse_at_50%_100%,rgba(130,212,156,.28),transparent_70%)]' : 'bg-[radial-gradient(ellipse_at_50%_100%,rgba(204,90,60,.28),transparent_70%)]'}`}
                />
                <CharacterAvatar appearance={me.appearance} size={88} mood={won ? 'happy' : 'scared'} blink className="relative" />
              </div>
            )}
            <div className="min-w-0">
              <div className={`headline text-4xl leading-tight ${won ? 'text-leaf' : 'text-laterite'}`}>{t(won ? 'end.victory' : 'end.defeat')}</div>
              <div className="mt-0.5 font-display font-bold leading-tight text-mist">{t(`end.${end.winner}`)}</div>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-lamp/60 bg-lamp/10 p-3 text-center">
              <div className="font-display text-3xl font-extrabold leading-none text-lamp">+{end.you.xp}</div>
              <div className="mt-1 text-xs font-semibold leading-tight text-rain">{t('summary.xp')}</div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-line bg-ink/50 p-3 text-center">
              <div className="font-display text-3xl font-extrabold leading-none text-paper">+{end.you.coins}</div>
              <div className="mt-1 text-xs font-semibold leading-tight text-rain">{t('summary.coins')}</div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {rows.map(([k, v]) => (
              <div key={k} className="flex min-h-16 flex-col justify-between gap-1 rounded-xl border-[1.5px] border-line bg-ink/40 p-2.5">
                <dt className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-rain">{t(k)}</dt>
                <dd className="font-display text-lg font-bold leading-tight text-paper">{v}</dd>
              </div>
            ))}
          </dl>

          <Notice tone={user.isDev ? 'warn' : 'good'} className="mt-3 text-xs">
            {user.isDev ? t('summary.notSaved') : t('summary.saved')}
          </Notice>
          <p className="mt-2 text-xs leading-snug text-rain">
            {t('summary.achievements')}: {t('summary.noAchievements')}
          </p>
        </Panel>

        <Panel className="p-4">
          <SectionTitle>{t('summary.players')}</SectionTitle>
          <ul className="space-y-1.5">
            {end.players.map((p) => (
              <li
                key={p.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border-2 p-1.5 pr-3 ${p.id === end.you.id ? 'border-lamp/70 bg-lamp/10' : 'border-transparent bg-ink/50'}`}
              >
                <span className="shrink-0 rounded-lg bg-night">
                  <CharacterAvatar appearance={p.appearance} size={40} dim={p.status !== 'alive'} />
                </span>
                <span className="min-w-0 flex-1 truncate font-display font-bold text-paper">{p.name}</span>
                <span className="flex flex-wrap items-center gap-1">
                  <Badge tone={p.role === 'CAT' ? 'gold' : 'good'}>{t(`role.${p.role}`)}</Badge>
                  {p.infected && <Badge tone="danger">{t('end.infected')}</Badge>}
                </span>
                <span className="w-24 text-right text-xs tabular-nums text-rain">
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
      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
        <Button variant="secondary" size="lg" onClick={home}>
          {t('common.home')}
        </Button>
        {roomAlive && (
          <Button variant="gold" size="lg" className="order-first sm:order-none" onClick={backToLobby}>
            {t('end.backToLobby')}
          </Button>
        )}
      </div>
    </Screen>
  );
}
