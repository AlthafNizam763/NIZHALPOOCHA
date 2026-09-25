'use client';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/state/settingsStore';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Badge, Panel, SectionTitle, Segmented, Toggle } from '@/components/ui/Controls';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { NARRATION_LANGS, NoVoiceHint, setNarrationLanguage } from '@/components/intro/NarrationControls';
import { IconGear, IconLanguage, IconSound } from '@/components/home/icons';

function Section({ title, icon, children, className = '' }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Panel className={`p-4 ${className}`}>
      <SectionTitle>
        <span className="flex items-center gap-2">
          {icon && (
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/70 text-lamp">
              {icon}
            </span>
          )}
          {title}
        </span>
      </SectionTitle>
      <div className="divide-y divide-line/70">{children}</div>
    </Panel>
  );
}

/** Volume slider: moss track fill, gold thumb, value readout. */
function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const pct = Math.round(value * 100);
  return (
    <label className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5">
      <span className="text-sm font-semibold leading-tight text-paper">{label}</span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:flex-none">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          style={{ background: `linear-gradient(to right, var(--color-moss) ${pct}%, var(--color-ink) ${pct}%)` }}
          className="h-2.5 w-full min-w-28 cursor-pointer appearance-none rounded-full border border-line sm:w-40 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-gold-deep [&::-moz-range-thumb]:bg-lamp [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gold-deep [&::-webkit-slider-thumb]:bg-lamp [&::-webkit-slider-thumb]:shadow-[0_2px_0_var(--color-gold-deep)] [&::-webkit-slider-thumb]:transition-transform active:[&::-webkit-slider-thumb]:scale-110"
        />
        <span className="w-10 shrink-0 text-right font-display text-sm font-bold tabular-nums text-lamp">{pct}%</span>
      </span>
    </label>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 py-1.5">
      <span className="text-sm font-semibold leading-tight text-paper">{label}</span>
      {children}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="py-2 text-xs leading-snug text-rain">{children}</p>;
}

const IconMic = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </svg>
);

const IconEye = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconGamepad = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 7.5h10a4.5 4.5 0 0 1 4.3 5.8l-1 3.3a2.5 2.5 0 0 1-4.3.8L14.5 16h-5L8 17.4a2.5 2.5 0 0 1-4.3-.8l-1-3.3A4.5 4.5 0 0 1 7 7.5z" />
    <path d="M8 10.5v3M6.5 12h3" />
    <circle cx="16" cy="11" r=".6" fill="currentColor" />
    <circle cx="17.5" cy="13" r=".6" fill="currentColor" />
  </svg>
);

const IconBell = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </svg>
);

const IconShield = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z" />
  </svg>
);

const IconUser = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8.5" r="4" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </svg>
);

export default function SettingsPage() {
  const t = useT();
  const router = useRouter();
  const s = useSettings();
  const user = useAuth((st) => st.user);
  const profile = useAuth((st) => st.profile);
  return (
    <Screen title={t('set.title')} back="/home" wide>
      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Section title={t('set.language')} icon={<IconLanguage className="h-5 w-5" />}>
            <div className="py-1.5">
              <Segmented
                value={s.language}
                onChange={(language) => s.set({ language })}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ml', label: 'മലയാളം' },
                ]}
              />
            </div>
          </Section>
          <Section title={t('set.audio')} icon={<IconSound className="h-5 w-5" />}>
            <Slider label={t('set.master')} value={s.masterVolume} onChange={(masterVolume) => s.set({ masterVolume })} />
            <Slider label={t('set.music')} value={s.musicVolume} onChange={(musicVolume) => s.set({ musicVolume })} />
            <Slider label={t('set.sfx')} value={s.sfxVolume} onChange={(sfxVolume) => s.set({ sfxVolume })} />
            <Toggle label={t('set.narration')} checked={s.narration} onChange={(narration) => s.set({ narration })} />
            <Row label={t('narration.language')}>
              <Segmented value={s.narrationLanguage} onChange={setNarrationLanguage} options={NARRATION_LANGS} />
            </Row>
            <Slider label={t('set.narrationVolume')} value={s.narrationVolume} onChange={(narrationVolume) => s.set({ narrationVolume })} />
            <NoVoiceHint className="py-2" />
          </Section>
          <Section title={t('set.voice')} icon={<IconMic />}>
            <Slider label={t('set.voiceVolume')} value={s.voiceVolume} onChange={(voiceVolume) => s.set({ voiceVolume })} />
            <Toggle label={t('set.pushToTalk')} checked={s.pushToTalk} onChange={(pushToTalk) => s.set({ pushToTalk })} />
            <Hint>{t('set.voiceHint')}</Hint>
          </Section>
        </div>
        <div className="space-y-4">
          <Section title={t('set.controls')} icon={<IconGamepad />}>
            <Row label={t('set.joystickSide')}>
              <Segmented
                value={s.joystickSide}
                onChange={(joystickSide) => s.set({ joystickSide })}
                options={[
                  { value: 'left', label: t('set.left') },
                  { value: 'right', label: t('set.right') },
                ]}
              />
            </Row>
            <Hint>{t('set.keys')}</Hint>
          </Section>
          <Section title={t('set.graphics')} icon={<IconGear className="h-5 w-5" />}>
            <Row label={t('set.quality')}>
              <Segmented
                value={s.quality}
                onChange={(quality) => s.set({ quality })}
                options={[
                  { value: 'low', label: t('set.quality.low') },
                  { value: 'high', label: t('set.quality.high') },
                ]}
              />
            </Row>
            <Toggle label={t('set.rain')} checked={s.rain} onChange={(rain) => s.set({ rain })} />
          </Section>
          <Section title={t('set.accessibility')} icon={<IconEye />}>
            <Toggle label={t('set.reduceFlashes')} checked={s.reduceFlashes} onChange={(reduceFlashes) => s.set({ reduceFlashes })} />
            <Toggle label={t('set.largeText')} checked={s.largeText} onChange={(largeText) => s.set({ largeText })} />
          </Section>
          <Section title={t('set.notifications')} icon={<IconBell />}>
            <Toggle label={t('set.notifyInvites')} checked={s.notifyInvites} onChange={(notifyInvites) => s.set({ notifyInvites })} />
          </Section>
          <Section title={t('set.privacy')} icon={<IconShield />}>
            <Toggle label={t('set.showOnline')} checked={s.showOnline} onChange={(showOnline) => s.set({ showOnline })} />
          </Section>
          {user && profile && (
            <Section title={t('set.account')} icon={<IconUser />}>
              <div className="flex flex-wrap items-center gap-3 py-2">
                <span className="overflow-hidden rounded-full border-2 border-lamp/70 bg-ink">
                  <CharacterAvatar appearance={profile.appearance} size={48} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display font-bold leading-tight text-paper">{profile.username}</div>
                  {user.isGuest ? <Badge>{t('profile.guest')}</Badge> : <div className="truncate text-xs text-rain">{user.email}</div>}
                </div>
                <Button variant="secondary" size="sm" onClick={() => router.push('/profile')}>
                  {t('home.profile')}
                </Button>
              </div>
            </Section>
          )}
        </div>
      </div>
    </Screen>
  );
}
