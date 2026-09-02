import { useEffect, useRef } from 'react';
import { useCoarsePointer, useRaf } from '../../system/hooks';
import { coord } from '../../system/rng';
import './Cursor.css';

/**
 * Any element may declare what the pointer becomes over it, with
 * `data-vx-cursor="+ | 0 | ? | × | coord"`. Anything else falls back
 * to the reticle. The pointer is never a large circle chasing the mouse.
 */
export function Cursor() {
  const coarse = useCoarsePointer();
  const root = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);

  const target = useRef({ x: -100, y: -100 });
  const shown = useRef({ x: -100, y: -100 });
  const printed = useRef('');

  useEffect(() => {
    if (coarse) return;
    document.body.dataset.cursor = 'synthetic';
    return () => { delete document.body.dataset.cursor; };
  }, [coarse]);

  useEffect(() => {
    if (coarse) return;
    const el = root.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;

      const hit = (e.target as Element | null)?.closest?.('[data-vx-cursor]') as HTMLElement | null;
      const decl = hit?.dataset.vxCursor ?? '';

      if (decl === 'coord') {
        el.dataset.mode = 'reticle';
        el.dataset.coord = '1';
      } else if (decl) {
        el.dataset.mode = 'glyph';
        el.dataset.glyph = decl;
        el.dataset.coord = '0';
        if (markRef.current) markRef.current.textContent = decl;
      } else {
        el.dataset.mode = 'reticle';
        el.dataset.coord = '0';
      }
    };
    const onDown = () => { el.dataset.down = '1'; };
    const onUp = () => { el.dataset.down = '0'; };
    const onOut = (e: PointerEvent) => { if (!e.relatedTarget) el.style.opacity = '0'; };
    const onIn = () => { el.style.opacity = '1'; };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerout', onOut);
    document.addEventListener('pointerover', onIn);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerout', onOut);
      document.removeEventListener('pointerover', onIn);
    };
  }, [coarse]);

  // One frame of easing. Enough to read as a physical object, not enough
  // to read as a trailing effect.
  useRaf(() => {
    const el = root.current;
    if (!el) return;
    const s = shown.current, t = target.current;
    s.x += (t.x - s.x) * 0.55;
    s.y += (t.y - s.y) * 0.55;
    el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
    if (el.dataset.coord === '1' && coordRef.current) {
      const c = coord(Math.round(t.x), Math.round(t.y));
      if (c !== printed.current) { coordRef.current.textContent = c; printed.current = c; }
    }
  }, !coarse);

  if (coarse) return null;

  return (
    <div ref={root} className="vx-cursor" data-mode="reticle" data-coord="0" aria-hidden="true">
      <span className="vx-cursor__reticle" />
      <span ref={markRef} className="vx-cursor__mark" />
      <span ref={coordRef} className="vx-cursor__coord" />
    </div>
  );
}
