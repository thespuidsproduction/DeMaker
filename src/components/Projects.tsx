"use client";

import { useEffect, useRef, useState } from "react";
import { PROJECTS } from "@/content/site";
import { trackSpecular, useGsapSetup, gsap, prefersReducedMotion } from "@/lib/motion";
import { Movement } from "./Movement";
import { TopologyPlate, Flourish } from "./Ornament";

/**
 * A digital exhibition. Each project is an artifact on a plinth: the preview
 * sits behind distorted glass, and the architecture is revealed by inspection
 * rather than by scrolling past it.
 */
export function Projects() {
  const [inspecting, setInspecting] = useState<string | null>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  useGsapSetup();

  useEffect(() => {
    const cleanups = cardRefs.current
      .filter((c): c is HTMLElement => Boolean(c))
      .map(trackSpecular);
    return () => cleanups.forEach((fn) => fn());
  }, []);

  // Cards carry inertia through the scroll: each drifts at its own rate.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.to(el, {
          yPercent: i % 2 === 0 ? -3.5 : 3,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1.2 },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <Movement id="work" index="§ 03" title="Exhibition" aside="objects, not screenshots">
      <p className="t-body works-intro" data-reveal>
        Systems presented as artifacts. Each one opens to its own strata —
        interface, transport, persistence, infrastructure, and the decisions
        that made it behave.
      </p>

      <ol className="works">
        {PROJECTS.map((p, i) => {
          const isOpen = inspecting === p.index;
          const panelId = `work-strata-${p.index}`;
          return (
            <li
              key={p.index}
              ref={(n) => {
                cardRefs.current[i] = n as HTMLElement | null;
              }}
              data-reveal
              className={`work${isOpen ? " work-open" : ""}`}
            >
              <article className="work-card glass glass-plate corners">
                {/* The preview: a distorted glass window onto the system. */}
                <div className="work-window" aria-hidden="true">
                  <div className="work-window-inner refract">
                    <TopologyPlate className="work-window-plate" />
                  </div>
                  <div className="work-window-veil" />
                  <span className="t-label work-window-tag">{p.kind}</span>
                </div>

                <div className="work-body">
                  <header className="work-head">
                    <span className="t-label">Project {p.index}</span>
                    <Flourish className="work-flourish" />
                  </header>

                  <h3 className="work-title">{p.name}</h3>
                  <p className="work-summary">{p.summary}</p>

                  <button
                    type="button"
                    className="t-label work-inspect"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setInspecting(isOpen ? null : p.index)}
                  >
                    <span className="work-inspect-glyph" aria-hidden="true" />
                    {isOpen ? "Close architecture" : "Inspect architecture"}
                  </button>

                  <div id={panelId} className="work-strata" hidden={!isOpen}>
                    <dl>
                      {p.strata.map((s, si) => (
                        <div key={s.label} className="work-stratum">
                          <dt>
                            <span className="work-stratum-n" aria-hidden="true">
                              {String(si + 1).padStart(2, "0")}
                            </span>
                            <span className="t-label">{s.label}</span>
                          </dt>
                          <dd>{s.body}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ol>

      <p className="t-meta works-note" data-reveal>
        Client-identifying detail is withheld until each system is publicly
        referenceable. Architecture is described exactly as built.
      </p>
    </Movement>
  );
}
