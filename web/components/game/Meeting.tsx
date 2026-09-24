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
import { useSecondsUntil } from './Overlays';
import { VoiceBadge, VoiceControls, useVoicePeer } from '@/components/voice/VoiceControls';

const EMPTY_PLAYERS: GamePlayerView[] = [];

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
      className={`relative flex items-center gap-2 rounded-xl border p-1.5 pr-2 text-left transition-colors ${
        selected ? 'border-lamp bg-lamp/15' : isMe ? 'border-moss bg-panel-2' : 'border-line bg-panel'
      } ${selectable ? 'hover:border-mist' : ''} ${gone ? 'opacity-50' : ''} ${voiceState.speaking && !voiceState.muted ? 'ring-2 ring-leaf' : ''}`}
    >
      <span className="absolute right-1.5 top-1.5">
        <VoiceBadge id={p.id} />
      </span>
      <div className="shrink-0 overflow-hidden rounded-lg bg-night">
        <CharacterAvatar appearance={p.appearance} size={44} dim={gone} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-semibold ${gone ? 'line-through' : ''}`}>{p.name}</div>
        <div className="text-[11px] text-rain">
          {p.status === 'dead' ? t('meeting.dead') : p.status === 'ejected' ? t('summary.ejected') : p.status === 'left' ? t('meeting.left') : voted ? `✓ ${t('meeting.voted')}` : ''}
        </div>
        {votersFor && votersFor.length > 0 && (
          <div className="mt-0.5 flex -space-x-1.5">
            {votersFor.map((v) => (
              <span key={v.id} className="overflow-hidden rounded-full border border-panel bg-night">
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
        {!alive && <div className="rounded-lg bg-night p-2 text-xs text-rain">{t('meeting.deadChat')}</div>}
        {chat.map((msg) => {
          const sender = players.find((p) => p.id === msg.senderId);
          return (
            <div key={msg.id} className={`flex gap-2 rounded-lg p-1.5 ${msg.channel === 'dead' ? 'bg-canal/20' : msg.senderId === uid ? 'bg-panel-2' : ''}`}>
              {sender && (
                <span className="shrink-0 overflow-hidden rounded-md bg-night">
                  <CharacterAvatar appearance={sender.appearance} size={28} dim={msg.channel === 'dead'} />
                </span>
              )}
              <div className="min-w-0 text-sm">
                <span className="font-semibold text-mist">{msg.senderName}</span>{' '}
                <span className="break-words">{msg.quickId ? t(`quick.${msg.quickId}` as I18nKey) : msg.text}</span>
              </div>
            </div>
          );
        })}
        <div ref={chatEnd} />
      </div>
      <div data-tut="quick-chat" className="mt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {QUICK_CHAT_IDS.map((q) => (
          <button key={q} onClick={() => void send({ quickId: q })} className="h-8 shrink-0 rounded-full border border-line bg-night px-3 text-xs text-mist hover:text-paper">
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
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-night px-3 text-sm outline-none focus:border-moss"
        />
        <Button type="submit" size="md">
          {t('meeting.send')}
        </Button>
      </form>
    </div>
  );

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex flex-col bg-ink/[0.97] pt-safe pb-safe pl-safe pr-safe">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="min-w-0">
          <div className="font-display text-xl leading-tight">{t(m.reason === 'report' ? 'meeting.report' : 'meeting.emergency')}</div>
          <div className="truncate text-xs text-rain">
            {victim ? t('meeting.foundBody', { name: caller?.name ?? '', victim: victim.name }) : t('meeting.calledBy', { name: caller?.name ?? '' })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <VoiceControls compact />
          <span className={`rounded-lg px-3 py-1 text-sm font-semibold ${voting ? 'bg-lamp text-ink' : 'bg-panel-2 text-paper'}`}>
            {voting ? t('meeting.voting') : t('meeting.discussion')} · {secs}s
          </span>
          <button onClick={() => setShowChat(!showChat)} data-tut="quick-chat" className="relative h-10 rounded-xl border border-line bg-panel px-3 text-sm md:hidden">
            {t('meeting.chat')}
            {chat.length > 0 && <span className="ml-1 text-lamp">{chat.length}</span>}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 p-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className={`min-h-0 flex-col ${showChat ? 'hidden md:flex' : 'flex'}`}>
          <div data-tut="vote-grid" className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto scrollbar-thin sm:grid-cols-3 lg:grid-cols-4">
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
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            {!voting && <span className="mr-auto text-sm text-rain">{t('meeting.votingIn', { n: secs })}</span>}
            {voting && !alive && <span className="mr-auto text-sm text-rain">{t('meeting.cantVote')}</span>}
            {iVoted && <span className="mr-auto text-sm text-leaf">✓ {t('meeting.youVoted')}</span>}
            {selected && canVote && (
              <Button variant="lamp" onClick={() => void vote(selected)}>
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
        <div className={`min-h-0 rounded-xl border border-line bg-panel p-2 ${showChat ? 'flex' : 'hidden md:flex'} flex-col`}>{chatPanel}</div>
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
    <div className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-ink/[0.97] p-6 text-center">
      {ej ? (
        <>
          <div className="relative h-36 w-36">
            <div className={r.ejectedRole === 'CAT' ? 'animate-human-fade absolute inset-0 flex items-center justify-center' : 'flex items-center justify-center'}>
              <CharacterAvatar appearance={ej.appearance} size={130} />
            </div>
            {r.ejectedRole === 'CAT' && (
              <div className="animate-cat-emerge absolute inset-0 flex items-center justify-center">
                <CatForm size={140} />
              </div>
            )}
          </div>
          <div className="font-display text-3xl">{t('vote.ejected', { name: ej.name })}</div>
          {r.ejectedRole && <div className={`text-xl ${r.ejectedRole === 'CAT' ? 'text-lamp' : 'text-mist'}`}>{t(r.ejectedRole === 'CAT' ? 'vote.wasCat' : 'vote.wasNotCat', { name: ej.name })}</div>}
          {r.catsRemaining !== null && <div className="text-sm text-rain">{t('vote.catsRemain', { n: r.catsRemaining })}</div>}
        </>
      ) : (
        <div className="font-display text-3xl">{t(r.outcome === 'tie' ? 'vote.tie' : r.outcome === 'skipped' ? 'vote.skipped' : 'vote.none')}</div>
      )}
      {r.votes && (
        <div className="mt-2 grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3">
          {players
            .filter((p) => (r.tally[p.id] ?? 0) > 0)
            .map((p) => (
              <PlayerCard key={p.id} p={p} voted={false} selectable={false} selected={false} isMe={false} onSelect={() => {}} votersFor={byTarget(p.id)} />
            ))}
          {(r.tally.skip ?? 0) > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-panel p-2 text-sm">
              {t('meeting.skip')}: {r.tally.skip}
            </div>
          )}
        </div>
      )}
      {!r.votes && Object.keys(r.tally).length > 0 && (
        <div className="text-sm text-rain">
          {Object.entries(r.tally)
            .map(([id, n]) => `${id === 'skip' ? t('meeting.skip') : (players.find((p) => p.id === id)?.name ?? '?')}: ${n}`)
            .join(' · ')}
        </div>
      )}
    </div>
  );
}
