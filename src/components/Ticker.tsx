"use client";

import { useEffect, useRef } from "react";
import { useTraces } from "@/lib/traces";
import { gsap, prefersReducedMotion, useGsapSetup } from "@/lib/motion";

const BASE = [
  "60 FPS",
  "ZERO LAYOUT SHIFT",
  "WCAG AA",
  "MOBILE SAFARI",
  "COMPOSITOR ONLY",
  "TYPED EDGES",
  "APPEND ONLY",
  "ONE ROUND TRIP",
  "REVERSIBLE OR GATED",
  "SLOW NETWORK FIRST",
];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE STRIP
 *
 * A measuring tape running between movements. It drifts on its own, and scroll
 * velocity pushes it — the page and the strip are in the same physical world,
 * so moving one moves the other.
 *
 * Once the visitor has uncovered things, they take their place in the strip
 * alongside the fixed claims: the site reciting what you found back to you.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Ticker({ reverse = false }: { reverse?: boolean }) {
  const railRef = useRef<HTMLDivElement>(null);
  const { traces } = useTraces();
  useGsapSetup();

  const items: { text: string; found: boolean }[] = BASE.map((text) => ({
    text,
    found: false,
  }));
  traces.slice(-6).forEach((t) => items.push({ text: `◆ ${t.label.toUpperCase()}`, found: true }));

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || prefersReducedMotion()) return;

    const dir = reverse ? 1 : -1;
    // Two identical runs; translating by exactly half is a seamless loop.
    const drift = gsap.to(rail, {
      xPercent: dir * -50,
      duration: 46,
      ease: "none",
      repeat: -1,
    });
    if (reverse) gsap.set(rail, { xPercent: -50 });

    // Scroll velocity leans on the strip, then it recovers its own pace.
    let raf = 0;
    let last = window.scrollY;
    let v = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = window.scrollY;
      v += (now - last - v) * 0.1;
      last = now;
      drift.timeScale(1 + Math.min(7, Math.abs(v) * 0.14));
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      drift.kill();
    };
  }, [reverse]);

  const run = (key: string) => (
    <span className="ticker-run" key={key}>
      {items.map((t, i) => (
        <span
          className={`ticker-item${t.found ? " ticker-item-found" : ""}`}
          key={`${key}-${t.text}-${i}`}
        >
          {t.text}
          <span className="ticker-tick" aria-hidden="true" />
        </span>
      ))}
    </span>
  );

  return (
    <div className="ticker" aria-hidden="true">
      <div ref={railRef} className="ticker-rail">
        {run("a")}
        {run("b")}
      </div>
    </div>
  );
}
