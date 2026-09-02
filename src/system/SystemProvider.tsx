import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { Presence } from './audio';
import { useReducedMotion } from './hooks';
import type { SectionId } from './lexicon';

/**
 * The VRAXXIS runtime.
 *
 * One source of truth for the things the interface claims to know about
 * itself: how many observers there are, which regions have been entered
 * and how often, what has been discovered, whether the presence is audible,
 * and when the next anomaly is permitted to occur.
 */

export type AnomalyChannel =
  | 'nav' | 'hero' | 'index' | 'object' | 'memory' | 'terminus' | 'statement' | 'signal';

const CHANNELS: AnomalyChannel[] = ['nav', 'hero', 'index', 'object', 'memory', 'terminus', 'statement', 'signal'];

export type Discovery = 'internal' | 'persistent-observer' | 'null-found' | 'dimensions' | 'sealed';

interface SystemValue {
  /** Starts at 1. The observer is not told who the second one is. */
  observers: number;
  addObserver: () => void;

  /** Visit counts per region. Revisiting a region changes what is in it. */
  visits: Record<string, number>;
  enterRegion: (id: SectionId) => void;

  discoveries: ReadonlySet<Discovery>;
  discover: (d: Discovery) => void;

  audioOn: boolean;
  toggleAudio: () => void;
  click: (intensity?: number) => void;
  tone: (freq?: number, dur?: number) => void;

  /** Broadcast anomaly ticks. A component re-renders only when its own channel fires. */
  subscribeAnomaly: (ch: AnomalyChannel, fn: () => void) => () => void;
  provokeAnomaly: (ch: AnomalyChannel) => void;

  reduced: boolean;

  /**
   * Session clock, in whole seconds, for callers that need it at the moment
   * they act rather than continuously. Reading it never causes a render.
   * Components that display the clock use `useUptime` instead.
   */
  uptimeRef: { readonly current: number };
}

const SystemContext = createContext<SystemValue | null>(null);

/**
 * The clock is deliberately kept out of the main context. Putting a value
 * that changes every second next to values that change once an hour would
 * re-render the entire interface sixty times a minute to animate one
 * counter, which is precisely the kind of thing this build refuses to do.
 */
const UptimeContext = createContext(0);

export function SystemProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  const [observers, setObservers] = useState(1);
  const [visits, setVisits] = useState<Record<string, number>>({});
  const [discoveries, setDiscoveries] = useState<ReadonlySet<Discovery>>(() => new Set());
  const [audioOn, setAudioOn] = useState(false);
  const [uptime, setUptime] = useState(0);

  const presence = useRef<Presence | null>(null);
  if (presence.current === null) presence.current = new Presence();
  useEffect(() => () => { presence.current?.dispose(); presence.current = null; }, []);

  // --- OBSERVERS -------------------------------------------------------
  const addObserver = useCallback(() => {
    setObservers((n) => Math.min(n + 1, 2));
    presence.current?.tone(96, 0.4);
  }, []);

  // --- REGIONS ---------------------------------------------------------
  const enterRegion = useCallback((id: SectionId) => {
    setVisits((v) => (v[id] === undefined ? { ...v, [id]: 1 } : { ...v, [id]: v[id] + 1 }));
  }, []);

  const discover = useCallback((d: Discovery) => {
    setDiscoveries((s) => (s.has(d) ? s : new Set(s).add(d)));
  }, []);

  // --- PRESENCE --------------------------------------------------------
  const toggleAudio = useCallback(() => {
    setAudioOn((on) => {
      const next = !on;
      if (next) void presence.current?.start();
      else void presence.current?.stop();
      return next;
    });
  }, []);

  const click = useCallback((i = 1) => presence.current?.click(i), []);
  const tone = useCallback((f = 220, d = 0.16) => presence.current?.tone(f, d), []);

  // Suspend the bed when the tab is not being observed.
  useEffect(() => {
    const onVis = () => {
      if (!audioOn) return;
      if (document.hidden) void presence.current?.stop();
      else void presence.current?.start();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [audioOn]);

  // --- UPTIME ----------------------------------------------------------
  const uptimeRef = useRef(0);
  uptimeRef.current = uptime;
  useEffect(() => {
    const id = window.setInterval(() => setUptime((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // --- ANOMALY SCHEDULER -----------------------------------------------
  // Rare by construction. If an observer can predict the next one, or
  // notices them arriving in a rhythm, the effect is already dead.
  const subs = useRef(new Map<AnomalyChannel, Set<() => void>>());

  const subscribeAnomaly = useCallback((ch: AnomalyChannel, fn: () => void) => {
    const map = subs.current;
    if (!map.has(ch)) map.set(ch, new Set());
    map.get(ch)!.add(fn);
    return () => { map.get(ch)?.delete(fn); };
  }, []);

  const provokeAnomaly = useCallback((ch: AnomalyChannel) => {
    subs.current.get(ch)?.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    if (reduced) return;
    let timer = 0;
    const schedule = () => {
      // 14–41 seconds. Never a round number, never twice the same gap.
      const wait = 14000 + Math.random() * 27000;
      timer = window.setTimeout(() => {
        if (!document.hidden) {
          const live = CHANNELS.filter((c) => (subs.current.get(c)?.size ?? 0) > 0);
          if (live.length) provokeAnomaly(live[(Math.random() * live.length) | 0]);
        }
        schedule();
      }, wait);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [reduced, provokeAnomaly]);

  const value = useMemo<SystemValue>(() => ({
    observers, addObserver,
    visits, enterRegion,
    discoveries, discover,
    audioOn, toggleAudio, click, tone,
    subscribeAnomaly, provokeAnomaly,
    reduced, uptimeRef,
  }), [observers, addObserver, visits, enterRegion, discoveries, discover,
       audioOn, toggleAudio, click, tone, subscribeAnomaly, provokeAnomaly, reduced]);

  // `children` keeps its identity across clock ticks, so the tick re-renders
  // only the components that actually read the clock.
  return (
    <SystemContext.Provider value={value}>
      <UptimeContext.Provider value={uptime}>{children}</UptimeContext.Provider>
    </SystemContext.Provider>
  );
}

/** Subscribes to the session clock. Re-renders once per second, by design. */
export function useUptime(): number {
  return useContext(UptimeContext);
}

export function useSystem(): SystemValue {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error('VRAXXIS: component addressed the runtime from outside it.');
  return ctx;
}

/**
 * Subscribe to one anomaly channel. Returns a counter that increments when
 * the channel fires; components key their brief misbehaviour off it.
 */
export function useAnomaly(ch: AnomalyChannel): number {
  const { subscribeAnomaly } = useSystem();
  const [n, setN] = useState(0);
  useEffect(() => subscribeAnomaly(ch, () => setN((v) => v + 1)), [ch, subscribeAnomaly]);
  return n;
}
