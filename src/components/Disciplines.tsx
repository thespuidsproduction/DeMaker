"use client";

import { useEffect, useRef, useState } from "react";
import { DISCIPLINES } from "@/content/site";
import { trackSpecular, useGsapSetup, gsap, prefersReducedMotion } from "@/lib/motion";
import { Movement } from "./Movement";
import { CornerLeaf, TopologyPlate, SchemaPlate, CircuitTrace } from "./Ornament";

const PLATES = [SchemaPlate, CircuitTrace, TopologyPlate];

/**
 * Three connected rooms in the same laboratory. The rooms share a wall: the
 * active room widens and its neighbours recede, so the reader is always in
 * one place rather than scanning three columns at once.
 */
export function Disciplines() {
  const [open, setOpen] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  useGsapSetup();

  useEffect(() => {
    const cleanups = cardRefs.current
      .filter((c): c is HTMLElement => Boolean(c))
      .map((c) => trackSpecular(c));
    return () => cleanups.forEach((fn) => fn());
  }, []);

  // The connecting thread between rooms draws itself as the section arrives.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-thread]",
        { scaleX: 0, transformOrigin: "left center" },
        {
          scaleX: 1,
          duration: 1.6,
          ease: "power3.inOut",
          scrollTrigger: { trigger: el, start: "top 78%", once: true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <Movement
      id="disciplines"
      index="§ 02"
      title="Three rooms, one laboratory"
      aside="they share a wall"
    >
      <div ref={wrapRef} className="rooms">
        <div className="rooms-thread" data-thread aria-hidden="true" />

        <div className="rooms-grid">
          {DISCIPLINES.map((d, i) => {
            const Plate = PLATES[i % PLATES.length];
            const isOpen = open === i;
            const panelId = `room-panel-${d.index}`;
            return (
              <article
                key={d.index}
                ref={(n) => {
                  cardRefs.current[i] = n;
                }}
                data-reveal
                className={`room glass glass-plate${isOpen ? " room-open" : ""}`}
              >
                <CornerLeaf className="room-leaf" />

                <header className="room-head">
                  <span className="room-index t-numeral" aria-hidden="true">
                    {d.index}
                  </span>
                  <div className="room-titles">
                    <h3 className="room-title">{d.title}</h3>
                    <p className="t-label room-epithet">{d.epithet}</p>
                  </div>
                </header>

                <p className="room-precis">{d.precis}</p>

                <span className="t-hand room-aside" aria-hidden="true">
                  {d.aside}
                </span>

                <button
                  type="button"
                  className="t-label room-toggle"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  <span className="room-toggle-glyph" aria-hidden="true">
                    {isOpen ? "−" : "+"}
                  </span>
                  {isOpen ? "Close the stack" : "Inspect the stack"}
                </button>

                <div id={panelId} className="room-panel" hidden={!isOpen}>
                  <dl className="room-groups">
                    {d.groups.map((g) => (
                      <div key={g.label} className="room-group">
                        <dt className="t-label">{g.label}</dt>
                        <dd>
                          <ul className="room-items">
                            {g.items.map((it) => (
                              <li key={it} className="room-item">
                                {it}
                              </li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <figure className="room-figure">
                    <Plate className="room-plate" />
                    <figcaption className="t-meta room-caption">{d.signature}</figcaption>
                  </figure>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </Movement>
  );
}
