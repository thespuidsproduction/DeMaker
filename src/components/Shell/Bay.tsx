import { useEffect, useRef, type ReactNode } from 'react';
import { useSystem } from '../../system/SystemProvider';
import type { SectionId } from '../../system/lexicon';
import './Shell.css';

/**
 * A region of VRAXXIS.
 *
 * Semantically this is an ordinary labelled <section>: it can be reached,
 * focused, announced and skipped like any well-built document. What it
 * contains is another matter, and not accessibility's problem.
 *
 * Entering a bay is recorded. Regions consult that count and present
 * themselves differently on a second visit.
 */
export function Bay({
  id, ord, title, aux, children, onEnter,
}: {
  id: SectionId;
  ord: string;
  title: string;
  aux?: string;
  children: ReactNode;
  onEnter?: (visits: number) => void;
}) {
  const { enterRegion, visits } = useSystem();
  const el = useRef<HTMLElement>(null);
  const inside = useRef(false);
  const enterRef = useRef(onEnter);
  enterRef.current = onEnter;
  const visitsRef = useRef(visits);
  visitsRef.current = visits;

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([e]) => {
        // Debounced by an entry latch: crossing the boundary counts once,
        // not once per scroll event near the edge.
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

  return (
    <section
      ref={el}
      id={`vx-${id}`}
      className="vx-bay-el vx-bay"
      tabIndex={-1}
      aria-labelledby={`vx-${id}-title`}
      data-region={id}
    >
      <header className="vx-bay__head">
        <span className="vx-bay__ord">{ord}</span>
        <h2 className="vx-bay__title" id={`vx-${id}-title`}>{title}</h2>
        {aux && <span className="vx-bay__aux">{aux}</span>}
      </header>
      <div className="vx-bay__body">{children}</div>
    </section>
  );
}

/** An interval of nothing. It is load-bearing. */
export function Silence({ note }: { note?: string }) {
  return (
    <div className="vx-silence" aria-hidden="true">
      <span className="vx-silence__line" />
      {note && <span className="vx-silence__note vx-micro">{note}</span>}
    </div>
  );
}
