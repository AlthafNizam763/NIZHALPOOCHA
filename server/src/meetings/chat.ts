import { GAME, QUICK_CHAT_IDS } from '@nizhal/shared';

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g;

/** Normalizes user chat text; returns null when nothing printable remains. */
export function sanitizeChat(text: string): string | null {
  const clean = text.replace(CONTROL, '').replace(/\s+/g, ' ').trim().slice(0, GAME.MAX_CHAT_LENGTH);
  return clean.length > 0 ? clean : null;
}

export function isQuickChatId(id: string): boolean {
  return (QUICK_CHAT_IDS as readonly string[]).includes(id);
}
