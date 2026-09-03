"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AGENT_STAGES, AGENT_ARCHITECTURE } from "@/content/site";
import { createField, type FieldHandle } from "@/lib/physics";
import {
  useGsapSetup,
  gsap,
  prefersReducedMotion,
  trackSpecular,
  rafWhenVisible,
} from "@/lib/motion";
import { useTraces, Marginalia } from "@/lib/traces";
import { Movement } from "./Movement";
import { Flourish } from "./Ornament";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE AGENT
 *
 * No dissertation. Three modules at rest — Perceive, Think, Act. Interact and
 * four more slide in between them; interact again and the architecture behind
 * the diagram finally speaks.
 *
 * The visitor learns by taking it apart, not by reading about it.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function AgentLab() {
  const [depth, setDepth] = useState<0 | 1 | 2>(0);
  const [live, setLive] = useState(-1);
  const [running, setRunning] = useState(false);

  const rigRef = useRef<HTMLDivElement>(null);
  const modRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<SVGPathElement[]>([]);
  const fieldRef = useRef<FieldHandle | null>(null);
  const timerRef = useRef<number | null>(null);
  const { leave } = useTraces();

  useGsapSetup();

  const visible = AGENT_STAGES.filter((s) => s.depth === 0 || depth >= 1);

  /* ── Physics: the machine has weight, and rewires as it grows ─────────── */
  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;

    fieldRef.current?.destroy();
    fieldRef.current = null;

    const id = window.setTimeout(() => {
      const mods = visible
        .map((s) => modRefs.current.get(s.id))
        .filter((m): m is HTMLDivElement => Boolean(m));
      if (!mods.length) return;
      fieldRef.current = createField(rig, mods, {
        gravity: 0,
        tether: 26,
        damping: 4.2,
        cursorRadius: 200,
        cursorForce: 5.5,
        leash: 30,
        colliderScale: 0.74,
      });
    }, 340);

    return () => {
      window.clearTimeout(id);
      fieldRef.current?.destroy();
      fieldRef.current = null;
    };
    // Re-seat the solver whenever the machine gains or loses modules.
  }, [depth, visible.length]);

  /* ── Wiring redrawn from live geometry every frame ────────────────────── */
  useEffect(() => {
    const rig = rigRef.current;
    const svg = svgRef.current;
    if (!rig || !svg) return;

    const draw = () => {
      const box = rig.getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);

      for (let i = 0; i < visible.length - 1; i++) {
        const a = modRefs.current.get(visible[i].id);
        const b = modRefs.current.get(visible[i + 1].id);
        const p = pathRefs.current[i];
        if (!a || !b || !p) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const wrapped = rb.left < ra.left;

        // Cables leave one module's edge and enter the next one's, so they run
        // through the gutter rather than across the reading surface.
        const x1 = (wrapped ? ra.left + ra.width / 2 : ra.right) - box.left;
        const y1 = (wrapped ? ra.bottom : ra.top + ra.height / 2) - box.top;
        const x2 = (wrapped ? rb.left + rb.width / 2 : rb.left) - box.left;
        const y2 = (wrapped ? rb.top : rb.top + rb.height / 2) - box.top;
        const sag = Math.min(20, Math.hypot(x2 - x1, y2 - y1) * 0.16);
        p.setAttribute("d", `M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag} ${x2} ${y2}`);
      }
    };
    draw();
    return rafWhenVisible(rig, draw);
  }, [visible]);

  useEffect(() => {
    const cleanups = Array.from(modRefs.current.values()).map(trackSpecular);
    return () => cleanups.forEach((fn) => fn());
  }, [depth]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  /* ── Expansion ────────────────────────────────────────────────────────── */
  const expand = useCallback(() => {
    setDepth((d) => {
      const next = (d < 2 ? d + 1 : 0) as 0 | 1 | 2;
      if (next === 1) leave("the agent", ["Retrieval", "Tools", "Memory", "Evaluation"]);
      if (next === 2) leave("the agent", ["Bounded state", "Typed edges", "Human in the loop"]);
      return next;
    });
  }, [leave]);

  /* ── A signal travelling the machine ──────────────────────────────────── */
  const runTrace = useCallback(() => {
    if (running) return;
    setRunning(true);
    const step = prefersReducedMotion() ? 200 : 460;
    let i = 0;

    const advance = () => {
      setLive(i);
      const el = modRefs.current.get(visible[i]?.id ?? "");
      if (el && !prefersReducedMotion()) {
        const r = el.getBoundingClientRect();
        fieldRef.current?.impulseAt(r.left + r.width / 2, r.top + r.height / 2, 1.4);
      }
      const thread = pathRefs.current[i];
      if (thread && !prefersReducedMotion()) {
        const len = thread.getTotalLength?.() ?? 200;
        gsap.fromTo(
          thread,
          { strokeDasharray: `16 ${len}`, strokeDashoffset: len },
          { strokeDashoffset: 0, duration: step / 1000, ease: "power1.inOut" },
        );
      }
      i += 1;
      timerRef.current = window.setTimeout(
        i < visible.length
          ? advance
          : () => {
              setLive(-1);
              setRunning(false);
            },
        step,
      );
    };
    timerRef.current = window.setTimeout(advance, 50);
  }, [running, visible]);

  const label = depth === 0 ? "Open the system" : depth === 1 ? "Show the architecture" : "Collapse";

  return (
    <Movement id="agent" index="§ 06" title="It Decides" aside="watch it work">
      <div className={`ag ag-depth-${depth}`}>
        <div className="ag-head" data-reveal>
          <p className="ag-claim">
            Software that doesn&rsquo;t only respond.
            <span className="ag-claim-b"> Software that can act.</span>
          </p>
          <button type="button" className="t-label ag-expand" onClick={expand} aria-expanded={depth > 0}>
            <span className="ag-expand-glyph" aria-hidden="true">
              {depth === 2 ? "−" : "+"}
            </span>
            {label}
          </button>
        </div>

        <div className="ag-machine glass glass-plate corners" data-reveal>
          <div className="ag-machine-head">
            <span className="t-label">
              Fig. 06 / {depth === 0 ? "Loop" : depth === 1 ? "Pipeline" : "Architecture"}
            </span>
            <button
              type="button"
              className="t-label ag-run"
              onClick={runTrace}
              disabled={running}
            >
              <span className="ag-run-dot" aria-hidden="true" />
              {running ? "Tracing…" : "Run a trace"}
            </button>
          </div>

          <div ref={rigRef} className="ag-rig">
            <svg ref={svgRef} className="ag-threads" aria-hidden="true" preserveAspectRatio="none">
              {visible.slice(0, -1).map((s, i) => (
                <path
                  key={s.id}
                  ref={(n) => {
                    if (n) pathRefs.current[i] = n;
                  }}
                  className="ag-thread"
                  fill="none"
                />
              ))}
            </svg>

            <ol className="ag-modules">
              {visible.map((s, i) => (
                <li key={s.id} className={`ag-slot${s.depth === 1 ? " ag-slot-added" : ""}`}>
                  <div
                    ref={(n) => {
                      if (n) modRefs.current.set(s.id, n);
                      else modRefs.current.delete(s.id);
                    }}
                    data-phys
                    className={`ag-module glass${live === i ? " ag-module-live" : ""}`}
                  >
                    <span className="ag-module-i" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="ag-module-name">{s.name}</h3>
                    {depth >= 1 ? <p className="ag-module-note">{s.note}</p> : null}
                    <span className="ag-port" aria-hidden="true" />
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {depth === 2 ? (
            <dl className="ag-arch">
              {AGENT_ARCHITECTURE.map((a) => (
                <div key={a.k} className="ag-arch-row">
                  <dt className="t-label">{a.k}</dt>
                  <dd>{a.v}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="ag-foot">
            <Flourish className="ag-flourish" />
            <span className="t-hand ag-hand" aria-hidden="true">
              {depth === 0
                ? "three moves, then it stops"
                : depth === 1
                  ? "every edge is typed"
                  : "a scheduler that guesses"}
            </span>
          </div>
        </div>

        <Marginalia after={5} prefix="from earlier" pick="first" className="ag-margin" />
      </div>
    </Movement>
  );
}
