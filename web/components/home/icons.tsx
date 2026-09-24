/** Simple line icons for the title screen (original, currentColor). */
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const IconTrophy = (p: { className?: string }) => (
  <svg {...base} className={p.className} aria-hidden>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4" />
  </svg>
);
export const IconGear = (p: { className?: string }) => (
  <svg {...base} className={p.className} aria-hidden>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
export const IconShirt = (p: { className?: string }) => (
  <svg {...base} className={p.className} aria-hidden>
    <path d="M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z" />
  </svg>
);
export const IconLanguage = (p: { className?: string }) => (
  <svg {...base} className={p.className} aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);
export const IconSound = ({ muted, className }: { muted?: boolean; className?: string }) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M4 9v6h4l5 4V5L8 9H4z" />
    {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M17 8a5 5 0 0 1 0 8M19.5 5.5a9 9 0 0 1 0 13" />}
  </svg>
);
export const IconDoor = (p: { className?: string }) => (
  <svg {...base} className={p.className} aria-hidden>
    <path d="M14 4H6v16h8M10 12h11M18 9l3 3-3 3" />
  </svg>
);
export const IconBook = (p: { className?: string }) => (
  <svg {...base} className={p.className} aria-hidden>
    <path d="M2 5.5C4.5 4 8 4 12 6c4-2 7.5-2 10-.5V19c-2.5-1.5-6-1.5-10 .5-4-2-7.5-2-10-.5V5.5zM12 6v13.5" />
  </svg>
);
export const IconBolt = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} aria-hidden>
    <path d="M13.5 2 4 13.5h6.5L9 22l11-12.5h-6.8L13.5 2z" fill="#f6d34a" stroke="#1b0f06" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);
export const IconKey = (p: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={p.className} aria-hidden>
    <circle cx="16" cy="24" r="9" fill="none" stroke="#e9b04f" strokeWidth="4" />
    <path d="M25 24h18M37 24v7M43 24v5" stroke="#e9b04f" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
export const IconMoon = (p: { className?: string }) => (
  <svg {...base} className={p.className} aria-hidden>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    <path d="M15 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" />
  </svg>
);
