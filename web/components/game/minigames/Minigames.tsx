'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/hooks/useT';
import { audio } from '@/services/audio';
import { Notice } from '@/components/ui/Feedback';

export interface MinigameProps {
  onDone: () => void;
}

function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j]!, r[i]!];
  }
  return r;
}

function Hint({ children, error }: { children: React.ReactNode; error?: string | null }) {
  return (
    <div className="mb-3 flex min-h-10 flex-col items-center gap-1.5 text-center text-sm leading-snug">
      <div className="text-mist">{children}</div>
      {error && (
        <Notice tone="danger" className="animate-rise py-1">
          {error}
        </Notice>
      )}
    </div>
  );
}

/** Shared well that frames every mini-game board. */
const BOARD = 'rounded-[var(--radius-card)] border-2 border-line bg-ink shadow-[inset_0_2px_10px_rgb(0_0_0/0.45)]';
/** Tactile tile used by the tap-based puzzles. */
const TILE = 'tactile rounded-2xl border-2 border-line border-b-ink bg-panel-2 text-paper hover:border-lamp/60';

// ── 1. Wires ────────────────────────────────────────────────────────────
const WIRE_COLORS = ['var(--color-laterite)', 'var(--color-lamp)', 'var(--color-canal)', 'var(--color-leaf)'];

export function WiresGame({ onDone }: MinigameProps) {
  const t = useT();
  const right = useMemo(() => shuffle([0, 1, 2, 3]), []);
  const [picked, setPicked] = useState<number | null>(null);
  const [links, setLinks] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const rowY = (i: number) => 30 + i * 60;

  const connect = (rightIndex: number) => {
    if (picked === null) return;
    const color = right[rightIndex]!;
    if (color === picked) {
      audio.play('click');
      const next = { ...links, [picked]: rightIndex };
      setLinks(next);
      setError(null);
      if (Object.keys(next).length === 4) setTimeout(onDone, 250);
    } else {
      audio.play('warning');
      setError(t('mini.wrong'));
    }
    setPicked(null);
  };

  return (
    <div>
      <Hint error={error}>{t('mini.wires')}</Hint>
      <div className={`relative mx-auto h-[250px] w-full max-w-sm ${BOARD}`}>
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 300 250" preserveAspectRatio="none">
          {Object.entries(links).map(([l, r]) => (
            <path key={l} d={`M 40 ${rowY(+l)} C 150 ${rowY(+l)}, 150 ${rowY(r)}, 260 ${rowY(r)}`} stroke={WIRE_COLORS[+l]} strokeWidth="8" fill="none" strokeLinecap="round" />
          ))}
        </svg>
        {[0, 1, 2, 3].map((i) => (
          <button
            key={`l${i}`}
            onClick={() => links[i] === undefined && setPicked(i)}
            className={`absolute left-2 h-11 w-14 -translate-y-1/2 rounded-xl border-2 border-b-4 border-ink/60 shadow-[inset_0_2px_0_rgb(255_255_255/0.25)] transition-transform ${
              picked === i ? 'scale-110 outline outline-2 outline-offset-2 outline-paper' : links[i] !== undefined ? 'opacity-80' : 'hover:scale-105'
            }`}
            style={{ top: `${(rowY(i) / 250) * 100}%`, background: WIRE_COLORS[i] }}
            aria-label={`wire ${i + 1}`}
            aria-pressed={picked === i}
          />
        ))}
        {right.map((c, i) => (
          <button
            key={`r${i}`}
            onClick={() => connect(i)}
            className={`absolute right-2 h-11 w-14 -translate-y-1/2 rounded-xl border-2 border-b-4 border-ink/60 shadow-[inset_0_2px_0_rgb(255_255_255/0.25)] transition-transform ${picked !== null ? 'hover:scale-105' : ''}`}
            style={{ top: `${(rowY(i) / 250) * 100}%`, background: WIRE_COLORS[c] }}
            aria-label={`socket ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── 2. Number sequence ──────────────────────────────────────────────────
export function NumbersGame({ onDone }: MinigameProps) {
  const t = useT();
  const N = 8;
  const [order, setOrder] = useState(() => shuffle(Array.from({ length: N }, (_, i) => i + 1)));
  const [next, setNext] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const press = (n: number) => {
    if (n === next) {
      audio.play('click');
      setError(null);
      if (n === N) setTimeout(onDone, 200);
      setNext(n + 1);
    } else {
      audio.play('warning');
      setError(t('mini.wrong'));
      setNext(1);
      setOrder(shuffle(order));
    }
  };
  return (
    <div>
      <Hint error={error}>{t('mini.numbers', { n: N })}</Hint>
      <div className={`mx-auto grid max-w-xs grid-cols-4 gap-2 p-2 ${BOARD}`}>
        {order.map((n) => (
          <button
            key={n}
            onClick={() => press(n)}
            disabled={n < next}
            className={`h-16 font-display text-2xl font-extrabold ${
              n < next ? 'cursor-default rounded-2xl border-2 border-moss-deep bg-moss text-paper' : TILE
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── 3. Timing ───────────────────────────────────────────────────────────
export function TimingGame({ onDone }: MinigameProps) {
  const t = useT();
  const NEED = 2;
  const [hits, setHits] = useState(0);
  const [band, setBand] = useState(() => 0.2 + Math.random() * 0.6);
  const [error, setError] = useState<string | null>(null);
  const needle = useRef<HTMLDivElement>(null);
  const pos = useRef(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const p = ((now - start) / 1100) % 2;
      pos.current = p < 1 ? p : 2 - p;
      if (needle.current) needle.current.style.left = `${pos.current * 100}%`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const W = 0.16;
  const stop = () => {
    if (Math.abs(pos.current - band) <= W / 2) {
      audio.play('click');
      setError(null);
      const h = hits + 1;
      setHits(h);
      if (h >= NEED) setTimeout(onDone, 200);
      else setBand(0.15 + Math.random() * 0.7);
    } else {
      audio.play('warning');
      setError(t('mini.wrong'));
    }
  };
  return (
    <div>
      <Hint error={error}>{t('mini.timing', { n: NEED - hits })}</Hint>
      <div className="mb-3 flex justify-center gap-1.5" aria-hidden>
        {Array.from({ length: NEED }, (_, i) => (
          <span key={i} className={`h-2.5 w-8 rounded-full border ${i < hits ? 'border-leaf bg-leaf' : 'border-line bg-ink'}`} />
        ))}
      </div>
      <div className={`relative mx-auto mb-5 h-14 max-w-sm overflow-hidden ${BOARD}`}>
        <div className="absolute inset-y-0 border-x-2 border-leaf bg-moss/70" style={{ left: `${(band - W / 2) * 100}%`, width: `${W * 100}%` }} />
        <div ref={needle} className="absolute inset-y-1 w-1.5 -translate-x-1/2 rounded-full bg-lamp shadow-[0_0_10px_var(--color-lamp)]" />
      </div>
      <div className="flex justify-center">
        <button
          onClick={stop}
          className="tactile min-h-16 min-w-40 rounded-2xl border-2 border-gold-deep bg-lamp px-6 py-2 font-display text-xl font-extrabold uppercase leading-tight text-ink"
        >
          {t('mini.stop')}
        </button>
      </div>
    </div>
  );
}

// ── 4. Memory ───────────────────────────────────────────────────────────
export function MemoryGame({ onDone }: MinigameProps) {
  const t = useT();
  const LEN = 4;
  const [seq, setSeq] = useState<number[]>(() => Array.from({ length: LEN }, () => Math.floor(Math.random() * 9)));
  const [lit, setLit] = useState<number | null>(null);
  const [watching, setWatching] = useState(true);
  const [input, setInput] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!watching) return;
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const step = () => {
      if (i >= seq.length) {
        setLit(null);
        setWatching(false);
        return;
      }
      setLit(seq[i]!);
      audio.play('click');
      timers.push(setTimeout(() => setLit(null), 380));
      i++;
      timers.push(setTimeout(step, 560));
    };
    timers.push(setTimeout(step, 500));
    return () => timers.forEach(clearTimeout);
  }, [watching, seq]);

  const press = (n: number) => {
    if (watching) return;
    const next = [...input, n];
    if (seq[next.length - 1] !== n) {
      audio.play('warning');
      setError(t('mini.wrong'));
      setInput([]);
      setSeq(Array.from({ length: LEN }, () => Math.floor(Math.random() * 9)));
      setWatching(true);
      return;
    }
    audio.play('click');
    setError(null);
    setInput(next);
    setLit(n);
    setTimeout(() => setLit(null), 180);
    if (next.length === seq.length) setTimeout(onDone, 250);
  };

  return (
    <div>
      <Hint error={error}>
        {t('mini.memory')} <span className="font-display font-bold text-lamp">{watching ? t('mini.memoryWatch') : t('mini.memoryGo')}</span>
      </Hint>
      <div className="mb-3 flex justify-center gap-1.5" aria-hidden>
        {Array.from({ length: LEN }, (_, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < input.length ? 'bg-lamp' : 'bg-line'}`} />
        ))}
      </div>
      <div className={`mx-auto grid max-w-[15rem] grid-cols-3 gap-2 p-2 ${BOARD}`}>
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i}
            onClick={() => press(i)}
            className={`h-16 rounded-2xl border-2 transition-[background-color,box-shadow,border-color] duration-100 ${
              lit === i ? 'border-gold-deep bg-lamp shadow-[0_0_18px_var(--color-lamp)]' : 'border-line bg-panel-2'
            } ${watching ? 'cursor-wait' : 'hover:border-lamp/60'}`}
            aria-label={`lamp ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── 5. Arrange shop items (drag & drop via tap-to-place) ────────────────
const ITEMS = [
  { id: 'tea', shape: 'rounded-sm', color: 'var(--color-moss)', label: 'ചായപ്പൊടി' },
  { id: 'rice', shape: 'rounded-full', color: 'var(--color-paper)', label: 'അരി' },
  { id: 'banana', shape: 'rounded-[40%_10%]', color: 'var(--color-lamp)', label: 'പഴം' },
  { id: 'soap', shape: 'rounded-md rotate-45', color: 'var(--color-canal)', label: 'സോപ്പ്' },
];

export function ArrangeGame({ onDone }: MinigameProps) {
  const t = useT();
  const shelves = useMemo(() => shuffle(ITEMS), []);
  const [loose, setLoose] = useState(() => shuffle(ITEMS.map((i) => i.id)));
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const place = (shelfId: string) => {
    if (!picked) return;
    if (picked === shelfId) {
      audio.play('click');
      const p = { ...placed, [shelfId]: true };
      setPlaced(p);
      setLoose(loose.filter((x) => x !== shelfId));
      setError(null);
      if (Object.keys(p).length === ITEMS.length) setTimeout(onDone, 250);
    } else {
      audio.play('warning');
      setError(t('mini.wrong'));
    }
    setPicked(null);
  };
  const Icon = ({ id, size = 34 }: { id: string; size?: number }) => {
    const it = ITEMS.find((x) => x.id === id)!;
    return <span className={`inline-block shadow-[inset_0_-3px_0_rgb(0_0_0/0.25)] ${it.shape}`} style={{ width: size, height: size, background: it.color }} />;
  };
  return (
    <div>
      <Hint error={error}>{t('mini.arrange')}</Hint>
      <div className={`mx-auto mb-4 grid max-w-sm grid-cols-4 gap-2 p-2 ${BOARD}`}>
        {shelves.map((s) => (
          <button
            key={s.id}
            onClick={() => place(s.id)}
            className={`flex min-h-24 flex-col items-center justify-end rounded-xl border-2 border-b-8 border-line border-b-gold-deep bg-panel px-1 pb-2 transition-colors ${
              picked && !placed[s.id] ? 'hover:border-lamp/60 hover:border-b-gold-deep hover:bg-panel-2' : ''
            }`}
          >
            {placed[s.id] ? <Icon id={s.id} /> : <span className={`inline-block h-8 w-8 border-2 border-dashed border-rain/60 ${s.shape}`} />}
            <span className="mt-1 text-[11px] leading-tight text-mist">{s.label}</span>
          </button>
        ))}
      </div>
      <div className="flex min-h-16 flex-wrap justify-center gap-3">
        {loose.map((id) => (
          <button
            key={id}
            onClick={() => setPicked(id)}
            aria-pressed={picked === id}
            className={`tactile flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-b-ink ${picked === id ? 'border-lamp bg-lamp/15' : 'border-line bg-panel-2 hover:border-lamp/60'}`}
          >
            <Icon id={id} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── 6. Clear drain blockage ─────────────────────────────────────────────
export function ClearGame({ onDone }: MinigameProps) {
  const t = useT();
  const debris = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        id: i,
        x: 10 + Math.random() * 75,
        y: 10 + Math.random() * 70,
        rot: Math.random() * 180,
        leaf: i % 3 !== 0,
      })),
    [],
  );
  const [gone, setGone] = useState<Set<number>>(new Set());
  const clear = (id: number) => {
    audio.play('click');
    const g = new Set(gone);
    g.add(id);
    setGone(g);
    if (g.size === debris.length) setTimeout(onDone, 450);
  };
  return (
    <div>
      <Hint>{t('mini.clear')}</Hint>
      <div
        className="relative mx-auto h-56 max-w-sm overflow-hidden rounded-[var(--radius-card)] border-2 border-line"
        style={{
          background:
            gone.size === debris.length
              ? 'repeating-linear-gradient(90deg,var(--color-canal-deep) 0 14px,var(--color-canal) 14px 16px)'
              : 'repeating-linear-gradient(90deg,var(--color-ink) 0 14px,var(--color-panel-2) 14px 18px)',
        }}
      >
        {debris.map((d) => (
          <button
            key={d.id}
            onClick={() => clear(d.id)}
            className={`absolute h-12 w-16 transition-all duration-300 ${gone.has(d.id) ? 'pointer-events-none translate-x-40 opacity-0' : 'hover:brightness-110'}`}
            style={{ left: `${d.x}%`, top: `${d.y}%`, transform: `rotate(${d.rot}deg)` }}
            aria-label="debris"
          >
            <span className={`block h-full w-full shadow-[inset_0_-4px_0_rgb(0_0_0/0.3)] ${d.leaf ? 'rounded-[50%_0] bg-moss-deep' : 'rounded-md bg-mist/80'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Sabotage repair: press and hold ─────────────────────────────────────
export function HoldRepair({ onDone, ms = 1700 }: MinigameProps & { ms?: number }) {
  const t = useT();
  const [progress, setProgress] = useState(0);
  const holding = useRef(false);
  const done = useRef(false);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      setProgress((p) => {
        const next = holding.current ? Math.min(1, p + dt / ms) : Math.max(0, p - dt / (ms * 2));
        if (next >= 1 && !done.current) {
          done.current = true;
          setTimeout(onDone, 50);
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ms, onDone]);
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {/* Gold progress ring around the hold button */}
      <div
        className="rounded-full p-1.5 shadow-[0_0_24px_-6px_var(--color-lamp)]"
        style={{ background: `conic-gradient(var(--color-lamp) ${progress * 360}deg, var(--color-ink) 0deg)` }}
      >
        <button
          onPointerDown={() => (holding.current = true)}
          onPointerUp={() => (holding.current = false)}
          onPointerLeave={() => (holding.current = false)}
          onPointerCancel={() => (holding.current = false)}
          onKeyDown={(e) => e.key === ' ' && (holding.current = true)}
          onKeyUp={() => (holding.current = false)}
          className="tactile flex h-28 w-28 touch-none select-none items-center justify-center rounded-full border-4 border-gold-deep bg-panel-2 px-2 font-display text-lg font-extrabold uppercase leading-tight text-paper active:bg-lamp active:text-ink"
        >
          {t('mini.hold')}
        </button>
      </div>
      <div className="h-3 w-full max-w-xs overflow-hidden rounded-full border border-line bg-ink">
        <div className="h-full rounded-full bg-lamp" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
