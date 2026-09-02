import { useEffect, useRef } from 'react';
import { MEMORY_FRAGMENTS } from '../../system/lexicon';
import { useRaf, useMedia } from '../../system/hooks';
import { useSystem } from '../../system/SystemProvider';
import { Plate } from './plates';
import './MemoryArchive.css';

/**
 * Cells shear against their own track as it moves: each drifts vertically
 * at a rate keyed to its position, so the row never travels as one object.
 * The shear is bounded to a few pixels — enough to feel unstable, never
 * enough to move a cell off its own label.
 */
export function MemoryArchive({ visits }: { visits: number }) {
  const { reduced } = useSystem();
  const stacked = useMedia('(max-width: 860px)');
  const track = useRef<HTMLUListElement>(null);
  const cells = useRef<(HTMLElement | null)[]>([]);
  const lastX = useRef(-1);

  useRaf(() => {
    const el = track.current;
    if (!el) return;
    const x = el.scrollLeft;
    if (Math.abs(x - lastX.current) < 0.5) return;
    lastX.current = x;
    const p = x / Math.max(el.scrollWidth - el.clientWidth, 1);
    cells.current.forEach((c, i) => {
      if (!c) return;
      const lag = ((i % 3) - 1) * 14;
      c.style.transform = `translate3d(0, ${(p * lag).toFixed(1)}px, 0)`;
    });
  }, !reduced && !stacked);

  // A returning observer finds the archive already scrolled. Nothing
  // scrolled it, and the position it holds is not the one it was left at.
  useEffect(() => {
    const el = track.current;
    if (!el || visits < 2 || reduced || stacked) return;
    el.scrollTo({ left: 130 * (visits - 1), behavior: 'smooth' });
  }, [visits, reduced, stacked]);

  return (
    <div className="vx-mem">
      <ul
        className="vx-mem__track"
        ref={track}
        tabIndex={0}
        aria-label="Recovered fragments, horizontally scrollable"
      >
        {MEMORY_FRAGMENTS.map((m, i) => (
          <li
            key={m.ord}
            className="vx-mem__cell"
            data-drop={i % 4}
            ref={(el) => { cells.current[i] = el; }}
          >
            <div className="vx-mem__plate" data-vx-cursor="?">
              <Plate kind={m.plate} seed={m.ord} />
              <span className="vx-mem__unavailable">[IMAGE / UNAVAILABLE]</span>
            </div>

            <p className="vx-mem__ord">{m.ord}</p>
            <dl className="vx-mem__rows">
              <div className="vx-mem__row">
                <dt>DATE</dt>
                <dd data-block={m.date.includes('█') ? 1 : 0}>{m.date}</dd>
              </div>
              <div className="vx-mem__row">
                <dt>LOCATION</dt>
                <dd data-block={m.location.includes('█') ? 1 : 0}>{m.location}</dd>
              </div>
              <div className="vx-mem__row">
                <dt>STATUS</dt>
                <dd>{m.status}</dd>
              </div>
            </dl>
            {m.note && <p className="vx-mem__note vx-micro">{m.note}</p>}
          </li>
        ))}
      </ul>

      <div className="vx-mem__rule vx-micro">
        <span>FRAGMENTS {MEMORY_FRAGMENTS.length} / RECOVERED 0</span>
        <span>{visits > 1 ? 'ARCHIVE HAS MOVED' : 'ARCHIVE AT REST'}</span>
      </div>
    </div>
  );
}
