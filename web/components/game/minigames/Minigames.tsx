'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/hooks/useT';
import { audio } from '@/services/audio';

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
    <div className="mb-3 min-h-10 text-center text-sm">
      <div className="text-mist">{children}</div>
      {error && <div className="text-laterite">{error}</div>}
    </div>
  );
}

// ── 1. Wires ────────────────────────────────────────────────────────────
const WIRE_COLORS = ['#b5573a', '#e9b04f', '#3f6f86', '#3f7d5c'];

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
      <div className="relative mx-auto h-[250px] w-full max-w-sm rounded-xl border border-line bg-night">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 300 250" preserveAspectRatio="none">
          {Object.entries(links).map(([l, r]) => (
            <path key={l} d={`M 40 ${rowY(+l)} C 150 ${rowY(+l)}, 150 ${rowY(r)}, 260 ${rowY(r)}`} stroke={WIRE_COLORS[+l]} strokeWidth="8" fill="none" strokeLinecap="round" />
          ))}
        </svg>
        {[0, 1, 2, 3].map((i) => (
          <button
            key={`l${i}`}
            onClick={() => links[i] === undefined && setPicked(i)}
            className={`absolute left-2 h-11 w-14 -translate-y-1/2 rounded-lg border-2 ${picked === i ? 'border-paper' : 'border-transparent'}`}
            style={{ top: `${(rowY(i) / 250) * 100}%`, background: WIRE_COLORS[i] }}
            aria-label={`wire ${i + 1}`}
          />
        ))}
        {right.map((c, i) => (
          <button
            key={`r${i}`}
            onClick={() => connect(i)}
            className="absolute right-2 h-11 w-14 -translate-y-1/2 rounded-lg border-2 border-transparent"
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
      <div className="mx-auto grid max-w-xs grid-cols-4 gap-2">
        {order.map((n) => (
          <button
            key={n}
            onClick={() => press(n)}
            disabled={n < next}
            className={`h-16 rounded-xl border-2 font-display text-2xl transition-colors ${n < next ? 'border-moss bg-moss text-paper' : 'border-line bg-night text-paper hover:bg-panel-2'}`}
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
      <div className="relative mx-auto mb-5 h-14 max-w-sm overflow-hidden rounded-xl border border-line bg-night">
        <div className="absolute inset-y-0 bg-moss/70" style={{ left: `${(band - W / 2) * 100}%`, width: `${W * 100}%` }} />
        <div ref={needle} className="absolute inset-y-1 w-1.5 -translate-x-1/2 rounded bg-lamp" />
      </div>
      <div className="flex justify-center">
        <button onClick={stop} className="h-16 w-40 rounded-2xl border-2 border-lamp bg-lamp font-display text-xl text-ink active:scale-95">
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
        {t('mini.memory')} <span className="text-lamp">{watching ? t('mini.memoryWatch') : t('mini.memoryGo')}</span>
      </Hint>
      <div className="mx-auto grid max-w-[15rem] grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i}
            onClick={() => press(i)}
            className={`h-16 rounded-xl border-2 transition-colors ${lit === i ? 'border-lamp bg-lamp' : 'border-line bg-night'} ${watching ? 'cursor-wait' : ''}`}
            aria-label={`lamp ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── 5. Arrange shop items (drag & drop via tap-to-place) ────────────────
const ITEMS = [
  { id: 'tea', shape: 'rounded-sm', color: '#3f7d5c', label: 'ചായപ്പൊടി' },
  { id: 'rice', shape: 'rounded-full', color: '#e8e1cf', label: 'അരി' },
  { id: 'banana', shape: 'rounded-[40%_10%]', color: '#d8b640', label: 'പഴം' },
  { id: 'soap', shape: 'rounded-md rotate-45', color: '#6b4e8a', label: 'സോപ്പ്' },
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
    return <span className={`inline-block ${it.shape}`} style={{ width: size, height: size, background: it.color }} />;
  };
  return (
    <div>
      <Hint error={error}>{t('mini.arrange')}</Hint>
      <div className="mx-auto mb-4 grid max-w-sm grid-cols-4 gap-2">
        {shelves.map((s) => (
          <button key={s.id} onClick={() => place(s.id)} className="flex h-24 flex-col items-center justify-end rounded-xl border-b-8 border-[#5a3e27] bg-night pb-2">
            {placed[s.id] ? <Icon id={s.id} /> : <span className={`inline-block h-8 w-8 border-2 border-dashed border-rain/60 ${s.shape}`} />}
            <span className="mt-1 text-[11px] text-rain">{s.label}</span>
          </button>
        ))}
      </div>
      <div className="flex min-h-16 flex-wrap justify-center gap-3">
        {loose.map((id) => (
          <button key={id} onClick={() => setPicked(id)} className={`flex h-16 w-16 items-center justify-center rounded-xl border-2 bg-panel-2 ${picked === id ? 'border-paper' : 'border-line'}`}>
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
        className="relative mx-auto h-56 max-w-sm overflow-hidden rounded-xl border border-line"
        style={{
          background:
            gone.size === debris.length
              ? 'repeating-linear-gradient(90deg,#1f4a5a 0 14px,#2b5e70 14px 16px)'
              : 'repeating-linear-gradient(90deg,#1b1f20 0 14px,#3a3f41 14px 18px)',
        }}
      >
        {debris.map((d) => (
          <button
            key={d.id}
            onClick={() => clear(d.id)}
            className={`absolute h-12 w-16 transition-all duration-300 ${gone.has(d.id) ? 'pointer-events-none translate-x-40 opacity-0' : ''}`}
            style={{ left: `${d.x}%`, top: `${d.y}%`, transform: `rotate(${d.rot}deg)` }}
            aria-label="debris"
          >
            <span className={`block h-full w-full ${d.leaf ? 'rounded-[50%_0] bg-[#4f6b2f]' : 'rounded-md bg-[#c9c2b0]/80'}`} />
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
    <div className="flex flex-col items-center gap-4">
      <div className="h-4 w-full max-w-xs overflow-hidden rounded-full bg-night">
        <div className="h-full bg-lamp" style={{ width: `${progress * 100}%` }} />
      </div>
      <button
        onPointerDown={() => (holding.current = true)}
        onPointerUp={() => (holding.current = false)}
        onPointerLeave={() => (holding.current = false)}
        onPointerCancel={() => (holding.current = false)}
        onKeyDown={(e) => e.key === ' ' && (holding.current = true)}
        onKeyUp={() => (holding.current = false)}
        className="h-28 w-28 touch-none select-none rounded-full border-4 border-lamp bg-panel-2 font-display text-lg active:bg-lamp active:text-ink"
      >
        {t('mini.hold')}
      </button>
    </div>
  );
}
