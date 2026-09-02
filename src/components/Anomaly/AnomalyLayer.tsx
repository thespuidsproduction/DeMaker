import { useEffect, useRef, useState } from 'react';
import { useIdleStage, useTransient } from '../../system/hooks';
import { useSystem } from '../../system/SystemProvider';
import { IDLE_LINES } from '../../system/lexicon';
import './AnomalyLayer.css';

const SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'v', 'x',
];

/**
 * The parts of VRAXXIS that address the observer directly: the notices it
 * issues when nothing is happening, when the window changes shape, and
 * when a sequence it never mentioned is entered correctly.
 */
export function AnomalyLayer() {
  const { discoveries, discover, tone, reduced, observers } = useSystem();
  const idle = useIdleStage([52000, 68000], !reduced);
  const [resized, flagResize] = useTransient(2400);
  const [internal, setInternal] = useState(false);
  const progress = useRef(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  // --- the sequence ----------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      const want = SEQUENCE[progress.current];
      if (e.key.toLowerCase() === want.toLowerCase()) {
        progress.current += 1;
        if (progress.current === SEQUENCE.length) {
          progress.current = 0;
          discover('internal');
          setInternal(true);
          tone(147, 0.6);
        }
      } else {
        progress.current = e.key === SEQUENCE[0] ? 1 : 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [discover, tone]);

  // --- dimensions ------------------------------------------------------
  useEffect(() => {
    let armed = false;
    // The first resize event of a session is usually the browser settling.
    const t = window.setTimeout(() => { armed = true; }, 1500);
    const onResize = () => {
      if (!armed) return;
      flagResize();
      discover('dimensions');
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => { window.clearTimeout(t); window.removeEventListener('resize', onResize); };
  }, [flagResize, discover]);

  // --- focus management for the panel ----------------------------------
  useEffect(() => {
    if (!internal) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setInternal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [internal]);

  const notice =
    resized ? 'DIMENSIONS ACCEPTED'
    : idle >= 2 ? IDLE_LINES[1]
    : idle === 1 ? IDLE_LINES[0]
    : null;

  return (
    <>
      <p className="vx-notice" data-on={notice ? 1 : 0} role="status" aria-live="polite">
        {notice ?? ''}
      </p>

      <div
        className="vx-internal"
        data-open={internal ? 1 : 0}
        role="dialog"
        aria-modal="true"
        aria-label="VX internal"
        aria-hidden={!internal}
      >
        <div className="vx-internal__panel">
          <p className="vx-internal__head">VX / INTERNAL</p>
          <div className="vx-internal__body">
            <p>THERE IS NO ADDITIONAL LAYER.</p>
            <p>THIS IS THE SAME LAYER, ADMITTED.</p>
            <p>OBSERVERS: <b>{observers}</b></p>
            <p>RECORDED DISCOVERIES: {discoveries.size}</p>
            <p>NOTHING HERE WAS EARNED.</p>
          </div>
          <button ref={closeRef} type="button" className="vx-internal__close" onClick={() => setInternal(false)}>
            CLOSE / RETURN TO SURFACE
          </button>
        </div>
      </div>
    </>
  );
}
