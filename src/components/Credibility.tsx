"use client";

import { useEffect, useRef } from "react";
import { NUMERALS } from "@/content/site";
import { useGsapSetup, gsap, prefersReducedMotion } from "@/lib/motion";
import { Movement } from "./Movement";
import { SignalTrace } from "./Ornament";

/**
 * Measured claims. The numerals are architectural in scale; the information
 * beside them stays laboratory-precise. Nothing here is a metric that cannot
 * be stood behind.
 */
export function Credibility() {
  const ref = useRef<HTMLDivElement>(null);
  useGsapSetup();

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // Numerals arrive with weight: they overshoot slightly and settle.
      gsap.fromTo(
        "[data-numeral]",
        { yPercent: 62, opacity: 0, rotate: 1.4 },
        {
          yPercent: 0,
          opacity: 1,
          rotate: 0,
          duration: 1.5,
          ease: "expo.out",
          stagger: 0.11,
          scrollTrigger: { trigger: el, start: "top 82%", once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <Movement id="measured" index="§ 05" title="Measured" aside="no invented numbers">
      <div ref={ref} className="numerals">
        {NUMERALS.map((n) => (
          <div key={n.label} className="numeral">
            <div className="numeral-mask">
              <span className="t-numeral numeral-value" data-numeral>
                {n.value}
              </span>
            </div>
            <div className="numeral-foot">
              <span className="t-label numeral-label">{n.label}</span>
              <span className="t-meta numeral-note">{n.note}</span>
            </div>
          </div>
        ))}
      </div>

      <SignalTrace className="cred-trace" data-reveal />
    </Movement>
  );
}
