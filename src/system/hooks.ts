import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

/**
 * A single shared animation frame driver.
 * Every moving part in VRAXXIS subscribes here instead of opening its own
 * loop, so the page runs exactly one rAF regardless of how much is alive.
 */
type Frame = (t: number, dt: number) => void;
const subscribers = new Set<Frame>();
let running = false;
let last = 0;

function tick(t: number) {
  const dt = last === 0 ? 16.7 : Math.min(t - last, 50);
  last = t;
  for (const fn of subscribers) fn(t, dt);
  if (subscribers.size > 0) requestAnimationFrame(tick);
  else { running = false; last = 0; }
}

export function useRaf(fn: Frame, active = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const wrapped: Frame = (t, dt) => ref.current(t, dt);
    subscribers.add(wrapped);
    if (!running) { running = true; requestAnimationFrame(tick); }
    return () => { subscribers.delete(wrapped); };
  }, [active]);
}

/** Honours the operating system. Updates live if the setting changes. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Coarse pointers get a different manifestation of the interface. */
export const useCoarsePointer = () => useMedia('(hover: none), (pointer: coarse)');

/** Element visibility. Used to suspend work that nobody is looking at. */
export function useInView<T extends Element>(
  opts: IntersectionObserverInit = { rootMargin: '15% 0px', threshold: 0 }
) {
  // Annotated so the ref stays writable: callers routinely need to point
  // both this and a local ref at the same node.
  const ref: MutableRefObject<T | null> = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const optsRef = useRef(opts);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), optsRef.current);
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

/** Observed size of an element, for canvases that must not be blurry. */
export function useSize<T extends HTMLElement>() {
  const ref: MutableRefObject<T | null> = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Fires escalating stages after periods of no input. Resets on any input. */
export function useIdleStage(stages: readonly number[], enabled = true): number {
  const [stage, setStage] = useState(0);
  const timers = useRef<number[]>([]);
  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStage(0);
    if (!enabled) return;
    stages.forEach((ms, i) => {
      timers.current.push(window.setTimeout(() => setStage(i + 1), ms));
    });
  }, [stages, enabled]);

  useEffect(() => {
    reset();
    const events: (keyof WindowEventMap)[] = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      timers.current.forEach(clearTimeout);
    };
  }, [reset]);

  return enabled ? stage : 0;
}

/** A latch that raises for a duration and then lowers itself. Cleans up. */
export function useTransient(duration = 1800): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const raise = useCallback(() => {
    setOn(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOn(false), duration);
  }, [duration]);
  return [on, raise];
}
