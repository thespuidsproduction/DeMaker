"use client";

import { useEffect, useRef, useState } from "react";
import { TOOLBOX, type Facet } from "@/content/site";
import { createField, type FieldHandle } from "@/lib/physics";
import { trackSpecular, useGsapSetup, gsap, prefersReducedMotion } from "@/lib/motion";
import { useTraces, Marginalia } from "@/lib/traces";
import { Movement } from "./Movement";
import { CornerLeaf } from "./Ornament";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE TOOLBOX
 *
 * Six objects, not thirty-four names. Each carries a capability; the
 * technology underneath only exists once someone has asked for it, and the
 * long tail needs a second, quieter ask.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Toolbox() {
  const [open, setOpen] = useState<string | null>(null);
  const [deep, setDeep] = useState<string | null>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const objRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fieldRef = useRef<FieldHandle | null>(null);
  const { leave } = useTraces();

  useGsapSetup();

  /* The objects float: low tether, high damping. They part around the hand
     and settle back without ever leaving their cell. */
  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    const objs = objRefs.current.filter((o): o is HTMLDivElement => Boolean(o));
    if (!objs.length) return;

    const id = window.setTimeout(() => {
      fieldRef.current = createField(rig, objs, {
        gravity: 0,
        tether: 30,
        damping: 4.6,
        cursorRadius: 170,
        cursorForce: 3.4,
        leash: 22,
      });
    }, 260);

    return () => {
      window.clearTimeout(id);
      fieldRef.current?.destroy();
      fieldRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cleanups = objRefs.current
      .filter((o): o is HTMLDivElement => Boolean(o))
      .map(trackSpecular);
    return () => cleanups.forEach((fn) => fn());
  }, []);

  const unfold = (f: Facet, i: number) => {
    const isOpen = open === f.id;
    if (isOpen) {
      setOpen(null);
      setDeep(null);
      return;
    }
    setOpen(f.id);
    setDeep(null);
    leave("the toolbox", f.primary);

    const el = objRefs.current[i];
    if (el && !prefersReducedMotion()) {
      const r = el.getBoundingClientRect();
      fieldRef.current?.impulseAt(r.left + r.width / 2, r.top + r.height / 2, 1.9);
      gsap.fromTo(
        el.querySelectorAll("[data-tech]"),
        { opacity: 0, y: 10, filter: "blur(5px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.7,
          stagger: 0.06,
          ease: "power3.out",
          delay: 0.1,
        },
      );
    }
  };

  return (
    <Movement id="toolbox" index="§ 04" title="The Toolbox" aside="six objects">
      <p className="t-body tb-lede" data-reveal>
        Six things I do. Open one to see what it is made of.
      </p>

      <div ref={rigRef} className="tb-rig">
        <ul className="tb-grid">
          {TOOLBOX.map((f, i) => {
            const isOpen = open === f.id;
            const isDeep = deep === f.id;
            const panelId = `tb-${f.id}`;
            return (
              <li key={f.id} className={`tb-cell${isOpen ? " tb-cell-open" : ""}`} data-reveal>
                <div
                  ref={(n) => {
                    objRefs.current[i] = n;
                  }}
                  data-phys
                  className={`tb-object glass glass-plate${isOpen ? " tb-object-open" : ""}`}
                >
                  <CornerLeaf className="tb-leaf" />

                  <button
                    type="button"
                    className="tb-trigger"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => unfold(f, i)}
                  >
                    <span className="tb-verb">{f.verb}</span>
                    <span className="t-label tb-domain">{f.domain}</span>
                    <span className="tb-glyph" aria-hidden="true">
                      <span />
                      <span />
                    </span>
                  </button>

                  <p className="tb-claim">{f.claim}</p>

                  <div id={panelId} className="tb-panel" hidden={!isOpen}>
                    <ul className="tb-primary">
                      {f.primary.map((t) => (
                        <li key={t} data-tech className="tb-tech">
                          {t}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="t-label tb-more"
                      aria-expanded={isDeep}
                      onClick={() => {
                        const next = isDeep ? null : f.id;
                        setDeep(next);
                        if (next) leave("the toolbox", f.secondary);
                      }}
                    >
                      {isDeep ? "− less" : "+ more"}
                    </button>

                    {isDeep ? (
                      <p className="tb-secondary">
                        also worked with{" "}
                        {f.secondary.map((t, si) => (
                          <span key={t}>
                            <span className="tb-secondary-item">{t}</span>
                            {si < f.secondary.length - 1 ? ", " : "."}
                          </span>
                        ))}
                      </p>
                    ) : null}

                    <span className="t-hand tb-aside" aria-hidden="true">
                      {f.aside}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <Marginalia after={3} prefix="still holding" className="tb-margin" />
    </Movement>
  );
}
