import { useEffect, useRef, useState } from 'react';
import { useInView, useRaf } from '../../system/hooks';
import { useAnomaly, useSystem } from '../../system/SystemProvider';
import { RESIDUE_FRAGMENTS } from '../../system/lexicon';
import { pad } from '../../system/rng';
import { skeyed, soccurs, spick } from '../../system/session';
import './Residue.css';

/**
 * A FIELD OF NOTHING.
 *
 * Placed between regions, at the scale of a paragraph, a screen, or more
 * than a screen. Before the visit begins, the session decides for each
 * field whether it holds a boundary, a pixel, a count, a fragment, several
 * of those, or nothing whatsoever — and the last outcome is common enough
 * that investigating a field is not reliably rewarded.
 *
 * That is the point. An empty area that always turns out to contain
 * something is a puzzle, and a puzzle is solvable. An empty area that
 * sometimes contains something and sometimes does not is a place you are
 * never quite finished looking at.
 */
export function Residue({
  id, scale = 'short', ord = 0,
}: {
  id: string;
  scale?: 'short' | 'tall' | 'void';
  /** Distinguishes fields so the runtime can address one without the rest. */
  ord?: number;
}) {
  const { depth, reduced } = useSystem();
  const { n, kind } = useAnomaly('residue');
  const [host, inView] = useInView<HTMLDivElement>({ rootMargin: '0px', threshold: 0.15 });
  const countEl = useRef<HTMLSpanElement>(null);
  const pixelEl = useRef<HTMLSpanElement>(null);
  const [flash, setFlash] = useState(false);
  const spent = useRef(false);
  const armed = useRef(false);
  const nudge = useRef(0);
  const t0 = useRef(0);
  const lastTick = useRef(-1);

  // Composition of this field, fixed for the visit before it is ever seen.
  const has = {
    bound: soccurs(`${id}/bound`, 0.58),
    pixel: soccurs(`${id}/pixel`, 0.44),
    count: soccurs(`${id}/count`, 0.46),
    flash: soccurs(`${id}/flash`, 0.38),
  };
  const place = {
    bx: skeyed(`${id}/bx`, 8, 88), by: skeyed(`${id}/by`, 10, 86),
    baxis: soccurs(`${id}/baxis`, 0.4) ? 'v' : 'h',
    px: skeyed(`${id}/px`, 12, 90), py: skeyed(`${id}/py`, 14, 84),
    cx: skeyed(`${id}/cx`, 10, 74), cy: skeyed(`${id}/cy`, 12, 88),
    fx: skeyed(`${id}/fx`, 14, 62), fy: skeyed(`${id}/fy`, 20, 78),
  };
  const base = Math.floor(skeyed(`${id}/base`, 1000, 98000));
  const word = spick(`${id}/word`, RESIDUE_FRAGMENTS);
  const ox = soccurs(`${id}/ox`, 0.22);

  // The count advances at its own pace while the field is on screen. It is
  // written straight to the node; nothing re-renders to move a number.
  useRaf((t) => {
    if (!has.count || !countEl.current) return;
    if (t0.current === 0) t0.current = t;
    const ticks = Math.floor((t - t0.current) / 1400);
    // It advances every 1.4 seconds. It is not written eighty-four times
    // between one advance and the next.
    if (ticks === lastTick.current) return;
    lastTick.current = ticks;
    countEl.current.textContent = pad(base + ticks, 6);
  }, inView && has.count && !reduced);

  // The fragment. Once, at a moment decided before arrival, and then gone
  // for the rest of the visit however long anybody waits.
  useEffect(() => {
    if (!has.flash || !inView || spent.current || reduced) return;
    spent.current = true;
    const at = 3200 + skeyed(`${id}/when`, 0, 26000);
    const show = window.setTimeout(() => {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 620);
    }, at);
    return () => window.clearTimeout(show);
  }, [has.flash, inView, reduced, id]);

  // Addressed by the runtime — but only the field whose ordinal comes up.
  useEffect(() => {
    if (!armed.current) { armed.current = true; return; }
    if (n % 4 !== ord % 4) return;
    if (kind === 'relocate' || kind === 'shift') {
      nudge.current += 1;
      const el = pixelEl.current;
      if (el) {
        const dx = skeyed(`${id}/nudge/${n}/x`, -34, 34);
        const dy = skeyed(`${id}/nudge/${n}/y`, -21, 21);
        el.style.transform = `translate3d(${dx.toFixed(0)}px, ${dy.toFixed(0)}px, 0)`;
      }
    } else if (kind === 'open' || kind === 'linger') {
      // The field gives up its fragment a second time, which it had not
      // been going to do.
      setFlash(true);
      const t = window.setTimeout(() => setFlash(false), kind === 'linger' ? 2600 : 700);
      return () => window.clearTimeout(t);
    }
  }, [n, kind, ord, id]);

  const empty = !has.bound && !has.pixel && !has.count && !has.flash;

  return (
    <div
      className="vx-residue"
      ref={host}
      data-scale={scale}
      data-deep={depth >= 3 && scale !== 'short' ? 1 : 0}
      data-empty={empty ? 1 : 0}
      aria-hidden="true"
    >
      {has.bound && (
        <span
          className="vx-residue__bound"
          data-axis={place.baxis}
          style={{ left: `${place.bx}%`, top: `${place.by}%` }}
        />
      )}
      {has.pixel && (
        <span
          className="vx-residue__pixel"
          ref={pixelEl}
          style={{ left: `${place.px}%`, top: `${place.py}%` }}
        />
      )}
      {has.count && (
        <span
          className="vx-residue__count"
          ref={countEl}
          style={{ left: `${place.cx}%`, top: `${place.cy}%` }}
        >
          {pad(base, 6)}
        </span>
      )}
      {has.flash && (
        <span
          className="vx-residue__flash"
          data-on={flash ? 1 : 0}
          data-ox={ox ? 1 : 0}
          style={{ left: `${place.fx}%`, top: `${place.fy}%` }}
        >
          {word}
        </span>
      )}
    </div>
  );
}
