import { useEffect, useRef, useState } from 'react';
import { INDEX_ENTRIES, type IndexEntry } from '../../system/lexicon';
import { useAnomaly, useSystem } from '../../system/SystemProvider';
import { keyed } from '../../system/rng';
import { skeyed } from '../../system/session';
import { witness } from '../../system/casebook';
import './IndexSystem.css';

function confidenceOf(e: IndexEntry): number {
  const raw = e.fragments.find(([k]) => k === 'confidence')?.[1] ?? '0%';
  const n = parseInt(raw.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? Math.min(n, 100) : 0;
}

/**
 * The register, and the region where the system's temper is most legible.
 *
 * Addressed on its channel it will misfile a row, stop answering to the
 * pointer for a while, hold a reading open past the point at which it
 * should have cleared, or — rarely, and without being asked — lift a seal
 * it has refused every time it was asked, show what is underneath, and
 * then refuse again.
 *
 * None of it removes a capability: while it is withdrawn, every row still
 * opens on click, focus and Enter. It is only hover that it has stopped
 * finding interesting.
 */
export function IndexSystem({ visits }: { visits: number }) {
  const { click, reduced, tone } = useSystem();
  const { n, kind } = useAnomaly('index');

  const [open, setOpen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [withdrawn, setWithdrawn] = useState(false);
  const [unsealed, setUnsealed] = useState<string | null>(null);
  const [drift, setDrift] = useState(0);
  const timers = useRef<number[]>([]);
  const armed = useRef(false);

  const entry = INDEX_ENTRIES.find((e) => e.id === open) ?? null;
  const showingBeneath = entry != null && unsealed === entry.id && entry.beneath != null;

  // --- fragments arrive one at a time ----------------------------------
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRevealed(0);
    const list = showingBeneath ? entry!.beneath! : entry && !entry.sealed ? entry.fragments : null;
    if (!list) return;
    if (reduced) { setRevealed(list.length); return; }
    list.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setRevealed(i + 1), 120 + i * 145 + (i === 2 ? 90 : 0)));
    });
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, [entry, showingBeneath, reduced]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // --- what the system does when it is addressed here -------------------
  useEffect(() => {
    if (!armed.current) { armed.current = true; return; }
    const t: number[] = [];

    if (kind === 'withdraw') {
      // It stops noticing the pointer. It has not stopped working.
      setWithdrawn(true);
      t.push(window.setTimeout(() => setWithdrawn(false), 11000));
    } else if (kind === 'open') {
      const sealed = INDEX_ENTRIES.filter((e) => e.beneath);
      const target = sealed[Math.floor(skeyed(`unseal/${n}`, 0, sealed.length))];
      setUnsealed(target.id);
      setOpen(target.id);
      tone(88, 0.5);
      t.push(window.setTimeout(() => setUnsealed(null), 6500));
    } else if (kind === 'relocate' || kind === 'shift') {
      setDrift((d) => d + 1);
    } else if (kind === 'linger') {
      // Whatever is open stays open, and the register says nothing about it.
      setDrift((d) => d);
    }

    return () => t.forEach(clearTimeout);
  }, [n, kind, tone]);

  // The misfiled row moves for two reasons — because the observer has been
  // here before, and because the system has since decided otherwise.
  const misfiled = visits > 1 || drift > 0
    ? INDEX_ENTRIES[Math.floor(keyed(`misfile:${visits}:${drift}`, 0, INDEX_ENTRIES.length))].id
    : null;

  const total = drift % 2 === 1 ? INDEX_ENTRIES.length - 1 : INDEX_ENTRIES.length;

  const interrogate = (e: IndexEntry) => {
    click(e.sealed && unsealed !== e.id ? 0.35 : 0.8);
    setOpen((cur) => (cur === e.id ? null : e.id));
    // Opening a record is an act. Cases watching for it take their mark
    // from the record of the act, not from being present when it happened.
    witness('register', e.id);
  };

  const fragments = showingBeneath ? entry!.beneath! : entry?.fragments ?? [];

  return (
    <div className="vx-index" data-withdrawn={withdrawn ? 1 : 0}>
      <ul className="vx-index__list">
        {INDEX_ENTRIES.map((e) => {
          const conf = confidenceOf(e);
          const lifted = unsealed === e.id;
          return (
            <li key={e.id} className="vx-index__row" data-displaced={misfiled === e.id ? 1 : 0}>
              <button
                type="button"
                className="vx-index__btn"
                data-open={open === e.id ? 1 : 0}
                data-sealed={e.sealed && !lifted ? 1 : 0}
                data-lifted={lifted ? 1 : 0}
                data-vx-cursor={e.sealed && !lifted ? '×' : '0'}
                aria-expanded={open === e.id}
                aria-controls="vx-index-fragments"
                aria-label={
                  e.sealed && !lifted
                    ? `Entry ${e.id}, redacted, unavailable`
                    : `Entry ${e.id}, ${e.name}`
                }
                onClick={() => interrogate(e)}
                onPointerEnter={(ev) => {
                  if (withdrawn || ev.pointerType !== 'mouse') return;
                  setOpen(e.id);
                }}
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

      <div className="vx-index__frag" id="vx-index-fragments" aria-live="polite">
        <p className="vx-index__frag-head">
          {entry
            ? showingBeneath ? `BENEATH ${entry.id}`
            : entry.sealed ? `ENTRY ${entry.id}`
            : `OBJECT ${entry.id}`
            : 'NO ENTRY SELECTED'}
        </p>

        {entry?.sealed && !showingBeneath ? (
          <div className="vx-index__frag-list">
            <p className="vx-index__frag-line vx-index__refusal" data-on="1">RECORD SEALED</p>
            <p className="vx-index__frag-line" data-on="1">NO FRAGMENTS WILL BE RETURNED</p>
            <p className="vx-index__frag-line" data-on="1">THE SEAL IS NOT A MALFUNCTION</p>
          </div>
        ) : (
          <div className="vx-index__frag-list">
            {fragments.map(([k, v], i) => (
              <p className="vx-index__frag-line" key={k} data-on={i < revealed ? 1 : 0}>
                {k}: <b>{v}</b>
              </p>
            ))}
          </div>
        )}

        <div className="vx-index__count vx-micro">
          <span>REGISTER LENGTH {total}</span>
          <span>{misfiled ? 'REGISTER REORDERED' : 'REGISTER STABLE'}</span>
        </div>
      </div>
    </div>
  );
}
