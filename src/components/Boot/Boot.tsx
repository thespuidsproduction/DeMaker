import { useEffect, useRef, useState } from 'react';
import { useSystem } from '../../system/SystemProvider';
import { BOOT_SEQUENCE } from '../../system/lexicon';
import { pad } from '../../system/rng';
import { witness } from '../../system/casebook';
import './Boot.css';

type Mech = 'idle' | 'build' | 'collapse' | 'turn' | 'leave';

interface Step { at: number; line?: number; mech?: Mech; end?: true }

/** First arrival. Deliberately slow — the check is the content. */
const FULL: Step[] = [
  { at: 420,  line: 0 },
  { at: 1320, line: 1 },
  { at: 2140, line: 2 },
  { at: 2980, line: 3 },
  { at: 3760, line: -1, mech: 'build' },
  { at: 4700, mech: 'collapse' },
  { at: 5080, mech: 'turn' },
  { at: 5860, mech: 'leave' },
  { at: 6280, end: true },
];

/** Any subsequent arrival in the same session. The system does not repeat
    itself for someone it has already checked. It says so, briefly. */
const RECHECK: Step[] = [
  { at: 200,  line: 1 },
  { at: 900,  line: 4 },
  { at: 1500, line: -1, mech: 'turn' },
  { at: 1900, mech: 'leave' },
  { at: 2260, end: true },
];

const REDUCED: Step[] = [
  { at: 150, line: 1 },
  { at: 900, line: 3 },
  { at: 1500, end: true },
];

const LINES = [...BOOT_SEQUENCE, 'CHECK ALREADY PERFORMED'] as const;

export function Boot({ onComplete }: { onComplete: () => void }) {
  const { reduced, tone } = useSystem();
  const [line, setLine] = useState(-1);
  const [mech, setMech] = useState<Mech>('idle');
  const [done, setDone] = useState(false);
  const finished = useRef(false);
  const timers = useRef<number[]>([]);
  // Held in a ref: the check runs once, whatever the host does above it.
  const complete = useRef(onComplete);
  complete.current = onComplete;

  // Read once, on the way in. The record is written afterwards, so that
  // reading it stays a pure operation and the check cannot mark itself.
  const [repeat] = useState(() => {
    try { return sessionStorage.getItem('vx.checked') === '1'; }
    catch { return false; } // Storage refused. Treated as a first arrival.
  });
  useEffect(() => {
    try { sessionStorage.setItem('vx.checked', '1'); } catch { /* nothing is recorded */ }
  }, []);

  const script = reduced ? REDUCED : repeat ? RECHECK : FULL;

  useEffect(() => {
    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      setDone(true);
      window.setTimeout(() => complete.current(), 700);
    };

    timers.current = script.map((s) =>
      window.setTimeout(() => {
        if (s.line !== undefined) setLine(s.line);
        if (s.mech) setMech(s.mech);
        if (s.end) finish();
      }, s.at)
    );

    // The check can be declined. Declining is not treated as a failure.
    const skip = () => {
      timers.current.forEach(clearTimeout);
      witness('check');
      finish();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip();
    };
    window.addEventListener('keydown', onKey);

    const t = timers.current;
    return () => {
      t.forEach(clearTimeout);
      window.removeEventListener('keydown', onKey);
    };
  }, [script]);

  // One tone, at the moment the mechanism turns. Only if audio was enabled
  // before arrival, which it cannot have been. It is here for the second visit.
  useEffect(() => { if (mech === 'turn') tone(74, 0.5); }, [mech, tone]);

  return (
    <div
      className="vx-boot"
      data-phase={done ? 'clear' : 'holding'}
      data-mech={mech}
      role="status"
      aria-live="polite"
      aria-label="System check in progress"
    >
      <div className="vx-boot__stack">
        {LINES.map((text, i) => (
          <p
            key={text}
            className="vx-boot__line"
            data-on={line === i ? 1 : 0}
            data-weight={i === 1 ? 'name' : i === 3 ? 'verdict' : 'plain'}
            aria-hidden={line !== i}
          >
            {text}
          </p>
        ))}

        <div className="vx-boot__mech" aria-hidden="true">
          <div className="vx-boot__bar vx-boot__bar--h" />
          <div className="vx-boot__bar vx-boot__bar--v" />
          <div className="vx-boot__ticks">
            {/* Five ticks at exact twentieths. The sixth is not. */}
            {[0, 25, 50, 75, 100, 63].map((p, i) => (
              <span key={p} className="vx-boot__tick" style={{ left: `${p}%`, height: i === 5 ? '5px' : undefined }} />
            ))}
          </div>
        </div>
      </div>

      <div className="vx-boot__readout vx-micro" aria-hidden="true">
        <span>PERCEPTION CHECK</span>
        <span>SUBJECT {pad(1, 3)} / UNVERIFIED</span>
        <span>{repeat ? 'PRIOR RECORD FOUND' : 'NO PRIOR RECORD'}</span>
      </div>

      <button
        type="button"
        className="vx-boot__abort vx-micro"
        onClick={() => { timers.current.forEach(clearTimeout); witness('check'); setDone(true); window.setTimeout(() => complete.current(), 400); }}
      >
        DECLINE CHECK
      </button>
    </div>
  );
}
