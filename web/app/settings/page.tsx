'use client';
import type { ReactNode } from 'react';
import { useSettings } from '@/state/settingsStore';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Panel, Segmented, Toggle } from '@/components/ui/Controls';
import { NARRATION_LANGS, NoVoiceHint } from '@/components/intro/NarrationControls';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel className="p-4">
      <h2 className="font-display mb-2 text-lg">{title}</h2>
      <div className="space-y-1">{children}</div>
    </Panel>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(+e.target.value)} className="w-40 accent-[#3f7d5c]" />
    </label>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const t = useT();
  const s = useSettings();
  return (
    <Screen title={t('set.title')} back="/home" wide>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title={t('set.language')}>
          <Segmented
            value={s.language}
            onChange={(language) => s.set({ language })}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ml', label: 'മലയാളം' },
            ]}
          />
        </Section>
        <Section title={t('set.audio')}>
          <Slider label={t('set.master')} value={s.masterVolume} onChange={(masterVolume) => s.set({ masterVolume })} />
          <Slider label={t('set.music')} value={s.musicVolume} onChange={(musicVolume) => s.set({ musicVolume })} />
          <Slider label={t('set.sfx')} value={s.sfxVolume} onChange={(sfxVolume) => s.set({ sfxVolume })} />
          <Slider label={t('set.voiceVolume')} value={s.voiceVolume} onChange={(voiceVolume) => s.set({ voiceVolume })} />
          <Toggle label={t('set.narration')} checked={s.narration} onChange={(narration) => s.set({ narration })} />
          <Row label={t('narration.language')}>
            <Segmented value={s.narrationLanguage} onChange={(narrationLanguage) => s.set({ narrationLanguage })} options={NARRATION_LANGS} />
          </Row>
          <NoVoiceHint />
          <Toggle label={t('set.pushToTalk')} checked={s.pushToTalk} onChange={(pushToTalk) => s.set({ pushToTalk })} />
          <p className="text-xs text-rain">{t('set.voiceHint')}</p>
        </Section>
        <Section title={t('set.graphics')}>
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
        <Section title={t('set.controls')}>
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
          <p className="text-xs text-rain">{t('set.keys')}</p>
        </Section>
        <Section title={t('set.accessibility')}>
          <Toggle label={t('set.reduceFlashes')} checked={s.reduceFlashes} onChange={(reduceFlashes) => s.set({ reduceFlashes })} />
          <Toggle label={t('set.largeText')} checked={s.largeText} onChange={(largeText) => s.set({ largeText })} />
        </Section>
        <Section title={t('set.notifications')}>
          <Toggle label={t('set.notifyInvites')} checked={s.notifyInvites} onChange={(notifyInvites) => s.set({ notifyInvites })} />
        </Section>
        <Section title={t('set.privacy')}>
          <Toggle label={t('set.showOnline')} checked={s.showOnline} onChange={(showOnline) => s.set({ showOnline })} />
        </Section>
      </div>
    </Screen>
  );
}
