import { keyed } from '../../system/rng';
import type { MemoryFragment } from '../../system/lexicon';

/**
 * Every plate in the archive is generated from its own identifier. No image
 * is ever fetched, because no image was ever recovered. What is drawn is the
 * shape of the failure to recover it — scan residue, strata, a scatter, an
 * aperture, a lattice, or nothing at all.
 */
export function Plate({ kind, seed }: { kind: MemoryFragment['plate']; seed: string }) {
  const k = (n: number, a = 0, b = 1) => keyed(`${seed}:${n}`, a, b);

  const common = {
    viewBox: '0 0 200 140',
    preserveAspectRatio: 'none' as const,
    'aria-hidden': true as const,
    style: { width: '100%', height: '100%', display: 'block' },
  };

  if (kind === 'absent') {
    return (
      <svg {...common}>
        <rect width="200" height="140" fill="#050505" />
        <line x1="0" y1="140" x2="200" y2="0" stroke="#181818" strokeWidth="1" />
        <rect x="34" y="62" width="94" height="9" fill="#111111" />
        <rect x="34" y="76" width="52" height="9" fill="#111111" />
      </svg>
    );
  }

  if (kind === 'field') {
    // Scan residue: 46 lines, of which a deterministic handful are absent.
    return (
      <svg {...common}>
        <rect width="200" height="140" fill="#050505" />
        {Array.from({ length: 46 }, (_, i) => {
          const y = 2 + i * 3;
          const drop = k(i, 0, 1) < 0.18;
          if (drop) return null;
          const w = 40 + k(i + 100, 0, 158);
          const x = k(i + 200, 0, 200 - w);
          return <rect key={i} x={x} y={y} width={w} height="1" fill={i % 11 === 0 ? '#2A2A2A' : '#141414'} />;
        })}
        <rect x="0" y="66" width="200" height="1" fill="#C05A22" opacity="0.55" />
      </svg>
    );
  }

  if (kind === 'strata') {
    let y = 0;
    const bands: JSX.Element[] = [];
    for (let i = 0; y < 140; i++) {
      const h = 3 + k(i, 0, 17);
      const g = Math.floor(k(i + 50, 6, 34));
      bands.push(<rect key={i} x="0" y={y} width="200" height={h} fill={`rgb(${g},${g},${g})`} />);
      y += h + 1;
    }
    return (
      <svg {...common}>
        <rect width="200" height="140" fill="#050505" />
        {bands}
        <rect x="0" y="0" width="1" height="140" fill="#666" opacity="0.4" />
      </svg>
    );
  }

  if (kind === 'scatter') {
    return (
      <svg {...common}>
        <rect width="200" height="140" fill="#050505" />
        {Array.from({ length: 64 }, (_, i) => {
          const x = k(i, 6, 194);
          const y = k(i + 300, 6, 134);
          const s = k(i + 600, 0, 1) < 0.1 ? 3 : 1.6;
          return (
            <g key={i} stroke={i % 17 === 0 ? '#C05A22' : '#3A3A3A'} strokeWidth="1">
              <line x1={x - s} y1={y} x2={x + s} y2={y} />
              <line x1={x} y1={y - s} x2={x} y2={y + s} />
            </g>
          );
        })}
        <rect x="118" y="18" width="62" height="7" fill="#151515" />
      </svg>
    );
  }

  if (kind === 'aperture') {
    return (
      <svg {...common}>
        <rect width="200" height="140" fill="#050505" />
        {Array.from({ length: 9 }, (_, i) => {
          const r = 8 + i * 8.5;
          // Each ring is drawn for only part of its circumference.
          const start = k(i, 0, 6.28);
          const sweep = 1.1 + k(i + 40, 0, 3.4);
          const path = describeArc(100, 70, r, start, start + sweep);
          return <path key={i} d={path} fill="none" stroke={i === 6 ? '#C05A22' : '#242424'} strokeWidth="1" />;
        })}
        <circle cx="100" cy="70" r="1.5" fill="#666" />
      </svg>
    );
  }

  // lattice
  return (
    <svg {...common}>
      <rect width="200" height="140" fill="#050505" />
      {Array.from({ length: 21 }, (_, i) => {
        const x = i * 10;
        return k(i, 0, 1) < 0.22 ? null : <rect key={`v${i}`} x={x} y="0" width="1" height="140" fill="#161616" />;
      })}
      {Array.from({ length: 15 }, (_, i) => {
        const y = i * 10;
        return k(i + 90, 0, 1) < 0.22 ? null : <rect key={`h${i}`} x="0" y={y} width="200" height="1" fill="#161616" />;
      })}
      <rect x="70" y="40" width="60" height="60" fill="none" stroke="#3A3A3A" strokeWidth="1" />
      <rect x="77" y="47" width="60" height="60" fill="none" stroke="#1E1E1E" strokeWidth="1" />
    </svg>
  );
}

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeArc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}
