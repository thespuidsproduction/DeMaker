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
        onComplete: () => {
          // A finished reveal must leave nothing behind. `filter: blur(0px)`
          // is not a no-op: it keeps the element on its own compositing layer
          // for the life of the page, which costs memory on every revealed
          // node and makes the layer re-rasterise the fixed atmosphere behind
          // it — visible as a pale rectangle over the section background.
          for (const node of batch) {
            const el = node as HTMLElement;
            el.style.filter = "";
            el.style.willChange = "";
            el.style.transform = "";
            el.classList.add("is-revealed");
          }
        },
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

/**
 * Split text into per-character spans so a headline can be scored rather than
 * faded. Returns the character elements, or null if the element has already
 * been split.
 */
export function splitChars(el: HTMLElement): HTMLElement[] {
  if (el.dataset.split === "done") {
    return Array.from(el.querySelectorAll<HTMLElement>(".ch"));
  }
  const text = el.textContent ?? "";
  el.textContent = "";
  const out: HTMLElement[] = [];

  for (const word of text.split(" ")) {
    const w = document.createElement("span");
    w.className = "word";
    for (const c of word) {
      const span = document.createElement("span");
      span.className = "ch";
      span.textContent = c;
      w.appendChild(span);
      out.push(span);
    }
    el.appendChild(w);
    el.appendChild(document.createTextNode(" "));
  }

  el.dataset.split = "done";
  // The visible text is unchanged, so nothing needs re-announcing; the spans
  // are presentational only.
  return out;
}

/**
 * Characters rise into place from behind a mask, each one a beat behind the
 * last. Typography glides — that is its personality.
 */
export function scoreHeadline(el: HTMLElement, trigger?: HTMLElement) {
  const chars = splitChars(el);
  if (!chars.length) return;

  if (prefersReducedMotion()) {
    gsap.set(chars, { y: 0, opacity: 1 });
    el.classList.add("scored");
    return;
  }

  // Deliberately no clipping mask. An `overflow: hidden` box around a headline
  // whose children are composited gets its own paint layer, which shows up as
  // a pale rectangle against the fixed grain and atmosphere behind it. Rising
  // from a blur reads the same and leaves nothing behind.
  gsap.set(chars, { y: "0.55em", opacity: 0, filter: "blur(7px)", rotate: 1.5 });
  gsap.to(chars, {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    rotate: 0,
    duration: 1.05,
    ease: "expo.out",
    stagger: 0.028,
    scrollTrigger: { trigger: trigger ?? el, start: "top 88%", once: true },
    onComplete: () => {
      el.classList.add("scored");
      // Release the compositor hints once the characters have landed.
      chars.forEach((c) => {
        c.style.willChange = "";
        c.style.filter = "";
      });
    },
  });
}

/**
 * Typography shifts slightly when the visitor approaches: each character
 * leans away from the cursor, in proportion to how close it is. The effect is
 * per-character, so a headline ripples rather than sliding as a slab.
 */
export function proximityDrift(el: HTMLElement, strength = 9): () => void {
  if (prefersReducedMotion()) return () => {};
  const chars = Array.from(el.querySelectorAll<HTMLElement>(".ch"));
  if (!chars.length) return () => {};

  const setters = chars.map((c) => ({
    y: gsap.quickTo(c, "y", { duration: 0.85, ease: "power3.out" }),
    x: gsap.quickTo(c, "x", { duration: 0.85, ease: "power3.out" }),
  }));

  let raf = 0;
  let px = -9999;
  let py = -9999;

  const onMove = (e: PointerEvent) => {
    px = e.clientX;
    py = e.clientY;
    if (!raf) raf = requestAnimationFrame(apply);
  };

  const apply = () => {
    raf = 0;
    const radius = 190;
    chars.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const dx = r.left + r.width / 2 - px;
      const dy = r.top + r.height / 2 - py;
      const d = Math.hypot(dx, dy);
      if (d > radius) {
        setters[i].x(0);
        setters[i].y(0);
        return;
      }
      const f = (1 - d / radius) ** 2 * strength;
      setters[i].x((dx / (d || 1)) * f);
      setters[i].y((dy / (d || 1)) * f * 0.55);
    });
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  return () => {
    window.removeEventListener("pointermove", onMove);
    if (raf) cancelAnimationFrame(raf);
    gsap.to(chars, { x: 0, y: 0, duration: 0.5 });
  };
}

/**
 * A card leans toward the cursor on two axes. Glass has a surface normal; this
 * is what makes it read as a plate in space rather than a rectangle.
 */
export function tilt(el: HTMLElement, max = 5): () => void {
  if (prefersReducedMotion()) return () => {};

  const rx = gsap.quickTo(el, "rotationX", { duration: 0.75, ease: "power3.out" });
  const ry = gsap.quickTo(el, "rotationY", { duration: 0.75, ease: "power3.out" });
  const rz = gsap.quickTo(el, "z", { duration: 0.75, ease: "power3.out" });

  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    ry(nx * max * 2);
    rx(-ny * max * 2);
    rz(14);
  };
  const onLeave = () => {
    rx(0);
    ry(0);
    rz(0);
  };

  el.addEventListener("pointermove", onMove, { passive: true });
  el.addEventListener("pointerleave", onLeave);
  return () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
  };
}

/**
 * Count a numeral up as it arrives. Anything non-numeric (AA) is left alone —
 * a letter cannot count, and faking it would be noise.
 */
export function countUp(el: HTMLElement, value: string, trigger: HTMLElement) {
  const match = value.match(/^(\d+)(.*)$/);
  if (!match || prefersReducedMotion()) {
    el.textContent = value;
    return;
  }
  const target = Number(match[1]);
  const pad = match[1].length;
  const suffix = match[2];
  const state = { n: 0 };

  el.textContent = "0".padStart(pad, "0") + suffix;
  gsap.to(state, {
    n: target,
    duration: 1.9,
    ease: "power2.out",
    scrollTrigger: { trigger, start: "top 80%", once: true },
    onUpdate: () => {
      el.textContent = String(Math.round(state.n)).padStart(pad, "0") + suffix;
    },
  });
}

/**
 * Scroll velocity, normalised and smoothed, published as a CSS variable on
 * :root. Anything can subscribe to it — glass stretches, motes lag, plates
 * tilt — without each one running its own scroll listener.
 */
export function publishScrollVelocity(): () => void {
  if (prefersReducedMotion()) return () => {};
  const root = document.documentElement;
  let last = window.scrollY;
  let v = 0;
  let raf = 0;

  const tick = () => {
    raf = requestAnimationFrame(tick);
    const now = window.scrollY;
    const delta = now - last;
    last = now;
    // Smooth towards the instantaneous delta so the value never snaps.
    v += (delta - v) * 0.12;
    const clamped = Math.max(-1, Math.min(1, v / 55));
    root.style.setProperty("--scroll-v", clamped.toFixed(3));
    root.style.setProperty("--scroll-vabs", Math.abs(clamped).toFixed(3));
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    root.style.removeProperty("--scroll-v");
    root.style.removeProperty("--scroll-vabs");
  };
}

export { gsap, ScrollTrigger };
