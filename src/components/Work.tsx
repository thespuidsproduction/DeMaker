"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PROJECTS, type Project } from "@/content/site";
import { trackSpecular, useGsapSetup, gsap, prefersReducedMotion, tilt } from "@/lib/motion";
import { useTraces } from "@/lib/traces";
import { Movement } from "./Movement";
import {
  TopologyPlate,
  SchemaPlate,
  SealPlate,
  BotanicalDiagram,
  Flourish,
} from "./Ornament";

/** Each system gets the drawing that belongs to it, not the next in a cycle. */
const PLATES = {
  schema: SchemaPlate,
  seal: SealPlate,
  topology: TopologyPlate,
  botanical: BotanicalDiagram,
} as const;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT I BUILD
 *
 * The projects carry the skillset. At rest each one is a single line and a
 * quiet object — no technology named at all. Under the hood, the same card
 * becomes a blueprint: the ground turns to drafting paper, callouts appear on
 * the diagram, and the stack finally names itself.
 *
 * Surface = beautiful. Depth = technical. That contrast is the identity.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Work() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const { leave } = useTraces();
  useGsapSetup();

  useEffect(() => {
    const cards = cardRefs.current.filter((c): c is HTMLElement => Boolean(c));
    const cleanups = cards.flatMap((c) => {
      const plate = c.querySelector<HTMLElement>(".wk-card");
      return [trackSpecular(c), plate ? tilt(plate, 3.5) : () => {}];
    });
    return () => cleanups.forEach((fn) => fn());
  }, []);

  /* Each artifact drifts at its own rate. Images move slowly; that is their
     personality. */
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.to(el.querySelector("[data-plate]"), {
          yPercent: i % 2 === 0 ? -9 : 7,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1.4 },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  const openHood = useCallback(
    (p: Project, i: number) => {
      const wasOpen = openIndex === p.index;
      setOpenIndex(wasOpen ? null : p.index);
      if (wasOpen) return;

      leave(p.name, p.reveals);

      const el = cardRefs.current[i];
      if (!el || prefersReducedMotion()) return;

      // The blueprint snaps into place — diagrams do not glide, they land.
      gsap.fromTo(
        el.querySelectorAll("[data-callout]"),
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.28, stagger: 0.05, ease: "power4.out", delay: 0.18 },
      );
      gsap.fromTo(
        el.querySelectorAll("[data-reveal-tech]"),
        { opacity: 0, x: -8 },
        { opacity: 1, x: 0, duration: 0.5, stagger: 0.055, ease: "power3.out", delay: 0.3 },
      );
      // The drafting paper is driven by the `wk-item-open` class, not by a
      // tween. Animating it here would write an inline opacity that survives
      // closing the hood, leaving the blueprint grid switched on for good.
    },
    [openIndex, leave],
  );

  return (
    <Movement id="work" index="§ 03" title="What I Build" aside="look closer">
      <ol className="wk">
        {PROJECTS.map((p, i) => {
          const Plate = PLATES[p.plate];
          const isOpen = openIndex === p.index;
          const panelId = `wk-hood-${p.index}`;
          return (
            <li
              key={p.index}
              ref={(n) => {
                cardRefs.current[i] = n as HTMLElement | null;
              }}
              data-reveal
              className={`wk-item${isOpen ? " wk-item-open" : ""}`}
            >
              <article className="wk-card glass glass-plate">
                {/* ── The object ──────────────────────────────────────── */}
                <div className="wk-window">
                  <div className="wk-blueprint" data-blueprint aria-hidden="true" />
                  <div className="wk-window-inner refract" aria-hidden="true">
                    <Plate className="wk-plate" data-plate />
                  </div>
                  <div className="wk-window-veil" aria-hidden="true" />

                  {/* Callouts only exist on the blueprint. */}
                  {isOpen ? (
                    <div className="wk-callouts" aria-hidden="true">
                      {p.strata.map((s, si) => (
                        <span
                          key={s.label}
                          data-callout
                          className={`wk-callout wk-callout-${si}`}
                        >
                          <span className="wk-callout-tick" />
                          {s.label}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <span className="t-label wk-kind">{p.kind}</span>
                </div>

                {/* ── The surface ─────────────────────────────────────── */}
                <div className="wk-body">
                  <div className="wk-head">
                    <span className="t-label">{p.index}</span>
                    <Flourish className="wk-flourish" />
                  </div>

                  <h3 className="wk-title">{p.name}</h3>
                  <p className="wk-line">{p.line}</p>

                  <p className="wk-where">
                    <a
                      className="wk-visit"
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="wk-visit-dot" aria-hidden="true" />
                      {p.hrefLabel}
                      <span className="sr-only"> (opens in a new tab)</span>
                      <svg
                        className="wk-visit-arrow"
                        viewBox="0 0 12 12"
                        width="12"
                        height="12"
                        aria-hidden="true"
                        fill="none"
                      >
                        <path d="M2 10L10 2M4.5 2H10v5.5" className="engraved" strokeWidth="1.2" />
                      </svg>
                    </a>
                    {p.note ? <span className="t-meta wk-where-note">{p.note}</span> : null}
                  </p>

                  <button
                    type="button"
                    className="t-label wk-hood"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => openHood(p, i)}
                  >
                    <span className="wk-hood-glyph" aria-hidden="true" />
                    {isOpen ? "Close the hood" : "Under the hood"}
                  </button>

                  {/* ── The depth ─────────────────────────────────────── */}
                  <div id={panelId} className="wk-deep" hidden={!isOpen}>
                    <ul className="wk-stack">
                      {p.reveals.map((t) => (
                        <li key={t} data-reveal-tech className="wk-stack-item">
                          {t}
                        </li>
                      ))}
                    </ul>

                    <dl className="wk-strata">
                      {p.strata.map((s, si) => (
                        <div key={s.label} className="wk-stratum">
                          <dt>
                            <span className="wk-stratum-n" aria-hidden="true">
                              {String(si + 1).padStart(2, "0")}
                            </span>
                            <span className="t-label">{s.label}</span>
                          </dt>
                          <dd>{s.body}</dd>
                        </div>
                      ))}
                    </dl>

                    <p className="t-hand wk-note" aria-hidden="true">
                      {p.handNote}
                    </p>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ol>

      <p className="t-meta wk-footnote" data-reveal>
        Every system above is live and reachable. Each description is drawn from
        the project&rsquo;s own machine-readable disclosure, so anything claimed
        here can be checked against the source.
      </p>
    </Movement>
  );
}
