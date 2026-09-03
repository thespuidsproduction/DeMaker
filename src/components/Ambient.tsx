"use client";

import { useEffect, useRef, useState } from "react";
import { READOUT } from "@/content/site";
import { useTraces } from "@/lib/traces";
import { prefersReducedMotion, publishScrollVelocity, rafWhenVisible } from "@/lib/motion";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AMBIENT
 *
 * The pulse. Not animation for its own sake — four small signs that the
 * environment is running:
 *
 *   · a mote of glass drifting on a very long period
 *   · a status readout that quietly changes its mind
 *   · a line tracing an invisible system, once every half minute
 *   · a count of what the visitor has uncovered
 *
 * Nothing here asks for attention. All of it stops under reduced motion.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Ambient() {
  const moteRef = useRef<HTMLDivElement>(null);

  /* One scroll loop for the whole page, published as a CSS variable. Glass
     stretches, motes lag and plates lean off this single value rather than
     each running its own listener. */
  useEffect(() => publishScrollVelocity(), []);

  /* The mote drifts on a Lissajous path with a ~90 second period, so it never
     repeats visibly within the time anyone watches it. */
  useEffect(() => {
    const el = moteRef.current;
    if (!el || prefersReducedMotion()) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      const x = Math.sin(t / 14) * 46 + Math.sin(t / 5.5) * 9;
      const y = Math.cos(t / 19) * 34 + Math.cos(t / 7.3) * 7;
      const r = Math.sin(t / 23) * 9;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(2)}deg)`;
    };
    // The mote is fixed so it is always on screen; the value here is pausing
    // it when the tab goes to the background.
    return rafWhenVisible(el, tick);
  }, []);

  return (
    <>
      {/* A line tracing an invisible system, behind everything. */}
      <svg className="ambient-trace" aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <path
          className="ambient-trace-path"
          d="M-40 640 C 220 640 240 300 470 300 S 760 560 980 560 S 1180 220 1480 220"
          fill="none"
        />
      </svg>

      {/* The mote. */}
      <div className="ambient-mote-anchor" aria-hidden="true">
        <div ref={moteRef} className="ambient-mote glass glass-chip" />
      </div>

    </>
  );
}

/**
 * The readout lives in the header rather than floating over the page — a
 * status line that covers the paragraph you are reading is not ambient, it is
 * in the way. It reports the system at rest, and what you have uncovered once
 * you have uncovered something.
 */
export function Readout() {
  const [line, setLine] = useState(0);
  const [mounted, setMounted] = useState(false);
  const { count, latest } = useTraces();

  useEffect(() => setMounted(true), []);

  /* A slow, irregular cadence — a system idling, not a carousel. */
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let t: number;
    const schedule = () => {
      t = window.setTimeout(() => {
        setLine((n) => (n + 1) % READOUT.length);
        schedule();
      }, 5200 + Math.random() * 4800);
    };
    schedule();
    return () => window.clearTimeout(t);
  }, []);

  const text = latest && count > 0 ? `TRACE · ${latest.label.toUpperCase()}` : READOUT[line];

  return (
    <div className="readout" aria-hidden="true">
      <span className="readout-dot" />
      <span className="readout-text" suppressHydrationWarning>
        {mounted ? text : READOUT[0]}
      </span>
      {mounted && count > 0 ? (
        <span className="readout-count">{String(count).padStart(2, "0")}</span>
      ) : null}
    </div>
  );
}
