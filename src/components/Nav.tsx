"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { SITE } from "@/content/site";

const STOPS = [
  { id: "identity", label: "Identity" },
  { id: "disciplines", label: "Disciplines" },
  { id: "work", label: "Work" },
  { id: "lab", label: "Agent Lab" },
  { id: "profile", label: "Profile" },
  { id: "contact", label: "Contact" },
];

export function Nav() {
  const [active, setActive] = useState("identity");
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const sections = STOPS.map((s) => document.getElementById(s.id)).filter(
      (n): n is HTMLElement => Boolean(n),
    );

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.2, 0.6] },
    );
    sections.forEach((s) => io.observe(s));

    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      ref={ref}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        transition: "background 500ms var(--ease-door), border-color 500ms",
        borderBottom: `1px solid ${scrolled ? "var(--rule)" : "transparent"}`,
        backdropFilter: scrolled ? "blur(16px) saturate(1.3)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(16px) saturate(1.3)" : "none",
        background: scrolled ? "color-mix(in srgb, var(--bg) 72%, transparent)" : "transparent",
      }}
    >
      <div
        className="shell"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
          height: "clamp(52px, 5.4vw, 66px)",
        }}
      >
        <a href="#identity" style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
          <span
            style={{
              fontWeight: 900,
              letterSpacing: "-0.03em",
              fontSize: "0.9375rem",
            }}
          >
            P·C
          </span>
          <span className="t-label nav-domain">{SITE.domain}</span>
        </a>

        <nav aria-label="Sections" style={{ display: "flex", alignItems: "center", gap: "0.15rem" }}>
          <ul className="nav-list">
            {STOPS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={active === s.id ? "true" : undefined}
                  className="t-label"
                  style={{
                    display: "inline-block",
                    padding: "0.45rem 0.65rem",
                    color: active === s.id ? "var(--accent-ink)" : "var(--fg-faint)",
                    transition: "color 340ms var(--ease-door)",
                  }}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </nav>
      </div>
      <div className="tick-row" style={{ opacity: scrolled ? 0.35 : 0, transition: "opacity 500ms" }} />
    </header>
  );
}
