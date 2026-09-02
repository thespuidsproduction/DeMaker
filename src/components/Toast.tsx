"use client";

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
import { prefersReducedMotion } from "@/lib/motion";

type Tone = "ok" | "fail" | "note";
type Toast = { id: number; tone: Tone; title: string; body?: string; life: number };

type Api = {
  push: (t: Omit<Toast, "id" | "life"> & { life?: number }) => void;
  dismiss: (id: number) => void;
};

const Ctx = createContext<Api | null>(null);

let seq = 0;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TOASTS
 *
 * The convention people already know, in this site's material: a glass slab
 * that slides in, states plainly what happened, counts down, and leaves.
 *
 * A success dismisses itself. A failure does not, because a message that did
 * not send is something the sender needs to see and act on, and a notice that
 * vanishes on its own is a notice that can be missed.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<Api["push"]>(
    (t) => {
      const id = ++seq;
      // A failure stays until it is acknowledged.
      const life = t.life ?? (t.tone === "fail" ? 0 : 6000);
      setItems((list) => [...list.slice(-2), { ...t, id, life }]);
      if (life > 0) {
        timers.current.set(
          id,
          window.setTimeout(() => dismiss(id), life),
        );
      }
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((h) => window.clearTimeout(h));
  }, []);

  const api = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone} glass glass-plate`} role="status">
            <span className="toast-rule" aria-hidden="true" />

            <span className="toast-mark" aria-hidden="true">
              {t.tone === "ok" ? <Tick /> : t.tone === "fail" ? <Cross /> : <Dot />}
            </span>

            <span className="toast-body">
              <span className="toast-title">{t.title}</span>
              {t.body ? <span className="toast-text">{t.body}</span> : null}
            </span>

            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </button>

            {t.life > 0 && !prefersReducedMotion() ? (
              <span
                className="toast-life"
                style={{ animationDuration: `${t.life}ms` }}
                aria-hidden="true"
              />
            ) : null}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): Api {
  const ctx = useContext(Ctx);
  // Outside the provider a toast is simply not shown; nothing throws in a
  // decorative path.
  return ctx ?? { push: () => {}, dismiss: () => {} };
}

/* ── Marks, drawn rather than typed ─────────────────────────────────────── */

const Tick = () => (
  <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" fill="none">
    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <path
      className="toast-draw"
      d="M5.5 10.4l3.2 3.2 6-6.6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Cross = () => (
  <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" fill="none">
    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <path
      className="toast-draw"
      d="M6.6 6.6l6.8 6.8M13.4 6.6l-6.8 6.8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const Dot = () => (
  <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" fill="none">
    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <circle cx="10" cy="10" r="3" fill="currentColor" />
  </svg>
);
