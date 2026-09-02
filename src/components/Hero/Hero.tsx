import { useRef } from 'react';
import { useRaf } from '../../system/hooks';
import { useSystem, useUptime } from '../../system/SystemProvider';
import { ENTITY_READOUT } from '../../system/lexicon';
import { DiagnosticText, Statement, type Row } from '../Diagnostic/Diagnostic';
import { pad } from '../../system/rng';
import { spick } from '../../system/session';
import './Hero.css';

/**
 * The two halves drift apart on the way down at rates that differ by a
 * factor the observer cannot infer. Both transforms are composited; no
 * layout is read or written during scroll.
 */
export function Hero() {
  const { reduced, observers } = useSystem();
  const uptime = useUptime();
  const a = useRef<HTMLSpanElement>(null);
  const b = useRef<HTMLSpanElement>(null);
  const ghost = useRef<HTMLSpanElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const lastY = useRef(-1);

  useRaf(() => {
    const el = host.current;
    if (!el) return;
    const y = window.scrollY;
    if (y === lastY.current) return;
    lastY.current = y;
    // Only compute while the bay is anywhere near the viewport.
    if (y > window.innerHeight * 2) return;
    const p = y / Math.max(window.innerHeight, 1);
    if (a.current) a.current.style.transform = `translate3d(${(-p * 90).toFixed(1)}px, ${(p * 26).toFixed(1)}px, 0)`;
    if (ghost.current) ghost.current.style.transform = `translate3d(${(-p * 74).toFixed(1)}px, ${(p * 31).toFixed(1)}px, 0)`;
    if (b.current) b.current.style.transform = `translate3d(${(p * 148).toFixed(1)}px, ${(-p * 18).toFixed(1)}px, 0)`;
  }, !reduced);

  const rows: Row[] = ENTITY_READOUT.map(([k, v]) => [k, v] as Row);

  return (
    <div className="vx-hero" ref={host}>
      {/* One accessible name for an object that is drawn in three pieces. */}
      <h1 className="vx-sr">VRAXXIS</h1>

      <div className="vx-hero__mark" aria-hidden="true">
        <span ref={ghost} className="vx-hero__ghost">VRA</span>
        <span ref={a} className="vx-hero__part vx-hero__part--a">VRA</span>
        <span ref={b} className="vx-hero__part vx-hero__part--b">XXIS</span>
      </div>

      <div className="vx-hero__grid">
        <div className="vx-hero__readout">
          <DiagnosticText rows={rows} channel="hero" emphasise={1} />
          <div className="vx-hero__depth vx-micro">
            <span>UPTIME {pad(uptime, 6)}</span>
            <span>OBSERVERS {pad(observers, 2)}</span>
            <span>DEPTH 07</span>
          </div>
        </div>

        <div className="vx-hero__say">
          {/* Three statements can stand here. Which one does is settled
              before the visit begins, and none of the three is the entry. */}
          <Statement>{spick('hero/say', [
            'THIS IS NOT THE ENTRY',
            'THERE WAS NEVER AN ENTRY',
            'YOU HAVE ARRIVED EARLY',
          ] as const)}</Statement>
        </div>
      </div>

      <span className="vx-hero__spine vx-micro" aria-hidden="true">
        {spick('hero/spine', [
          'FACE A / EXPOSED — REMAINDER NOT SURFACED',
          'FACE A / EXPOSED — TWO FACES ARE UNACCOUNTED FOR',
          'FACE A / THE REMAINDER IS NOT BELOW',
        ] as const)}
      </span>
    </div>
  );
}
