import { useEffect, useRef, useState } from 'react';
import { useInView, useRaf, useSize } from '../../system/hooks';
import { useSystem } from '../../system/SystemProvider';
import { DiagnosticText, type Row } from '../Diagnostic/Diagnostic';
import {
  DETACHED, INNER, INNER_EDGES, OUTER, OUTER_EDGES, STRUTS,
  focalFor, project, scaleV3, twistFor,
} from './geometry';
import './ObjectVX.css';

const MAX_DEPTH = 7;

/**
 * The object is examined, not operated. Dragging turns it; releasing lets
 * it carry on turning and then hands it back to its own drift. Each
 * interaction opens one more internal layer, to a limit of seven, at which
 * point the manifest revises itself and stops.
 */
export function ObjectVX({ visits }: { visits: number }) {
  const { observers, addObserver, click, reduced } = useSystem();
  const [hostRef, size] = useSize<HTMLDivElement>();
  const [viewRef, inView] = useInView<HTMLDivElement>({ rootMargin: '30% 0px', threshold: 0 });
  const canvas = useRef<HTMLCanvasElement>(null);

  const [depth, setDepth] = useState(1);
  const [hits, setHits] = useState(0);

  // Orientation lives in a ref: turning the object must never re-render it.
  const rot = useRef({ ry: 0.62, rx: -0.34, vy: 0, vx: 0 });
  /**
   * The two focal lengths make the projected size of the solid depend on
   * how it happens to be turned, so a fixed scale would let corners leave
   * the plate at some angles and float in the middle at others. The fit is
   * measured each frame from the projection itself and approached slowly,
   * which keeps the object inside its plate at every orientation and gives
   * it a size that is never quite settled.
   */
  const fit = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const t0 = useRef(performance.now());

  /** Seven interrogations produce a second observer. Who it is, is not said. */
  const interrogate = () => {
    const n = hits + 1;
    setHits(n);
    setDepth((d) => Math.min(d + 1, MAX_DEPTH));
    click(0.6 + Math.min(n, 7) * 0.05);
    if (n === 7 && observers === 1) addObserver();
  };

  // A returning observer finds it already turned, at an angle nobody set.
  useEffect(() => {
    if (visits > 1) {
      rot.current.ry += 0.9 * (visits - 1);
      rot.current.rx = -0.34 + 0.11 * (visits - 1);
    }
  }, [visits]);

  // --- pointer ---------------------------------------------------------
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;

    const down = (e: PointerEvent) => {
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      d.x = e.clientX; d.y = e.clientY;
      rot.current.ry += dx * 0.0065;
      rot.current.rx += dy * 0.0048;
      rot.current.vy = dx * 0.0065;
      rot.current.vx = dy * 0.0048;
    };
    const up = (e: PointerEvent) => {
      if (drag.current?.id === e.pointerId) {
        try { el.releasePointerCapture(e.pointerId); } catch { /* pointer already gone */ }
        drag.current = null;
      }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, []);

  // --- sizing ----------------------------------------------------------
  useEffect(() => {
    const c = canvas.current;
    if (!c || size.w === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.floor(size.w * dpr);
    c.height = Math.floor(size.h * dpr);
  }, [size]);

  // --- render ----------------------------------------------------------
  // Suspended entirely when the object is off screen. It does not turn for
  // an empty room, whatever the manifest claims.
  useRaf((t) => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx || size.w === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    const r = rot.current;
    if (!drag.current) {
      // Momentum decays, then the object resumes a drift of its own.
      r.vy *= 0.94; r.vx *= 0.94;
      r.ry += r.vy + (reduced ? 0 : 0.0016);
      r.rx += r.vx;
      // A slow nod, out of phase with the turn, so the motion never loops.
      if (!reduced) r.rx += Math.sin((t - t0.current) / 5400) * 0.00035;
    }

    const cx = size.w / 2;
    const cy = size.h / 2;

    // Pass one: project at unit scale purely to measure the silhouette.
    let reach = 0.0001;
    for (let i = 0; i < OUTER.length; i++) {
      const p = project(OUTER[i], r.ry + twistFor(i, 'outer'), r.rx, focalFor(i, 'outer'), 1, 0, 0);
      const d = Math.hypot(p.x, p.y);
      if (d > reach) reach = d;
    }
    const target = (Math.min(size.w, size.h) * 0.42) / reach;
    fit.current += (target - fit.current) * (fit.current === 0 ? 0.06 : 0.05);
    const scale = fit.current;
    const wobble = reduced ? 0 : Math.sin((t - t0.current) / 1700);

    const po = OUTER.map((v, i) => project(v, r.ry + twistFor(i, 'outer'), r.rx, focalFor(i, 'outer'), scale, cx, cy));
    const pi = INNER.map((v, i) => project(v, r.ry + twistFor(i, 'inner'), r.rx, focalFor(i, 'inner'), scale, cx, cy));

    ctx.lineWidth = 1;
    ctx.lineCap = 'square';

    // Internal layers, innermost first, each dimmer and turned a little
    // further than the shell that contains it.
    for (let d = depth; d >= 2; d--) {
      const k = 1 - (d - 1) * 0.115;
      const off = (d - 1) * 0.075;
      const alpha = 0.045 + (depth - d) * 0.012;
      ctx.strokeStyle = `rgba(214,214,214,${alpha.toFixed(3)})`;
      ctx.beginPath();
      for (const [a, b] of OUTER_EDGES) {
        const A = project(scaleV3(OUTER[a], k), r.ry + off + twistFor(a, 'outer'), r.rx - off * 0.4, focalFor(a, 'outer'), scale, cx, cy);
        const B = project(scaleV3(OUTER[b], k), r.ry + off + twistFor(b, 'outer'), r.rx - off * 0.4, focalFor(b, 'outer'), scale, cx, cy);
        ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
      }
      ctx.stroke();
    }

    // Struts. Drawn before the shells so the interior reads as structure
    // rather than as an outline.
    ctx.strokeStyle = 'rgba(102,102,102,0.26)';
    ctx.beginPath();
    for (const [a, b] of STRUTS) {
      ctx.moveTo(po[a].x, po[a].y);
      ctx.lineTo(pi[b].x, pi[b].y);
    }
    ctx.stroke();

    // Inner shell.
    ctx.strokeStyle = 'rgba(160,160,160,0.26)';
    ctx.beginPath();
    for (const [a, b] of INNER_EDGES) {
      ctx.moveTo(pi[a].x, pi[a].y);
      ctx.lineTo(pi[b].x, pi[b].y);
    }
    ctx.stroke();

    // Outer shell. Two of its edges are not attached to it.
    OUTER_EDGES.forEach(([a, b], i) => {
      const detached = DETACHED.has(i);
      const A = po[a], B = po[b];
      const ox = detached ? wobble * 9 : 0;
      const oy = detached ? wobble * -5 : 0;
      ctx.strokeStyle = detached
        ? 'rgba(160,160,160,0.45)'
        : `rgba(242,242,242,${(0.5 + (A.z + B.z) * -0.12).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(A.x + ox, A.y + oy);
      ctx.lineTo(B.x + ox, B.y + oy);
      ctx.stroke();
    });

    // One edge is oxidised. It is the same edge every time.
    {
      const [a, b] = OUTER_EDGES[6];
      ctx.strokeStyle = 'rgba(192,90,34,0.85)';
      ctx.beginPath();
      ctx.moveTo(po[a].x, po[a].y);
      ctx.lineTo(po[b].x, po[b].y);
      ctx.stroke();
    }

    // Corner marks and a small number of vertex labels.
    ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = 'rgba(102,102,102,0.85)';
    po.forEach((p, i) => {
      ctx.strokeStyle = 'rgba(214,214,214,0.55)';
      ctx.beginPath();
      ctx.moveTo(p.x - 2.5, p.y); ctx.lineTo(p.x + 2.5, p.y);
      ctx.moveTo(p.x, p.y - 2.5); ctx.lineTo(p.x, p.y + 2.5);
      ctx.stroke();
      if (i === 0 || i === 5 || i === 7) ctx.fillText(`V${i}`, p.x + 6, p.y - 4);
    });

    // The absent inner vertex is marked. Nothing is drawn there.
    {
      const ghost = project(INNER[5], r.ry + twistFor(5, 'inner'), r.rx, focalFor(5, 'inner'), scale, cx, cy);
      ctx.strokeStyle = 'rgba(192,90,34,0.35)';
      ctx.beginPath();
      ctx.arc(ghost.x, ghost.y, 4.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, inView);

  const rows: Row[] = [
    ['STATE', hits > 0 ? 'ACTIVE / HANDLED' : 'ACTIVE'],
    ['AGE', hits >= 4 ? 'UNKNOWN (REVISED)' : 'UNKNOWN'],
    ['DEPTH', depth >= MAX_DEPTH ? '07 / 07' : `0${depth} / 07`],
    ['OWNER', 'NONE'],
    ['REFERENCE', 'VRAXXIS'],
    ['OBSERVED BY', String(observers)],
  ];

  return (
    <div className="vx-obj" ref={viewRef}>
      <div className="vx-obj__stage" ref={hostRef}>
        <canvas
          ref={canvas}
          className="vx-obj__canvas"
          style={{ width: size.w || undefined, height: size.h || undefined }}
          data-vx-cursor="coord"
          onClick={interrogate}
          role="img"
          aria-label={
            `Object VX-000: an eight-cornered outer shell stitched to a seven-cornered inner shell. ` +
            `Depth ${depth} of ${MAX_DEPTH} layers open. Observed by ${observers}.`
          }
        />
        <span className="vx-obj__id vx-micro">OBJECT / VX-000</span>
        <span className="vx-obj__hint vx-micro" data-spent={hits > 2 ? 1 : 0}>DRAG TO TURN / PRESS TO OPEN</span>
        <span className="vx-obj__depth" aria-hidden="true">
          {Array.from({ length: MAX_DEPTH }, (_, i) => <i key={i} data-open={i < depth ? 1 : 0} />)}
        </span>
      </div>

      <div className="vx-obj__manifest">
        <div>
          <p className="vx-obj__manifest-head">VX-000</p>
          <p className="vx-obj__manifest-sub vx-micro">
            {depth >= MAX_DEPTH ? 'NO FURTHER LAYERS ARE AVAILABLE' : 'LAYERS REMAIN'}
          </p>
        </div>

        <DiagnosticText rows={rows} channel="object" emphasise={observers > 1 ? 5 : undefined} />

        {/* Buttons for anyone who cannot drag a canvas. They do the same
            thing the canvas does, and say so plainly. */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <button type="button" className="vx-nav__toggle" data-vx-cursor="+" onClick={interrogate}>
            OPEN NEXT LAYER
          </button>
          <button
            type="button"
            className="vx-nav__toggle"
            data-vx-cursor="+"
            onClick={() => { rot.current.vy = 0.05; click(0.4); }}
          >
            TURN
          </button>
        </div>

        <p className="vx-obj__note vx-micro">
          {hits >= 7
            ? 'THE SECOND OBSERVER WAS NOT ADDED BY THIS INTERFACE'
            : 'THE OBJECT DOES NOT REQUIRE ATTENTION TO PERSIST'}
        </p>
      </div>
    </div>
  );
}
