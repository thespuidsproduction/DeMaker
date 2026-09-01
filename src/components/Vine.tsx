"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion, useGsapSetup } from "@/lib/motion";
import { VineSegment } from "./Ornament";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE VINE
 *
 * Something growing up the margin the whole way down the page, drawn as you
 * scroll. It is pure ornament and makes no claim otherwise: the one place in
 * a system this disciplined where a thing is allowed to just be pretty.
 *
 * Wide viewports only. In a narrow column there is no margin to grow in.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Vine({ side = "left", segments = 5 }: { side?: "left" | "right"; segments?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGsapSetup();

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const stems = el.querySelectorAll<SVGPathElement>(".vine-stem");
    const leaves = el.querySelectorAll<SVGGElement>(".vine-leaf");
    const buds = el.querySelectorAll<SVGGElement>(".vine-bud");

    const ctx = gsap.context(() => {
      stems.forEach((stem, i) => {
        const len = stem.getTotalLength();
        gsap.set(stem, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(stem, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: stem.closest(".vine-seg"),
            start: "top 92%",
            end: "bottom 45%",
            scrub: 0.8,
          },
        });

        // Leaves and buds open behind the growing tip rather than with it.
        gsap.fromTo(
          [leaves[i], buds[i]],
          { opacity: 0, scale: 0.5, transformOrigin: "50% 50%" },
          {
            opacity: 1,
            scale: 1,
            ease: "power2.out",
            stagger: 0.1,
            scrollTrigger: {
              trigger: stem.closest(".vine-seg"),
              start: "top 78%",
              end: "bottom 55%",
              scrub: 1.1,
            },
          },
        );
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className={`vine vine-${side}`} aria-hidden="true">
      {Array.from({ length: segments }, (_, i) => (
        <div className="vine-seg" key={i}>
          <VineSegment className="vine-svg" flip={i % 2 === 1} />
        </div>
      ))}
    </div>
  );
}
