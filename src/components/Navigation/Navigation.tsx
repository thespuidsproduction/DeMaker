import { useCallback, useEffect, useRef, useState } from 'react';
import { NAV, type NavNode, type SectionId } from '../../system/lexicon';
import { useAnomaly, useSystem } from '../../system/SystemProvider';
import { useCoarsePointer } from '../../system/hooks';
import { skeyed } from '../../system/session';
import { SignalIndicator } from '../Diagnostic/Diagnostic';
import './Navigation.css';

/**
 * A node's label is replaced while the pointer is on it, cycling through a
 * short list of near-synonyms before returning to itself. The system is
 * reacting, not animating — and when it is in an indifferent temper it
 * stops reacting entirely for a while, which is a different thing from
 * being broken.
 */
function useDriftLabel(node: NavNode, suppressed: boolean) {
  const [text, setText] = useState(node.label);
  const timers = useRef<number[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const enter = useCallback(() => {
    if (!node.drift || suppressed) return;
    clear();
    node.drift.forEach((label, i) => {
      timers.current.push(window.setTimeout(() => setText(label), i * 190));
    });
    timers.current.push(
      window.setTimeout(() => setText(node.label), node.drift.length * 190 + 120)
    );
  }, [node, clear, suppressed]);

  const leave = useCallback(() => { clear(); setText(node.label); }, [node, clear]);

  useEffect(() => clear, [clear]);
  return { text, enter, leave };
}

function NavNodeButton({
  node, index, active, level, suppressed, displaced, lent, onGo, onInert, mobile,
}: {
  node: NavNode;
  index: number;
  active: boolean;
  /** How much of itself the rail is still willing to show. */
  level: number;
  suppressed: boolean;
  displaced: boolean;
  /** An inert coordinate the system has temporarily decided to honour. */
  lent: boolean;
  onGo: (t: SectionId) => void;
  onInert: (n: NavNode) => void;
  mobile?: boolean;
}) {
  const { text, enter, leave } = useDriftLabel(node, suppressed);
  const [held, setHeld] = useState(false);
  const cls = mobile ? 'vx-nav-m__btn' : 'vx-nav__btn';
  const resolves = node.target !== null || lent;

  // Below the surface the rail stops naming its destinations. Putting the
  // pointer or the keyboard on one brings its name back, so the column is
  // never unusable — only unreadable at rest.
  const shown = mobile || level < 2 || held;

  return (
    <button
      type="button"
      className={cls}
      data-active={active ? 1 : 0}
      data-inert={resolves ? 0 : 1}
      data-lent={lent ? 1 : 0}
      data-displaced={displaced ? 1 : 0}
      data-level={mobile ? 0 : level}
      data-vx-cursor={resolves ? '+' : '?'}
      aria-current={active ? 'true' : undefined}
      // The rail may stop printing its labels. It never stops announcing them.
      aria-label={resolves ? `Region ${node.ord}, ${node.label}` : `${node.label} — unresolved coordinate`}
      onMouseEnter={() => { setHeld(true); enter(); }}
      onMouseLeave={() => { setHeld(false); leave(); }}
      onFocus={() => { setHeld(true); enter(); }}
      onBlur={() => { setHeld(false); leave(); }}
      onClick={() => (node.target ? onGo(node.target) : lent ? onGo('null') : onInert(node))}
    >
      <span className="vx-nav__ord" aria-hidden="true">
        {level < 4 || mobile
          ? node.ord
          /* At the deepest level the ordinals become marks whose length is
             the only thing distinguishing one coordinate from another. */
          : <i className="vx-nav__tick" style={{ width: 6 + (index % 4) * 7 }} />}
      </span>
      <span className="vx-nav__label" data-shown={shown ? 1 : 0} aria-hidden={!shown}>
        {shown ? text : ''}
      </span>
    </button>
  );
}

export function VraxxisNavigation({ active }: { active: SectionId | null }) {
  const { audioOn, toggleAudio, click, observers, discover, reduced, depth } = useSystem();
  const { n, kind } = useAnomaly('nav');
  const coarse = useCoarsePointer();
  const [open, setOpen] = useState(false);
  const [markHits, setMarkHits] = useState(0);
  const [inertNote, setInertNote] = useState<string | null>(null);
  const [suppressed, setSuppressed] = useState(false);
  const [displaced, setDisplaced] = useState(-1);
  const [lent, setLent] = useState(false);
  const noteTimer = useRef<number>();
  const armed = useRef(false);

  const go = useCallback((target: SectionId) => {
    const el = document.getElementById(`vx-${target}`);
    if (!el) return;
    click(0.7);
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => el.focus({ preventScroll: true }), reduced ? 0 : 600);
    setOpen(false);
  }, [click, reduced]);

  const onInert = useCallback((node: NavNode) => {
    click(0.4);
    clearTimeout(noteTimer.current);
    setInertNote(node.label === 'VRAXX' ? 'COORDINATE HELD' : 'NO DESTINATION RECORDED');
    noteTimer.current = window.setTimeout(() => setInertNote(null), 2600);
  }, [click]);

  useEffect(() => () => clearTimeout(noteTimer.current), []);

  // What the rail does when the runtime addresses it.
  useEffect(() => {
    if (!armed.current) { armed.current = true; return; }
    const t: number[] = [];
    if (kind === 'withdraw') {
      setSuppressed(true);
      t.push(window.setTimeout(() => setSuppressed(false), 12000));
    } else if (kind === 'shift' || kind === 'relocate') {
      setDisplaced(Math.floor(skeyed(`nav/displace/${n}`, 0, NAV.length)));
      t.push(window.setTimeout(() => setDisplaced(-1), 3400));
    } else if (kind === 'open') {
      // A coordinate that has refused every time it was operated resolves.
      // It is not announced, it is not explained, and it does not last.
      setLent(true);
      t.push(window.setTimeout(() => setLent(false), 11000));
    }
    return () => t.forEach(clearTimeout);
  }, [n, kind]);

  const onMark = () => {
    const h = markHits + 1;
    setMarkHits(h);
    click(h >= 7 ? 1 : 0.5);
    if (h === 7) discover('persistent-observer');
  };

  const looking = markHits >= 7;
  // Touch has no hover to restore a hidden label with, so the rail on a
  // coarse pointer never strips past its ordinals.
  const level = coarse ? Math.min(depth, 1) : depth;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <nav className="vx-nav" aria-label="Region coordinates" data-level={level}>
        <button
          type="button"
          className="vx-nav__mark"
          data-looking={looking ? 1 : 0}
          data-vx-cursor="0"
          onClick={onMark}
          aria-label="VRAXXIS"
        >
          {looking ? 'YOU KEEP LOOKING' : 'VRAXXIS'}
        </button>

        <div className="vx-nav__list">
          {NAV.map((node, i) => (
            <NavNodeButton
              key={node.ord + node.label}
              node={node}
              index={i}
              active={active === node.target}
              level={level}
              suppressed={suppressed}
              displaced={displaced === i}
              lent={lent && node.inert === true}
              onGo={go}
              onInert={onInert}
            />
          ))}
        </div>

        <div className="vx-nav__foot">
          {inertNote && <span className="vx-micro" role="status">{inertNote}</span>}
          <SignalIndicator label={`OBSERVED BY ${observers}`} state={observers > 1 ? 'fault' : 'active'} />
          <button
            type="button"
            className="vx-nav__toggle"
            data-on={audioOn ? 1 : 0}
            data-vx-cursor="+"
            onClick={toggleAudio}
            aria-pressed={audioOn}
          >
            AUDIO: {audioOn ? 'ON' : 'OFF'}
          </button>
          <span className="vx-micro" aria-hidden="true">G / SUBSTRATE</span>
        </div>
      </nav>

      {/* Mobile: a single mark, and a field behind it. The field always
          names its coordinates — a phone has no hover to get them back. */}
      <div className="vx-nav-m">
        <button
          type="button"
          className="vx-nav-m__open"
          onClick={() => { setOpen(true); click(0.6); }}
          aria-expanded={open}
          aria-label="Open region coordinates"
        >
          /\
        </button>

        <div className="vx-nav-m__field" data-open={open ? 1 : 0}>
          <button type="button" className="vx-nav-m__close" onClick={() => setOpen(false)} aria-label="Close coordinates">×</button>
          {NAV.map((node, i) => (
            <NavNodeButton
              key={node.ord + node.label}
              node={node}
              index={i}
              active={active === node.target}
              level={0}
              suppressed={suppressed}
              displaced={displaced === i}
              lent={lent && node.inert === true}
              onGo={go}
              onInert={onInert}
              mobile
            />
          ))}
          <div className="vx-nav-m__meta vx-micro">
            <span>OBSERVED BY {observers}</span>
            {inertNote && <span role="status">{inertNote}</span>}
            <button type="button" className="vx-nav__toggle" data-on={audioOn ? 1 : 0} onClick={toggleAudio} aria-pressed={audioOn}>
              AUDIO: {audioOn ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
