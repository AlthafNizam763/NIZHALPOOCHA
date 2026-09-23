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
import { Field, Modal, Panel } from '@/components/ui/Controls';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { CustomizePanel } from '@/components/lobby/CustomizePanel';

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

  return (
    <Screen title={t('profile.title')} back="/home" wide>
      <div className="grid gap-4 md:grid-cols-[300px_1fr]">
        <Panel className="flex flex-col items-center gap-3 p-5 text-center">
          <CharacterAvatar appearance={profile.appearance} size={140} animate />
          <div className="font-display text-2xl">{profile.username}</div>
          <div className="text-sm text-rain">{user.isGuest ? t('profile.guest') : user.email}</div>
          <div className="w-full">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-lamp">{t('home.level', { n: lvl.level })}</span>
              <span className="text-rain">
                {lvl.into}/{lvl.needed} XP
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-night">
              <div className="h-full bg-lamp" style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} />
            </div>
          </div>
          <Button variant="secondary" full onClick={() => setEdit(true)}>
            {t('lobby.customize')}
          </Button>
        </Panel>

        <div className="space-y-4">
          <Panel className="grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-4">
            {stats.map(([k, v]) => (
              <div key={k} className="bg-panel p-3">
                <div className="font-display text-2xl">{v}</div>
                <div className="text-xs text-rain">{t(k)}</div>
              </div>
            ))}
          </Panel>

          {firebaseEnabled && user.isGuest && !user.isDev && (
            <Panel className="p-4">
              <div className="font-display text-lg">{t('auth.upgrade')}</div>
              <p className="mb-3 text-sm text-mist">{t('auth.upgradeHint')}</p>
              <form onSubmit={(e) => void upgrade(e)} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Field label={t('auth.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Field label={t('auth.password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <Button type="submit" loading={upBusy}>
                  {t('common.save')}
                </Button>
              </form>
              {upErr && <p className="mt-2 text-sm text-laterite">{t(upErr)}</p>}
            </Panel>
          )}

          <Panel className="p-4">
            <div className="mb-2 font-display text-lg">{t('profile.history')}</div>
            {history === null ? (
              <div className="text-sm text-rain">{t('common.loading')}</div>
            ) : history.length === 0 ? (
              <div className="text-sm text-rain">{user.isDev ? t('common.devMode') : t('profile.noHistory')}</div>
            ) : (
              <ul className="divide-y divide-line">
                {history.map((h) => (
                  <li key={h.matchId} className="flex items-center justify-between py-2 text-sm">
                    <span className={h.won ? 'text-leaf' : 'text-laterite'}>{t(h.won ? 'end.victory' : 'end.defeat')}</span>
                    <span className={h.role === 'CAT' ? 'text-lamp' : 'text-mist'}>{t(`role.${h.role}`)}</span>
                    <span className="text-rain">+{h.xp} XP</span>
                    <span className="text-rain">{h.endedAt.toLocaleDateString()}</span>
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
