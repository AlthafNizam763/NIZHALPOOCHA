/**
 * The Nizhalpoocha's true form — an original shadow-cat silhouette with lamp-lit
 * eyes. Only ever shown after a legitimate reveal (role reveal to the Cat
 * itself, confirmed ejection, or the end-of-match reveal).
 */
export function CatForm({ size = 120, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <radialGradient id="catAura" cx="0.5" cy="0.55" r="0.5">
          <stop offset="0" stopColor="#3f6f86" stopOpacity="0.35" />
          <stop offset="1" stopColor="#3f6f86" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="64" r="56" fill="url(#catAura)" />
      {/* tail curling like smoke */}
      <path d="M86 98 C112 92 112 62 96 56 C88 53 84 62 92 66" fill="none" stroke="#070a09" strokeWidth="7" strokeLinecap="round" />
      {/* body */}
      <path d="M34 104 C30 78 38 60 60 58 C82 60 90 78 86 104 Z" fill="#070a09" />
      {/* head with ears */}
      <path d="M36 50 L34 20 L50 34 Q60 30 70 34 L86 20 L84 50 Q84 66 60 68 Q36 66 36 50 Z" fill="#070a09" />
      {/* kasavu-gold collar hint */}
      <path d="M44 66 Q60 74 76 66" fill="none" stroke="#d8b640" strokeWidth="2" opacity="0.8" />
      {/* eyes */}
      <ellipse cx="50" cy="48" rx="5" ry="3.4" fill="#f1b43e" />
      <ellipse cx="70" cy="48" rx="5" ry="3.4" fill="#f1b43e" />
      <ellipse cx="50" cy="48" rx="1.2" ry="3" fill="#070a09" />
      <ellipse cx="70" cy="48" rx="1.2" ry="3" fill="#070a09" />
      {/* whiskers */}
      <g stroke="#2e3c36" strokeWidth="1">
        <path d="M44 56 L28 54" />
        <path d="M44 58 L28 60" />
        <path d="M76 56 L92 54" />
        <path d="M76 58 L92 60" />
      </g>
    </svg>
  );
}
