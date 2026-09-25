'use client';
import { useState, type ReactNode } from 'react';
import {
  ACCESSORIES,
  CLOTH_COLORS,
  FOOTWEAR,
  HAIR_COLORS,
  HAIR_STYLE_COUNT,
  SKIN_TONES,
  TOP_STYLES,
  randomAppearance,
  type Appearance,
} from '@nizhal/shared';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/utils/i18n';
import { Button } from '@/components/ui/Button';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { Field, Segmented } from '@/components/ui/Controls';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 font-display text-xs font-bold uppercase leading-tight tracking-wider text-rain">{children}</div>;
}

function Swatches({ colors, value, onChange, label }: { colors: readonly number[]; value: number; onChange: (i: number) => void; label: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {colors.map((c, i) => {
          const selected = i === value;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${label} ${i + 1}`}
              onClick={() => onChange(i)}
              className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-transform hover:-translate-y-px ${
                selected ? 'scale-110 border-lamp ring-2 ring-lamp/40 ring-offset-2 ring-offset-panel' : 'border-line-strong hover:border-lamp/60'
              }`}
              style={{ background: hex(c) }}
            >
              {selected && (
                <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-lamp text-[11px] font-black text-ink shadow-[0_1px_0_var(--color-gold-deep)]">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CustomizePanel({
  initialName,
  initial,
  onSave,
  saving,
  saveLabel = 'common.save',
}: {
  initialName: string;
  initial: Appearance;
  onSave: (name: string, a: Appearance) => void;
  saving?: boolean;
  saveLabel?: I18nKey;
}) {
  const t = useT();
  const [a, setA] = useState<Appearance>(initial);
  const [name, setName] = useState(initialName);
  const set = (patch: Partial<Appearance>) => setA({ ...a, ...patch });

  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-3 sm:sticky sm:top-0 sm:self-start">
        <div className="relative flex h-56 w-48 items-end justify-center overflow-hidden rounded-[var(--radius-card)] border-2 border-lamp/50 bg-ink">
          <span aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(241,180,62,.3),transparent_65%)]" />
          <span aria-hidden className="absolute inset-x-0 bottom-4 mx-auto h-5 w-28 rounded-[50%] bg-night" />
          <div className="animate-idle relative pb-5">
            <CharacterAvatar appearance={a} size={170} mood="happy" blink />
          </div>
        </div>
        <div className="max-w-48 truncate text-center font-display text-lg font-bold leading-tight text-paper">{name.trim() || '—'}</div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setA(randomAppearance())}
          icon={
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="4" y="4" width="16" height="16" rx="4" />
              <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none" />
            </svg>
          }
        >
          {t('custom.random')}
        </Button>
      </div>
      <div className="space-y-4">
        <Field label={t('custom.name')} value={name} onChange={(e) => setName(e.target.value)} maxLength={16} />
        <div>
          <Label>{t('custom.body')}</Label>
          <Segmented
            value={a.body}
            onChange={(body) => set({ body })}
            options={[
              { value: 'boy', label: t('custom.boy') },
              { value: 'girl', label: t('custom.girl') },
            ]}
          />
        </div>
        <Swatches label={t('custom.skin')} colors={SKIN_TONES} value={a.skin} onChange={(skin) => set({ skin })} />
        <div>
          <Label>{t('custom.hair')}</Label>
          <div role="radiogroup" aria-label={t('custom.hair')} className="flex flex-wrap gap-2">
            {Array.from({ length: HAIR_STYLE_COUNT }, (_, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={a.hair === i}
                onClick={() => set({ hair: i })}
                className={`relative rounded-xl border-2 p-1 transition-colors ${a.hair === i ? 'border-lamp bg-lamp/10' : 'border-line bg-ink/60 hover:border-lamp/60'}`}
                aria-label={`${t('custom.hair')} ${i + 1}`}
              >
                <CharacterAvatar appearance={{ ...a, hair: i, accessory: 'none' }} size={48} />
                {a.hair === i && (
                  <span aria-hidden className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-lamp text-[11px] font-black text-ink">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <Swatches label={t('custom.hairColor')} colors={HAIR_COLORS} value={a.hairColor} onChange={(hairColor) => set({ hairColor })} />
        <div>
          <Label>{t('custom.topStyle')}</Label>
          <Segmented value={a.topStyle} onChange={(topStyle) => set({ topStyle })} options={TOP_STYLES.map((s) => ({ value: s, label: t(`custom.${s}` as I18nKey) }))} />
        </div>
        <Swatches label={t('custom.top')} colors={CLOTH_COLORS} value={a.top} onChange={(top) => set({ top })} />
        <Swatches label={t('custom.bottom')} colors={CLOTH_COLORS} value={a.bottom} onChange={(bottom) => set({ bottom })} />
        <div>
          <Label>{t('custom.footwear')}</Label>
          <Segmented value={a.footwear} onChange={(footwear) => set({ footwear })} options={FOOTWEAR.map((s) => ({ value: s, label: t(`custom.${s}` as I18nKey) }))} />
        </div>
        <div>
          <Label>{t('custom.accessory')}</Label>
          <div role="radiogroup" aria-label={t('custom.accessory')} className="flex flex-wrap gap-2">
            {ACCESSORIES.map((acc) => (
              <button
                key={acc}
                type="button"
                role="radio"
                aria-checked={a.accessory === acc}
                onClick={() => set({ accessory: acc })}
                className={`min-h-9 rounded-full border-2 px-3.5 py-1 font-display text-sm font-bold leading-tight transition-colors ${
                  a.accessory === acc ? 'border-gold-deep bg-lamp text-ink' : 'border-line bg-ink/60 text-mist hover:border-lamp/60 hover:text-paper'
                }`}
              >
                {t(`custom.${acc}` as I18nKey)}
              </button>
            ))}
          </div>
        </div>
        <Button variant="gold" size="lg" full loading={saving} onClick={() => onSave(name.trim(), a)} disabled={name.trim().length < 2}>
          {t(saveLabel)}
        </Button>
      </div>
    </div>
  );
}
