import { INDEX_ENTRIES, STATEMENTS } from '../../system/lexicon';
import { pick } from '../../system/rng';

/**
 * The terminal is fictional and does nothing. It reads no files, runs no
 * code, reaches no network and holds no state that outlives the tab. Its
 * only capability is answering, and it answers badly on purpose.
 */

export interface Session {
  observers: number;
  uptime: number;
  discoveries: ReadonlySet<string>;
  audioOn: boolean;
  toggleAudio: () => void;
  clear: () => void;
  goto: (id: string) => void;
}

export interface Reply {
  lines: string[];
  tone?: 'plain' | 'ox';
}

const COMMANDS: Record<string, (arg: string, s: Session) => Reply> = {
  help: () => ({
    lines: [
      'RECOGNISED: HELP INDEX LIST TRACE OBSERVE WHO WHERE WHEN',
      'NULL VRAXX OBJECT MEMORY DEPTH STATUS AUDIO CLEAR EXIT',
      'HELP IS NOT ASSISTANCE. IT IS A LIST.',
    ],
  }),

  index: () => ({ lines: [`INDEX CONTAINS ${INDEX_ENTRIES.length} OBJECTS`] }),

  list: () => ({
    lines: [
      `${INDEX_ENTRIES.length} OBJECTS FOUND`,
      ...INDEX_ENTRIES.slice(0, 5).map((e) => `  ${e.id}  ${e.name}`),
      '  ...',
      '  LISTING TRUNCATED BY THE LISTING',
    ],
  }),

  trace: () => ({
    lines: ['TRACE ACTIVE', 'MOVEMENT IS BEING RETAINED FOR 2600 MS', 'NOTHING IS BEING KEPT'],
  }),

  observe: (_a, s) => ({
    lines: [
      `OBSERVERS: ${s.observers}`,
      s.observers > 1 ? 'THE SECOND WAS NOT INVITED' : 'OBSERVATION IS ONE-DIRECTIONAL',
    ],
    tone: s.observers > 1 ? 'ox' : 'plain',
  }),

  who: () => ({ lines: ['OBSERVER'] }),
  where: () => ({ lines: ['NOT HERE'] }),
  when: (_a, s) => ({ lines: [`SESSION AGE ${s.uptime}S`, 'THE FIGURE ABOVE IS THE ONLY TIME AVAILABLE'] }),

  null: (_a, s) => { s.goto('null'); return { lines: ['NULL'] }; },

  vraxx: (_a, s) => ({
    lines: s.discoveries.has('internal')
      ? ['VX / INTERNAL', 'ALREADY OPEN', 'IT WAS NOT A REWARD']
      : ['VRAXX', 'VRAXX', 'VRAXX'],
  }),

  object: (_a, s) => { s.goto('object'); return { lines: ['OBJECT / VX-000', 'STATE: ACTIVE', 'OWNER: NONE'] }; },
  memory: (_a, s) => { s.goto('memory'); return { lines: ['8 FRAGMENTS HELD', '0 RECOVERED', 'THE ARCHIVE IS COMPLETE'] }; },

  depth: () => ({ lines: ['DEPTH 07', 'THERE IS NO DEPTH 08', 'DEPTH 08 IS NOT MISSING'] }),

  status: (_a, s) => ({
    lines: [
      'SYSTEM STATUS: UNRESOLVED',
      `UPTIME: ${s.uptime}S`,
      `AUDIO: ${s.audioOn ? 'ON' : 'OFF'}`,
      `DISCOVERIES: ${s.discoveries.size}`,
      'NO FAULT IS BEING REPORTED',
    ],
  }),

  audio: (_a, s) => { s.toggleAudio(); return { lines: [`AUDIO: ${s.audioOn ? 'OFF' : 'ON'}`] }; },

  clear: (_a, s) => { s.clear(); return { lines: [] }; },

  exit: () => ({ lines: ['EXIT ACKNOWLEDGED', 'NOTHING CLOSED'] }),

  why: () => ({ lines: ['NO QUERY MATCH'] }),

  vx: (_a, s) => ({
    lines: s.discoveries.has('internal') ? ['VX / INTERNAL'] : ['VX'],
  }),
};

/** Aliases the system chose not to document. */
const ALIAS: Record<string, string> = {
  '?': 'help', ls: 'list', dir: 'list', man: 'help',
  reset: 'clear', cls: 'clear', quit: 'exit', me: 'who',
};

let nonsenseCount = 0;

export function run(input: string, session: Session): Reply {
  const raw = input.trim();
  if (!raw) return { lines: ['INPUT WAS NOT REQUIRED'] };

  const [head, ...rest] = raw.toLowerCase().split(/\s+/);
  const name = ALIAS[head] ?? head;
  const fn = COMMANDS[name];
  if (fn) return fn(rest.join(' '), session);

  // Nothing is an error here. Input is received and filed.
  nonsenseCount += 1;
  if (nonsenseCount % 4 === 0) return { lines: ['INPUT WAS NOT REQUIRED'] };
  if (nonsenseCount % 7 === 0) return { lines: [pick(raw, STATEMENTS)], tone: 'ox' };
  return { lines: ['INPUT ACCEPTED'] };
}
