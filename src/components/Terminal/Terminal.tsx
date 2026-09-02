import { useCallback, useEffect, useRef, useState } from 'react';
import { useSystem } from '../../system/SystemProvider';
import { Statement } from '../Diagnostic/Diagnostic';
import { run, type Session } from './commands';
import './Terminal.css';

interface Entry { id: number; kind: 'echo' | 'out'; text: string; tone?: 'plain' | 'ox'; }

const OPENING: string[] = [
  'REMNANT CONSOLE / VX',
  'THIS CONSOLE CONTROLS NOTHING',
  'TYPE HELP',
];

export function Terminal() {
  const { observers, uptimeRef, discoveries, audioOn, toggleAudio, click, reduced } = useSystem();
  const [log, setLog] = useState<Entry[]>(() =>
    OPENING.map((text, i) => ({ id: i, kind: 'out' as const, text }))
  );
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const nextId = useRef(OPENING.length);
  const logEl = useRef<HTMLDivElement>(null);

  const push = useCallback((entries: Omit<Entry, 'id'>[]) => {
    setLog((prev) => {
      const added = entries.map((e) => ({ ...e, id: nextId.current++ }));
      // The console forgets. It keeps the last 90 lines and no more.
      return [...prev, ...added].slice(-90);
    });
  }, []);

  useEffect(() => {
    const el = logEl.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = value;
    setValue('');
    if (input.trim()) {
      setHistory((h) => [...h.slice(-40), input]);
      setCursor(-1);
    }
    click(0.5);

    const session: Session = {
      observers,
      uptime: uptimeRef.current,
      discoveries: discoveries as ReadonlySet<string>,
      audioOn,
      toggleAudio,
      clear: () => setLog([]),
      goto: (id) => {
        const target = document.getElementById(`vx-${id}`);
        target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      },
    };

    const reply = run(input, session);
    push([
      { kind: 'echo', text: input || ' ' },
      ...reply.lines.map((text) => ({ kind: 'out' as const, text, tone: reply.tone })),
    ]);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      const next = cursor < 0 ? history.length - 1 : Math.max(0, cursor - 1);
      setCursor(next);
      setValue(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cursor < 0) return;
      const next = cursor + 1;
      if (next >= history.length) { setCursor(-1); setValue(''); }
      else { setCursor(next); setValue(history[next]); }
    }
  };

  return (
    <div className="vx-term">
      <div className="vx-term__shell">
        <div className="vx-term__bar vx-micro">
          <span>REMNANT / CONSOLE</span>
          <span>NO PRIVILEGES HELD</span>
        </div>

        {/* Output is announced as it arrives, in order. */}
        <div className="vx-term__log" ref={logEl} role="log" aria-live="polite" aria-label="Console output">
          {log.map((e) => (
            <div key={e.id} className={e.kind === 'echo' ? 'vx-term__echo' : 'vx-term__out'} data-tone={e.tone ?? 'plain'}>
              {e.text}
            </div>
          ))}
        </div>

        <form className="vx-term__form" onSubmit={submit}>
          <span className="vx-term__caret" aria-hidden="true">&gt;</span>
          <label className="vx-sr" htmlFor="vx-term-input">Console input. This console is fictional and performs no operations.</label>
          <input
            id="vx-term-input"
            className="vx-term__input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            placeholder="ENTER INPUT"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="send"
          />
          <button type="submit" className="vx-term__send">SEND</button>
        </form>
      </div>

      <div className="vx-term__side">
        <Statement tone="quiet">THE SYSTEM IS DOING EXACTLY THIS</Statement>
        <p className="vx-micro">
          NO COMMAND ENTERED HERE REACHES ANYTHING. THE CONSOLE ANSWERS BECAUSE
          IT WAS BUILT TO ANSWER, NOT BECAUSE IT WAS ASKED.
        </p>
        <p className="vx-micro">UP / DOWN RECALLS PRIOR INPUT.</p>
      </div>
    </div>
  );
}
