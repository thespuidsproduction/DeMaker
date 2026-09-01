"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTraces } from "@/lib/traces";
import { gsap, prefersReducedMotion, useGsapSetup } from "@/lib/motion";
import { Movement } from "./Movement";
import { WovenRule } from "./Ornament";

const W = 1000;
const H = 400;

/** A small deterministic hash, so a given name always lands on the same star. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE CHART
 *
 * Every technology the visitor has uncovered becomes a star, placed on a
 * golden-angle spiral so the sky fills evenly however many there are, and
 * jittered by a hash of its own name so a given name always lands in the same
 * place. Lines join them in the order they were found, which makes the chart a
 * record of the route someone actually took through the page.
 *
 * The empty sky is the honest state and it stays empty. Inventing stars for a
 * visitor who has not opened anything would be the one dishonest thing on the
 * site.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Chart() {
  const { traces } = useTraces();
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const skyRef = useRef<SVGSVGElement>(null);
  useGsapSetup();

  useEffect(() => setMounted(true), []);

  /**
   * Stars cluster into a constellation per place they were found, rather than
   * scattering across the sky and being joined in discovery order. Sixty
   * things connected in the sequence you happened to click them is a scribble;
   * the same sixty grouped by where they came from is a chart.
   */
  const { groups, links } = useMemo(() => {
    const byFrom = new Map<string, typeof traces>();
    for (const t of traces) {
      const list = byFrom.get(t.from) ?? [];
      list.push(t);
      byFrom.set(t.from, list);
    }

    // Each constellation needs area in proportion to its population, so its
    // radius grows with the square root of the count rather than linearly.
    const names = [...byFrom.keys()].sort(
      (x, y) => byFrom.get(y)!.length - byFrom.get(x)!.length,
    );
    const radius = (n: number) => Math.min(96, 18 + Math.sqrt(n) * 16);

    /**
     * Laid out like plates in an atlas rather than on a ring. A ring works
     * only when the groups are roughly equal, and these are not: one facet of
     * the toolbox can hold forty names while a project holds five. Shelf
     * packing gives every constellation exactly the room it needs, never
     * overlaps, and reads as a page of charts, which is the right register.
     */
    const GAP = 30;
    const LABEL = 24;

    type Cell = { from: string; spread: number; w: number; h: number; cx: number; cy: number };
    const cells: Cell[] = names.map((from) => {
      const spread = radius(byFrom.get(from)!.length);
      // A cell has to be wide enough for its name as well as its stars, or a
      // long constellation title runs straight into its neighbour.
      const labelW = from.length * 6.4 + GAP;
      return {
        from,
        spread,
        w: Math.max(spread * 2, labelW) + GAP,
        h: spread * 2 * 0.86 + LABEL + GAP,
        cx: 0,
        cy: 0,
      };
    });

    const maxRow = W - 60;
    const rows: Cell[][] = [];
    let row: Cell[] = [];
    let rowW = 0;
    for (const c of cells) {
      if (row.length && rowW + c.w > maxRow) {
        rows.push(row);
        row = [];
        rowW = 0;
      }
      row.push(c);
      rowW += c.w;
    }
    if (row.length) rows.push(row);

    let y = 0;
    for (const r of rows) {
      const rowHeight = Math.max(...r.map((c) => c.h));
      const totalW = r.reduce((sum, c) => sum + c.w, 0);
      let x = -totalW / 2;
      for (const c of r) {
        c.cx = x + c.w / 2;
        c.cy = y + rowHeight / 2 - LABEL / 2;
        x += c.w;
      }
      y += rowHeight;
    }

    const GOLDEN = Math.PI * (3 - Math.sqrt(5));
    const built = cells.map((c) => {
      const members = byFrom.get(c.from)!;
      // Members ride their own golden-angle spiral, which fills a disc evenly
      // instead of banding on a single orbit.
      const stars = members.map((t, i) => {
        const rr = members.length === 1 ? 0 : Math.sqrt((i + 0.5) / members.length) * c.spread;
        const ang = i * GOLDEN + hash(t.label) * 0.7;
        return {
          ...t,
          x: c.cx + Math.cos(ang) * rr,
          y: c.cy + Math.sin(ang) * rr * 0.86,
          mag: 1.2 + hash(t.label + "m") * 1.5,
        };
      });
      return { from: c.from, cx: c.cx, cy: c.cy, spread: c.spread, stars };
    });

    // Whatever the packing worked out to, fit it inside the frame.
    const pad = 30;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const g of built) {
      minX = Math.min(minX, g.cx - g.spread);
      maxX = Math.max(maxX, g.cx + g.spread);
      minY = Math.min(minY, g.cy - g.spread);
      maxY = Math.max(maxY, g.cy + g.spread * 0.86 + LABEL);
    }
    const scale = Math.min(
      (W - pad * 2) / Math.max(maxX - minX, 1),
      (H - pad * 2) / Math.max(maxY - minY, 1),
      1.5,
    );
    const ox = W / 2 - ((minX + maxX) / 2) * scale;
    const oy = H / 2 - ((minY + maxY) / 2) * scale;

    for (const g of built) {
      g.cx = g.cx * scale + ox;
      g.cy = g.cy * scale + oy;
      g.spread *= scale;
      for (const st of g.stars) {
        st.x = st.x * scale + ox;
        st.y = st.y * scale + oy;
        st.mag = Math.max(1, st.mag * Math.min(scale, 1.15));
      }
    }

    // Lines stay inside a constellation. Nothing crosses the sky.
    const edges: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    for (const g of built) {
      for (let i = 0; i < g.stars.length - 1; i++) {
        const a = g.stars[i];
        const b = g.stars[i + 1];
        edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, key: `${a.label}-${b.label}` });
      }
      // Close the ring on a group big enough to read as a shape.
      if (g.stars.length > 2) {
        const a = g.stars[g.stars.length - 1];
        const b = g.stars[0];
        edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, key: `${g.from}-close` });
      }
    }
    return { groups: built, links: edges };
  }, [traces]);

  const stars = useMemo(() => groups.flatMap((g) => g.stars), [groups]);

  /* Stars arrive one at a time, then breathe on their own periods. */
  useEffect(() => {
    const svg = skyRef.current;
    if (!svg || !mounted || prefersReducedMotion() || !stars.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-star]",
        { scale: 0, opacity: 0, transformOrigin: "50% 50%" },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          ease: "back.out(2)",
          // Random rather than in sequence, so the sky fills in like a sky.
          // Capped total, because sixty stars at a fixed stagger would take
          // three seconds to finish arriving.
          stagger: { each: Math.min(0.03, 1.1 / Math.max(stars.length, 1)), from: "random" },
          scrollTrigger: { trigger: svg, start: "top 82%", once: true },
        },
      );
      // The dash offset is already set inline per line, sized to its own
      // length, so the lines only need animating to zero.
      gsap.to("[data-link]", {
        strokeDashoffset: 0,
        duration: 1.4,
        ease: "power2.inOut",
        stagger: 0.05,
        scrollTrigger: { trigger: svg, start: "top 80%", once: true },
      });
      svg.querySelectorAll<SVGCircleElement>("[data-twinkle]").forEach((s, i) => {
        gsap.to(s, {
          opacity: 0.35,
          duration: 1.6 + (i % 7) * 0.42,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: (i % 5) * 0.31,
        });
      });
    }, svg);

    return () => ctx.revert();
  }, [mounted, stars.length]);

  const empty = !mounted || stars.length === 0;

  return (
    <Movement id="chart" index="§ 08" title="Your Chart" aside="what you found">
      <div className="chart">
        <div className="chart-sky glass glass-plate corners">
          <svg
            ref={skyRef}
            className="chart-svg"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={
              empty
                ? "An empty star chart. Nothing has been uncovered yet."
                : `A star chart of ${stars.length} things uncovered on this page.`
            }
          >
            {/* The ecliptic: a reference line, because every chart has one. */}
            <ellipse
              className="chart-ecliptic"
              cx={W / 2}
              cy={H / 2}
              rx={W / 2 - 70}
              ry={H / 2 - 50}
            />
            <ellipse
              className="chart-ecliptic chart-ecliptic-inner"
              cx={W / 2}
              cy={H / 2}
              rx={(W / 2 - 70) * 0.55}
              ry={(H / 2 - 50) * 0.55}
            />
            <line className="chart-axis" x1={W / 2} y1="18" x2={W / 2} y2={H - 18} />
            <line className="chart-axis" x1="30" y1={H / 2} x2={W - 30} y2={H / 2} />

            {/* One constellation per place a thing was found. */}
            {links.map((l) => {
              const len = Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
              return (
                <line
                  key={l.key}
                  data-link
                  className="chart-link"
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  strokeDasharray={len}
                  strokeDashoffset={len}
                />
              );
            })}

            {/* The name sits clear of its own stars, under the constellation. */}
            {groups.map((g) => (
              <text
                key={g.from}
                className="chart-group"
                x={g.cx}
                y={g.cy + g.spread * 0.86 + 20}
                textAnchor="middle"
              >
                {g.from}
              </text>
            ))}

            {stars.map((s, i) => (
              <g
                key={s.label}
                data-star
                className={`chart-star${active === i ? " chart-star-on" : ""}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive((a) => (a === i ? null : a))}
              >
                <circle className="chart-halo" cx={s.x} cy={s.y} r={s.mag * 4} />
                <circle data-twinkle className="chart-core" cx={s.x} cy={s.y} r={s.mag} />
                <circle className="chart-hit" cx={s.x} cy={s.y} r="18" />
                <text className="chart-label" x={s.x + s.mag + 8} y={s.y + 3.5}>
                  {s.label}
                </text>
              </g>
            ))}
          </svg>

          {empty ? (
            <p className="chart-empty">
              <span className="t-hand">nothing charted yet</span>
              <span className="t-meta">Open a project, or a facet of the toolbox.</span>
            </p>
          ) : null}
        </div>

        <div className="chart-foot">
          <WovenRule className="chart-weave" />
          <p className="t-meta chart-note">
            {empty
              ? "This chart is drawn from what you uncover. It starts empty and stays that way until you do."
              : `${stars.length} charted, in the order you found them. Kept in this browser for this visit only, and sent nowhere.`}
          </p>
        </div>
      </div>
    </Movement>
  );
}
