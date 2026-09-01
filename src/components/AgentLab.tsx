"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AGENT_STAGES, AGENT_CAPABILITIES, SITE } from "@/content/site";
import { createField, type FieldHandle } from "@/lib/physics";
import { useGsapSetup, gsap, prefersReducedMotion, trackSpecular } from "@/lib/motion";
import { Movement } from "./Movement";
import { CoordinateRose, Flourish } from "./Ornament";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AI AGENT LAB
 * The agent rendered as a translucent mechanical system rather than a chat
 * window. Each stage is a glass module with real mass; the threads between
 * them are recomputed from live geometry every frame, so the machine stays
 * wired together however its parts are pushed around.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function AgentLab() {
  const rigRef = useRef<HTMLDivElement>(null);
  const moduleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathsRef = useRef<(SVGPathElement | null)[]>([]);
  const fieldRef = useRef<FieldHandle | null>(null);

  const [live, setLive] = useState<number>(-1);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  useGsapSetup();

  /* ── Physics: the modules have weight and part around the hand ───────── */
  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    const mods = moduleRefs.current.filter((m): m is HTMLDivElement => Boolean(m));
    if (!mods.length) return;

    const id = window.setTimeout(() => {
      fieldRef.current = createField(rig, mods, {
        gravity: 0,
        tether: 42,
        damping: 4.4,
        cursorRadius: 150,
        cursorForce: 2.6,
        leash: 30,
      });
    }, 260);

    return () => {
      window.clearTimeout(id);
      fieldRef.current?.destroy();
      fieldRef.current = null;
    };
  }, []);

  /* ── Wiring: threads redrawn from live geometry ──────────────────────── */
  useEffect(() => {
    const rig = rigRef.current;
    const svg = svgRef.current;
    if (!rig || !svg) return;

    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const box = rig.getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);

      for (let i = 0; i < AGENT_STAGES.length - 1; i++) {
        const a = moduleRefs.current[i];
        const b = moduleRefs.current[i + 1];
        const p = pathsRef.current[i];
        if (!a || !b || !p) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const wrapped = rb.left < ra.left;

        // Cables leave one module's edge and enter the next one's, so they
        // run through the gutter instead of across the reading surface. When
        // the row wraps, the cable drops out of the bottom and re-enters the
        // top of the next line.
        const x1 = (wrapped ? ra.left + ra.width / 2 : ra.right) - box.left;
        const y1 = (wrapped ? ra.bottom : ra.top + ra.height / 2) - box.top;
        const x2 = (wrapped ? rb.left + rb.width / 2 : rb.left) - box.left;
        const y2 = (wrapped ? rb.top : rb.top + rb.height / 2) - box.top;

        // A slack cable rather than a straight rule: it sags between modules
        // and tightens as they are pulled apart.
        const mx = wrapped ? (x1 + x2) / 2 : (x1 + x2) / 2;
        const sag = Math.min(22, Math.hypot(x2 - x1, y2 - y1) * 0.16);
        const my = (y1 + y2) / 2 + sag;
        p.setAttribute("d", `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ── Specular tracking per module ────────────────────────────────────── */
  useEffect(() => {
    const cleanups = moduleRefs.current
      .filter((m): m is HTMLDivElement => Boolean(m))
      .map(trackSpecular);
    return () => cleanups.forEach((fn) => fn());
  }, []);

  /* ── The trace: a signal travelling the machine ──────────────────────── */
  const runTrace = useCallback(() => {
    if (running) return;
    setRunning(true);

    const stepMs = prefersReducedMotion() ? 220 : 520;
    let i = 0;

    const advance = () => {
      setLive(i);
      const el = moduleRefs.current[i];
      if (el && !prefersReducedMotion()) {
        const r = el.getBoundingClientRect();
        fieldRef.current?.impulseAt(r.left + r.width / 2, r.top + r.height / 2, 1.5);
        gsap.fromTo(
          el,
          { "--pulse": 0 },
          { "--pulse": 1, duration: 0.34, yoyo: true, repeat: 1, ease: "power2.inOut" },
        );
      }
      const thread = pathsRef.current[i];
      if (thread && !prefersReducedMotion()) {
        const len = thread.getTotalLength?.() ?? 200;
        gsap.fromTo(
          thread,
          { strokeDasharray: `18 ${len}`, strokeDashoffset: len },
          { strokeDashoffset: 0, duration: stepMs / 1000, ease: "power1.inOut" },
        );
      }
      i += 1;
      if (i < AGENT_STAGES.length) {
        timerRef.current = window.setTimeout(advance, stepMs);
      } else {
        timerRef.current = window.setTimeout(() => {
          setLive(-1);
          setRunning(false);
        }, stepMs);
      }
    };

    timerRef.current = window.setTimeout(advance, 60);
  }, [running]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <Movement id="lab" index="§ 05" title="AI Agent Lab" aside="it can decide">
      <div className="lab">
        <div className="lab-lede">
          <p className="lab-sub" data-reveal>
            Software that doesn&rsquo;t only respond.
            <br />
            <span className="lab-sub-accent">Software that can reason, decide and act.</span>
          </p>
          <p className="t-body lab-stance" data-reveal>
            {SITE.agenticStance}
          </p>
        </div>

        {/* ── The machine ─────────────────────────────────────────────── */}
        <div className="lab-machine glass glass-plate corners" data-reveal>
          <div className="lab-machine-head">
            <div>
              <span className="t-label">Fig. 05 — Agent topology</span>
              <p className="t-meta lab-machine-note">
                Push a module. The machine stays wired.
              </p>
            </div>
            <button
              type="button"
              className="t-label lab-run"
              onClick={runTrace}
              disabled={running}
              aria-live="polite"
            >
              <span className="lab-run-dot" aria-hidden="true" />
              {running ? "Tracing…" : "Run a trace"}
            </button>
          </div>

          <div ref={rigRef} className="lab-rig">
            <svg
              ref={svgRef}
              className="lab-threads"
              aria-hidden="true"
              preserveAspectRatio="none"
            >
              {AGENT_STAGES.slice(0, -1).map((s, i) => (
                <path
                  key={s.id}
                  ref={(n) => {
                    pathsRef.current[i] = n;
                  }}
                  className="lab-thread"
                  fill="none"
                />
              ))}
            </svg>

            <ol className="lab-modules">
              {AGENT_STAGES.map((s, i) => (
                <li key={s.id} className="lab-module-slot">
                  <div
                    ref={(n) => {
                      moduleRefs.current[i] = n;
                    }}
                    data-phys
                    className={`lab-module glass${live === i ? " lab-module-live" : ""}`}
                  >
                    <span className="lab-module-index" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="lab-module-name">{s.name}</h3>
                    <p className="lab-module-note">{s.note}</p>
                    <span className="lab-module-port" aria-hidden="true" />
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="lab-machine-foot">
            <Flourish className="lab-flourish" />
            <span className="t-hand lab-hand">
              a distributed system
              <br />
              with a probabilistic scheduler
            </span>
            <CoordinateRose className="lab-rose" />
          </div>
        </div>

        {/* ── Capabilities ────────────────────────────────────────────── */}
        <div className="lab-caps" data-reveal>
          <span className="t-label">Capabilities under orchestration</span>
          <ul className="lab-caps-list">
            {AGENT_CAPABILITIES.map((c) => (
              <li key={c} className="lab-cap glass glass-chip">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Movement>
  );
}
