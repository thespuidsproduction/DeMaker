"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  useGsapSetup,
  revealSequence,
  scoreHeadline,
  proximityDrift,
} from "@/lib/motion";

type Props = {
  id?: string;
  index: string;
  title: string;
  aside?: string;
  children: ReactNode;
  /** Extra class on the <section>. */
  className?: string;
  labelledBy?: string;
};

/**
 * A movement of the publication. Owns its own reveal timeline so each
 * section is scored independently rather than one global scroll animation.
 */
export function Movement({ id, index, title, aside, children, className }: Props) {
  const ref = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useGsapSetup();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("reveal-ready");
    revealSequence(el);
  }, []);

  // The title is scored character by character, then stays live: it leans away
  // from the cursor as the visitor approaches it.
  useEffect(() => {
    const t = titleRef.current;
    const el = ref.current;
    if (!t || !el) return;
    scoreHeadline(t, el);
    return proximityDrift(t);
  }, []);

  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section
      ref={ref}
      id={id}
      className={`movement${className ? ` ${className}` : ""}`}
      aria-labelledby={headingId}
    >
      <div className="shell">
        <div className="movement-head" data-reveal>
          <span className="movement-index" aria-hidden="true">
            {index}
          </span>
          <h2 ref={titleRef} id={headingId} className="movement-title">
            {title}
          </h2>
          {aside ? (
            <span className="t-hand movement-aside" aria-hidden="true">
              {aside}
            </span>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}
