import { useEffect, useRef, useState } from 'react';
import { useInView, useRaf } from '../../system/hooks';
import { useSystem } from '../../system/SystemProvider';
import { DiagnosticText, Statement, type Row } from '../Diagnostic/Diagnostic';
import { pad } from '../../system/rng';
import './TraceBay.css';

const LEDGER = 9;

/**
 * A live readout and a short ledger.
 *
 * The readout is written straight to the DOM, but only on the frames where
 * the number it is showing has actually changed — a pointer at rest costs
 * nothing at all, and a moving one costs two text-node assignments. The
 * ledger is state and advances about twice a second. Nothing here is
 * transmitted, stored, or retained past the tab.
 */
export function TraceBay() {
  const { reduced } = useSystem();
  const [viewRef, inView] = useInView<HTMLDivElement>({ rootMargin: '20% 0px', threshold: 0 });
  const xEl = useRef<HTMLSpanElement>(null);
  const yEl = useRef<HTMLSpanElement>(null);
  const shown = useRef({ x: '', y: '' });
  const pointer = useRef({ x: 0, y: 0 });
  const lastPush = useRef(0);
  const [ledger, setLedger] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => { pointer.current.x = e.clientX; pointer.current.y = e.clientY; };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useRaf((t) => {
    const p = pointer.current;
    const x = `${p.x < 0 ? '-' : '+'}${pad(p.x, 4)}`;
    const y = pad(p.y, 4);
    if (x !== shown.current.x && xEl.current) { xEl.current.textContent = x; shown.current.x = x; }
    if (y !== shown.current.y && yEl.current) { yEl.current.textContent = y; shown.current.y = y; }
    if (t - lastPush.current > 620) {
      lastPush.current = t;
      setLedger((l) => [`${pad(Math.round(p.x), 4)}.${pad(Math.round(p.y), 4)}`, ...l].slice(0, LEDGER));
      setMoves((m) => m + 1);
    }
  }, inView && !reduced);

  const rows: Row[] = [
    ['RETENTION', '2600 MS'],
    ['SAMPLES HELD', pad(ledger.length, 2)],
    ['WRITTEN', 'NOWHERE'],
    ['LEDGER AGE', `${pad(moves, 4)} TICKS`],
  ];

  return (
    <div className="vx-tracebay" ref={viewRef}>
      <div className="vx-tracebay__live">
        <p className="vx-micro" style={{ marginBottom: 10 }}>POINTER / LIVE</p>
        <p className="vx-tracebay__big" aria-hidden="true">
          <span ref={xEl}>+0000</span><span>.</span><span ref={yEl}>0000</span>
        </p>
        <p className="vx-sr">A live readout of pointer coordinates. It is decorative and is not recorded.</p>
        <div style={{ marginTop: 26 }}>
          <DiagnosticText rows={rows} channel="signal" />
        </div>
      </div>

      <div className="vx-tracebay__ledger">
        <p className="vx-micro" style={{ marginBottom: 10 }}>LEDGER / LAST {LEDGER}</p>
        <ol aria-hidden="true">
          {Array.from({ length: LEDGER }, (_, i) => (
            <li key={i}>
              <span>{pad(i + 1, 2)}</span>
              <span>{ledger[i] ?? '————.————'}</span>
              <span>{ledger[i] ? 'HELD' : '—'}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="vx-tracebay__say">
        <Statement>REFERENCE LOST</Statement>
        <div style={{ height: 26 }} />
        <Statement tone="quiet">REFERENCE RESTORED</Statement>
        <div style={{ height: 26 }} />
        <Statement tone="quiet">NOTHING WAS RESTORED</Statement>
      </div>
    </div>
  );
}
