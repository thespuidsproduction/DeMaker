"use client";

import { useEffect, useRef, useState } from "react";
import { SITE, SURFACE_STACK } from "@/content/site";
import { gsap, prefersReducedMotion, useGsapSetup } from "@/lib/motion";
import { holdScroll } from "@/lib/lock";

const KEY = "princey-intro";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE CURTAIN
 *
 * Two ivory plates part to reveal the page, with the wordmark and a measuring
 * rule between them. It runs once a session — an entrance is only an entrance
 * the first time — and never at all under reduced motion.
 *
 * Rendered above everything but removed from the DOM the moment it finishes,
 * so it can never trap focus or intercept a pointer.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Intro() {
  // Rendered closed on the server. Mounting it after first paint would flash
  // the page and then cover it up, which is worse than no curtain at all.
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useGsapSetup();

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDone(true);
      return;
    }
    try {
      if (sessionStorage.getItem(KEY) === "seen") setDone(true);
    } catch {
      /* blocked storage: the curtain simply runs every load */
    }
  }, []);

  useEffect(() => {
    if (done) return;
    const root = rootRef.current;
    if (!root) return;

    const release = holdScroll();

    let tl: gsap.core.Timeline;

    // An entrance nobody can escape is a hostage situation. Any input at all
    // sends it straight to the curtain.
    const skip = () => {
      if (tl && tl.progress() < 1) tl.seek("curtain").timeScale(2.4);
    };
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") skip();
    };
    window.addEventListener("pointerdown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchstart", skip, { passive: true });
    window.addEventListener("keydown", keys);

    const ctx = gsap.context(() => {
      tl = gsap.timeline({
        onComplete: () => {
          release();
          try {
            sessionStorage.setItem(KEY, "seen");
          } catch {
            /* nothing to do */
          }
          setDone(true);
        },
      });

      tl.fromTo(
        "[data-i='mark'] .ch",
        { yPercent: 120, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.028 },
      )
        .fromTo(
          "[data-i='rule']",
          { scaleX: 0 },
          { scaleX: 1, duration: 0.8, ease: "power3.inOut" },
          "-=0.45",
        )
        .fromTo(
          "[data-i='word']",
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: "power2.out" },
          "-=0.62",
        )
        // The plates part like heavy doors, not like a fade.
        .addLabel("curtain", ">+0.12")
        .to("[data-i='top']", { yPercent: -101, duration: 0.95, ease: "power4.inOut" }, "curtain")
        .to("[data-i='bottom']", { yPercent: 101, duration: 0.95, ease: "power4.inOut" }, "curtain")
        .to("[data-i='centre']", { opacity: 0, duration: 0.4, ease: "power2.in" }, "curtain")
        .to(root, { autoAlpha: 0, duration: 0.01 });
    }, root);

    return () => {
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
      window.removeEventListener("keydown", keys);
      ctx.revert();
      release();
    };
  }, [done]);

  if (done) return null;

  return (
    <div ref={rootRef} className="intro" aria-hidden="true">
      <div className="intro-plate intro-top" data-i="top" />
      <div className="intro-plate intro-bottom" data-i="bottom" />

      <div className="intro-centre" data-i="centre">
        <span className="intro-mark t-display" data-i="mark">
          {"PRINCE CHIPANGO".split("").map((c, i) => (
            <span key={`${c}-${i}`} className="ch">
              {c === " " ? " " : c}
            </span>
          ))}
        </span>

        <span className="intro-rule" data-i="rule" />

        <span className="intro-words">
          {SURFACE_STACK.map((w) => (
            <span key={w} className="t-label" data-i="word">
              {w}
            </span>
          ))}
        </span>

        <span className="t-label intro-domain" data-i="word">
          {SITE.domain}
        </span>
      </div>
    </div>
  );
}
