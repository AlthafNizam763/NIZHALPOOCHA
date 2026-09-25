'use client';
import { useState, type ReactNode } from 'react';
import { ALL_MAPS, SETTINGS_BOUNDS, catLimitsFor, getMap, getMode, mapSupportsMode, type RoomSettings } from '@nizhal/shared';
import { useT } from '@/hooks/useT';
import { Stepper, Toggle } from '@/components/ui/Controls';
import type { I18nKey } from '@/utils/i18n';

/**
 * Tiny top-down sketch of a map (water, roads, buildings) drawn from its layout
 * data — purely decorative, used on map tiles, the lobby summary and public room cards.
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
function GroupLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="font-display text-xs font-bold uppercase leading-tight tracking-wider text-rain">{children}</span>
      {aside}
    </div>
  );
}

const Check = () => (
  <span aria-hidden className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-lamp text-ink shadow-[0_1px_0_var(--color-gold-deep)]">
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  </span>
);

/** Compact number picker for the two headline numbers (players, cats). */
function CountCard({ label, hint, value, min, max, onChange }: { label: string; hint?: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const btn = 'tactile h-10 w-10 shrink-0 rounded-full border-2 border-line border-b-ink bg-panel-2 text-xl font-bold leading-none text-paper hover:text-lamp';
  return (
    <div className="surface flex min-w-0 flex-col items-center rounded-2xl px-2 py-2">
      <span className="font-display text-sm font-bold leading-tight text-mist">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label={`${label} −`}>
          −
        </button>
        <span className="headline min-w-9 text-center text-3xl leading-none text-lamp tabular-nums" aria-live="polite">
          {value}
        </span>
        <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label={`${label} +`}>
          +
        </button>
      </div>
      {hint && <span className="mt-1 text-center text-[11px] leading-tight text-rain">{hint}</span>}
    </div>
  );
}

/**
 * Room setup used once, on Create Room. Everything important (who can join, map,
 * mode, players, cats) fits on one phone screen; timers and rule toggles live
 * under "More options". Bounds mirror the server's; the server re-validates everything.
 */
export function RoomSetupForm({ value, onChange }: { value: RoomSettings; onChange: (patch: Partial<RoomSettings>) => void }) {
  const t = useT();
  const B = SETTINGS_BOUNDS;
  const [more, setMore] = useState(false);
  const map = getMap(value.mapId);
  const mode = getMode(value.mode);
  const lim = catLimitsFor(value.mode, value.maxPlayers);
  const modes = map.supportedModes.filter((id) => mapSupportsMode(map, id));
  const rules = [...mode.ruleKeys, ...map.specialRules.ruleKeys].map((k) => t(k as I18nKey));

  return (
    <div className="space-y-4 [@media(max-height:700px)]:space-y-3">
      {/* Who can join */}
      <section>
        <GroupLabel>{t('create.visibility')}</GroupLabel>
        <div role="radiogroup" aria-label={t('create.visibility')} className="grid grid-cols-2 gap-1 rounded-2xl border-2 border-line bg-night p-1">
          {[
            { v: false, label: t('create.private'), icon: <path d="M7 11V8.5a5 5 0 0 1 10 0V11M5.5 11h13v9h-13z" /> },
            { v: true, label: t('create.public'), icon: <path d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5S9.6 5.8 12 3.5z" /> },
          ].map((o) => {
            const on = value.isPublic === o.v;
            return (
              <button
                key={String(o.v)}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ isPublic: o.v })}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 font-display text-base font-bold leading-tight transition-colors ${
                  on ? 'bg-lamp text-ink shadow-[0_2px_0_var(--color-gold-deep)]' : 'text-rain hover:bg-panel-2 hover:text-paper'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {o.icon}
                </svg>
                {o.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs leading-snug text-rain [@media(max-height:700px)]:hidden">{value.isPublic ? t('create.publicHint') : t('create.privateHint')}</p>
      </section>

      {/* Map: one swipeable row on phones, a single row of five on wider screens */}
      <section>
        <GroupLabel>{t('settings.room.map')}</GroupLabel>
        <div role="radiogroup" aria-label={t('settings.room.map')} className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
          {ALL_MAPS.map((m) => {
            const on = value.mapId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ mapId: m.id })}
                className={`tactile relative flex w-[6.75rem] shrink-0 snap-start flex-col items-stretch gap-1.5 rounded-2xl border-2 bg-panel p-1.5 text-left sm:w-auto ${
                  on ? 'border-lamp border-b-gold-deep bg-lamp/10' : 'border-line border-b-ink hover:border-line-strong'
                }`}
              >
                <MapPreview mapId={m.id} className="h-14 w-full [@media(max-height:700px)]:h-10" />
                <span className={`line-clamp-2 min-h-[2.5em] px-0.5 font-display text-xs font-bold leading-tight ${on ? 'text-lamp' : 'text-paper'}`}>{t(m.nameKey as I18nKey)}</span>
                {on && <Check />}
              </button>
            );
          })}
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-rain [@media(max-height:700px)]:hidden">{t(map.descriptionKey as I18nKey)}</p>
      </section>

      {/* Mode */}
      <section>
        <GroupLabel>{t('settings.room.mode')}</GroupLabel>
        <div role="radiogroup" aria-label={t('settings.room.mode')} className={`grid gap-2 ${modes.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {modes.map((id) => {
            const on = value.mode === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  const l = catLimitsFor(id, value.maxPlayers);
                  onChange({ mode: id, catCount: Math.min(l.max, Math.max(l.min, value.catCount)) });
                }}
                className={`tactile min-h-11 rounded-2xl border-2 px-2 font-display text-sm font-bold leading-tight ${
                  on ? 'border-lamp border-b-gold-deep bg-lamp text-ink' : 'border-line border-b-ink bg-panel-2 text-paper hover:text-lamp'
                }`}
              >
                {t(`mode.${id}`)}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-rain [@media(max-height:700px)]:hidden">{t(mode.descriptionKey as I18nKey)}</p>
      </section>

      {/* The two numbers that matter most */}
      <section className="grid grid-cols-2 gap-2">
        <CountCard label={t('settings.room.maxPlayers')} value={value.maxPlayers} min={B.maxPlayers.min} max={B.maxPlayers.max} onChange={(v) => onChange({ maxPlayers: v })} />
        <CountCard
          label={t('settings.room.catCount')}
          hint={`${lim.min}–${lim.max}`}
          value={value.catCount}
          min={Math.max(B.catCount.min, lim.min)}
          max={Math.min(B.catCount.max, lim.max)}
          onChange={(v) => onChange({ catCount: v })}
        />
      </section>

      {/* Everything else, folded away */}
      <section className="surface overflow-hidden rounded-2xl">
        <button type="button" onClick={() => setMore(!more)} aria-expanded={more} className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left">
          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-bold leading-tight text-paper">{t('create.moreOptions')}</span>
            <span className="block truncate text-xs text-rain">
              {t('settings.room.discussion')} {value.discussionS}s · {t('settings.room.voting')} {value.votingS}s · {t('settings.room.tasks')} {value.tasksPerPlayer}
            </span>
          </span>
          <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 text-lamp transition-transform ${more ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {more && (
          <div className="animate-screen-in divide-y divide-line border-t border-line px-4 pb-2">
            {rules.length > 0 && (
              <ul className="space-y-1 py-3 text-xs leading-snug text-mist">
                {rules.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span aria-hidden className="mt-[0.4em] h-1.5 w-1.5 shrink-0 rounded-full bg-lamp" />
                    <span className="min-w-0">{r}</span>
                  </li>
                ))}
              </ul>
            )}
            <Stepper label={t('settings.room.killCooldown')} unit="s" value={value.killCooldownS} min={B.killCooldownS.min} max={B.killCooldownS.max} step={5} onChange={(v) => onChange({ killCooldownS: v })} />
            <Stepper label={t('settings.room.discussion')} unit="s" value={value.discussionS} min={B.discussionS.min} max={B.discussionS.max} step={15} onChange={(v) => onChange({ discussionS: v })} />
            <Stepper label={t('settings.room.voting')} unit="s" value={value.votingS} min={B.votingS.min} max={B.votingS.max} step={15} onChange={(v) => onChange({ votingS: v })} />
            <Stepper label={t('settings.room.tasks')} value={value.tasksPerPlayer} min={B.tasksPerPlayer.min} max={B.tasksPerPlayer.max} onChange={(v) => onChange({ tasksPerPlayer: v })} />
            {mode.emergencyMeetings && (
              <Stepper label={t('settings.room.emergency')} value={value.emergencyMeetings} min={B.emergencyMeetings.min} max={B.emergencyMeetings.max} onChange={(v) => onChange({ emergencyMeetings: v })} />
            )}
            <Toggle label={t('settings.room.anonymous')} checked={value.anonymousVotes} onChange={(v) => onChange({ anonymousVotes: v })} />
            <Toggle label={t('settings.room.confirmEjects')} checked={value.confirmEjects} onChange={(v) => onChange({ confirmEjects: v })} />
            <Toggle label={t('settings.room.voice')} checked={value.voiceChat} onChange={(v) => onChange({ voiceChat: v })} />
          </div>
        )}
      </section>
    </div>
  );
}

/** Read-only summary of the room's setup, shown in the lobby (chosen once on Create Room). */
export function RoomSummary({ settings }: { settings: RoomSettings }) {
  const t = useT();
  const tiles: [string, ReactNode][] = [
    [t('settings.room.mode'), t(`mode.${settings.mode}`)],
    [t('settings.room.catCount'), settings.catCount],
    [t('settings.room.maxPlayers'), settings.maxPlayers],
    [t('settings.room.tasks'), settings.tasksPerPlayer],
  ];
  return (
    <div className="flex items-start gap-3">
      <MapPreview mapId={settings.mapId} className="h-16 w-20 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-display text-base font-bold leading-tight text-paper">{t(getMap(settings.mapId).nameKey as I18nKey)}</div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-2">
          {tiles.map(([label, v]) => (
            <div key={label} className="min-w-0 rounded-xl border-[1.5px] border-line bg-ink/50 px-2.5 py-1.5">
              <div className="truncate text-[11px] font-semibold leading-tight text-rain">{label}</div>
              <div className="truncate font-display text-sm font-bold leading-tight text-lamp">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-1.5 text-[11px] leading-snug text-rain">
          {t('settings.room.killCooldown')} {settings.killCooldownS}s · {t('settings.room.discussion')} {settings.discussionS}s · {t('settings.room.voting')} {settings.votingS}s
          {settings.voiceChat ? ` · ${t('settings.room.voice')}` : ''}
        </div>
      </div>
    </div>
  );
}
