"use client";

import { useCallback, useEffect, useState } from "react";
import { THEME_KEY } from "@/lib/theme";

type Mode = "light" | "dark" | "system";

const KEY = THEME_KEY;

function apply(mode: Mode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
}

/**
 * Pulls the light out of the room rather than flipping a switch: the
 * transition is a timed dissolve, honoured only when motion is welcome.
 */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(KEY) as Mode | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setMode(stored);
      }
    } catch {
      /* private mode, blocked storage — the system default is correct anyway */
    }
  }, []);

  const cycle = useCallback(() => {
    const order: Mode[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    setMode(next);
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* nothing to do — the choice simply will not persist */
    }
  }, [mode]);

  const label = mounted ? mode : "system";

  return (
    <button
      type="button"
      onClick={cycle}
      className="t-label glass glass-chip magnetic"
      aria-label={`Colour scheme: ${label}. Activate to change.`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 0.7rem",
        cursor: "pointer",
        color: "var(--fg-muted)",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" fill="none">
        <circle cx="6" cy="6" r="5" className="engraved" />
        <path d="M6 1a5 5 0 0 0 0 10z" fill="var(--fg-muted)" opacity="0.7" />
      </svg>
      <span suppressHydrationWarning>{label}</span>
    </button>
  );
}
