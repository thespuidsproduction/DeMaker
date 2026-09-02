import { useEffect, useRef, useState } from 'react';
import { useAnomaly, useSystem, type AnomalyChannel } from '../../system/SystemProvider';
import { useRaf } from '../../system/hooks';
import { contradict } from '../../system/lexicon';
import { pad } from '../../system/rng';
import { skeyed } from '../../system/session';
import './Diagnostic.css';

export type Row = readonly [string, string];

/**
 * A block of telemetry, and one of the places the system is willing to be
 * caught out. Addressed on its channel it will move a row two pixels, hold
 * that displacement for far longer than a displacement should last, or
 * report the opposite of what it has been reporting and then go back to
 * reporting it. It never comments on any of this afterwards.
 */
export function DiagnosticText({
  rows, channel, emphasise, className, id,
}: {
  rows: readonly Row[];
  channel?: AnomalyChannel;
  emphasise?: number;
  className?: string;
  id?: string;
}) {
  const { n, kind } = useAnomaly(channel ?? 'signal');
  const [shifted, setShifted] = useState(-1);
  const [flipped, setFlipped] = useState(-1);
  const armed = useRef(false);

  useEffect(() => {
    if (!channel || !armed.current) { armed.current = true; return; }
    const row = Math.floor(skeyed(`diag/${channel}/${n}`, 0, rows.length));
    const timers: number[] = [];

    if (kind === 'flip') {
      setFlipped(row);
      // Long enough to be read, short enough to be doubted afterwards.
      timers.push(window.setTimeout(() => setFlipped(-1), 1900));
    } else if (kind === 'shift' || kind === 'relocate') {
      setShifted(row);
      timers.push(window.setTimeout(() => setShifted(-1), 190));
    } else if (kind === 'linger') {
      setShifted(row);
      timers.push(window.setTimeout(() => setShifted(-1), 6200));
    }
    // 'open' and 'withdraw' mean nothing to a readout. It stays as it is.

    return () => timers.forEach(clearTimeout);
  }, [n, kind, channel, rows.length]);

  return (
    <dl className={`vx-diag${className ? ` ${className}` : ''}`} id={id}>
      {rows.map(([k, v], i) => (
        <div className="vx-diag__row" key={k}>
          <dt className="vx-diag__k">{k}</dt>
          <dd
            className="vx-diag__v"
            data-shift={shifted === i ? 1 : 0}
            data-emph={emphasise === i ? 1 : 0}
          >
            {flipped === i ? contradict(v) : v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

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
