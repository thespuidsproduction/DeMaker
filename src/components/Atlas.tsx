"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LAND } from "@/content/world";
import { SITE } from "@/content/site";
import { gsap, prefersReducedMotion, useGsapSetup, rafWhenVisible } from "@/lib/motion";
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

  /**
   * Blend, orientation and momentum all live outside React. Sixty state
   * changes a second have no business going through a render.
   */
  const view = useRef({ t: 0, lon: 0, lat: 0, velLon: 0, velLat: 0, touched: false });
  const dragging = useRef(false);
  const [adrift, setAdrift] = useState(false);
  useGsapSetup();

  /* ── Draw ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const t0 = performance.now();
    const reduced = prefersReducedMotion();

    const render = (now: number) => {
      const v = view.current;

      // Momentum, and nothing else. The globe used to ease back toward home
      // every frame, which is felt through the hand as the thing resisting
      // being turned rather than as a globe with any mass. Let go of it now
      // and it coasts to a stop and stays exactly where it was left; the
      // way back is a control, not a spring.
      if (!dragging.current) {
        v.lon += v.velLon;
        v.lat += v.velLat;
        v.velLon *= 0.955;
        v.velLat *= 0.9;
        if (Math.abs(v.velLon) < 0.002) v.velLon = 0;
        if (Math.abs(v.velLat) < 0.002) v.velLat = 0;
      }
      // Past the poles the projection turns inside out, so the tilt stops
      // just short of them.
      v.lat = Math.max(-78, Math.min(78, v.lat));

      // The idle drift is an invitation to touch the thing, so it ends for
      // good the moment somebody does. Nothing should move under the hand
      // except what the hand is moving.
      const drift = reduced || v.touched ? 0 : Math.sin((now - t0) / 5200) * 13;
      const lon0 = HOME[0] + drift + v.lon;
      const lat0 = 24 + v.lat;

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

    return rafWhenVisible(svg, render);
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
    let lastX = 0;
    let lastY = 0;
    let pointer: number | null = null;

    /**
     * Degrees of rotation per pixel of travel, worked out from how large the
     * sphere actually is on this screen. At the centre of the disc the point
     * under the finger then moves with the finger, one to one, which is the
     * whole of what makes a globe feel grabbed rather than nudged. Toward the
     * limb it slows of its own accord, because that is what a sphere does.
     */
    const perPixel = () => {
      const radiusPx = (svg.getBoundingClientRect().width * R) / W;
      return radiusPx > 0 ? 57.29578 / radiusPx : 0;
    };

    const down = (e: PointerEvent) => {
      if (view.current.t < 0.3) return; // nothing to spin on a flat map
      pointer = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      dragging.current = true;
      view.current.touched = true;
      view.current.velLon = 0;
      view.current.velLat = 0;
      setAdrift(true);
      svg.setPointerCapture(e.pointerId);
      svg.classList.add("atlas-grabbing");
    };

    const move = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      const k = perPixel();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      // Increasing the centre longitude carries the surface to the left, so
      // dragging right has to lower it for the map to follow the hand.
      const dLon = -dx * k;
      const dLat = dy * k;
      view.current.lon += dLon;
      view.current.lat += dLat;

      // Averaged, so that one stray final event before release cannot fling
      // the globe off in a direction the hand never went.
      view.current.velLon = view.current.velLon * 0.4 + dLon * 0.6;
      view.current.velLat = view.current.velLat * 0.4 + dLat * 0.6;
    };

    const up = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      pointer = null;
      dragging.current = false;
      if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
      svg.classList.remove("atlas-grabbing");
    };

    /** Arrow keys turn it too, for anyone not using a pointer at all. */
    const key = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 18 : 6;
      let used = true;
      if (e.key === "ArrowLeft") view.current.lon -= step;
      else if (e.key === "ArrowRight") view.current.lon += step;
      else if (e.key === "ArrowUp") view.current.lat += step;
      else if (e.key === "ArrowDown") view.current.lat -= step;
      else used = false;
      if (!used || view.current.t < 0.3) return;
      e.preventDefault();
      view.current.touched = true;
      view.current.velLon = 0;
      view.current.velLat = 0;
      setAdrift(true);
    };

    svg.addEventListener("pointerdown", down);
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
    svg.addEventListener("keydown", key);
    return () => {
      svg.removeEventListener("pointerdown", down);
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up);
      svg.removeEventListener("pointercancel", up);
      svg.removeEventListener("keydown", key);
    };
  }, []);

  /* ── The way home ───────────────────────────────────────────────────── */
  const recentre = useCallback(() => {
    const v = view.current;
    v.velLon = 0;
    v.velLat = 0;
    setAdrift(false);
    // Longitude is wound to whichever turn of the sphere is nearest, so a
    // globe spun four times round does not unwind four times to get back.
    const target = Math.round(v.lon / 360) * 360 - v.lon;
    if (prefersReducedMotion()) {
      v.lon += target;
      v.lat = 0;
      return;
    }
    gsap.to(v, { lon: v.lon + target, lat: 0, duration: 1.1, ease: "power3.inOut" });
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

          <div className="atlas-actions">
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

            {/* Nothing drags the globe home behind the user's back, so the
                way back has to be offered instead. It appears only once
                there is somewhere to come back from. */}
            <button
              type="button"
              className={`atlas-home${globe && adrift ? " atlas-home-on" : ""}`}
              onClick={recentre}
              tabIndex={globe && adrift ? 0 : -1}
              aria-hidden={!(globe && adrift)}
            >
              Recentre
            </button>
          </div>
        </div>

        <figure className="atlas-frame glass glass-plate corners" data-reveal>
          <svg
            ref={svgRef}
            className={`atlas-svg${globe ? " atlas-svg-live" : ""}`}
            viewBox={`0 0 ${W} ${H}`}
            role={globe ? "application" : "img"}
            tabIndex={globe ? 0 : -1}
            aria-label={
              globe
                ? `Orthographic globe marked in the ${SITE.location}. Drag, or use the arrow keys, to turn it.`
                : `World map, Mercator projection, marked in the ${SITE.location}.`
            }
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
            {globe
              ? "Orthographic. Take hold of it and turn it, any direction."
              : "Mercator, 1569. Conformal, and a liar about area."}
          </figcaption>
        </figure>
      </div>
    </Movement>
  );
}
