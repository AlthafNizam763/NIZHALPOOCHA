/**
 * Menu backdrop: a quiet Kadalimukku skyline at night — coconut palms, a
 * tiled-roof house and one warm street lamp — under light rain.
 */
export function MonsoonBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_85%,#243a30_0%,#131c19_45%,#0b100e_100%)]" />
      <svg className="absolute bottom-0 left-0 h-[46vh] min-h-56 w-full" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice">
        <defs>
          <radialGradient id="lampglow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#e9b04f" stopOpacity="0.55" />
            <stop offset="1" stopColor="#e9b04f" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* distant palms */}
        <g fill="#16241e">
          {[80, 260, 520, 930, 1110].map((x, i) => (
            <g key={x} transform={`translate(${x} ${150 + (i % 2) * 20})`}>
              <rect x="-4" y="0" width="8" height="260" rx="3" />
              {[-70, -35, 0, 35, 70, 110, -110].map((a) => (
                <ellipse key={a} cx="0" cy="0" rx="62" ry="10" transform={`rotate(${a}) translate(46 0)`} />
              ))}
            </g>
          ))}
        </g>
        {/* house with Kerala roof */}
        <g transform="translate(640 250)">
          <path d="M-150 30 L0 -60 L150 30 Z" fill="#3a1d15" />
          <path d="M-120 30 L0 -38 L120 30 Z" fill="#5a2a1c" />
          <rect x="-110" y="30" width="220" height="120" fill="#1d2622" />
          <rect x="-24" y="62" width="48" height="88" fill="#0e1512" />
          <rect x="52" y="60" width="34" height="30" fill="#e9b04f" opacity="0.55" />
        </g>
        {/* lamp */}
        <circle cx="420" cy="232" r="120" fill="url(#lampglow)" />
        <rect x="416" y="232" width="7" height="170" fill="#0f1714" />
        <rect x="404" y="226" width="30" height="8" rx="3" fill="#e9b04f" />
        {/* ground */}
        <rect x="0" y="380" width="1200" height="20" fill="#0e1512" />
        <rect x="0" y="372" width="1200" height="8" fill="#1a2521" />
      </svg>
      <div className="menu-rain absolute inset-0" />
    </div>
  );
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className="text-center leading-none select-none">
      <div className={`font-display tracking-wide text-paper ${small ? 'text-3xl' : 'text-5xl sm:text-6xl'}`}>NIZHALPOOCHA</div>
      <div className={`font-display text-lamp ${small ? 'mt-1 text-lg' : 'mt-2 text-2xl'}`}>നിഴൽപ്പൂച്ച</div>
    </div>
  );
}
