"use client";

import { useEffect, useRef } from "react";
import { SITE } from "@/content/site";
import { useGsapSetup, gsap, prefersReducedMotion, magnetise, trackSpecular } from "@/lib/motion";
import { CoordinateRose, Flourish, EngravedRule } from "./Ornament";

/**
 * The final page of an experimental technical journal. The statement is set
 * as a plate; the details beneath it are set as a colophon.
 */
export function Contact() {
  const ref = useRef<HTMLElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const magnetRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  useGsapSetup();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.set("[data-c]", { opacity: 1, yPercent: 0 });
        return;
      }
      gsap.fromTo(
        "[data-c='line']",
        { yPercent: 110, opacity: 0, rotate: 1.2 },
        {
          yPercent: 0,
          opacity: 1,
          rotate: 0,
          duration: 1.5,
          ease: "expo.out",
          stagger: 0.11,
          scrollTrigger: { trigger: el, start: "top 76%", once: true },
        },
      );
      gsap.fromTo(
        "[data-c='detail']",
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.07,
          scrollTrigger: { trigger: el, start: "top 62%", once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const cleanups = magnetRefs.current
      .filter((a): a is HTMLAnchorElement => Boolean(a))
      .map((a) => magnetise(a, 0.2, 90));
    const plate = plateRef.current;
    if (plate) cleanups.push(trackSpecular(plate));
    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <section ref={ref} id="contact" className="movement contact" aria-labelledby="contact-heading">
      <div className="shell">
        <div className="contact-eyebrow">
          <span className="t-label">07 — Contact</span>
          <Flourish className="contact-flourish" />
        </div>

        {/* Authored line breaks: the rag is composed, never left to the
            browser. Screen readers still receive one continuous sentence. */}
        <h2 id="contact-heading" className="contact-statement t-display">
          <span className="sr-only">Let&rsquo;s build something that should not exist yet.</span>
          <span aria-hidden="true">
            <span className="contact-mask">
              <span data-c="line">LET&rsquo;S BUILD</span>
            </span>
            <span className="contact-mask">
              <span data-c="line" className="contact-statement-b">
                SOMETHING THAT
              </span>
            </span>
            <span className="contact-mask">
              <span data-c="line" className="contact-statement-c">
                SHOULD NOT EXIST YET.
              </span>
            </span>
          </span>
        </h2>

        <EngravedRule className="contact-rule" />

        <div className="contact-body">
          <div ref={plateRef} className="contact-card glass glass-plate corners" data-c="detail">
            <span className="t-label">Correspondence</span>
            <ul className="contact-links">
              <li>
                <a
                  ref={(n) => {
                    magnetRefs.current[0] = n;
                  }}
                  href={`mailto:${SITE.email}`}
                  className="contact-link magnetic"
                >
                  <span className="contact-link-label">Email</span>
                  <span className="contact-link-value">{SITE.email}</span>
                  <Arrow />
                </a>
              </li>
              <li>
                <a
                  ref={(n) => {
                    magnetRefs.current[1] = n;
                  }}
                  href={`tel:${SITE.phoneHref}`}
                  className="contact-link magnetic"
                >
                  <span className="contact-link-label">Telephone</span>
                  <span className="contact-link-value">{SITE.phone}</span>
                  <Arrow />
                </a>
              </li>
            </ul>
          </div>

          <div className="contact-colophon" data-c="detail">
            <p className="contact-name">{SITE.name}</p>
            <ul className="contact-roles">
              {SITE.roles.map((r) => (
                <li key={r}>{r.toUpperCase()}</li>
              ))}
            </ul>
            <p className="t-meta contact-place">{SITE.location}</p>
            <CoordinateRose className="contact-rose" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <svg
      className="contact-arrow"
      viewBox="0 0 24 12"
      aria-hidden="true"
      fill="none"
      width="24"
      height="12"
    >
      <path d="M0 6h21M16 1l5 5-5 5" className="engraved" strokeWidth="1" />
    </svg>
  );
}
