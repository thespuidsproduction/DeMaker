"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion, useGsapSetup } from "@/lib/motion";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE LENS
 *
 * A piece of the glass system that follows the pointer. It is not a "custom
 * cursor" — the real cursor stays exactly where it is. This is a lens floating
 * a little behind your hand, with its own mass, that actually refracts what is
 * under it.
 *
 * It reacts rather than decorates:
 *   · over a control        it opens and a ring draws around it
 *   · over a physics body   it becomes a grab mark
 *   · while scrolling fast  it stretches along the direction of travel
 *   · on press              it collapses, then springs back
 *
 * Pointer-fine devices only. There is no lens on a touchscreen because there
 * is no pointer to lag behind.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Lens() {
  const lensRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const [enabled, setEnabled] = useState(false);
  useGsapSetup();

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const fine = window.matchMedia("(pointer: fine)");
    const sync = () => setEnabled(fine.matches);
    sync();
    fine.addEventListener("change", sync);
    return () => fine.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = lensRef.current;
    const ring = ringRef.current;
    if (!enabled || !el || !ring) return;

    gsap.set(el, { xPercent: -50, yPercent: -50, opacity: 0 });

    // Different durations per property: position lags, scale answers quickly.
    const qx = gsap.quickTo(el, "x", { duration: 0.42, ease: "power3.out" });
    const qy = gsap.quickTo(el, "y", { duration: 0.42, ease: "power3.out" });
    const qs = gsap.quickTo(el, "scale", { duration: 0.5, ease: "power3.out" });

    let shown = false;
    let mode = "";

    const onMove = (e: PointerEvent) => {
      if (!shown) {
        shown = true;
        gsap.to(el, { opacity: 1, duration: 0.5 });
      }
      qx(e.clientX);
      qy(e.clientY);

      const t = e.target as HTMLElement | null;
      const next = t?.closest("a, button, input, textarea, [role='button']")
        ? "act"
        : t?.closest("[data-phys]")
          ? "grab"
          : "";

      if (next !== mode) {
        mode = next;
        el.dataset.mode = mode;
        qs(mode === "act" ? 2.5 : mode === "grab" ? 1.7 : 1);
        // The ring draws itself when the lens finds something to do.
        gsap.to(ring, {
          strokeDashoffset: mode ? 0 : 138,
          duration: mode ? 0.6 : 0.3,
          ease: mode ? "power3.out" : "power2.in",
        });
      }
    };

    const onDown = () => gsap.to(el, { scale: "-=0.35", duration: 0.16, ease: "power2.out" });
    const onUp = () =>
      qs(mode === "act" ? 2.5 : mode === "grab" ? 1.7 : 1);
    const onLeave = () => {
      shown = false;
      gsap.to(el, { opacity: 0, duration: 0.35 });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf([el, ring]);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={lensRef} className="lens" aria-hidden="true">
      <div className="lens-glass" />
      <svg className="lens-ring" viewBox="0 0 48 48">
        <circle
          ref={ringRef}
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="138"
          strokeDashoffset="138"
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
        />
      </svg>
      <span className="lens-core" />
    </div>
  );
}
