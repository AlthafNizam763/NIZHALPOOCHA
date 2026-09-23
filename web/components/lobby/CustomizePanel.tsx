'use client';
import { useState } from 'react';
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

function Swatches({ colors, value, onChange, label }: { colors: readonly number[]; value: number; onChange: (i: number) => void; label: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs text-rain">{label}</div>
      <div className="flex flex-wrap gap-2">
        {colors.map((c, i) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${i + 1}`}
            onClick={() => onChange(i)}
            className={`h-9 w-9 rounded-full border-2 ${i === value ? 'border-paper' : 'border-transparent'}`}
            style={{ background: hex(c) }}
          />
        ))}
      </div>
    </div>
  );
}

export function CustomizePanel({
  initialName,
  initial,
  onSave,
  saving,
}: {
  initialName: string;
  initial: Appearance;
  onSave: (name: string, a: Appearance) => void;
  saving?: boolean;
}) {
  const t = useT();
  const [a, setA] = useState<Appearance>(initial);
  const [name, setName] = useState(initialName);
  const set = (patch: Partial<Appearance>) => setA({ ...a, ...patch });

  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-2xl border border-line bg-night p-3">
          <CharacterAvatar appearance={a} size={150} animate />
        </div>
        <Button variant="secondary" size="sm" onClick={() => setA(randomAppearance())}>
          {t('custom.random')}
        </Button>
      </div>
      <div className="space-y-4">
        <Field label={t('custom.name')} value={name} onChange={(e) => setName(e.target.value)} maxLength={16} />
        <Segmented
          value={a.body}
          onChange={(body) => set({ body })}
          options={[
            { value: 'boy', label: t('custom.boy') },
            { value: 'girl', label: t('custom.girl') },
          ]}
        />
        <Swatches label={t('custom.skin')} colors={SKIN_TONES} value={a.skin} onChange={(skin) => set({ skin })} />
        <div>
          <div className="mb-1.5 text-xs text-rain">{t('custom.hair')}</div>
          <div className="flex gap-2">
            {Array.from({ length: HAIR_STYLE_COUNT }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => set({ hair: i })}
                className={`rounded-xl border-2 bg-night p-1 ${a.hair === i ? 'border-paper' : 'border-line'}`}
                aria-label={`${t('custom.hair')} ${i + 1}`}
              >
                <CharacterAvatar appearance={{ ...a, hair: i, accessory: 'none' }} size={48} />
              </button>
            ))}
          </div>
        </div>
        <Swatches label={t('custom.hairColor')} colors={HAIR_COLORS} value={a.hairColor} onChange={(hairColor) => set({ hairColor })} />
        <div>
          <div className="mb-1.5 text-xs text-rain">{t('custom.topStyle')}</div>
          <Segmented value={a.topStyle} onChange={(topStyle) => set({ topStyle })} options={TOP_STYLES.map((s) => ({ value: s, label: t(`custom.${s}` as I18nKey) }))} />
        </div>
        <Swatches label={t('custom.top')} colors={CLOTH_COLORS} value={a.top} onChange={(top) => set({ top })} />
        <Swatches label={t('custom.bottom')} colors={CLOTH_COLORS} value={a.bottom} onChange={(bottom) => set({ bottom })} />
        <div>
          <div className="mb-1.5 text-xs text-rain">{t('custom.footwear')}</div>
          <Segmented value={a.footwear} onChange={(footwear) => set({ footwear })} options={FOOTWEAR.map((s) => ({ value: s, label: t(`custom.${s}` as I18nKey) }))} />
        </div>
        <div>
          <div className="mb-1.5 text-xs text-rain">{t('custom.accessory')}</div>
          <div className="flex flex-wrap gap-2">
            {ACCESSORIES.map((acc) => (
              <button
                key={acc}
                type="button"
                onClick={() => set({ accessory: acc })}
                className={`h-9 rounded-lg border px-3 text-sm ${a.accessory === acc ? 'border-paper bg-panel-2' : 'border-line text-mist'}`}
              >
                {t(`custom.${acc}` as I18nKey)}
              </button>
            ))}
          </div>
        </div>
        <Button full loading={saving} onClick={() => onSave(name.trim(), a)} disabled={name.trim().length < 2}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
