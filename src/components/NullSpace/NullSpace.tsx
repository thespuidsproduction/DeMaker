import { useEffect, useRef, useState } from 'react';
import { useInView, useRaf } from '../../system/hooks';
import { useSystem } from '../../system/SystemProvider';
import { keyed } from '../../system/rng';
import './NullSpace.css';

/** Fixed positions, generated once. Nothing here is placed at random. */
const OBJECTS = Array.from({ length: 22 }, (_, i) => ({
  x: keyed(`null:x:${i}`, 6, 94),
  y: keyed(`null:y:${i}`, 8, 92),
  w: keyed(`null:w:${i}`, 0, 1) < 0.3 ? 13 : 1,
  h: keyed(`null:h:${i}`, 0, 1) < 0.3 ? 1 : 7,
}));

/**
 * Objects are lit only within a short radius of the pointer, and go out
 * again the moment it leaves. After enough of the field has been swept,
 * the region states what it thinks has happened, once, and then stops.
 */
export function NullSpace() {
  const { discover, reduced, tone } = useSystem();
  // One ref serves as both the visibility probe and the measurement host.
  const [host, inView] = useInView<HTMLDivElement>({ rootMargin: '0px', threshold: 0.2 });
  const nodes = useRef<(HTMLElement | null)[]>([]);
  const pointer = useRef({ x: -9999, y: -9999, inside: false });
  const swept = useRef(0);
  const [found, setFound] = useState<0 | 1 | 2>(0);
  const announced = useRef(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.current.x = e.clientX - r.left;
      pointer.current.y = e.clientY - r.top;
      pointer.current.inside = true;
    };
    const leave = () => { pointer.current.inside = false; };
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerdown', move, { passive: true });
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerdown', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);

  useRaf(() => {
    const el = host.current;
    if (!el) return;
    const w = el.clientWidth, h = el.clientHeight;
    const p = pointer.current;
    const radius = Math.min(w, h) * 0.26;

    nodes.current.forEach((n, i) => {
      if (!n) return;
      const o = OBJECTS[i];
      const ox = (o.x / 100) * w;
      const oy = (o.y / 100) * h;
      let a = 0;
      if (p.inside) {
        const d = Math.hypot(ox - p.x, oy - p.y);
        a = d < radius ? Math.pow(1 - d / radius, 1.7) * 0.55 : 0;
        if (a > 0.4) swept.current += 1;
      }
      n.style.opacity = a.toFixed(3);
    });

    // Roughly a full sweep of the field. Stated once, then withdrawn.
    if (!announced.current && swept.current > 620) {
      announced.current = true;
      setFound(1);
      discover('null-found');
      tone(58, 0.9);
      window.setTimeout(() => setFound(2), 5200);
    }
  }, inView && !reduced);

  return (
    <div
      className="vx-null"
      ref={host}
      data-vx-cursor="0"
    >
      <p className="vx-null__word">NULL</p>

      {OBJECTS.map((o, i) => (
        <span
          key={i}
          className="vx-null__obj"
          ref={(el) => { nodes.current[i] = el; }}
          style={{ left: `${o.x}%`, top: `${o.y}%` }}
          aria-hidden="true"
        >
          <i style={{ width: o.w, height: o.h }} />
        </span>
      ))}

      {/* Announced only when it happens, and never repeated. */}
      <p className="vx-null__found" data-on={found} role="status">
        {found > 0 ? 'YOU WERE NOT SUPPOSED TO FIND THIS' : ''}
      </p>

      {/* The field is swept with a pointer. Where there is no pointer,
          there is this, and it does the same thing in one press. */}
      <button
        type="button"
        className="vx-null__aid"
        onClick={() => {
          nodes.current.forEach((n) => { if (n) n.style.opacity = '0.5'; });
          if (!announced.current) {
            announced.current = true;
            setFound(1);
            discover('null-found');
            window.setTimeout(() => setFound(2), 5200);
          }
        }}
      >
        SWEEP FIELD
      </button>
    </div>
  );
}
