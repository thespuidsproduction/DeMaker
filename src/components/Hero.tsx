"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { SITE, SURFACE_STACK } from "@/content/site";
import { createField, type FieldHandle } from "@/lib/physics";
import { useGsapSetup, gsap, EASE, prefersReducedMotion, trackSpecular } from "@/lib/motion";
import {
  CoordinateRose,
  Flourish,
  CircuitTrace,
  SchemaPlate,
  BotanicalDiagram,
} from "./Ornament";

/**
 * Fragment placement. Deliberately asymmetric — the labels sit in the
 * negative space around the identity block, not in a ring around it.
 * Coordinates are percentages of the field, tuned per breakpoint band by the
 * `far` flag (fragments marked far are hidden on narrow viewports so the
 * composition never becomes a crowd).
 */
type Placement = {
  x: number;
  y: number;
  /** Hidden below 900px — the composition must never become a crowd. */
  far?: boolean;
  scale?: number;
  /** Slot index for the narrow-viewport arrangement (see globals.css). */
  m?: number;
};

const PLACEMENT: Placement[] = [
  { x: 6, y: 30, m: 0 },       // React
  { x: 77, y: 10, far: true }, // Next.js
  { x: 87, y: 26, m: 1 },      // TypeScript
  { x: 3, y: 62, far: true },  // Node
  { x: 84, y: 58, m: 2 },      // PostgreSQL
  { x: 2, y: 80, m: 3 },       // AI
];

export function Hero() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rootRef = useRef<HTMLElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);

  useGsapSetup();

  /* ── Physics: the fragments float inside a bounded optical system ─────── */
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const chips = chipsRef.current.filter((c): c is HTMLDivElement => Boolean(c));
    if (!chips.length) return;

    let handle: FieldHandle | null = null;
    // Let layout settle before anchors are measured.
    const id = window.setTimeout(() => {
      handle = createField(field, chips, {
        gravity: 0,
        tether: 22,
        damping: 3.0,
        cursorRadius: 220,
        cursorForce: 6.5,
        leash: 118,
      });
    }, 220);

    const onShock = (e: PointerEvent) => handle?.impulseAt(e.clientX, e.clientY, 3.2);
    field.addEventListener("pointerdown", onShock);

    return () => {
      window.clearTimeout(id);
      field.removeEventListener("pointerdown", onShock);
      handle?.destroy();
    };
  }, []);

  /* ── Entrance: scored, not faded ──────────────────────────────────────── */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.set("[data-h]", { opacity: 1, y: 0, clipPath: "none" });
        gsap.set("[data-chip]", { opacity: 1, scale: 1 });
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: EASE.door } });

      tl.fromTo(
        "[data-h='rule']",
        { scaleX: 0, transformOrigin: "left center" },
        { scaleX: 1, opacity: 1, duration: 1.1 },
      )
        .fromTo(
          "[data-h='eyebrow']",
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.8 },
          "-=0.75",
        )
        .fromTo(
          "[data-h='word']",
          { opacity: 0, yPercent: 108, rotate: 1.6 },
          {
            opacity: 1,
            yPercent: 0,
            rotate: 0,
            duration: 1.45,
            stagger: 0.09,
            ease: "expo.out",
          },
          "-=0.5",
        )
        .fromTo(
          "[data-h='role']",
          { opacity: 0, x: -14 },
          { opacity: 1, x: 0, duration: 0.9, stagger: 0.075 },
          "-=1.0",
        )
        .fromTo(
          "[data-h='philosophy']",
          { opacity: 0, y: 18, filter: "blur(7px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.2 },
          "-=0.85",
        )
        .fromTo(
          "[data-h='orn']",
          { opacity: 0, rotate: -22 },
          { opacity: 1, rotate: 0, duration: 1.6, ease: "power2.out" },
          "-=1.1",
        )
        .fromTo(
          "[data-chip]",
          { opacity: 0, scale: 0.86, filter: "blur(8px)" },
          {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: 1.05,
            stagger: { each: 0.055, from: "random" },
          },
          "-=1.5",
        );

      // Parallax on scroll: the fragments and the identity drift at different
      // rates, so the composition gains depth rather than sliding as a slab.
      gsap.to("[data-h='identity']", {
        yPercent: -9,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 0.6 },
      });
      gsap.to("[data-field]", {
        yPercent: 13,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 0.9 },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  /* ── Specular tracking on the statement plate ─────────────────────────── */
  useEffect(() => {
    const el = plateRef.current;
    if (!el) return;
    return trackSpecular(el);
  }, []);

  return (
    <section ref={rootRef} id="identity" className="hero" aria-label="Prince Chipango, identity">
      {/* The optical field: translucent planes carrying technical fragments. */}
      <div ref={fieldRef} className="hero-field" data-field aria-hidden="true">
        {/* Matter behind the glass. Without something to bend, a translucent
            plane is just a rectangle — this is what makes the planes read as
            optical rather than decorative. */}
        <div className="hero-ghost">
          <span className="hero-ghost-num">01</span>
          <SchemaPlate className="hero-ghost-plate" />
        </div>
        <div className="hero-ghost hero-ghost-b">
          <BotanicalDiagram className="hero-ghost-botanical" />
        </div>

        <div className="hero-plane hero-plane-a glass glass-plate" />
        <div className="hero-plane hero-plane-b glass" />
        <div className="hero-plane hero-plane-c glass glass-chip" />

        {SURFACE_STACK.map((frag, i) => {
          const p: Placement = PLACEMENT[i] ?? { x: 50, y: 50 };
          // Fragments on the right half are anchored by their right edge, so
          // a long label can never push past the viewport.
          const rightAnchored = p.x >= 50;
          return (
            <div
              key={frag}
              ref={(n) => {
                chipsRef.current[i] = n;
              }}
              data-chip
              data-phys
              data-m={p.m}
              className={`hero-chip glass glass-chip t-label${p.far ? " hero-chip-far" : ""}${
                rightAnchored ? " hero-chip-right" : ""
              }`}
              // The wide-viewport position travels as inline custom
              // properties; the narrow-viewport seats are declared only in
              // the stylesheet, under different names, and take priority via
              // the var() fallback chain. Inline custom properties always beat
              // stylesheet ones, so the two sets must never share a name.
              style={
                {
                  "--chip-dx": rightAnchored ? "auto" : `${p.x}%`,
                  "--chip-drx": rightAnchored ? `${(100 - p.x).toFixed(2)}%` : "auto",
                  "--chip-dy": `${p.y}%`,
                  fontSize: `${0.5625 * (p.scale ?? 1)}rem`,
                } as CSSProperties
              }
            >
              <span className="hero-chip-dot" />
              {frag}
            </div>
          );
        })}
      </div>

      <div className="shell hero-inner">
        <div className="grid12">
          {/* Left rail: laboratory metadata. */}
          <div className="hero-rail">
            <div className="hair" data-h="rule" style={{ opacity: 0 }} />
            <p className="t-label hero-rail-line" data-h="eyebrow">
              {SITE.domain}
            </p>
            <p className="t-label hero-rail-line" data-h="eyebrow">
              Portfolio № 01
            </p>
            {/* Deliberately coarse. Two decimal places of latitude and
                longitude is a street, and the only location this site
                publishes is a country. This is the same imprecise pair the
                atlas centres on, which is the middle of the island and
                nobody's address. */}
            <p className="t-label hero-rail-line hero-rail-coord" data-h="eyebrow">
              54°N 2°W
            </p>
          </div>

          {/* Identity block. */}
          <div className="hero-identity" data-h="identity">
            <h1 className="hero-name t-display">
              <span className="hero-word-mask">
                <span data-h="word">PRINCE</span>
              </span>
              <span className="hero-word-mask">
                <span data-h="word">CHIPANGO</span>
              </span>
            </h1>

            <ul className="hero-roles" aria-label="Disciplines">
              {SITE.roles.map((r) => (
                <li key={r} data-h="role" className="hero-role">
                  <span className="hero-role-tick" aria-hidden="true" />
                  {r.toUpperCase()}
                </li>
              ))}
            </ul>
          </div>

          {/* Philosophy plate — the manifesto in miniature. */}
          <div className="hero-plate-wrap" data-h="philosophy">
            <div ref={plateRef} className="hero-plate glass glass-plate corners">
              <div className="hero-plate-head">
                <span className="t-label">Statement</span>
                <Flourish className="hero-plate-flourish" />
              </div>
              <blockquote className="hero-quote">
                <p>&ldquo;{SITE.philosophy}&rdquo;</p>
              </blockquote>
              <CircuitTrace className="hero-plate-trace" />
              <p className="t-meta hero-plate-foot">
                <span>FIG. 01</span>
                <span>/</span>
                <span>PRINCIPLE OF OPERATION</span>
              </p>
            </div>
          </div>
        </div>

        <CoordinateRose className="hero-rose" data-h="orn" />
      </div>

      <div className="hero-baseline">
        <div className="shell hero-baseline-inner">
          <span className="t-label">Scroll</span>
          <span className="hero-baseline-line" aria-hidden="true" />
          <span className="t-label">Full-stack · Frontend · Agentic systems</span>
        </div>
      </div>
    </section>
  );
}
