export type TimerHandle = { cancel(): void };

/** Time source injected into rooms/matches so tests can drive time manually. */
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): TimerHandle;
  setInterval(fn: () => void, ms: number): TimerHandle;
}

export const realClock: Clock = {
  now: () => Date.now(),
  setTimeout(fn, ms) {
    const h = setTimeout(fn, ms);
    return { cancel: () => clearTimeout(h) };
  },
  setInterval(fn, ms) {
    const h = setInterval(fn, ms);
    return { cancel: () => clearInterval(h) };
  },
};
