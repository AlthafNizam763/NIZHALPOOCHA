'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { levelFromXp, type Appearance } from '@nizhal/shared';
import { useAuth } from '@/state/authStore';
import { useUi } from '@/state/uiStore';
import { useT } from '@/hooks/useT';
import { useRequireAuth } from '@/hooks/useRoute';
import { firebaseEnabled } from '@/services/firebase';
import { authErrorKey, upgradeGuest } from '@/services/auth';
import { recentMatches, saveProfile, type MatchHistoryEntry } from '@/services/profile';
import type { I18nKey } from '@/utils/i18n';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Badge, Field, Modal, Panel, SectionTitle, Spinner } from '@/components/ui/Controls';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { CustomizePanel } from '@/components/lobby/CustomizePanel';

/** Lamp-gold ring showing progress through the current level. */
function LevelRing({ level, progress }: { level: number; progress: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="var(--color-ink)" stroke="var(--color-line)" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="var(--color-lamp)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${c * Math.max(0, Math.min(1, progress))} ${c}`}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="38" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="20" fill="var(--color-paper)">
        {level}
      </text>
    </svg>
  );
}

export default function ProfilePage() {
  const ready = useRequireAuth();
  const t = useT();
  const toast = useUi((s) => s.toast);
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const setProfile = useAuth((s) => s.setProfile);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<MatchHistoryEntry[] | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [upErr, setUpErr] = useState<I18nKey | null>(null);
  const [upBusy, setUpBusy] = useState(false);

  useEffect(() => {
    if (!user || user.isDev) return setHistory([]);
    recentMatches(user.uid)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [user]);

  if (!ready || !user || !profile) return null;
  const lvl = levelFromXp(profile.xp);
  const s = profile.stats;
  const stats: [I18nKey, number][] = [
    ['profile.games', s.gamesPlayed],
    ['profile.wins', s.wins],
    ['profile.losses', s.losses],
    ['profile.tasks', s.tasksCompleted],
    ['profile.catsIdentified', s.catsIdentified],
    ['profile.catWins', s.catWins],
    ['profile.investigations', s.investigations],
    ['profile.xp', profile.xp],
  ];

  async function save(name: string, appearance: Appearance) {
    setSaving(true);
    try {
      await saveProfile(user!, { username: name, appearance });
      setProfile({ ...profile!, username: name, appearance });
      setEdit(false);
      toast('common.saved', undefined, 'good');
    } catch {
      toast('err.SERVER_ERROR', undefined, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function upgrade(e: FormEvent) {
    e.preventDefault();
    setUpBusy(true);
    setUpErr(null);
    try {
      await upgradeGuest(email, password);
      toast('auth.upgradeDone', undefined, 'good');
    } catch (err) {
      setUpErr(authErrorKey(err));
    } finally {
      setUpBusy(false);
    }
  }

  const progress = lvl.into / lvl.needed;

  return (
    <Screen title={t('profile.title')} back="/home" wide>
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Panel kasavu className="flex flex-col items-center gap-3 p-5 pt-7 text-center">
          <div className="relative flex h-48 w-full items-end justify-center overflow-hidden rounded-2xl border-[1.5px] border-line bg-ink/60">
            <span aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(241,180,62,.26),transparent_65%)]" />
            <span aria-hidden className="absolute inset-x-0 bottom-3 mx-auto h-5 w-32 rounded-[50%] bg-ink/80" />
            <div className="animate-idle relative pb-3">
              <CharacterAvatar appearance={profile.appearance} size={150} mood="happy" blink />
            </div>
          </div>
          <div className="w-full min-w-0">
            <div className="headline break-words text-3xl leading-tight text-paper">{profile.username}</div>
            <div className="mt-1 flex justify-center">
              {user.isGuest ? <Badge>{t('profile.guest')}</Badge> : <span className="break-all text-sm text-rain">{user.email}</span>}
            </div>
          </div>
          <div className="flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-line bg-ink/50 p-3 text-left">
            <LevelRing level={lvl.level} progress={progress} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-lg font-bold leading-tight text-lamp">{t('home.level', { n: lvl.level })}</div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full border border-line bg-ink">
                <div className="h-full rounded-full bg-lamp" style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="mt-1 text-xs tabular-nums text-rain">
                {lvl.into}/{lvl.needed} XP
              </div>
            </div>
          </div>
          <Button variant="gold" full onClick={() => setEdit(true)}>
            {t('lobby.customize')}
          </Button>
        </Panel>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map(([k, v]) => (
              <div key={k} className="surface flex min-h-20 flex-col justify-between gap-1 rounded-2xl p-3">
                <div className="text-xs font-semibold leading-tight text-rain">{t(k)}</div>
                <div className={`font-display text-3xl font-extrabold leading-none tabular-nums ${k === 'profile.xp' ? 'text-lamp' : 'text-paper'}`}>{v}</div>
              </div>
            ))}
          </div>

          {firebaseEnabled && user.isGuest && !user.isDev && (
            <Panel className="p-4">
              <SectionTitle>{t('auth.upgrade')}</SectionTitle>
              <p className="mb-3 text-sm leading-snug text-mist">{t('auth.upgradeHint')}</p>
              <form onSubmit={(e) => void upgrade(e)} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Field label={t('auth.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Field label={t('auth.password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <Button type="submit" loading={upBusy}>
                  {t('common.save')}
                </Button>
              </form>
              {upErr && (
                <Notice tone="danger" className="mt-3">
                  {t(upErr)}
                </Notice>
              )}
            </Panel>
          )}

          <Panel className="p-4">
            <SectionTitle>{t('profile.history')}</SectionTitle>
            {history === null ? (
              <div className="flex items-center gap-3 py-4 text-sm text-mist" role="status">
                <Spinner className="h-6 w-8" />
                {t('common.loading')}
              </div>
            ) : history.length === 0 ? (
              <EmptyState
                title={user.isDev ? t('common.devMode') : t('profile.noHistory')}
                art={<CharacterAvatar appearance={profile.appearance} size={72} mood="suspicious" blink />}
              />
            ) : (
              <ul className="space-y-1.5">
                {history.map((h) => (
                  <li key={h.matchId} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-ink/50 px-3 py-2 text-sm">
                    <Badge tone={h.won ? 'good' : 'danger'}>{t(h.won ? 'end.victory' : 'end.defeat')}</Badge>
                    <span className={`font-display font-bold ${h.role === 'CAT' ? 'text-lamp' : 'text-mist'}`}>{t(`role.${h.role}`)}</span>
                    <span className="ml-auto font-display font-bold tabular-nums text-lamp">+{h.xp} XP</span>
                    <span className="text-xs text-rain">{h.endedAt.toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Modal open={edit} onClose={() => setEdit(false)} title={t('custom.title')} wide>
        <CustomizePanel initialName={profile.username} initial={profile.appearance} onSave={(n, a) => void save(n, a)} saving={saving} />
      </Modal>
    </Screen>
  );
}
