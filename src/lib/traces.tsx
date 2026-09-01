"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TRACES
 *
 * The site remembers what you have opened. A technology named inside a project
 * is not forgotten when you scroll away — it comes back later as a note in the
 * margin, in handwriting, as though someone had jotted it down while you were
 * looking at something else.
 *
 * State is per-visit (sessionStorage). Nothing is transmitted anywhere.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const KEY = "princey-traces";

type Trace = { label: string; from: string; at: number };

type Store = {
  traces: Trace[];
  /** Record something the visitor uncovered. Idempotent per label. */
  leave: (from: string, labels: string | string[]) => void;
  /** Has this been uncovered yet? */
  seen: (label: string) => boolean;
  count: number;
  /** The most recent trace, for the ambient readout. */
  latest: Trace | null;
};

const Ctx = createContext<Store | null>(null);

export function TraceProvider({ children }: { children: ReactNode }) {
  const [traces, setTraces] = useState<Trace[]>([]);
  const known = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Trace[];
        if (Array.isArray(parsed)) {
          parsed.forEach((t) => known.current.add(t.label));
          setTraces(parsed);
        }
      }
    } catch {
      /* blocked storage — the session simply starts with no memory */
    }
  }, []);

  const leave = useCallback((from: string, labels: string | string[]) => {
    const list = Array.isArray(labels) ? labels : [labels];
    const fresh = list.filter((l) => !known.current.has(l));
    if (!fresh.length) return;
    fresh.forEach((l) => known.current.add(l));

    setTraces((prev) => {
      const next = [...prev, ...fresh.map((label) => ({ label, from, at: Date.now() }))];
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* nothing to do — the memory just will not survive a reload */
      }
      return next;
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      traces,
      leave,
      seen: (label: string) => known.current.has(label),
      count: traces.length,
      latest: traces.length ? traces[traces.length - 1] : null,
    }),
    [traces, leave],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTraces(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Rendered outside the provider (never in this app) — degrade to a no-op
    // rather than throwing inside a decorative component.
    return { traces: [], leave: () => {}, seen: () => false, count: 0, latest: null };
  }
  return ctx;
}

/**
 * A note in the margin, in the visitor's own history.
 *
 * Renders nothing until something has actually been discovered — the site
 * should never invent a memory it does not have. `after` holds it back until
 * enough has been uncovered for the callback to feel earned rather than
 * automatic.
 */
export function Marginalia({
  after = 1,
  pick = "latest",
  prefix = "you found",
  className,
}: {
  after?: number;
  pick?: "latest" | "first" | "random";
  prefix?: string;
  className?: string;
}) {
  const { traces } = useTraces();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || traces.length < after) return null;

  let t: Trace;
  if (pick === "first") t = traces[0];
  else if (pick === "random") {
    // Stable within a render pass: keyed on the trace count, not Math.random.
    t = traces[(traces.length * 7) % traces.length];
  } else t = traces[traces.length - 1];

  return (
    <aside className={`marginalia${className ? ` ${className}` : ""}`} aria-hidden="true">
      <span className="marginalia-hook" />
      <span className="t-hand marginalia-text">
        {prefix} {t.label}
        <br />
        <span className="marginalia-from">— in {t.from}</span>
      </span>
    </aside>
  );
}
