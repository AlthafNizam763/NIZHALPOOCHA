'use client';
import { useEffect } from 'react';
import { useVoice } from '@/state/voiceStore';
import { useRoom } from '@/state/roomStore';
import { useSettings } from '@/state/settingsStore';
import { useUi } from '@/state/uiStore';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { voice } from '@/services/voice';
import type { I18nKey } from '@/utils/i18n';

function MicIcon({ off, className = 'h-5 w-5' }: { off?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

const CHANNEL_KEY: Record<string, I18nKey> = {
  lobby: 'voice.channel.lobby',
  meeting: 'voice.channel.meeting',
  dead: 'voice.channel.dead',
};

/**
 * Compact voice control used in the lobby, HUD and meeting screen.
 * Off → "Join voice". On → mic toggle (or hold-to-talk) + channel label + leave.
 */
export function VoiceControls({ compact }: { compact?: boolean }) {
  const t = useT();
  const roomVoice = useRoom((s) => s.room?.settings.voiceChat ?? false);
  const { status, error, channel, muted, talking, speaking } = useVoice();
  const ptt = useSettings((s) => s.pushToTalk);
  const uid = useAuth((s) => s.user?.uid);
  const toast = useUi((s) => s.toast);

  useEffect(() => {
    if (status === 'error' && error) toast(`voice.err.${error}`, undefined, 'warn');
  }, [status, error, toast]);

  // Host switched voice off → leave locally.
  useEffect(() => {
    if (!roomVoice && (status === 'on' || status === 'connecting')) void voice.leave();
  }, [roomVoice, status]);

  if (!roomVoice) return null;

  if (status !== 'on') {
    return (
      <button
        onClick={() => void voice.join()}
        disabled={status === 'connecting'}
        className={`pointer-events-auto flex h-11 items-center gap-2 rounded-xl border px-3 text-sm disabled:opacity-60 ${
          status === 'error' ? 'border-laterite/70 bg-ink/80 text-laterite' : 'border-line bg-ink/80 text-paper hover:bg-panel-2'
        }`}
        title={status === 'error' && error ? t(`voice.err.${error}`) : undefined}
      >
        <MicIcon off={status === 'error'} />
        {!compact && <span>{status === 'connecting' ? t('voice.connecting') : t('voice.join')}</span>}
      </button>
    );
  }

  const live = !muted && (!ptt || talking);
  const iSpeak = !!uid && speaking.includes(uid);
  const label = channel ? t(CHANNEL_KEY[channel]!) : t('voice.paused');

  return (
    <div className="pointer-events-auto flex h-11 items-center gap-1 rounded-xl border border-line bg-ink/80 pl-1 pr-1 text-sm">
      {ptt ? (
        <button
          onPointerDown={() => voice.setTalking(true)}
          onPointerUp={() => voice.setTalking(false)}
          onPointerLeave={() => voice.setTalking(false)}
          onPointerCancel={() => voice.setTalking(false)}
          className={`flex h-9 touch-none select-none items-center gap-1.5 rounded-lg px-2 ${talking ? 'bg-moss text-paper' : 'text-mist hover:bg-panel-2'}`}
          aria-label={t('voice.hold')}
        >
          <MicIcon off={!talking} />
          {!compact && <span className="text-xs">{t('voice.hold')}</span>}
        </button>
      ) : (
        <button
          onClick={() => voice.setMuted(!muted)}
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${muted ? 'text-laterite hover:bg-panel-2' : 'text-paper hover:bg-panel-2'} ${
            iSpeak && live ? 'ring-2 ring-leaf' : ''
          }`}
          aria-label={muted ? t('voice.unmute') : t('voice.mute')}
          aria-pressed={muted}
        >
          <MicIcon off={muted} />
        </button>
      )}
      {!compact && <span className={`px-1 text-xs ${channel ? 'text-leaf' : 'text-rain'}`}>{label}</span>}
      <button onClick={() => void voice.leave()} className="flex h-9 w-7 items-center justify-center rounded-lg text-rain hover:bg-panel-2 hover:text-paper" aria-label={t('voice.leave')}>
        ×
      </button>
    </div>
  );
}

/** Per-player voice state for avatars/cards: speaking ring + muted badge. */
export function useVoicePeer(id: string): { inVoice: boolean; muted: boolean; speaking: boolean } {
  const uid = useAuth((s) => s.user?.uid);
  const status = useVoice((s) => s.status);
  const channel = useVoice((s) => s.channel);
  const peer = useVoice((s) => s.peers.find((p) => p.id === id));
  const speaking = useVoice((s) => s.speaking.includes(id));
  const selfMuted = useVoice((s) => s.muted);
  if (status !== 'on' || !channel) return { inVoice: false, muted: false, speaking: false };
  if (id === uid) return { inVoice: true, muted: selfMuted, speaking };
  return { inVoice: !!peer, muted: peer?.muted ?? false, speaking: !!peer && speaking };
}

export function VoiceBadge({ id }: { id: string }) {
  const v = useVoicePeer(id);
  if (!v.inVoice) return null;
  return (
    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${v.muted ? 'bg-laterite/80 text-paper' : v.speaking ? 'bg-leaf text-ink' : 'bg-panel-2 text-mist'}`}>
      <MicIcon off={v.muted} className="h-3.5 w-3.5" />
    </span>
  );
}
