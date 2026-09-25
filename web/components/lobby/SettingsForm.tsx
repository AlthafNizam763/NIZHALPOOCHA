'use client';
import type { ReactNode } from 'react';
import { ALL_MAPS, SETTINGS_BOUNDS, catLimitsFor, getMap, getMode, mapSupportsMode, type RoomSettings } from '@nizhal/shared';
import { useT } from '@/hooks/useT';
import { ChoiceCard, Stepper, Toggle } from '@/components/ui/Controls';
import type { I18nKey } from '@/utils/i18n';

/**
 * Tiny top-down sketch of a map (water, roads, buildings) drawn from its layout
 * data — purely decorative, used on map choice cards and public room cards.
 */
export function MapPreview({ mapId, className = '' }: { mapId: RoomSettings['mapId']; className?: string }) {
  const m = getMap(mapId);
  return (
    <svg
      viewBox={`0 0 ${m.width} ${m.height}`}
      preserveAspectRatio="xMidYMid slice"
      className={`block rounded-xl border-2 border-line bg-ink ${className}`}
      aria-hidden
    >
      <rect width={m.width} height={m.height} fill={m.theme.background} />
      {m.water.map((r, i) => (
        <rect key={`w${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill="var(--color-canal-deep)" />
      ))}
      {m.roads.map((r, i) => (
        <rect key={`r${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill="var(--color-line)" />
      ))}
      {m.bridges.map((r, i) => (
        <rect key={`b${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill="var(--color-gold-deep)" />
      ))}
      {m.buildings.map((b) => (
        <rect key={b.id} x={b.floor.x} y={b.floor.y} width={b.floor.w} height={b.floor.h} fill="var(--color-line-strong)" stroke="var(--color-lamp)" strokeOpacity={0.35} strokeWidth={Math.max(m.width, m.height) / 220} />
      ))}
    </svg>
  );
}

/** Small uppercase label above a group of controls. */
function GroupLabel({ children }: { children: ReactNode }) {
  return <div className="mb-2 font-display text-xs font-bold uppercase leading-tight tracking-wider text-rain">{children}</div>;
}

/** Picks one of several cards; used for map and mode. */
function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { id: T; title: string; hint: string; art?: ReactNode }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="py-3">
      <GroupLabel>{label}</GroupLabel>
      <div role="radiogroup" aria-label={label} className="grid gap-2 @xl:grid-cols-2">
        {options.map((o) => (
          <ChoiceCard key={o.id} selected={value === o.id} disabled={disabled} onClick={() => onChange(o.id)} title={o.title} description={o.hint} icon={o.art} />
        ))}
      </div>
    </div>
  );
}

/** Match settings editor. Bounds mirror the server's; the server re-validates everything. */
export function SettingsForm({
  value,
  onChange,
  playerCount,
  disabled,
}: {
  value: RoomSettings;
  onChange: (patch: Partial<RoomSettings>) => void;
  playerCount: number;
  disabled?: boolean;
}) {
  const t = useT();
  const B = SETTINGS_BOUNDS;
  const map = getMap(value.mapId);
  const mode = getMode(value.mode);
  const n = Math.max(5, Math.min(playerCount, value.maxPlayers));
  const lim = catLimitsFor(value.mode, n);
  const catMax = catLimitsFor(value.mode, value.maxPlayers).max;
  const rules = [...mode.ruleKeys, ...map.specialRules.ruleKeys].map((k) => t(k as I18nKey));
  return (
    <div className="@container divide-y divide-line">
      <Choice
        label={t('settings.room.map')}
        value={value.mapId}
        disabled={disabled}
        // Changing only the map lets the server pick that map's default mode when needed.
        onChange={(mapId) => onChange({ mapId })}
        options={ALL_MAPS.map((m) => ({
          id: m.id,
          title: t(m.nameKey as I18nKey),
          hint: `${t(m.descriptionKey as I18nKey)} · ${t('map.supports')}: ${m.supportedModes.map((id) => t(`mode.${id}`)).join(', ')}`,
          art: <MapPreview mapId={m.id} className="h-12 w-16" />,
        }))}
      />
      <Choice
        label={t('settings.room.mode')}
        value={value.mode}
        disabled={disabled}
        onChange={(m) => {
          const l = catLimitsFor(m, n);
          onChange({ mode: m, catCount: Math.min(l.max, Math.max(l.min, value.catCount)) });
        }}
        options={map.supportedModes
          .filter((id) => mapSupportsMode(map, id))
          .map((id) => ({ id, title: t(`mode.${id}`), hint: t(getMode(id).descriptionKey as I18nKey) }))}
      />
      {rules.length > 0 && (
        <div className="py-3">
          <ul className="space-y-1 rounded-xl border-[1.5px] border-line bg-ink/50 px-3 py-2.5 text-xs leading-snug text-mist">
            {rules.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden className="mt-[0.4em] h-1.5 w-1.5 shrink-0 rounded-full bg-lamp" />
                <span className="min-w-0">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Stepper
        label={t('settings.room.maxPlayers')}
        value={value.maxPlayers}
        min={Math.max(B.maxPlayers.min, playerCount)}
        max={B.maxPlayers.max}
        onChange={(v) => onChange({ maxPlayers: v })}
        disabled={disabled}
      />
      <Stepper
        label={t('settings.room.catCount')}
        hint={t('settings.room.catHint', { n, min: lim.min, max: lim.max })}
        value={value.catCount}
        min={B.catCount.min}
        max={Math.min(B.catCount.max, catMax)}
        onChange={(v) => onChange({ catCount: v })}
        disabled={disabled}
      />
      <Stepper label={t('settings.room.killCooldown')} unit="s" value={value.killCooldownS} min={B.killCooldownS.min} max={B.killCooldownS.max} step={5} onChange={(v) => onChange({ killCooldownS: v })} disabled={disabled} />
      <Stepper label={t('settings.room.discussion')} unit="s" value={value.discussionS} min={B.discussionS.min} max={B.discussionS.max} step={15} onChange={(v) => onChange({ discussionS: v })} disabled={disabled} />
      <Stepper label={t('settings.room.voting')} unit="s" value={value.votingS} min={B.votingS.min} max={B.votingS.max} step={15} onChange={(v) => onChange({ votingS: v })} disabled={disabled} />
      <Stepper label={t('settings.room.tasks')} value={value.tasksPerPlayer} min={B.tasksPerPlayer.min} max={B.tasksPerPlayer.max} onChange={(v) => onChange({ tasksPerPlayer: v })} disabled={disabled} />
      {mode.emergencyMeetings && (
        <Stepper label={t('settings.room.emergency')} value={value.emergencyMeetings} min={B.emergencyMeetings.min} max={B.emergencyMeetings.max} onChange={(v) => onChange({ emergencyMeetings: v })} disabled={disabled} />
      )}
      <Toggle label={t('settings.room.anonymous')} checked={value.anonymousVotes} onChange={(v) => onChange({ anonymousVotes: v })} disabled={disabled} />
      <Toggle label={t('settings.room.confirmEjects')} checked={value.confirmEjects} onChange={(v) => onChange({ confirmEjects: v })} disabled={disabled} />
      <Toggle label={t('settings.room.public')} checked={value.isPublic} onChange={(v) => onChange({ isPublic: v })} disabled={disabled} />
      <Toggle label={t('settings.room.voice')} checked={value.voiceChat} onChange={(v) => onChange({ voiceChat: v })} disabled={disabled} />
    </div>
  );
}
