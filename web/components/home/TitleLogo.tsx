'use client';

/**
 * Chunky title-screen logo: cream-to-lamp gradient letters with a thick dark
 * outline, and a small shadow-cat peeking over the first letter. The Malayalam
 * name sits beneath in turmeric gold.
 */
export function TitleLogo({ compact }: { compact?: boolean }) {
  const size = compact ? 'text-[2.4rem] sm:text-5xl [@media(max-height:480px)]:text-[2.1rem]' : 'text-5xl sm:text-7xl';
  const title = 'NIZHALPOOCHA';
  const letters = (
    <span className={`inline-block px-1 pt-2 font-display font-extrabold tracking-wide ${size}`} style={{ lineHeight: 1.05 }}>
      {title}
    </span>
  );
  return (
    <div className="relative select-none text-center" role="img" aria-label="Nizhalpoocha · നിഴൽപ്പൂച്ച">
      <div className="relative inline-block">
        {/* Peeking cat on the N */}
        <svg viewBox="0 0 60 40" className={`absolute left-0 ${compact ? '-top-3 w-10' : '-top-5 w-14 sm:-top-6 sm:w-16'}`} aria-hidden>
          <path d="M6 38 L8 6 L20 18 Q30 14 40 18 L52 6 L54 38 Z" fill="#070a09" stroke="#f1b43e" strokeWidth="1.5" />
          <ellipse cx="22" cy="28" rx="4.5" ry="3" fill="#f1b43e" className="animate-[blink_5s_infinite]" />
          <ellipse cx="38" cy="28" rx="4.5" ry="3" fill="#f1b43e" className="animate-[blink_5s_infinite]" />
          <ellipse cx="22" cy="28" rx="1" ry="2.6" fill="#070a09" />
          <ellipse cx="38" cy="28" rx="1" ry="2.6" fill="#070a09" />
        </svg>
        {/* Outline + drop shadow layer */}
        <span
          aria-hidden
          className="absolute inset-0 text-transparent"
          style={{ WebkitTextStroke: compact ? '9px #1b0f06' : '12px #1b0f06', filter: 'drop-shadow(0 6px 0 #0b0604) drop-shadow(0 10px 24px rgba(0,0,0,.6))' }}
        >
          {letters}
        </span>
        {/* Gradient fill layer */}
        <span className="relative inline-block bg-gradient-to-b from-[#fff7e3] via-[#f6d58a] to-[#e39a2c] bg-clip-text text-transparent">{letters}</span>
      </div>
      <div
        className={`font-display font-extrabold leading-tight text-lamp ${compact ? 'text-xl [@media(max-height:480px)]:text-base' : 'text-2xl sm:text-3xl'}`}
        style={{ textShadow: '1.5px 1.5px 0 #1b0f06, -1.5px -1.5px 0 #1b0f06, 1.5px -1.5px 0 #1b0f06, -1.5px 1.5px 0 #1b0f06, 0 1.5px 0 #1b0f06, 0 -1.5px 0 #1b0f06, 1.5px 0 0 #1b0f06, -1.5px 0 0 #1b0f06, 0 3px 0 #1b0f06, 0 0 18px rgba(241,180,62,.35)' }}
      >
        നിഴൽപ്പൂച്ച
      </div>
    </div>
  );
}
