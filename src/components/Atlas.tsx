"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LAND } from "@/content/world";
import { SITE } from "@/content/site";
import { gsap, prefersReducedMotion, useGsapSetup } from "@/lib/motion";
import { Movement } from "./Movement";
import { CoordinateRose } from "./Ornament";

/* ── Frame ─────────────────────────────────────────────────────────────── */

const W = 700;
const H = 600;
/**
 * Mercator stretches without limit toward the poles, so a projection has to
 * stop somewhere. Scaling from the height rather than the width means the
 * chosen cut-off is what sets the size, and nothing is sliced off mid-coast:
 * at 83 degrees the only land lost is the very top of Greenland and the
 * Antarctic coast, and no false horizontal appears where a ring was clipped.
 */
const LAT_MAX = 83;
const K = H / 2 / Math.log(Math.tan(Math.PI / 4 + (LAT_MAX * Math.PI) / 360));
const R = 250; // globe radius

/** Roughly the middle of the United Kingdom. Nothing more precise is published. */
const HOME: [number, number] = [-2.0, 54.0];

const rad = (d: number) => (d * Math.PI) / 180;

/** Mercator, as Gerardus Mercator set it out in 1569. */
function mercator(lon: number, lat: number): [number, number] {
  const phi = rad(Math.max(-LAT_MAX, Math.min(LAT_MAX, lat)));
  return [W / 2 + rad(lon) * K, H / 2 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) * K];
}

/**
 * Orthographic, the view from infinitely far away. Returns the third value as
 * the cosine of angular distance from the centre: positive is the near face.
 */
function orthographic(
  lon: number,
  lat: number,
  lon0: number,
  lat0: number,
): [number, number, number] {
  const p = rad(lat);
  const l = rad(lon - lon0);
  const p0 = rad(lat0);
  const cosC = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  return [
    W / 2 + R * Math.cos(p) * Math.sin(l),
    H / 2 - R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)),
    cosC,
  ];
}

/** Meridians and parallels, generated rather than stored. */
function graticule(): number[][][] {
  const lines: number[][][] = [];
  for (let lon = -180; lon <= 180; lon += 30) {
    const line: number[][] = [];
    for (let lat = -80; lat <= 80; lat += 4) line.push([lon, lat]);
    lines.push(line);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const line: number[][] = [];
    for (let lon = -180; lon <= 180; lon += 4) line.push([lon, lat]);
    lines.push(line);
  }
  return lines;
}

const GRID = graticule();

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE ATLAS
 *
 * A Mercator projection that folds into a globe. Both are computed from the
 * same [lon, lat] rings every frame and blended by a single value, so the
 * transition is a real reprojection rather than a crossfade between two
 * pictures.
 *
 * Points on the far side of the sphere are drawn on their own path at an
 * opacity that falls to zero as the sphere closes, which is what makes the
 * flat map look like it is wrapping rather than cutting away.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Atlas() {
  const [globe, setGlobe] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const frontRef = useRef<SVGPathElement>(null);
  const backRef = useRef<SVGPathElement>(null);
  const gridRef = useRef<SVGPathElement>(null);
  const rimRef = useRef<SVGCircleElement>(null);
  const markRef = useRef<SVGGElement>(null);

  /** Blend, spin and the pointer's contribution all live outside React. */
  const view = useRef({ t: 0, spin: 0, drag: 0, vel: 0 });
  useGsapSetup();

  /* ── Draw ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let raf = 0;
    const t0 = performance.now();
    const reduced = prefersReducedMotion();

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const v = view.current;

      // Idle drift keeps the home marker on the near face rather than
      // carrying it round the back where it cannot be seen.
      const drift = reduced ? 0 : Math.sin((now - t0) / 5200) * 13;
      v.drag += v.vel;
      v.vel *= 0.94;
      v.drag *= 0.985; // always returning to the view that shows home
      const lon0 = HOME[0] + drift + v.drag;
      const lat0 = 24;

      const t = v.t;
      let front = "";
      let back = "";

      for (const ring of LAND) {
        let run: "front" | "back" | null = null;
        let prevLon: number | null = null;

        for (let i = 0; i < ring.length; i++) {
          const [lon, lat] = ring[i];

          // A ring that crosses the antimeridian would otherwise be drawn as
          // one long horizontal stroke straight back across the whole map:
          // the classic Mercator seam. Break the path instead.
          const wrapped = prevLon !== null && Math.abs(lon - prevLon) > 180;
          prevLon = lon;

          const [mx, my] = mercator(lon, lat);
          const [ox, oy, cosC] = orthographic(lon, lat, lon0, lat0);
          const x = mx + (ox - mx) * t;
          const y = my + (oy - my) * t;
          const side = cosC > 0 ? "front" : "back";
          const cmd = side === run && !wrapped ? "L" : "M";
          run = side;
          const seg = `${cmd}${x.toFixed(1)} ${y.toFixed(1)}`;
          if (side === "front") front += seg;
          else back += seg;
        }
      }

      let grid = "";
      for (const line of GRID) {
        let run: "front" | "back" | null = null;
        let prevLon: number | null = null;
        for (const [lon, lat] of line) {
          const wrapped = prevLon !== null && Math.abs(lon - prevLon) > 180;
          prevLon = lon;
          const [mx, my] = mercator(lon, lat);
          const [ox, oy, cosC] = orthographic(lon, lat, lon0, lat0);
          const x = mx + (ox - mx) * t;
          const y = my + (oy - my) * t;
          const side = cosC > 0 || t < 0.02 ? "front" : "back";
          if (side === "back") {
            run = null;
            continue;
          }
          grid += `${run === "front" && !wrapped ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
          run = "front";
        }
      }

      frontRef.current?.setAttribute("d", front);
      backRef.current?.setAttribute("d", back);
      // At rest the far side is simply part of a flat map and must look
      // identical to the rest of it. It only recedes as the sphere closes.
      backRef.current?.setAttribute("opacity", String(Math.pow(1 - t, 1.4)));
      gridRef.current?.setAttribute("d", grid);

      const rim = rimRef.current;
      if (rim) {
        rim.setAttribute("opacity", String(t * 0.5));
        rim.setAttribute("r", String(R));
      }

      // The marker rides the same blend, and hides when the globe turns it
      // away rather than floating over the far side.
      const mark = markRef.current;
      if (mark) {
        const [hmx, hmy] = mercator(HOME[0], HOME[1]);
        const [hox, hoy, hcos] = orthographic(HOME[0], HOME[1], lon0, lat0);
        const hx = hmx + (hox - hmx) * t;
        const hy = hmy + (hoy - hmy) * t;
        mark.setAttribute("transform", `translate(${hx.toFixed(1)} ${hy.toFixed(1)})`);
        const vis = hcos > 0 ? 1 : 1 - t;
        mark.setAttribute("opacity", vis.toFixed(2));
      }
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ── Toggle ─────────────────────────────────────────────────────────── */
  const toggle = useCallback(() => {
    const next = !globe;
    setGlobe(next);
    const v = view.current;
    if (prefersReducedMotion()) {
      v.t = next ? 1 : 0;
      return;
    }
    gsap.to(v, {
      t: next ? 1 : 0,
      duration: 1.5,
      ease: "power3.inOut",
    });
  }, [globe]);

  /* ── Spin ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let last: number | null = null;

    const down = (e: PointerEvent) => {
      if (view.current.t < 0.3) return; // nothing to spin on a flat map
      last = e.clientX;
      svg.setPointerCapture(e.pointerId);
      svg.classList.add("atlas-grabbing");
    };
    const move = (e: PointerEvent) => {
      if (last === null) return;
      const dx = e.clientX - last;
      last = e.clientX;
      view.current.drag += dx * 0.35;
      view.current.vel = dx * 0.09;
    };
    const up = () => {
      last = null;
      svg.classList.remove("atlas-grabbing");
    };

    svg.addEventListener("pointerdown", down);
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
    return () => {
      svg.removeEventListener("pointerdown", down);
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up);
      svg.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <Movement id="atlas" index="§ 08" title="Where From" aside="one dot, that is all">
      <div className="atlas">
        <div className="atlas-head" data-reveal>
          <p className="t-body atlas-lede">
            Mercator&rsquo;s projection of 1569, which flattens a sphere by
            stretching the poles until every compass bearing is a straight line.
            Fold it back up and you get the shape it was cut from.
          </p>

          <div className="atlas-controls" role="group" aria-label="Projection">
            <button
              type="button"
              className={`atlas-toggle${!globe ? " atlas-toggle-on" : ""}`}
              onClick={() => globe && toggle()}
              aria-pressed={!globe}
            >
              Mercator
            </button>
            <button
              type="button"
              className={`atlas-toggle${globe ? " atlas-toggle-on" : ""}`}
              onClick={() => !globe && toggle()}
              aria-pressed={globe}
            >
              Globe
            </button>
          </div>
        </div>

        <figure className="atlas-frame glass glass-plate corners" data-reveal>
          <svg
            ref={svgRef}
            className="atlas-svg"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`World map, ${globe ? "orthographic globe" : "Mercator projection"}, marked in the ${SITE.location}.`}
          >
            <circle ref={rimRef} className="atlas-rim" cx={W / 2} cy={H / 2} r={R} opacity="0" />
            <path ref={gridRef} className="atlas-grid" />
            <path ref={backRef} className="atlas-land atlas-land-back" />
            <path ref={frontRef} className="atlas-land" />

            <g ref={markRef} className="atlas-mark">
              <circle className="atlas-ping" r="6" />
              <circle className="atlas-ping atlas-ping-2" r="6" />
              <circle className="atlas-dot" r="3.4" />
              <line className="atlas-leader" x1="0" y1="-6" x2="18" y2="-30" />
              <g transform="translate(20 -34)">
                {/* A plate behind the tag, so it stays legible wherever the
                    coastline and the graticule happen to run underneath. */}
                <rect className="atlas-tag-plate" x="-7" y="-21" width="152" height="44" rx="2" />
                <text className="atlas-tag">I am here</text>
                <text className="atlas-tag-sub" y="13">
                  {SITE.location}
                </text>
              </g>
            </g>
          </svg>

          <CoordinateRose className="atlas-rose" />

          <figcaption className="t-meta atlas-caption">
            {globe ? "Orthographic. Drag to turn it." : "Mercator, 1569. Conformal, and a liar about area."}
          </figcaption>
        </figure>
      </div>
    </Movement>
  );
}
