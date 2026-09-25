'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { QUICK_CHAT_IDS, type GamePlayerView } from '@nizhal/shared';
import { useGame } from '@/state/gameStore';
import { useUi } from '@/state/uiStore';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { actions as net, errorKey } from '@/services/net';
import type { I18nKey } from '@/utils/i18n';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { CatForm } from '@/components/ui/CatForm';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Controls';
import { Notice } from '@/components/ui/Feedback';
import { useSecondsUntil } from './Overlays';
import { VoiceBadge, VoiceControls, useVoicePeer } from '@/components/voice/VoiceControls';

const EMPTY_PLAYERS: GamePlayerView[] = [];

/** Meeting backdrop: night scrim with a faint backwater-teal glow from above. */
const MEETING_BG = {
  background:
    'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--color-canal-deep) 28%, transparent) 0%, transparent 60%), color-mix(in srgb, var(--color-ink) 97%, transparent)',
};

/**
 * Countdown as a gold ring. The ring's full length is the time left when this
 * phase was first shown (mount is keyed by the deadline), so it drains evenly.
 */
function TimerRing({ secs }: { secs: number }) {
  const [total] = useState(() => Math.max(1, secs));
  const frac = Math.max(0, Math.min(1, secs / total));
  const urgent = secs <= 10;
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center ${urgent && secs > 0 ? 'animate-pulse' : ''}`} role="timer" aria-live="off">
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="var(--color-ink)" stroke="var(--color-line)" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={urgent ? 'var(--color-laterite)' : 'var(--color-lamp)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 0.25s linear' }}
        />
      </svg>
      <span className={`relative font-display text-sm font-extrabold tabular-nums ${urgent ? 'text-laterite' : 'text-paper'}`}>{secs}</span>
    </span>
  );
}

function PlayerCard({
  p,
  voted,
  selectable,
  selected,
  isMe,
  onSelect,
  votersFor,
}: {
  p: GamePlayerView;
  voted: boolean;
  selectable: boolean;
  selected: boolean;
  isMe: boolean;
  onSelect: () => void;
  votersFor?: GamePlayerView[];
}) {
  const t = useT();
  const gone = p.status !== 'alive';
  const voiceState = useVoicePeer(p.id);
  return (
    <button
      disabled={!selectable}
      onClick={onSelect}
      aria-pressed={selectable ? selected : undefined}
      className={`relative flex min-h-16 items-center gap-2 rounded-2xl border-2 p-1.5 pr-2 text-left transition-[border-color,background-color,transform] duration-150 disabled:cursor-default ${
        selected ? 'border-lamp bg-lamp/15 shadow-[0_0_16px_-4px_var(--color-lamp)]' : isMe ? 'border-moss bg-panel-2' : 'border-line bg-panel'
      } ${selectable && !selected ? 'hover:-translate-y-px hover:border-lamp/60' : ''} ${gone ? 'opacity-55' : ''} ${
        voiceState.speaking && !voiceState.muted ? 'ring-2 ring-leaf ring-offset-2 ring-offset-ink' : ''
      }`}
    >
      <span className="absolute right-1.5 top-1.5">
        <VoiceBadge id={p.id} />
      </span>
      {selected && (
        <span aria-hidden className="absolute -left-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-gold-deep bg-lamp text-xs font-black text-ink">
          ✓
        </span>
      )}
      <div className={`shrink-0 overflow-hidden rounded-xl border ${gone ? 'border-line bg-ink' : 'border-line bg-night'}`}>
        <CharacterAvatar appearance={p.appearance} size={44} dim={gone} blink={!gone} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate font-display text-sm font-bold leading-tight ${gone ? 'text-rain line-through' : 'text-paper'}`}>{p.name}</div>
        <div
          className={`text-[11px] font-semibold leading-tight ${
            p.status === 'dead' ? 'text-laterite' : p.status !== 'alive' ? 'text-rain' : voted ? 'text-leaf' : 'text-rain'
          }`}
        >
          {p.status === 'dead' ? t('meeting.dead') : p.status === 'ejected' ? t('summary.ejected') : p.status === 'left' ? t('meeting.left') : voted ? `✓ ${t('meeting.voted')}` : ''}
        </div>
        {votersFor && votersFor.length > 0 && (
          <div className="mt-0.5 flex -space-x-1.5">
            {votersFor.map((v) => (
              <span key={v.id} className="overflow-hidden rounded-full border-2 border-panel bg-night">
                <CharacterAvatar appearance={v.appearance} size={18} />
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

export function MeetingScreen() {
  const t = useT();
  const toast = useUi((s) => s.toast);
  const uid = useAuth((s) => s.user?.uid);
  const state = useGame((s) => s.state);
  const chat = useGame((s) => s.chat);
  const self = useGame((s) => s.self);
  const players = useGame((s) => s.state?.players ?? EMPTY_PLAYERS);
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [showChat, setShowChat] = useState(false);
  const endsAt = state?.phase === 'MEETING' ? state.meeting?.discussionEndsAt : state?.meeting?.votingEndsAt;
  const secs = useSecondsUntil(endsAt);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'end' });
  }, [chat.length, showChat]);

  if (!state || (state.phase !== 'MEETING' && state.phase !== 'VOTING') || !state.meeting) return null;
  const m = state.meeting;
  const voting = state.phase === 'VOTING';
  const alive = self?.alive ?? false;
  const iVoted = !!uid && m.votedIds.includes(uid);
  const canVote = voting && alive && !iVoted;
  const caller = players.find((p) => p.id === m.callerId);
  const victim = players.find((p) => p.id === m.reportedVictimId);

  const vote = async (target: string | 'skip') => {
    const r = await net.vote(target);
    if (!r.ok) toast(errorKey(r.error), undefined, 'warn');
    setSelected(null);
  };
  const send = async (payload: { text?: string; quickId?: string }) => {
    const r = await net.chat(payload);
    if (!r.ok) toast(errorKey(r.error), undefined, 'warn');
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    setText('');
    void send({ text: v });
  };

  const chatPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
        {!alive && <Notice tone="info">{t('meeting.deadChat')}</Notice>}
        {chat.map((msg) => {
          const sender = players.find((p) => p.id === msg.senderId);
          return (
            <div
              key={msg.id}
              className={`flex gap-2 rounded-xl p-1.5 ${
                msg.channel === 'dead' ? 'border-l-2 border-canal bg-canal/15' : msg.senderId === uid ? 'bg-panel-2' : 'bg-ink/40'
              }`}
            >
              {sender && (
                <span className="shrink-0 overflow-hidden rounded-lg border border-line bg-night">
                  <CharacterAvatar appearance={sender.appearance} size={28} dim={msg.channel === 'dead'} />
                </span>
              )}
              <div className="min-w-0 text-sm leading-snug">
                <span className={`font-display font-bold ${msg.senderId === uid ? 'text-lamp' : 'text-mist'}`}>{msg.senderName}</span>{' '}
                <span className="break-words text-paper">{msg.quickId ? t(`quick.${msg.quickId}` as I18nKey) : msg.text}</span>
              </div>
            </div>
          );
        })}
        <div ref={chatEnd} />
      </div>
      <div data-tut="quick-chat" className="mt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {QUICK_CHAT_IDS.map((q) => (
          <button
            key={q}
            onClick={() => void send({ quickId: q })}
            className="min-h-9 shrink-0 rounded-full border-2 border-line bg-ink px-3 py-1 text-xs font-semibold leading-tight text-mist transition-colors hover:border-lamp/60 hover:text-paper"
          >
            {t(`quick.${q}` as I18nKey)}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-1.5 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={140}
          placeholder={t('meeting.chatPlaceholder')}
          enterKeyHint="send"
          className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-line bg-ink px-4 text-sm text-paper outline-none transition-colors placeholder:text-rain/60 focus:border-lamp"
        />
        <Button type="submit" size="md">
          {t('meeting.send')}
        </Button>
      </form>
    </div>
  );

  return (
    <div className="animate-screen-in pointer-events-auto fixed inset-0 z-40 flex flex-col pt-safe pb-safe pl-safe pr-safe" style={MEETING_BG}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-line px-3 py-2">
        <div className="min-w-0">
          <div className={`headline text-2xl leading-tight ${m.reason === 'report' ? 'text-laterite' : 'text-lamp'}`}>{t(m.reason === 'report' ? 'meeting.report' : 'meeting.emergency')}</div>
          <div className="truncate text-xs leading-snug text-mist">
            {victim ? t('meeting.foundBody', { name: caller?.name ?? '', victim: victim.name }) : t('meeting.calledBy', { name: caller?.name ?? '' })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <VoiceControls compact />
          <span
            className={`rounded-full border-2 px-3 py-1 font-display text-sm font-bold leading-tight ${
              voting ? 'border-gold-deep bg-lamp text-ink' : 'border-canal-deep bg-canal text-paper'
            }`}
          >
            {voting ? t('meeting.voting') : t('meeting.discussion')}
          </span>
          <TimerRing key={endsAt ?? 'none'} secs={secs} />
          <button
            onClick={() => setShowChat(!showChat)}
            data-tut="quick-chat"
            aria-pressed={showChat}
            className={`tactile relative flex h-11 items-center gap-1.5 rounded-full border-2 border-b-ink px-3.5 font-display text-sm font-bold md:hidden ${
              showChat ? 'border-lamp bg-panel-2 text-lamp' : 'border-line bg-panel-2 text-paper'
            }`}
          >
            {t('meeting.chat')}
            {chat.length > 0 && <span className="min-w-5 rounded-full bg-lamp px-1.5 text-center text-xs leading-5 text-ink">{chat.length}</span>}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 p-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className={`min-h-0 flex-col ${showChat ? 'hidden md:flex' : 'flex'}`}>
          <div data-tut="vote-grid" className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-1.5 scrollbar-thin sm:grid-cols-3 lg:grid-cols-4">
            {players.map((p) => (
              <PlayerCard
                key={p.id}
                p={p}
                isMe={p.id === uid}
                voted={m.votedIds.includes(p.id)}
                selectable={canVote && p.status === 'alive'}
                selected={selected === p.id}
                onSelect={() => setSelected(p.id)}
              />
            ))}
          </div>
          <div className="surface mt-2 flex min-h-14 flex-wrap items-center justify-end gap-2 rounded-[var(--radius-card)] p-2">
            {!voting && <span className="mr-auto px-1 text-sm leading-snug text-rain">{t('meeting.votingIn', { n: secs })}</span>}
            {voting && !alive && <span className="mr-auto px-1 text-sm leading-snug text-rain">{t('meeting.cantVote')}</span>}
            {iVoted && (
              <span className="mr-auto">
                <Badge tone="good">✓ {t('meeting.youVoted')}</Badge>
              </span>
            )}
            {selected && canVote && (
              <Button variant="gold" onClick={() => void vote(selected)}>
                {t('meeting.confirmVote', { name: players.find((p) => p.id === selected)?.name ?? '' })}
              </Button>
            )}
            {canVote && (
              <Button variant="secondary" onClick={() => void vote('skip')}>
                {t('meeting.skip')}
              </Button>
            )}
          </div>
        </div>
        <div className={`surface min-h-0 rounded-[var(--radius-card)] p-2 ${showChat ? 'flex' : 'hidden md:flex'} flex-col`}>{chatPanel}</div>
      </div>
    </div>
  );
}

export function VoteResultView() {
  const t = useT();
  const phase = useGame((s) => s.state?.phase);
  const r = useGame((s) => s.voteResult);
  const players = useGame((s) => s.state?.players ?? EMPTY_PLAYERS);
  if (phase !== 'RESULT' || !r) return null;
  const ej = players.find((p) => p.id === r.ejectedId);
  const byTarget = (id: string) => (r.votes ?? []).filter((v) => v.targetId === id).map((v) => players.find((p) => p.id === v.voterId)!).filter(Boolean);

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center" style={MEETING_BG}>
      {ej ? (
        <>
          <div className="relative h-36 w-36">
            <span aria-hidden className="absolute inset-x-2 bottom-0 h-5 rounded-[50%] bg-[radial-gradient(ellipse,color-mix(in_srgb,var(--color-lamp)_30%,transparent),transparent_70%)]" />
            <div className={r.ejectedRole === 'CAT' ? 'animate-human-fade absolute inset-0 flex items-center justify-center' : 'flex items-center justify-center'}>
              <CharacterAvatar appearance={ej.appearance} size={130} mood="scared" />
            </div>
            {r.ejectedRole === 'CAT' && (
              <div className="animate-cat-emerge absolute inset-0 flex items-center justify-center">
                <CatForm size={140} />
              </div>
            )}
          </div>
          <div className="headline animate-screen-in max-w-2xl text-3xl leading-tight text-paper sm:text-4xl">{t('vote.ejected', { name: ej.name })}</div>
          {r.ejectedRole && (
            <div className={`animate-rise font-display text-xl font-bold leading-tight ${r.ejectedRole === 'CAT' ? 'text-lamp' : 'text-mist'}`}>
              {t(r.ejectedRole === 'CAT' ? 'vote.wasCat' : 'vote.wasNotCat', { name: ej.name })}
            </div>
          )}
          {r.catsRemaining !== null && <Badge tone="gold">{t('vote.catsRemain', { n: r.catsRemaining })}</Badge>}
        </>
      ) : (
        <div className="headline animate-screen-in max-w-2xl text-3xl leading-tight text-paper sm:text-4xl">
          {t(r.outcome === 'tie' ? 'vote.tie' : r.outcome === 'skipped' ? 'vote.skipped' : 'vote.none')}
        </div>
      )}
      {r.votes && (
        <div className="animate-rise mt-2 grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3">
          {players
            .filter((p) => (r.tally[p.id] ?? 0) > 0)
            .map((p) => (
              <PlayerCard key={p.id} p={p} voted={false} selectable={false} selected={false} isMe={false} onSelect={() => {}} votersFor={byTarget(p.id)} />
            ))}
          {(r.tally.skip ?? 0) > 0 && (
            <div className="flex min-h-16 items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-panel/70 p-2 font-display text-sm font-bold text-mist">
              {t('meeting.skip')}: <span className="text-lamp">{r.tally.skip}</span>
            </div>
          )}
        </div>
      )}
      {!r.votes && Object.keys(r.tally).length > 0 && (
        <div className="surface rounded-full px-4 py-1.5 text-sm leading-snug text-mist">
          {Object.entries(r.tally)
            .map(([id, n]) => `${id === 'skip' ? t('meeting.skip') : (players.find((p) => p.id === id)?.name ?? '?')}: ${n}`)
            .join(' · ')}
        </div>
      )}
    </div>
  );
}
