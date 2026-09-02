import { useEffect, useRef, useState } from 'react';
import { useCoarsePointer, useRaf } from '../../system/hooks';
import { useAnomaly, useSystem } from '../../system/SystemProvider';
import { STILLNESS_LINES } from '../../system/lexicon';
import { pad } from '../../system/rng';
import './TraceLayer.css';

interface Mark { x: number; y: number; t: number; label: string | null; }

const LIFE = 2600;      // ms a mark survives, ordinarily
const MAX = 110;        // hard ceiling on retained marks
const MIN_STEP = 17;    // px between samples — sparse on purpose

/**
 * A record of where the pointer has been, kept just long enough to be
 * noticed and not long enough to be read. Every sixth mark is annotated
 * with a coordinate; the annotations are the only part that reads as
 * deliberate, which is why they are rare.
 */
export function TraceLayer() {
  const { reduced, observers } = useSystem();
  const { n, kind } = useAnomaly('signal');
  const coarse = useCoarsePointer();
  /**
   * Retention is ordinarily 2600 ms. In an observant temper the layer
   * keeps movement for four times that, which is long enough for a path
   * to accumulate into a legible shape before it goes — the interface
   * having, briefly, taken more of an interest than it usually does.
   */
  const life = useRef(LIFE);
  const armedTrace = useRef(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const marks = useRef<Mark[]>([]);
  const count = useRef(0);
  const last = useRef({ x: 0, y: 0 });
  const dpr = useRef(1);
  const dirty = useRef(true);

  /**
   * THE OTHER PATH.
   *
   * Once the object has registered a second observer, the layer
   * occasionally retains movement that is not the pointer's: a short arc,
   * laid down over about a second, decaying like everything else and
   * annotated with nothing, because it does not annotate.
   *
   * It happens perhaps twice in an hour. It is never on screen at the same
   * moment as it is being made, it never intersects the pointer, and there
   * is no notice, no sound and no acknowledgement anywhere in the build
   * that anything occurred. An observer who sees it will not be sure they
   * saw it, and there is nothing they can do to make it happen again.
   */
  const other = useRef<Mark[]>([]);

  // --- stillness -------------------------------------------------------
  const [still, setStill] = useState(0);
  const stillAt = useRef({ x: -999, y: -999 });

  useEffect(() => {
    if (coarse || reduced) return;
    let timers: number[] = [];
    const arm = () => {
      timers.forEach(clearTimeout);
      setStill(0);
      timers = [
        window.setTimeout(() => setStill(1), 11000),
        window.setTimeout(() => setStill(2), 15500),
        window.setTimeout(() => setStill(0), 20500),
      ];
    };
    const onMove = (e: PointerEvent) => {
      stillAt.current.x = e.clientX;
      stillAt.current.y = e.clientY;
      arm();
    };
    arm();
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { timers.forEach(clearTimeout); window.removeEventListener('pointermove', onMove); };
  }, [coarse, reduced]);

  useEffect(() => {
    if (!armedTrace.current) { armedTrace.current = true; return; }
    if (kind !== 'linger') return;
    life.current = LIFE * 4;
    const t = window.setTimeout(() => { life.current = LIFE; }, 21000);
    return () => window.clearTimeout(t);
  }, [n, kind]);

  // --- sampling --------------------------------------------------------
  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      if (dx * dx + dy * dy < MIN_STEP * MIN_STEP) return;
      last.current.x = e.clientX;
      last.current.y = e.clientY;
      count.current += 1;
      const n = count.current;
      marks.current.push({
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
        // Every sixth sample is annotated. Every thirty-first is annotated
        // with something that is not a coordinate.
        label: n % 31 === 0 ? 'VX' : n % 6 === 0 ? `${pad(e.clientX, 4)}.${pad(e.clientY, 4)}` : null,
      });
      if (marks.current.length > MAX) marks.current.splice(0, marks.current.length - MAX);
      dirty.current = true;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced]);

  // --- the other path --------------------------------------------------
  useEffect(() => {
    if (reduced || observers < 2) return;
    let timer = 0;
    let laying = 0;

    const lay = () => {
      // An arc that starts off one edge, crosses a little of the field and
      // leaves. It is given a plausible hand: an arc, not a straight line,
      // decelerating slightly, the way a pointer moves and a script does not.
      const w = window.innerWidth, h = window.innerHeight;
      const fromLeft = Math.random() < 0.5;
      const x0 = fromLeft ? -30 : w + 30;
      const y0 = 90 + Math.random() * (h - 200);
      const span = (fromLeft ? 1 : -1) * (180 + Math.random() * 320);
      const bow = (Math.random() - 0.5) * 220;
      const steps = 12 + Math.floor(Math.random() * 6);

      let i = 0;
      laying = window.setInterval(() => {
        const u = i / steps;
        const ease = 1 - (1 - u) * (1 - u);
        other.current.push({
          x: x0 + span * ease,
          y: y0 + bow * Math.sin(u * Math.PI),
          t: performance.now(),
          label: null,
        });
        if (other.current.length > 40) other.current.shift();
        dirty.current = true;
        if (++i > steps) window.clearInterval(laying);
      }, 58);
    };

    /* The first one comes shortly after the object registers the second
       observer — which is the minute the observer is paying most attention,
       and therefore the only minute in which it is worth happening. After
       that it retreats to a few times an hour, so that having seen it once
       is no help at all in seeing it again. */
    let first = true;
    const schedule = () => {
      const wait = first ? 34_000 + Math.random() * 46_000 : 260_000 + Math.random() * 380_000;
      first = false;
      timer = window.setTimeout(() => {
        if (!document.hidden) lay();
        schedule();
      }, wait);
    };
    schedule();

    return () => { window.clearTimeout(timer); window.clearInterval(laying); other.current = []; };
  }, [reduced, observers]);

  // --- sizing ----------------------------------------------------------
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const resize = () => {
      dpr.current = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.floor(window.innerWidth * dpr.current);
      c.height = Math.floor(window.innerHeight * dpr.current);
      c.style.width = `${window.innerWidth}px`;
      c.style.height = `${window.innerHeight}px`;
      dirty.current = true;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    return () => window.removeEventListener('resize', resize);
  }, []);

  // --- draw ------------------------------------------------------------
  useRaf(() => {
    const c = canvas.current;
    if (!c) return;
    const now = performance.now();

    // Retire dead marks before deciding whether there is anything to draw.
    const live = marks.current;
    const alien = other.current;
    while (live.length && now - live[0].t > life.current) { live.shift(); dirty.current = true; }
    while (alien.length && now - alien[0].t > LIFE) { alien.shift(); dirty.current = true; }
    if (!dirty.current && live.length === 0 && alien.length === 0) return;

    const ctx = c.getContext('2d');
    if (!ctx) return;
    const s = dpr.current;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.clearRect(0, 0, c.width / s, c.height / s);
    if (live.length === 0 && alien.length === 0) { dirty.current = false; return; }

    ctx.lineWidth = 1;
    ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < live.length; i++) {
      const m = live[i];
      const age = (now - m.t) / life.current;
      if (age >= 1) continue;
      const a = (1 - age) * (1 - age);

      // A hairline back to the previous mark, only while the two are close.
      const prev = live[i - 1];
      if (prev) {
        const d = Math.hypot(m.x - prev.x, m.y - prev.y);
        if (d < 120) {
          ctx.strokeStyle = `rgba(160,160,160,${(a * 0.16).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }
      }

      // The mark itself: a 3px cross, never a dot.
      ctx.strokeStyle = `rgba(214,214,214,${(a * 0.5).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(m.x - 2, m.y); ctx.lineTo(m.x + 2, m.y);
      ctx.moveTo(m.x, m.y - 2); ctx.lineTo(m.x, m.y + 2);
      ctx.stroke();

      if (m.label) {
        ctx.fillStyle = m.label === 'VX'
          ? `rgba(192,90,34,${(a * 0.8).toFixed(3)})`
          : `rgba(102,102,102,${(a * 0.75).toFixed(3)})`;
        ctx.fillText(m.label, m.x + 6, m.y - 5);
      }
    }

    // The other path. Same decay, no annotation, and no join back to the
    // pointer's marks — the two records do not touch anywhere.
    for (let i = 0; i < alien.length; i++) {
      const m = alien[i];
      const age = (now - m.t) / LIFE;
      if (age >= 1) continue;
      const a = (1 - age) * (1 - age);
      const prev = alien[i - 1];
      if (prev) {
        ctx.strokeStyle = `rgba(160,160,160,${(a * 0.13).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(214,214,214,${(a * 0.42).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(m.x - 2, m.y); ctx.lineTo(m.x + 2, m.y);
      ctx.moveTo(m.x, m.y - 2); ctx.lineTo(m.x, m.y + 2);
      ctx.stroke();
    }

    dirty.current = true;
  }, !reduced);

  if (reduced) return null;

  return (
    <>
      <canvas ref={canvas} className="vx-trace" aria-hidden="true" />
      {!coarse && (
        <p
          className="vx-stillness"
          data-on={still > 0 ? 1 : 0}
          data-stage={still}
          aria-hidden="true"
          style={{ left: stillAt.current.x, top: stillAt.current.y }}
        >
          {still === 2 ? STILLNESS_LINES[1] : STILLNESS_LINES[0]}
        </p>
      )}
    </>
  );
}
