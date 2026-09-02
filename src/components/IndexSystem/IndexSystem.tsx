import { useEffect, useRef, useState } from 'react';
import { INDEX_ENTRIES, type IndexEntry } from '../../system/lexicon';
import { useAnomaly, useSystem } from '../../system/SystemProvider';
import { keyed } from '../../system/rng';
import './IndexSystem.css';

/** Confidence is stated as a percentage in the fragments and drawn as a
    measure in the row. The two do not always agree. */
function confidenceOf(e: IndexEntry): number {
  const raw = e.fragments.find(([k]) => k === 'confidence')?.[1] ?? '0%';
  const n = parseInt(raw.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? Math.min(n, 100) : 0;
}

export function IndexSystem({ visits }: { visits: number }) {
  const { click, reduced } = useSystem();
  const pulse = useAnomaly('index');
  const [open, setOpen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);
  const timers = useRef<number[]>([]);

  const entry = INDEX_ENTRIES.find((e) => e.id === open) ?? null;

  // Fragments do not appear together. They arrive, one at a time, at
  // intervals that are close to regular and are not.
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRevealed(0);
    if (!entry || entry.sealed) return;
    if (reduced) { setRevealed(entry.fragments.length); return; }
    entry.fragments.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setRevealed(i + 1), 120 + i * 145 + (i === 2 ? 90 : 0)));
    });
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, [entry, reduced]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // On any visit after the first, the register has quietly misfiled one row.
  // It is a different row each time, and nothing anywhere acknowledges it.
  const displaced = visits > 1
    ? INDEX_ENTRIES[Math.floor(keyed(`misfile:${visits}`, 0, INDEX_ENTRIES.length))].id
    : null;

  // When the anomaly channel fires here, the register loses count.
  const total = pulse % 2 === 1 ? INDEX_ENTRIES.length - 1 : INDEX_ENTRIES.length;

  const interrogate = (e: IndexEntry) => {
    click(e.sealed ? 0.35 : 0.8);
    setOpen((cur) => (cur === e.id ? null : e.id));
  };

  return (
    <div className="vx-index">
      <ul className="vx-index__list">
        {INDEX_ENTRIES.map((e) => {
          const conf = confidenceOf(e);
          return (
            <li key={e.id} className="vx-index__row" data-displaced={displaced === e.id ? 1 : 0}>
              <button
                type="button"
                className="vx-index__btn"
                data-open={open === e.id ? 1 : 0}
                data-sealed={e.sealed ? 1 : 0}
                data-vx-cursor={e.sealed ? '×' : '0'}
                aria-expanded={open === e.id}
                aria-controls="vx-index-fragments"
                aria-label={e.sealed ? `Entry ${e.id}, redacted, unavailable` : `Entry ${e.id}, ${e.name}`}
                onClick={() => interrogate(e)}
                onMouseEnter={() => !('ontouchstart' in window) && setOpen(e.id)}
              >
                <span className="vx-index__id">{e.id}</span>
                <span className="vx-index__name">{e.name}</span>
                <span className="vx-index__bar" aria-hidden="true">
                  <span style={{ width: `${open === e.id ? conf : Math.min(conf, 9)}%` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* The fragment panel is a live region: what appears here is
          announced, in the order it arrives, exactly as it is seen. */}
      <div className="vx-index__frag" id="vx-index-fragments" aria-live="polite">
        <p className="vx-index__frag-head">
          {entry ? (entry.sealed ? `ENTRY ${entry.id}` : `OBJECT ${entry.id}`) : 'NO ENTRY SELECTED'}
        </p>

        {entry?.sealed ? (
          <div className="vx-index__frag-list">
            <p className="vx-index__frag-line vx-index__refusal" data-on="1">RECORD SEALED</p>
            <p className="vx-index__frag-line" data-on="1">NO FRAGMENTS WILL BE RETURNED</p>
            <p className="vx-index__frag-line" data-on="1">THE SEAL IS NOT A MALFUNCTION</p>
          </div>
        ) : (
          <div className="vx-index__frag-list">
            {entry?.fragments.map(([k, v], i) => (
              <p className="vx-index__frag-line" key={k} data-on={i < revealed ? 1 : 0}>
                {k}: <b>{v}</b>
              </p>
            ))}
          </div>
        )}

        <div className="vx-index__count vx-micro">
          <span>REGISTER LENGTH {total}</span>
          <span>{visits > 1 ? 'REGISTER REORDERED' : 'REGISTER STABLE'}</span>
        </div>
      </div>
    </div>
  );
}
