"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PROJECTS, TOOLBOX } from "@/content/site";
import { holdScroll } from "@/lib/lock";
import { prefersReducedMotion } from "@/lib/motion";
import { useTraces } from "@/lib/traces";

/* ── The catalogue ─────────────────────────────────────────────────────── */

type Entry = {
  id: string;
  group: "Sections" | "Work" | "Elsewhere";
  label: string;
  hint: string;
  /** Extra words that should match, without being printed. */
  keys?: string;
  run: () => void;
};

const goto = (hash: string) => () => {
  const el = document.getElementById(hash);
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  // The address bar should still say where you are, but pushing the hash
  // directly would make the browser jump before the smooth scroll starts.
  window.history.replaceState(null, "", `#${hash}`);
};

const SECTIONS: Array<[string, string, string, string]> = [
  ["identity", "Identity", "§ 01", "top home start name prince chipango"],
  ["work", "What I Build", "§ 03", "projects portfolio case studies"],
  ["toolbox", "The Toolbox", "§ 04", "stack skills tools technologies"],
  ["measured", "Measured", "§ 05", "numbers metrics verifiable"],
  ["agent", "It Decides", "§ 06", "agent ai architecture pipeline"],
  ["profile", "The Person", "§ 07", "about bio background"],
  ["atlas", "Where From", "§ 08", "map globe mercator location united kingdom"],
  ["chart", "Your Chart", "§ 09", "memory traces constellation what you found"],
  ["contact", "Open a Channel", "§ 10", "contact email message hire get in touch"],
];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE INDEX
 *
 * A card catalogue drawer. On a wide screen it answers to the keyboard and
 * behaves as a command palette; on a phone it is simply the navigation,
 * full height, with everything the header cannot fit.
 *
 * Nine sections exist and the header has only ever shown six of them, so the
 * atlas and the chart have been reachable by scrolling and by nothing else.
 * This is the way in.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function IndexDrawer() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [mac, setMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const { leave } = useTraces();

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = SECTIONS.map(([id, label, hint, keys]) => ({
      id: `s-${id}`,
      group: "Sections",
      label,
      hint,
      keys,
      run: goto(id),
    }));

    for (const p of PROJECTS) {
      out.push({
        id: `p-${p.index}`,
        group: "Work",
        label: p.name,
        hint: p.place,
        keys: `${p.kind} ${p.reveals.join(" ")} blueprint under the hood`,
        run: () => {
          window.dispatchEvent(
            new CustomEvent("atelier:reveal", { detail: { project: p.index } }),
          );
        },
      });
    }

    for (const f of TOOLBOX) {
      out.push({
        id: `t-${f.id}`,
        group: "Elsewhere",
        label: f.verb,
        hint: f.domain,
        keys: `toolbox ${f.primary.join(" ")} ${f.secondary.join(" ")}`,
        run: goto("toolbox"),
      });
    }

    return out;
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      `${e.label} ${e.hint} ${e.keys ?? ""}`.toLowerCase().includes(q),
    );
  }, [entries, query]);

  /* ── Opening and closing ────────────────────────────────────────────── */

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
    restoreTo.current?.focus();
  }, []);

  const show = useCallback(() => {
    restoreTo.current = document.activeElement as HTMLElement | null;
    setOpen(true);
    setQuery("");
    setCursor(0);
  }, []);

  const choose = useCallback(
    (e: Entry | undefined) => {
      if (!e) return;
      close();
      leave("the index", e.label);
      // Let the drawer finish leaving before the page starts moving, or the
      // two animations argue with each other.
      window.setTimeout(e.run, prefersReducedMotion() ? 0 : 180);
    },
    [close, leave],
  );

  /** The global shortcut, and every key the drawer answers to while open. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open ? close() : show();
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => (shown.length ? (c + 1) % shown.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => (shown.length ? (c - 1 + shown.length) % shown.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        choose(shown[cursor]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, shown, cursor, choose, close, show]);

  /* Focus in, and the page held still underneath. */
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    const release = holdScroll();
    return () => {
      window.clearTimeout(t);
      release();
    };
  }, [open]);

  /* Keep the highlighted row in view when the keyboard is doing the moving. */
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[data-cursor="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  /* ── Trap, so tab cannot wander out into a page nobody can see ──────── */
  const onTrap = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const root = e.currentTarget as HTMLElement;
    const focusable = root.querySelectorAll<HTMLElement>(
      'input, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  let lastGroup = "";

  return (
    <>
      <button
        type="button"
        className="ix-open"
        onClick={show}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="ix-open-rules" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="ix-open-word">Index</span>
        <kbd className="ix-open-key" aria-hidden="true">
          {mac ? "⌘" : "Ctrl"}K
        </kbd>
        <span className="sr-only">Open the index. Keyboard shortcut, command or control K.</span>
      </button>

      <div
        className={`ix${open ? " ix-on" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Index"
        hidden={!open}
        onKeyDown={onTrap}
      >
        <div className="ix-veil" onClick={close} aria-hidden="true" />

        <div className="ix-drawer corners">
          <div className="ix-head">
            <label className="sr-only" htmlFor="ix-q">
              Filter the index
            </label>
            <span className="ix-caret" aria-hidden="true" />
            <input
              id="ix-q"
              ref={inputRef}
              className="ix-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sections, work, anything named"
              autoComplete="off"
              spellCheck={false}
              role="combobox"
              aria-expanded="true"
              aria-controls="ix-list"
              aria-activedescendant={shown[cursor] ? `ix-${shown[cursor].id}` : undefined}
            />
            <button type="button" className="ix-close" onClick={close}>
              <span aria-hidden="true">Esc</span>
              <span className="sr-only">Close the index</span>
            </button>
          </div>

          <div className="ix-list" id="ix-list" role="listbox" ref={listRef} tabIndex={-1}>
            {shown.length === 0 ? (
              <p className="ix-empty t-meta">
                Nothing under that name. The whole of it is nine sections and four
                pieces of work.
              </p>
            ) : null}

            {shown.map((e, i) => {
              const head = e.group !== lastGroup ? e.group : null;
              lastGroup = e.group;
              return (
                <div key={e.id}>
                  {head ? (
                    <p className="t-label ix-group" aria-hidden="true">
                      {head}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    id={`ix-${e.id}`}
                    role="option"
                    aria-selected={i === cursor}
                    data-cursor={i === cursor}
                    className={`ix-row${i === cursor ? " ix-row-on" : ""}`}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => choose(e)}
                  >
                    <span className="ix-row-label">{e.label}</span>
                    <span className="ix-row-hint t-meta">{e.hint}</span>
                    <span className="ix-row-arrow" aria-hidden="true">
                      &rarr;
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <p className="ix-foot t-meta" aria-hidden="true">
            <span>&uarr;&darr; move</span>
            <span>&crarr; go</span>
            <span>esc close</span>
          </p>
        </div>
      </div>
    </>
  );
}
