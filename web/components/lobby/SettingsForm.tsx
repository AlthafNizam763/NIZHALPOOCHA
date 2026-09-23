'use client';
import { SETTINGS_BOUNDS, catLimits, type RoomSettings } from '@nizhal/shared';
import { useT } from '@/hooks/useT';
import { Stepper, Toggle } from '@/components/ui/Controls';

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
  const lim = catLimits(Math.max(5, Math.min(playerCount, value.maxPlayers)));
  return (
    <div className="divide-y divide-line">
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
        hint={t('settings.room.catHint', { n: Math.max(5, playerCount), min: lim.min, max: lim.max })}
        value={value.catCount}
        min={B.catCount.min}
        max={B.catCount.max}
        onChange={(v) => onChange({ catCount: v })}
        disabled={disabled}
      />
      <Stepper label={t('settings.room.killCooldown')} unit="s" value={value.killCooldownS} min={B.killCooldownS.min} max={B.killCooldownS.max} step={5} onChange={(v) => onChange({ killCooldownS: v })} disabled={disabled} />
      <Stepper label={t('settings.room.discussion')} unit="s" value={value.discussionS} min={B.discussionS.min} max={B.discussionS.max} step={15} onChange={(v) => onChange({ discussionS: v })} disabled={disabled} />
      <Stepper label={t('settings.room.voting')} unit="s" value={value.votingS} min={B.votingS.min} max={B.votingS.max} step={15} onChange={(v) => onChange({ votingS: v })} disabled={disabled} />
      <Stepper label={t('settings.room.tasks')} value={value.tasksPerPlayer} min={B.tasksPerPlayer.min} max={B.tasksPerPlayer.max} onChange={(v) => onChange({ tasksPerPlayer: v })} disabled={disabled} />
      <Stepper label={t('settings.room.emergency')} value={value.emergencyMeetings} min={B.emergencyMeetings.min} max={B.emergencyMeetings.max} onChange={(v) => onChange({ emergencyMeetings: v })} disabled={disabled} />
      <Toggle label={t('settings.room.anonymous')} checked={value.anonymousVotes} onChange={(v) => onChange({ anonymousVotes: v })} disabled={disabled} />
      <Toggle label={t('settings.room.confirmEjects')} checked={value.confirmEjects} onChange={(v) => onChange({ confirmEjects: v })} disabled={disabled} />
      <Toggle label={t('settings.room.public')} checked={value.isPublic} onChange={(v) => onChange({ isPublic: v })} disabled={disabled} />
      <Toggle label={t('settings.room.voice')} checked={value.voiceChat} onChange={(v) => onChange({ voiceChat: v })} disabled={disabled} />
    </div>
  );
}
