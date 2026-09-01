/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ENGRAVINGS
 * Victorian linework and antique scientific-illustration motifs, drawn as
 * hairline vectors. Used as accent only — never as the primary style.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { SVGProps } from "react";

type OrnProps = SVGProps<SVGSVGElement>;

const base = "engraved";

/** A delicate engraved flourish — the margin decoration of a technical plate. */
export function Flourish({ className, ...rest }: OrnProps) {
  return (
    <svg viewBox="0 0 240 26" className={className} aria-hidden="true" fill="none" {...rest}>
      <path className={base} d="M0 13h74" />
      <path className={base} d="M166 13h74" />
      <path
        className={base}
        d="M74 13c6-9 14-9 20 0s14 9 20 0M114 13c6-9 14-9 20 0s14 9 20 0"
      />
      <circle className={base} cx="120" cy="13" r="4.2" />
      <circle className="engraved-fill" cx="120" cy="13" r="1.1" />
      <path className={base} d="M120 4.5v-3.5M120 21.5v3.5" />
      <path className={base} d="M84 13c0-3.6 2.6-6 5.6-6M156 13c0 3.6-2.6 6-5.6 6" />
    </svg>
  );
}

/** Ornamental corner, placed on otherwise ultra-modern panels. */
export function CornerLeaf({ className, ...rest }: OrnProps) {
  return (
    <svg viewBox="0 0 44 44" className={className} aria-hidden="true" fill="none" {...rest}>
      <path className={base} d="M1 15V1h14" />
      <path className={base} d="M5 21c0-8 5-14 13-16" />
      <path
        className={base}
        d="M9 25c1.8-4.6 5-6.4 8.6-5.6-.4 3.8-3 6.4-8.6 5.6ZM13 32c3-3.6 6.6-4 9.4-1.8-1.8 3.2-5.2 4.4-9.4 1.8Z"
      />
      <circle className="engraved-fill" cx="4" cy="4" r="1.05" />
      <path className={base} d="M20 40c6-2 10-6 12-12" />
    </svg>
  );
}

/** A compass rose / coordinate reference — retro-futurist navigation cue. */
export function CoordinateRose({ className, ...rest }: OrnProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true" fill="none" {...rest}>
      <circle className={base} cx="48" cy="48" r="45" />
      <circle className={base} cx="48" cy="48" r="34" strokeDasharray="1 4" />
      <circle className={base} cx="48" cy="48" r="14" />
      <path className={base} d="M48 3v90M3 48h90" />
      <path className={base} d="M16 16l64 64M80 16L16 80" strokeDasharray="2 5" />
      <path className="engraved-fill" d="M48 12l5 30-5 6-5-6z" opacity="0.55" />
      <path className={base} d="M48 84l4-24-4-5-4 5z" />
      {[0, 30, 60, 90, 120, 150].map((a) => (
        <line
          key={a}
          className={base}
          x1="48"
          y1="3"
          x2="48"
          y2="9"
          transform={`rotate(${a} 48 48)`}
        />
      ))}
    </svg>
  );
}

/** Network topology — a constellation of components. */
export function TopologyPlate({ className, ...rest }: OrnProps) {
  const nodes: [number, number, number][] = [
    [20, 30, 3.4],
    [58, 16, 2.4],
    [96, 34, 4.2],
    [40, 60, 2.6],
    [78, 68, 3],
    [124, 54, 2.4],
    [110, 90, 2.8],
    [30, 96, 2.2],
  ];
  const edges: [number, number][] = [
    [0, 1],
    [1, 2],
    [0, 3],
    [3, 4],
    [2, 5],
    [4, 6],
    [5, 6],
    [3, 7],
    [4, 2],
    [7, 4],
  ];
  return (
    <svg viewBox="0 0 148 112" className={className} aria-hidden="true" fill="none" {...rest}>
      {edges.map(([a, b], i) => (
        <line
          key={i}
          className={base}
          x1={nodes[a][0]}
          y1={nodes[a][1]}
          x2={nodes[b][0]}
          y2={nodes[b][1]}
          strokeDasharray={i % 3 === 0 ? "2 3" : undefined}
        />
      ))}
      {nodes.map(([x, y, r], i) => (
        <g key={i}>
          <circle className={base} cx={x} cy={y} r={r} />
          <circle className="engraved-fill" cx={x} cy={y} r={r * 0.32} />
        </g>
      ))}
      <rect className={base} x="1" y="1" width="146" height="110" strokeDasharray="3 4" />
    </svg>
  );
}

/** A schematic of a persistence layer, drawn as an antique mechanical plate. */
export function SchemaPlate({ className, ...rest }: OrnProps) {
  return (
    <svg viewBox="0 0 160 116" className={className} aria-hidden="true" fill="none" {...rest}>
      <ellipse className={base} cx="40" cy="20" rx="26" ry="9" />
      <path className={base} d="M14 20v46c0 5 11.6 9 26 9s26-4 26-9V20" />
      <path className={base} d="M14 35c0 5 11.6 9 26 9s26-4 26-9M14 50c0 5 11.6 9 26 9s26-4 26-9" />
      <rect className={base} x="96" y="12" width="58" height="18" />
      <rect className={base} x="96" y="38" width="58" height="18" />
      <rect className={base} x="96" y="64" width="58" height="18" />
      <path className={base} d="M66 30h30M66 47h30M66 66h30" strokeDasharray="2 3" />
      <path className={base} d="M40 84v20M40 104h108v-14" />
      <circle className="engraved-fill" cx="96" cy="21" r="1.3" />
      <circle className="engraved-fill" cx="96" cy="47" r="1.3" />
      <circle className="engraved-fill" cx="96" cy="73" r="1.3" />
      <path className={base} d="M104 18h34M104 24h22M104 44h34M104 50h18M104 70h34M104 76h26" />
    </svg>
  );
}

/** A circuit / signal-path fragment. Early-computing visual cue. */
export function CircuitTrace({ className, ...rest }: OrnProps) {
  return (
    <svg viewBox="0 0 200 40" className={className} aria-hidden="true" fill="none" {...rest}>
      <path className={base} d="M0 20h26l8-9h30l8 9h22l7-9h32l7 9h26l8 9h26" />
      <circle className={base} cx="26" cy="20" r="2.4" />
      <circle className={base} cx="130" cy="20" r="2.4" />
      <rect className={base} x="60" y="4" width="14" height="8" />
      <rect className={base} x="152" y="24" width="16" height="9" />
      <path className={base} d="M0 30h14M186 10h14" strokeDasharray="2 3" />
    </svg>
  );
}

/** Botanical-technical hybrid — antique scientific illustration motif. */
export function BotanicalDiagram({ className, ...rest }: OrnProps) {
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden="true" fill="none" {...rest}>
      <path className={base} d="M60 148V44" />
      <path className={base} d="M60 96c-18 0-28-10-30-26 18-2 28 8 30 26Z" />
      <path className={base} d="M60 78c18-2 27-13 27-29-18 0-27 11-27 29Z" />
      <path className={base} d="M60 120c-14 1-22-6-24-19 14-1 22 6 24 19Z" />
      <circle className={base} cx="60" cy="34" r="11" />
      <circle className={base} cx="60" cy="34" r="4.6" />
      <path className={base} d="M60 23V10M60 45v6M49 34H36M71 34h13" strokeDasharray="1 3" />
      <path className={base} d="M30 70h-14M16 70v34h14" strokeDasharray="2 3" />
      <text
        x="4"
        y="66"
        fontSize="6"
        fill="var(--engrave)"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.1em"
      >
        FIG.
      </text>
      <path className={base} d="M40 142h40" />
      <path className={base} d="M40 139v6M80 139v6" />
    </svg>
  );
}

/** A thin engraved rule used to separate movements. */
export function EngravedRule({ className, ...rest }: OrnProps) {
  return (
    <svg viewBox="0 0 400 8" className={className} aria-hidden="true" fill="none" preserveAspectRatio="none" {...rest}>
      <path className={base} d="M0 4h174M226 4h174" />
      <path className={base} d="M186 4l7-3v6zM214 4l-7-3v6z" />
      <circle className="engraved-fill" cx="200" cy="4" r="1.4" />
    </svg>
  );
}

/** Oscilloscope-like trace. A quiet retro-futurist heartbeat. */
export function SignalTrace({ className, ...rest }: OrnProps) {
  return (
    <svg viewBox="0 0 300 44" className={className} aria-hidden="true" fill="none" preserveAspectRatio="none" {...rest}>
      <path
        className={base}
        d="M0 22h34l6-13 7 26 6-19 8 12 7-6h30l6-9 8 18 6-12 7 7h34l6-14 8 24 6-16 7 9h32l6-8 8 15 6-11 7 6h34"
      />
    </svg>
  );
}
