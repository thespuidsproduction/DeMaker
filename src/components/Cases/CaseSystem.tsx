import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  MARK_LABEL, MARK_WEIGHT, WINDOW, buildCase, dayIndex, lastSealed, openCases,
  resolutionOf, signatureFor, untilNextOpening, verifyFigure, verifySignature,
  type Case, type MarkId,
} from '../../system/cases';
import {
  casebookRevision, exportCasebook, fileSubmission, grant, marksFor, noteSeen,
  observerId, subscribeCasebook, submissions, witnessedAt, isVolatile,
} from '../../system/casebook';
import { currentRelay, relayAttached } from '../../system/relay';
import { useSystem } from '../../system/SystemProvider';
import { pad } from '../../system/rng';
import './CaseSystem.css';

/** One subscription to the casebook, shared by everything in this region. */
const useCasebook = () => useSyncExternalStore(subscribeCasebook, casebookRevision, casebookRevision);

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function Countdown() {
  const [ms, setMs] = useState(() => untilNextOpening());
  useEffect(() => {
    const id = window.setInterval(() => setMs(untilNextOpening()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return <span>NEXT OPENING {pad(h, 2)}:{pad(m, 2)}:{pad(s, 2)}</span>;
}

/** The observer count, asked for and — as things stand — not supplied. */
function Observers({ n }: { n: number }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    void currentRelay().observers(n).then((c) => { if (live) setCount(c); });
    return () => { live = false; };
  }, [n]);
  return <span>{count === null ? 'OBSERVERS UNCOUNTED' : `${count} OBSERVERS`}</span>;
}

function Board({ cases, current, onPick }: { cases: Case[]; current: number; onPick: (n: number) => void }) {
  useCasebook();
  const sealed = lastSealed();

  return (
    <div>
      <ul className="vx-board">
        {cases.map((c) => {
          const pct = resolutionOf(marksFor(c.n));
          return (
            <li key={c.n}>
              <button
                type="button"
                className="vx-board__row"
                data-current={c.n === current ? 1 : 0}
                data-state={c.state}
                data-full={pct === 100 ? 1 : 0}
                data-vx-cursor="+"
                aria-current={c.n === current ? 'true' : undefined}
                aria-label={`Case ${c.designation}, ${pct} per cent resolved, day ${c.age + 1} of ${WINDOW}`}
                onClick={() => onPick(c.n)}
              >
                <span className="vx-board__des">{c.designation}</span>
                <span className="vx-board__meter" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
                <span className="vx-board__state">
                  {pct === 0 ? 'UNKNOWN' : pct === 100 ? 'RESOLVED' : `${pct}% RESOLVED`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="vx-board__foot vx-micro">
        <Countdown />
        {sealed && <span>{sealed.designation} SEALED</span>}
      </div>
    </div>
  );
}

function FigurePanel({ c }: { c: Case }) {
  const f = c.figure;

  if (f.kind === 'sequence') {
    return (
      <div className="vx-case__seq" aria-label={`Sequence: ${f.data.map((d) => (d < 0 ? 'withheld' : d)).join(', ')}`}>
        {f.data.map((d, i) => <i key={i} data-hole={d < 0 ? 1 : 0}>{d < 0 ? '——' : d}</i>)}
      </div>
    );
  }

  if (f.kind === 'coordinates') {
    const lit = new Set(f.data);
    return (
      <div className="vx-case__plot" role="img" aria-label={`Thirty-five surveyed positions, ${f.data.length} occupied. Plotted on a five by seven grid they form a character.`}>
        {Array.from({ length: 35 }, (_, i) => (
          <span key={i} className="vx-case__cell" data-lit={lit.has(i) ? 1 : 0} />
        ))}
      </div>
    );
  }

  if (f.kind === 'cipher') {
    return (
      <div className="vx-case__ciph" aria-label={`Transcript positions: ${f.data.join(', ')}`}>
        {f.data.map((d, i) => <i key={i}>{ALPHABET[d]}</i>)}
      </div>
    );
  }

  return null;
}

function Mark({
  id, held, lost, how, children,
}: { id: MarkId; held: boolean; lost?: boolean; how: string; children?: React.ReactNode }) {
  return (
    <div className="vx-mark" data-id={id} data-held={held ? 1 : 0} data-lost={lost ? 1 : 0}>
      <span className="vx-mark__pip" aria-hidden="true" />
      <div>
        <p className="vx-mark__name">
          {MARK_LABEL[id]} — {held ? 'HELD' : lost ? 'LOST' : 'NOT HELD'}
        </p>
        <p className="vx-mark__how vx-micro">{how}</p>
        {!held && children}
      </div>
      <span className="vx-mark__weight vx-micro">{pad(MARK_WEIGHT[id], 2)}</span>
    </div>
  );
}

function CaseDetail({ c }: { c: Case }) {
  useCasebook();
  const { click, tone } = useSystem();
  const held = marksFor(c.n);
  const has = (m: MarkId) => held.includes(m);

  const [attempt, setAttempt] = useState('');
  const [figureReply, setFigureReply] = useState('');
  const [sig, setSig] = useState('');
  const [sigReply, setSigReply] = useState('');

  // The trace mark is taken from the record of what the observer has
  // already done in the artefact — including before this case opened.
  const witnessed = witnessedAt(c.witness.source, c.witness.detail) !== undefined;
  useEffect(() => {
    if (witnessed && !has('trace') && c.state === 'open') {
      if (grant(c.n, 'trace')) tone(132, 0.3);
    }
  }, [witnessed, c.n, c.state, has, tone]);

  const submitFigure = (e: React.FormEvent) => {
    e.preventDefault();
    click(0.6);
    if (verifyFigure(c.figure, attempt)) {
      grant(c.n, 'figure');
      setFigureReply('ACCEPTED');
      setAttempt('');
      tone(110, 0.4);
    } else {
      setFigureReply('NOT THAT');
    }
  };

  const submitSig = (e: React.FormEvent) => {
    e.preventDefault();
    click(0.6);
    const result = verifySignature(c.n, observerId(), sig);
    setSigReply(
      result === 'accepted' ? 'CORROBORATED'
      : result === 'own' ? 'THAT IS YOUR OWN'
      : result === 'wrong-case' ? 'ISSUED AGAINST ANOTHER CASE'
      : 'NOT A SIGNATURE'
    );
    if (result === 'accepted') { grant(c.n, 'second'); setSig(''); tone(84, 0.6); }
  };

  const claimWindow = () => {
    click(0.9);
    grant(c.n, 'window');
    tone(150, 0.3);
  };

  const issuable = has('trace') && has('figure');
  const pct = resolutionOf(held);
  const windowOpen = c.age === 0;

  return (
    <div className="vx-case">
      <div className="vx-case__head">
        <p className="vx-case__des">{c.designation}</p>
        <span className="vx-micro">
          {c.state === 'sealed' ? 'SEALED' : `DAY ${c.age + 1} OF ${WINDOW}`} / {c.classification}
        </span>
      </div>
      <p className="vx-case__note vx-micro">{c.note}</p>

      <div className="vx-case__figure">
        <p className="vx-case__statement">{c.figure.statement}</p>
        <FigurePanel c={c} />
      </div>

      <div className="vx-marks">
        <Mark id="trace" held={has('trace')} how={c.witness.instruction} />

        <Mark id="figure" held={has('figure')} how={`THE FIGURE RESOLVES TO ${c.figure.form}.`}>
          {c.state === 'open' && (
            <>
              <form className="vx-form" onSubmit={submitFigure}>
                <label className="vx-sr" htmlFor={`fig-${c.n}`}>Answer for the figure of case {c.designation}</label>
                <input
                  id={`fig-${c.n}`}
                  value={attempt}
                  onChange={(e) => { setAttempt(e.target.value); setFigureReply(''); }}
                  placeholder={c.figure.form}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="submit" className="vx-btn">SUBMIT</button>
              </form>
              <p className="vx-reply vx-micro" role="status" data-tone={figureReply === 'ACCEPTED' ? 'ox' : 'plain'}>
                {figureReply}
              </p>
            </>
          )}
        </Mark>

        <Mark
          id="window"
          held={has('window')}
          lost={!has('window') && !windowOpen}
          how={
            has('window') ? 'TAKEN ON THE DAY IT OPENED.'
            : windowOpen ? 'AVAILABLE TODAY ONLY. IT WILL NOT BE AVAILABLE TOMORROW.'
            : 'THE WINDOW CLOSED. THIS MARK IS NOT RECOVERABLE.'
          }
        >
          {windowOpen && (
            <div className="vx-form vx-form--lone">
              <button type="button" className="vx-btn" data-key="1" onClick={claimWindow}>
                TAKE THE WINDOW MARK
              </button>
            </div>
          )}
        </Mark>

        <Mark
          id="second"
          held={has('second')}
          how={
            'ONE OBSERVER CANNOT TAKE THIS. IT IS GRANTED FOR A SIGNATURE ISSUED TO SOMEBODY ELSE, ' +
            'AGAINST THIS CASE. VRAXXIS WILL NOT INTRODUCE YOU.'
          }
        >
          {c.state === 'open' && (
            <>
              <form className="vx-form" onSubmit={submitSig}>
                <label className="vx-sr" htmlFor={`sig-${c.n}`}>Another observer's signature for case {c.designation}</label>
                <input
                  id={`sig-${c.n}`}
                  value={sig}
                  onChange={(e) => { setSig(e.target.value); setSigReply(''); }}
                  placeholder="XXX-XXXX-X"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="submit" className="vx-btn">CORROBORATE</button>
              </form>
              <p className="vx-reply vx-micro" role="status" data-tone={sigReply === 'CORROBORATED' ? 'ox' : 'plain'}>
                {sigReply}
              </p>
            </>
          )}
        </Mark>
      </div>

      <div className="vx-case__issue">
        <p className="vx-micro">
          YOUR SIGNATURE FOR {c.designation} —{' '}
          {issuable ? 'ISSUED. IT IS OF NO USE TO YOU.' : 'WITHHELD UNTIL THE TRACE AND FIGURE MARKS ARE HELD.'}
        </p>
        {issuable && <p className="vx-sig">{signatureFor(c.n, observerId())}</p>}
      </div>

      <div className="vx-board__foot vx-case__tally vx-micro">
        <span>RESOLUTION {pad(pct, 3)} / 100</span>
        <Observers n={c.n} />
      </div>
    </div>
  );
}

function Submissions() {
  useCasebook();
  const { click } = useSystem();
  const [where, setWhere] = useState('');
  const [account, setAccount] = useState('');
  const [reply, setReply] = useState('');
  const filed = submissions();

  const file = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.trim()) { setReply('NO ACCOUNT GIVEN'); return; }
    click(0.7);
    const record = fileSubmission({
      designation: `VX-${pad(dayIndex(), 3)}/S`,
      where: where.trim() || 'UNSTATED',
      account: account.trim(),
    });
    void currentRelay().transmit(record);
    setWhere(''); setAccount('');
    setReply(relayAttached() ? 'FILED AND TRANSMITTED' : 'FILED. HELD. NOT TRANSMITTED.');
  };

  const takeAway = () => {
    click(0.5);
    setReply(exportCasebook());
  };

  return (
    <div className="vx-submit">
      <p className="vx-case__statement">REPORT AN ANOMALY</p>
      <p className="vx-mark__how vx-submit__note vx-micro">
        ANYTHING FILED HERE STAYS IN THIS BROWSER. THERE IS NOTHING FOR IT TO BE SENT TO,
        AND THE SYSTEM WILL SAY SO RATHER THAN PRETEND OTHERWISE.
      </p>

      <form className="vx-form" onSubmit={file}>
        <label className="vx-sr" htmlFor="sub-where">Where the anomaly was observed</label>
        <input
          id="sub-where" value={where} onChange={(e) => setWhere(e.target.value)}
          placeholder="WHERE" autoComplete="off"
        />
        <button type="submit" className="vx-btn">FILE</button>
        <label className="vx-sr" htmlFor="sub-account">Your account of the anomaly</label>
        <textarea
          id="sub-account" value={account} onChange={(e) => setAccount(e.target.value)}
          placeholder="Account. It will not be read by anyone."
        />
      </form>
      <p className="vx-reply vx-reply--record vx-micro" role="status">{reply}</p>

      {filed.length > 0 && (
        <div className="vx-submit__held">
          {filed.slice(0, 6).map((s) => (
            <div className="vx-submit__row vx-micro" key={s.id}>
              <span>{s.id}</span>
              <span><b>{s.where}</b> — {s.account.slice(0, 64)}{s.account.length > 64 ? '…' : ''}</span>
              <span>{relayAttached() ? 'SENT' : 'HELD'}</span>
            </div>
          ))}
          <div className="vx-form vx-form--pair">
            <button type="button" className="vx-btn" onClick={takeAway}>TAKE THE RECORD AWAY</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CaseSystem() {
  useCasebook();
  const today = useMemo(() => dayIndex(), []);
  const cases = useMemo(() => openCases(today), [today]);
  const [current, setCurrent] = useState(today);
  const c = useMemo(() => buildCase(current, today), [current, today]);

  // Whether this observer has been at this case before. Recorded, not shown.
  const returning = useMemo(() => noteSeen(current), [current]);
  const pick = useCallback((n: number) => setCurrent(n), []);

  return (
    <div className="vx-cases">
      <div className="vx-cases__today vx-micro">
        <span>ACTIVE CASES {cases.length}</span>
        <span>{returning ? 'YOU HAVE BEEN AT THIS ONE BEFORE' : 'FIRST READING'}</span>
        <span>{isVolatile() ? 'CASEBOOK NOT RETAINED' : 'CASEBOOK RETAINED LOCALLY'}</span>
      </div>

      <div className="vx-cases__split">
        <Board cases={cases} current={current} onPick={pick} />
        <div>
          <CaseDetail c={c} />
          <Submissions />
        </div>
      </div>
    </div>
  );
}
