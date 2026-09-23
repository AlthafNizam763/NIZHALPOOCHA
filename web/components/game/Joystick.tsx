'use client';
import { useRef, useState } from 'react';
import { bridge } from '@/game/bridge';

/** Floating virtual joystick: touch anywhere in its zone, drag to move. */
export function Joystick({ side }: { side: 'left' | 'right' }) {
  const zone = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [base, setBase] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const R = 52;

  const update = (cx: number, cy: number, b: { x: number; y: number }) => {
    let dx = cx - b.x;
    let dy = cy - b.y;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob({ x: dx, y: dy });
    const mag = Math.min(1, d / R);
    // Small dead zone, then full speed quickly for responsive control.
    const k = mag < 0.15 ? 0 : Math.min(1, (mag - 0.15) / 0.55);
    bridge.joy.x = d > 0 ? (dx / Math.max(1, Math.hypot(dx, dy))) * k : 0;
    bridge.joy.y = d > 0 ? (dy / Math.max(1, Math.hypot(dx, dy))) * k : 0;
  };

  const end = () => {
    pointer.current = null;
    setBase(null);
    setKnob({ x: 0, y: 0 });
    bridge.resetInput();
  };

  return (
    <div
      ref={zone}
      className={`absolute bottom-0 z-20 h-[55%] w-[42%] touch-none ${side === 'left' ? 'left-0' : 'right-0'}`}
      onPointerDown={(e) => {
        if (pointer.current !== null) return;
        pointer.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        const rect = zone.current!.getBoundingClientRect();
        const b = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setBase(b);
        update(b.x, b.y, b);
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== pointer.current || !base) return;
        const rect = zone.current!.getBoundingClientRect();
        update(e.clientX - rect.left, e.clientY - rect.top, base);
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {base ? (
        <div className="pointer-events-none absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper/25 bg-black/25" style={{ left: base.x, top: base.y }}>
          <div
            className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full border-2 border-paper/50 bg-paper/25"
            style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
          />
        </div>
      ) : (
        <div className={`pointer-events-none absolute bottom-8 h-24 w-24 rounded-full border-2 border-paper/15 ${side === 'left' ? 'left-8' : 'right-8'}`}>
          <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper/15" />
        </div>
      )}
    </div>
  );
}
