import { useCallback, useEffect, useRef, useState } from 'react';
import { NAV, type NavNode, type SectionId } from '../../system/lexicon';
import { useSystem } from '../../system/SystemProvider';
import { SignalIndicator } from '../Diagnostic/Diagnostic';
import './Navigation.css';

/**
 * A node's label is replaced while the pointer is on it, cycling through
 * a short list of near-synonyms before returning to itself. NULL becomes
 * NOT NULL, then NULL?, then NULL. The system is reacting, not animating.
 */
function useDriftLabel(node: NavNode) {
  const [text, setText] = useState(node.label);
  const timers = useRef<number[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const enter = useCallback(() => {
    if (!node.drift) return;
    clear();
    node.drift.forEach((label, i) => {
      timers.current.push(window.setTimeout(() => setText(label), i * 190));
    });
    timers.current.push(
      window.setTimeout(() => setText(node.label), node.drift.length * 190 + 120)
    );
  }, [node, clear]);

  const leave = useCallback(() => { clear(); setText(node.label); }, [node, clear]);

  useEffect(() => clear, [clear]);
  return { text, enter, leave };
}

function NavNodeButton({
  node, active, onGo, onInert, mobile,
}: {
  node: NavNode;
  active: boolean;
  onGo: (t: SectionId) => void;
  onInert: (n: NavNode) => void;
  mobile?: boolean;
}) {
  const { text, enter, leave } = useDriftLabel(node);
  const cls = mobile ? 'vx-nav-m__btn' : 'vx-nav__btn';

  return (
    <button
      type="button"
      className={cls}
      data-active={active ? 1 : 0}
      data-inert={node.inert ? 1 : 0}
      data-vx-cursor={node.inert ? '?' : '+'}
      aria-current={active ? 'true' : undefined}
      // The visible label mutates; the accessible name does not.
      aria-label={node.inert ? `${node.label} — unresolved coordinate` : `Region ${node.ord}, ${node.label}`}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      onClick={() => (node.target ? onGo(node.target) : onInert(node))}
    >
      <span className="vx-nav__ord" aria-hidden="true">{node.ord}</span>
      <span className="vx-nav__label">{text}</span>
    </button>
  );
}

export function VraxxisNavigation({ active }: { active: SectionId | null }) {
  const { audioOn, toggleAudio, click, observers, discover, reduced } = useSystem();
  const [open, setOpen] = useState(false);
  const [markHits, setMarkHits] = useState(0);
  const [inertNote, setInertNote] = useState<string | null>(null);
  const noteTimer = useRef<number>();

  const go = useCallback((target: SectionId) => {
    const el = document.getElementById(`vx-${target}`);
    if (!el) return;
    click(0.7);
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    // Focus follows the move, or keyboard operators are stranded.
    window.setTimeout(() => el.focus({ preventScroll: true }), reduced ? 0 : 600);
    setOpen(false);
  }, [click, reduced]);

  /** Inert coordinates do not fail. They reclassify themselves and stay. */
  const onInert = useCallback((node: NavNode) => {
    click(0.4);
    clearTimeout(noteTimer.current);
    setInertNote(node.label === 'VRAXX' ? 'COORDINATE HELD' : 'NO DESTINATION RECORDED');
    noteTimer.current = window.setTimeout(() => setInertNote(null), 2600);
  }, [click]);

  useEffect(() => () => clearTimeout(noteTimer.current), []);

  /** Seven presses on the wordmark. The system notices being looked at. */
  const onMark = () => {
    const n = markHits + 1;
    setMarkHits(n);
    click(n >= 7 ? 1 : 0.5);
    if (n === 7) discover('persistent-observer');
  };

  const looking = markHits >= 7;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const nodes = NAV.map((n) => (
    <NavNodeButton key={n.ord + n.label} node={n} active={active === n.target} onGo={go} onInert={onInert} />
  ));

  return (
    <>
      <nav className="vx-nav" aria-label="Region coordinates">
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

        <div className="vx-nav__list">{nodes}</div>

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

      {/* Mobile: a single mark, and a field behind it. */}
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
          {NAV.map((n) => (
            <NavNodeButton key={n.ord + n.label} node={n} active={active === n.target} onGo={go} onInert={onInert} mobile />
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
