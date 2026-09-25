'use client';
import { ALL_MAPS, SETTINGS_BOUNDS, catLimitsFor, getMap, getMode, mapSupportsMode, type RoomSettings } from '@nizhal/shared';
import { useT } from '@/hooks/useT';
import { Stepper, Toggle } from '@/components/ui/Controls';
import type { I18nKey } from '@/utils/i18n';

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
  options: { id: T; title: string; hint: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="py-3">
      <div className="mb-2 text-sm text-mist">{label}</div>
      <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            disabled={disabled}
            onClick={() => onChange(o.id)}
            className={`rounded-xl border p-2.5 text-left transition-colors disabled:opacity-60 ${value === o.id ? 'border-moss bg-moss/20' : 'border-line bg-night hover:bg-panel-2'}`}
          >
            <div className="text-sm font-semibold">{o.title}</div>
            <div className="text-xs leading-snug text-rain">{o.hint}</div>
          </button>
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
    <div className="divide-y divide-line">
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
      <ul className="list-disc space-y-0.5 py-3 pl-5 text-xs text-rain">
        {rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
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
