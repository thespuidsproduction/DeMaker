"use client";

import { useEffect, useRef } from "react";
import { SITE } from "@/content/site";
import { useGsapSetup, gsap, prefersReducedMotion } from "@/lib/motion";
import { EngravedRule, BotanicalDiagram } from "./Ornament";
import { Annotate } from "./Annotate";

/**
 * The manifesto. Set as a declaration, not résumé copy — the line breaks are
 * authored so each clause lands on its own baseline.
 */
export function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  useGsapSetup();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.set("[data-clause]", { opacity: 1, y: 0 });
        gsap.set("[data-reveal]", { opacity: 1 });
        return;
      }
      gsap.set("[data-reveal]", { opacity: 1 });

      // Each clause settles under its own weight as the reader arrives.
      gsap.fromTo(
        "[data-clause]",
        { opacity: 0.12, y: 20, filter: "blur(4px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 1,
          ease: "power3.out",
          stagger: 0.14,
          scrollTrigger: {
            trigger: el,
            start: "top 72%",
            end: "center 52%",
            scrub: 0.8,
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, []);

  const clauses = [
    "I build software from the interface",
    "down to the infrastructure.",
    "Products that feel effortless at 60fps,",
    "remain useful when the network is slow,",
    "behave properly on mobile Safari,",
    "and stay understandable long",
    "after the first deployment.",
  ];

  return (
    <section ref={ref} className="movement manifesto" aria-label="Manifesto">
      <div className="shell">
        <div className="grid12">
          <div className="manifesto-mark" data-reveal style={{ opacity: 0 }}>
            <span className="t-label">Manifesto</span>
            <BotanicalDiagram className="manifesto-botanical" />
            <span className="t-hand manifesto-note">
              the whole system,
              <br />
              or none of it
            </span>
          </div>

          <div className="manifesto-body">
            <p className="manifesto-statement">
              {clauses.map((c, i) => (
                <span key={c} data-clause className="manifesto-clause">
                  {c === "and stay understandable long" ? (
                    <>
                      and stay <Annotate kind="circle">understandable</Annotate> long
                    </>
                  ) : (
                    c
                  )}
                  {i < clauses.length - 1 ? " " : ""}
                </span>
              ))}
            </p>

            <EngravedRule className="manifesto-rule" data-reveal style={{ opacity: 0 }} />

            <p className="t-meta manifesto-attrib" data-reveal style={{ opacity: 0 }}>
              {SITE.name} · {SITE.location} · {SITE.domain}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
