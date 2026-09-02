import { useEffect, useRef, useState } from 'react';
import { useAnomaly, useSystem, type AnomalyChannel } from '../../system/SystemProvider';
import { useRaf } from '../../system/hooks';
import { pad } from '../../system/rng';
import './Diagnostic.css';

export type Row = readonly [string, string];

/**
 * A block of telemetry. When its anomaly channel fires, exactly one row
 * shifts two pixels and returns. Not every observer will see it happen.
 */
export function DiagnosticText({
  rows, channel, emphasise, className, id,
}: {
  rows: readonly Row[];
  channel?: AnomalyChannel;
  /** Index of the row permitted to use the accent. At most one. */
  emphasise?: number;
  className?: string;
  id?: string;
}) {
  const pulse = useAnomaly(channel ?? 'signal');
  const [shifted, setShifted] = useState(-1);
  const armed = useRef(false);

  useEffect(() => {
    if (!channel || !armed.current) { armed.current = true; return; }
    const row = pulse % rows.length;
    setShifted(row);
    const t = window.setTimeout(() => setShifted(-1), 190);
    return () => window.clearTimeout(t);
  }, [pulse, channel, rows.length]);

  return (
    <dl className={`vx-diag${className ? ` ${className}` : ''}`} id={id}>
      {rows.map(([k, v], i) => (
        <div className="vx-diag__row" key={k}>
          <dt className="vx-diag__k">{k}</dt>
          <dd className="vx-diag__v" data-shift={shifted === i ? 1 : 0} data-emph={emphasise === i ? 1 : 0}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A statement. It is not a heading and must never be treated as one. */
export function Statement({
  children, tone = 'plain',
}: { children: string; tone?: 'plain' | 'quiet' | 'ox' }) {
  return <p className="vx-statement" data-tone={tone}>{children}</p>;
}

export function SignalIndicator({
  label, state = 'idle',
}: { label: string; state?: 'idle' | 'active' | 'fault' }) {
  return (
    <span className="vx-signal" data-state={state}>
      <span className="vx-signal__dot" aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * The right margin carries a ruler measuring the document. The reading is
 * accurate. It is also of no use to anybody.
 */
export function CoordinateSystem() {
  const { reduced } = useSystem();
  const head = useRef<HTMLSpanElement>(null);
  const val = useRef<HTMLSpanElement>(null);
  const lastPct = useRef(-1);

  useRaf(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? window.scrollY / max : 0;
    if (Math.abs(pct - lastPct.current) < 0.0008) return;
    lastPct.current = pct;
    const top = `${(pct * 100).toFixed(2)}%`;
    if (head.current) head.current.style.top = top;
    if (val.current) {
      val.current.style.top = top;
      val.current.textContent = `${pad(Math.round(pct * 1000), 4)} / 1000`;
    }
  });

  if (reduced) return null;

  return (
    <div className="vx-coords" aria-hidden="true">
      {Array.from({ length: 21 }, (_, i) => (
        <span
          key={i}
          className="vx-coords__tick"
          data-major={i % 5 === 0 ? 1 : 0}
          style={{ top: `${i * 5}%` }}
        />
      ))}
      <span ref={val} className="vx-coords__val" style={{ top: '0%' }}>0000 / 1000</span>
      <span ref={head} className="vx-coords__head" style={{ top: '0%' }} />
    </div>
  );
}
