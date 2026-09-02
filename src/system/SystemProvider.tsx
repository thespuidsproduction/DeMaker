import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { Presence } from './audio';
import { useReducedMotion } from './hooks';
import type { SectionId } from './lexicon';
import { SESSION, skeyed, spick } from './session';

/**
 * THE VRAXXIS RUNTIME
 *
 * Three things are kept here, and they are separate on purpose.
 *
 *   TEMPERAMENT  — what kind of thing the system is inclined to do.
 *   RHYTHM       — when it is inclined to do anything at all.
 *   DEPTH        — how far in the observer has gone, and therefore how much
 *                  of the ordinary interface it is still willing to provide.
 *
 * No component decides on its own to misbehave. A component declares which
 * channel it listens on, and acts only when the runtime addresses it. That
 * is the difference between an interface with a presence and a page with
 * effects scattered through it.
 */

export type AnomalyChannel =
  | 'nav' | 'hero' | 'index' | 'object' | 'terminus' | 'statement' | 'signal' | 'residue';

const CHANNELS: AnomalyChannel[] = ['nav', 'hero', 'index', 'object', 'terminus', 'statement', 'signal', 'residue'];

/**
 * What the system does when it acts. Never more than one of these at a time,
 * and never twice in a row in the same place.
 */
export type AnomalyKind =
  | 'shift'      // something is a few pixels from where it was
  | 'flip'       // a reading contradicts itself, then does not
  | 'open'       // something that was closed is briefly not
  | 'withdraw'   // something stops answering for a while
  | 'linger'     // something outstays the duration it was given
  | 'relocate';  // an object is simply elsewhere

/**
 * TEMPERAMENT.
 *
 * Not a mood indicator, not a character, and never named anywhere in the
 * interface. It exists only to bias which kind of thing happens next, so
 * that a run of events reads as one disposition rather than as a shuffle.
 */
export type Temper = 'indifferent' | 'observant' | 'impatient' | 'contradictory' | 'accommodating';

const KIND_BY_TEMPER: Record<Temper, readonly AnomalyKind[]> = {
  indifferent:   ['withdraw', 'withdraw', 'shift'],
  observant:     ['linger', 'shift', 'linger'],
  impatient:     ['relocate', 'shift', 'relocate'],
  contradictory: ['flip', 'flip', 'shift'],
  accommodating: ['open', 'linger', 'open'],
};

/** Temperaments the session may settle into unprompted, in its own order. */
const DRIFT: readonly Temper[] = ['indifferent', 'observant', 'contradictory', 'accommodating', 'indifferent', 'observant'];

export type Discovery = 'internal' | 'persistent-observer' | 'null-found' | 'dimensions' | 'sealed' | 'depth' | 'beyond' | 'aperture';

export interface AnomalyEvent { n: number; kind: AnomalyKind; }

interface SystemValue {
  observers: number;
  addObserver: () => void;

  visits: Record<string, number>;
  enterRegion: (id: SectionId) => void;

  discoveries: ReadonlySet<Discovery>;
  discover: (d: Discovery) => void;

  audioOn: boolean;
  toggleAudio: () => void;
  click: (intensity?: number) => void;
  tone: (freq?: number, dur?: number) => void;

  subscribeAnomaly: (ch: AnomalyChannel, fn: (e: AnomalyEvent) => void) => () => void;

  /** Current inclination. Read it to bias behaviour; never print it. */
  temper: Temper;

  /**
   * THE APERTURE.
   *
   * The register gives 04:17:02 as the last observation of three separate
   * entities, and 04:17:03 for a fourth. It is stated four times, in a
   * document that states nothing twice by accident, and it is the only
   * timestamp in the build that is not redacted.
   *
   * It is a real time. For the sixty seconds of 04:17, local, the register
   * does not seal anything. Almost nobody will be awake, which is the
   * correct number of people for it, and the ones who are will have to
   * tell the others.
   */
  aperture: boolean;

  /**
   * How far in the observer is, 0 to 4. Rises with the furthest point
   * reached and never falls — you do not get shallower by scrolling back.
   * Regions consult it to decide how much ordinary interface to withhold.
   */
  depth: number;

  reduced: boolean;
  uptimeRef: { readonly current: number };
}

const SystemContext = createContext<SystemValue | null>(null);
const UptimeContext = createContext(0);

export function SystemProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  const [observers, setObservers] = useState(1);
  const [visits, setVisits] = useState<Record<string, number>>({});
  const [discoveries, setDiscoveries] = useState<ReadonlySet<Discovery>>(() => new Set());
  const [audioOn, setAudioOn] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [temper, setTemper] = useState<Temper>(() => spick('temper/first', DRIFT));
  const [aperture, setAperture] = useState(false);
  const [depth, setDepth] = useState(0);

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

  // --- PRESENCE (AUDIBLE) ----------------------------------------------
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

  useEffect(() => {
    const onVis = () => {
      if (!audioOn) return;
      if (document.hidden) void presence.current?.stop();
      else void presence.current?.start();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [audioOn]);

  useEffect(() => {
    const id = window.setInterval(() => setUptime((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const uptimeRef = useRef(0);
  uptimeRef.current = uptime;

  // --- THE APERTURE ----------------------------------------------------
  // Read from the observer's own clock. Nothing is fetched to establish
  // the time, and nothing anywhere announces the hour in advance.
  useEffect(() => {
    const read = () => {
      const d = new Date();
      setAperture(d.getHours() === 4 && d.getMinutes() === 17);
    };
    read();
    const id = window.setInterval(read, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => { if (aperture) discover('aperture'); }, [aperture, discover]);

  // --- DEPTH -----------------------------------------------------------
  // Measured from the furthest point reached, not the current one. The
  // interface does not restore what it has already stopped offering.
  const reached = useRef(0);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const p = window.scrollY / max;
      if (p > reached.current) {
        reached.current = p;
        const next = p > 0.88 ? 4 : p > 0.66 ? 3 : p > 0.42 ? 2 : p > 0.16 ? 1 : 0;
        setDepth((d) => (next > d ? next : d));
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(read); };
    window.addEventListener('scroll', onScroll, { passive: true });
    read();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => { if (depth >= 3) discover('depth'); }, [depth, discover]);

  // --- ATTENTION -------------------------------------------------------
  // A decaying count of how much the observer has been doing. Nothing is
  // stored, nothing is sent; it exists for the length of one visit and
  // informs exactly one decision.
  const attention = useRef(0);
  const lastInput = useRef(performance.now());
  useEffect(() => {
    const bump = (w: number) => () => {
      attention.current = Math.min(attention.current + w, 40);
      lastInput.current = performance.now();
    };
    const move = bump(0.35), act = bump(4);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', act, { passive: true });
    window.addEventListener('keydown', act, { passive: true });
    window.addEventListener('wheel', bump(0.6), { passive: true });
    const decay = window.setInterval(() => { attention.current *= 0.78; }, 2000);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', act);
      window.removeEventListener('keydown', act);
      window.clearInterval(decay);
      window.clearInterval(decay);
    };
  }, []);

  // --- TEMPERAMENT -----------------------------------------------------
  // Settles for the better part of a minute at a time. Two of the five are
  // reactions to the observer; the rest are the session's own drift.
  const temperStep = useRef(0);
  useEffect(() => {
    if (reduced) return;
    let timer = 0;
    const settle = () => {
      const hold = 38000 + skeyed(`temper/hold/${temperStep.current}`, 0, 34000);
      timer = window.setTimeout(() => {
        const idleFor = performance.now() - lastInput.current;
        const next: Temper =
          idleFor > 26000 ? 'impatient'
          : attention.current > 22 ? 'observant'
          : DRIFT[temperStep.current % DRIFT.length];
        temperStep.current += 1;
        setTemper(next);
        settle();
      }, hold);
    };
    settle();
    return () => window.clearTimeout(timer);
  }, [reduced]);

  // --- RHYTHM ----------------------------------------------------------
  // The system has a pulse of its own and the observer is not in it.
  //
  // Events do not arrive evenly. The session alternates between long rests
  // in which nothing whatsoever happens and short clusters in which two to
  // four things happen close together. An even scatter reads as a timer; a
  // rest followed by a cluster reads as something deciding to act.
  const subs = useRef(new Map<AnomalyChannel, Set<(e: AnomalyEvent) => void>>());
  const count = useRef(0);
  const lastChannel = useRef<AnomalyChannel | null>(null);
  const temperRef = useRef(temper);
  temperRef.current = temper;

  const subscribeAnomaly = useCallback((ch: AnomalyChannel, fn: (e: AnomalyEvent) => void) => {
    const map = subs.current;
    if (!map.has(ch)) map.set(ch, new Set());
    map.get(ch)!.add(fn);
    return () => { map.get(ch)?.delete(fn); };
  }, []);

  const strike = useCallback(() => {
    if (document.hidden) return;
    const live = CHANNELS.filter((c) => (subs.current.get(c)?.size ?? 0) > 0 && c !== lastChannel.current);
    if (!live.length) return;
    const n = (count.current += 1);
    const ch = live[Math.floor(skeyed(`strike/where/${n}`, 0, live.length))];
    lastChannel.current = ch;
    const kinds = KIND_BY_TEMPER[temperRef.current];
    const kind = kinds[Math.floor(skeyed(`strike/what/${n}`, 0, kinds.length))];
    subs.current.get(ch)?.forEach((fn) => fn({ n, kind }));
  }, []);

  useEffect(() => {
    if (reduced) return;
    let timers: number[] = [];
    let phrase = 0;

    const beat = () => {
      const p = phrase++;
      // Rests are long. Long enough that the observer stops expecting
      // anything, which is the only state in which a cluster registers.
      const rest = 34000 + skeyed(`beat/rest/${p}`, 0, 62000);
      // Every third or fourth phrase is a cluster instead of a single event.
      const burst = skeyed(`beat/burst/${p}`) < 0.34 ? 2 + Math.floor(skeyed(`beat/size/${p}`, 0, 3)) : 1;

      timers.push(window.setTimeout(() => {
        for (let i = 0; i < burst; i++) {
          timers.push(window.setTimeout(strike, i * (1400 + skeyed(`beat/gap/${p}/${i}`, 0, 2600))));
        }
        beat();
      }, rest));
    };

    // The first event of a visit comes early enough to be noticed and late
    // enough not to look like part of the loading sequence.
    timers.push(window.setTimeout(() => { strike(); beat(); }, 17000 + skeyed('beat/first', 0, 11000)));

    return () => { timers.forEach(clearTimeout); timers = []; };
  }, [reduced, strike]);

  const value = useMemo<SystemValue>(() => ({
    observers, addObserver,
    visits, enterRegion,
    discoveries, discover,
    audioOn, toggleAudio, click, tone,
    subscribeAnomaly,
    temper, depth, aperture,
    reduced, uptimeRef,
  }), [observers, addObserver, visits, enterRegion, discoveries, discover,
       audioOn, toggleAudio, click, tone, subscribeAnomaly, temper, depth, aperture, reduced]);

  return (
    <SystemContext.Provider value={value}>
      <UptimeContext.Provider value={uptime}>{children}</UptimeContext.Provider>
    </SystemContext.Provider>
  );
}

export function useUptime(): number {
  return useContext(UptimeContext);
}

export function useSystem(): SystemValue {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error('VRAXXIS: component addressed the runtime from outside it.');
  return ctx;
}

/**
 * Listen on one channel. Returns the last event addressed to it — a counter
 * and the kind of thing the system was inclined to do. A component that
 * receives a kind it has no answer for should do nothing at all.
 */
export function useAnomaly(ch: AnomalyChannel): AnomalyEvent {
  const { subscribeAnomaly } = useSystem();
  const [e, setE] = useState<AnomalyEvent>({ n: 0, kind: 'shift' });
  useEffect(() => subscribeAnomaly(ch, setE), [ch, subscribeAnomaly]);
  return e;
}

/** The session identity, for anything that wants to print it at itself. */
export { SESSION };
