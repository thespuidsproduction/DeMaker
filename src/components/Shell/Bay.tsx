import { useEffect, useRef, type ReactNode } from 'react';
import { useSystem } from '../../system/SystemProvider';
import type { SectionId } from '../../system/lexicon';
import './Shell.css';

/**
 * A REGION OF VRAXXIS, AND HOW MUCH OF AN INTERFACE IT IS STILL WILLING
 * TO BE.
 *
 * Every bay has a rank — how far into the document it sits — and the
 * runtime has a depth — how far the observer has actually gone. The level
 * a bay presents itself at is the lesser of the two, which produces two
 * effects at once:
 *
 *   Going deeper strips conventions. Ranks 5 and above only reach their
 *   full state once somebody has been down there.
 *
 *   Coming back changes what you left. A bay you passed at depth 1 has
 *   given up its label by the time you return at depth 4.
 *
 * What is withheld is only ever presentational: the auxiliary field, then
 * the visible title, then the ordinal, then the alignment itself. The
 * heading never leaves the accessibility tree, the region never stops
 * being reachable, and its accessible name never changes. An observer
 * using a screen reader is told exactly where they are at every level —
 * they simply cannot see the interface stop saying it.
 */
export function Bay({
  id, ord, title, aux, rank, children, onEnter,
}: {
  id: SectionId;
  ord: string;
  title: string;
  aux?: string;
  /** Position in the descent. Higher ranks are permitted to withhold more. */
  rank: number;
  children: ReactNode;
  onEnter?: (visits: number) => void;
}) {
  const { enterRegion, visits, depth } = useSystem();
  const el = useRef<HTMLElement>(null);
  const inside = useRef(false);
  const enterRef = useRef(onEnter);
  enterRef.current = onEnter;
  const visitsRef = useRef(visits);
  visitsRef.current = visits;

  const level = Math.min(rank, depth);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !inside.current) {
          inside.current = true;
          enterRegion(id);
          enterRef.current?.((visitsRef.current[id] ?? 0) + 1);
        } else if (!e.isIntersecting && e.intersectionRatio === 0) {
          inside.current = false;
        }
      },
      { threshold: [0, 0.25], rootMargin: '-20% 0px -20% 0px' }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [id, enterRegion]);

  const showAux = level < 2 && aux;
  const showTitle = level < 3;
  const showOrd = level < 4;

  return (
    <section
      ref={el}
      id={`vx-${id}`}
      className="vx-bay-el vx-bay"
      tabIndex={-1}
      aria-labelledby={`vx-${id}-title`}
      data-region={id}
      data-level={level}
    >
      <header className="vx-bay__head">
        {showOrd
          ? <span className="vx-bay__ord">{ord}</span>
          : <span className="vx-bay__mark" aria-hidden="true" />}

        {/* The heading is always here. Below level 3 it is simply not shown. */}
        <h2 className={showTitle ? 'vx-bay__title' : 'vx-sr'} id={`vx-${id}-title`}>{title}</h2>

        {showAux && <span className="vx-bay__aux">{aux}</span>}
      </header>
      <div className="vx-bay__body">{children}</div>
    </section>
  );
}
