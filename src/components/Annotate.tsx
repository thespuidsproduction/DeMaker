"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, prefersReducedMotion, useGsapSetup } from "@/lib/motion";
import { HandCircle, HandUnderline } from "./Ornament";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ANNOTATE
 *
 * Someone has been through this page with a pen. A phrase gets circled or
 * underlined, and the stroke draws itself as you arrive, at the speed a hand
 * would move: fast through the straight part, slowing at the turn.
 *
 * Purely decorative. The mark is aria-hidden and the text underneath is
 * untouched, so nothing about the meaning depends on seeing it.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Annotate({
  children,
  kind = "circle",
  delay = 0,
  className,
}: {
  children: ReactNode;
  kind?: "circle" | "underline";
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useGsapSetup();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const paths = Array.from(root.querySelectorAll<SVGPathElement>(".hand-stroke"));
    if (!paths.length) return;

    if (prefersReducedMotion()) {
      paths.forEach((p, i) => {
        p.style.strokeDasharray = "none";
        p.style.strokeDashoffset = "0";
        p.style.opacity = i === 0 ? "0.85" : "0.5";
      });
      return;
    }

    const ctx = gsap.context(() => {
      paths.forEach((path, i) => {
        const len = path.getTotalLength();
        // The dash offset does the hiding, so the stroke can be made visible
        // up front and simply drawn in.
        gsap.set(path, {
          strokeDasharray: len,
          strokeDashoffset: len,
          opacity: i === 0 ? 0.85 : 0.5,
        });
        gsap.to(path, {
          strokeDashoffset: 0,
          duration: 0.85 + i * 0.2,
          // A hand does not move at a constant rate.
          ease: "power2.inOut",
          delay: delay + i * 0.16,
          scrollTrigger: { trigger: root, start: "top 82%", once: true },
        });
      });
    }, root);

    return () => ctx.revert();
  }, [delay]);

  const Mark = kind === "circle" ? HandCircle : HandUnderline;

  return (
    <span ref={ref} className={`annotate annotate-${kind}${className ? ` ${className}` : ""}`}>
      <span className="annotate-text">{children}</span>
      <Mark className="annotate-mark" />
    </span>
  );
}
