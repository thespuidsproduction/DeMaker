"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/** Register GSAP plugins exactly once, on the client. */
export function useGsapSetup() {
  if (typeof window === "undefined" || registered) return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out", duration: 0.9 });
  registered = true;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Heavy studio doors swinging shut. Never `ease-out` by default.
 */
export const EASE = {
  door: "power4.out",
  mercury: "power2.inOut",
  settle: "elastic.out(0.6, 0.55)",
  weight: "expo.out",
} as const;

/**
 * Reveal a set of elements as a scored sequence rather than a fade.
 * Elements settle into place with momentum — they never snap.
 */
export function revealSequence(
  scope: HTMLElement,
  selector = "[data-reveal]",
  opts: { start?: string; stagger?: number; y?: number } = {},
) {
  const targets = gsap.utils.toArray<HTMLElement>(selector, scope);
  if (!targets.length) return;

  if (prefersReducedMotion()) {
    gsap.set(targets, { opacity: 1, y: 0, clearProps: "filter" });
    return;
  }

  gsap.set(targets, {
    opacity: 0,
    y: opts.y ?? 26,
    filter: "blur(6px)",
  });

  ScrollTrigger.batch(targets, {
    start: opts.start ?? "top 88%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 1.15,
        ease: EASE.door,
        stagger: opts.stagger ?? 0.075,
        overwrite: true,
      }),
  });
}

/**
 * Magnetic attraction. The element leans toward the cursor with inertia and
 * returns on a spring — it has mass, so it lags slightly behind the pointer.
 */
export function magnetise(
  el: HTMLElement,
  strength = 0.28,
  radius = 120,
): () => void {
  if (prefersReducedMotion()) return () => {};

  const qx = gsap.quickTo(el, "x", { duration: 0.7, ease: EASE.door });
  const qy = gsap.quickTo(el, "y", { duration: 0.7, ease: EASE.door });
  const qr = gsap.quickTo(el, "rotate", { duration: 0.9, ease: EASE.door });

  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const falloff = Math.max(0, 1 - dist / (radius + Math.max(r.width, r.height)));
    qx(dx * strength * falloff);
    qy(dy * strength * falloff);
    qr(dx * 0.012 * falloff);
  };

  const onLeave = () => {
    qx(0);
    qy(0);
    qr(0);
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerleave", onLeave);

  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerleave", onLeave);
  };
}

/**
 * Move the specular highlight on a glass plate to track the pointer, so the
 * light source appears to be in the room rather than baked into the CSS.
 */
export function trackSpecular(el: HTMLElement): () => void {
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty("--spec-x", `${x.toFixed(1)}%`);
    el.style.setProperty("--spec-y", `${(y - 40).toFixed(1)}%`);
  };
  const onLeave = () => {
    el.style.removeProperty("--spec-x");
    el.style.removeProperty("--spec-y");
  };
  el.addEventListener("pointermove", onMove, { passive: true });
  el.addEventListener("pointerleave", onLeave);
  return () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
  };
}

export { gsap, ScrollTrigger };
