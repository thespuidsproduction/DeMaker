import { keyed, pad, pick, seedFrom } from './rng';
import { INDEX_ENTRIES } from './lexicon';

/**
 * CASES
 *
 * VRAXXIS opens a case a day. Which case, and everything in it, is derived
 * from the date — so two people on opposite sides of the world open the
 * same designation on the same day, discuss the same anomaly, and check
 * each other's work, with no server anywhere in the arrangement. The date
 * is the shared state. It is the only shared state that cannot go down.
 *
 * A case is open for five days and is then SEALED. Sealing is permanent:
 * the generator is keyed to a day index that never comes round again, so a
 * case nobody resolved is a case nobody will ever resolve. Discoveries here
 * are genuinely perishable, and that is the point of dating them.
 *
 * Case 000 is the object. It has been open since before the register and
 * will not be closing.
 */

/** Day zero. Designations count from here and do not reset. */
const EPOCH = Date.UTC(2026, 7, 1); // 2026-08-01
const DAY = 86_400_000;
/** How long a case stays open before it is sealed for good. */
export const WINDOW = 5;

export const dayIndex = (at: number = Date.now()) =>
  Math.floor((at - EPOCH) / DAY);

/** Milliseconds until the next case opens. Displayed as a countdown. */
export const untilNextOpening = (at: number = Date.now()) =>
  (dayIndex(at) + 1) * DAY + EPOCH - at;

// ---------------------------------------------------------------------------
// MARKS
// ---------------------------------------------------------------------------

/**
 * Four marks per case, weighted so that a partial resolution reports an
 * awkward number. A case that is three-quarters done should not say 75%;
 * it should say 73%, and the observer should be unable to work out from
 * the figure which quarter is missing.
 */
export type MarkId = 'trace' | 'figure' | 'window' | 'second';

export const MARK_WEIGHT: Record<MarkId, number> = {
  trace: 22,
  figure: 31,
  window: 20,
  second: 27,
};

export const MARK_LABEL: Record<MarkId, string> = {
  trace: 'TRACE MARK',
  figure: 'FIGURE MARK',
  window: 'WINDOW MARK',
  second: 'SECOND MARK',
};

/** An act inside the artefact that a case may be watching for. */
export type WitnessSource = 'register' | 'depth' | 'field' | 'residue' | 'check' | 'console';

const WITNESS_INSTRUCTION: Record<WitnessSource, string> = {
  register: 'THE MARK IS FILED UNDER AN ENTRY',
  depth: 'THE MARK IS AT DEPTH SEVEN',
  field: 'THE MARK IS IN THE FIELD',
  residue: 'THE MARK IS IN A PLACE THAT LOOKS EMPTY',
  check: 'THE MARK IS HELD BY THE CHECK',
  console: 'THE MARK ANSWERS TO A WORD',
};

// ---------------------------------------------------------------------------
// THE FIGURE — one solvable problem per case
// ---------------------------------------------------------------------------

export type FigureKind = 'sequence' | 'coordinates' | 'cipher' | 'register';

export interface Figure {
  kind: FigureKind;
  /** Stated flatly. Never phrased as a riddle and never as an instruction. */
  statement: string;
  /** Rendered by the case panel. Meaning varies by kind. */
  data: number[];
  /** seedFrom(answer). The answer itself is not carried in the bundle. */
  check: number;
  /** Shape of the expected answer, so nobody is guessing the format. */
  form: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Normalised before hashing and before comparison. Case, spaces and
    punctuation are not part of any answer. */
export const normalise = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

const sealAnswer = (answer: string) => seedFrom(normalise(answer));

export const verifyFigure = (figure: Figure, attempt: string) =>
  attempt.trim().length > 0 && sealAnswer(attempt) === figure.check;

/**
 * A 5×7 stroke font, sufficient for the coordinate figures. Each glyph is
 * a list of lit cells; plotted on a grid they read as a letter, and read
 * as nothing at all in the column of numbers the case prints.
 */
const GLYPH: Record<string, number[]> = {
  V: [0, 4, 5, 9, 10, 14, 15, 19, 21, 23, 27],
  X: [0, 4, 6, 8, 12, 16, 18, 20, 24],
  A: [2, 6, 8, 10, 14, 15, 16, 17, 18, 19, 20, 24, 25, 29],
  T: [0, 1, 2, 3, 4, 7, 12, 17, 22, 27],
  I: [0, 1, 2, 3, 4, 7, 12, 17, 22, 25, 26, 27, 28, 29],
  L: [0, 5, 10, 15, 20, 25, 26, 27, 28, 29],
  O: [1, 2, 3, 5, 9, 10, 14, 15, 19, 20, 24, 26, 27, 28],
  N: [0, 4, 5, 6, 9, 10, 12, 14, 15, 18, 19, 20, 24],
  E: [0, 1, 2, 3, 4, 5, 10, 11, 12, 15, 20, 25, 26, 27, 28, 29],
  R: [0, 1, 2, 3, 5, 9, 10, 11, 12, 15, 17, 20, 24],
};

const GLYPH_KEYS = Object.keys(GLYPH);

function buildFigure(n: number): Figure {
  const kind = pick(`case/${n}/figure`, ['sequence', 'coordinates', 'cipher', 'register'] as const);

  if (kind === 'sequence') {
    /* A second-order sequence with one term withheld. The rule is a small
       integer recurrence, so it is discoverable by anybody who writes the
       differences down, and opaque to anybody who does not. */
    const a = 2 + Math.floor(keyed(`case/${n}/seq/a`, 0, 7));
    const b = 3 + Math.floor(keyed(`case/${n}/seq/b`, 0, 11));
    const terms: number[] = [a, b];
    for (let i = 2; i < 8; i++) terms.push(terms[i - 1] + terms[i - 2] + (i % 2 === 0 ? 1 : 0));
    const hole = 5 + Math.floor(keyed(`case/${n}/seq/hole`, 0, 3));
    const answer = String(terms[hole]);
    const data = terms.map((t, i) => (i === hole ? -1 : t));
    return {
      kind,
      statement: 'ONE TERM WAS NOT RECORDED.',
      data,
      check: sealAnswer(answer),
      form: 'A NUMBER',
    };
  }

  if (kind === 'coordinates') {
    const letter = GLYPH_KEYS[Math.floor(keyed(`case/${n}/glyph`, 0, GLYPH_KEYS.length))];
    return {
      kind,
      statement: 'THIRTY-FIVE POSITIONS WERE SURVEYED. THESE WERE OCCUPIED.',
      data: GLYPH[letter],
      check: sealAnswer(letter),
      form: 'ONE CHARACTER',
    };
  }

  if (kind === 'cipher') {
    /* A shift cipher whose shift is printed above it as a coordinate. The
       point is not to be hard. The point is that it is plainly solvable
       and nothing anywhere admits that it is a cipher. */
    const words = ['OBSERVER', 'REMNANT', 'VRAXXIS', 'INTERVAL', 'WITNESS', 'APERTURE', 'SEALED', 'FIGURE'];
    const word = words[Math.floor(keyed(`case/${n}/word`, 0, words.length))];
    const shift = 1 + Math.floor(keyed(`case/${n}/shift`, 0, 24));
    const data = [...word].map((ch) => (ALPHABET.indexOf(ch) + shift) % 26);
    return {
      kind,
      statement: `TRANSCRIPT RECOVERED AT OFFSET ${pad(shift, 2)}.`,
      data,
      check: sealAnswer(word),
      form: 'ONE WORD',
    };
  }

  /* A question the register can answer, if anybody reads the register. */
  const entry = INDEX_ENTRIES[Math.floor(keyed(`case/${n}/entry`, 0, INDEX_ENTRIES.length))];
  const fragment = entry.fragments[Math.floor(keyed(`case/${n}/frag`, 0, entry.fragments.length))];
  return {
    kind: 'register',
    statement: `ONE ENTRY IN THE REGISTER GIVES ${fragment[0].toUpperCase()} AS ${fragment[1].toUpperCase()}. ITS NUMBER.`,
    data: [],
    check: sealAnswer(entry.id),
    form: 'FOUR DIGITS',
  };
}

// ---------------------------------------------------------------------------
// CORROBORATION — the mark one observer cannot take alone
// ---------------------------------------------------------------------------

const SIG_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // no I, L, O, U

const enc = (value: number, width: number) => {
  let out = '';
  let v = Math.abs(Math.trunc(value));
  for (let i = 0; i < width; i++) { out = SIG_ALPHABET[v % 32] + out; v = Math.floor(v / 32); }
  return out;
};

/**
 * A signature is issued only to an observer already holding the trace and
 * figure marks. It carries the case it belongs to and a checksum, and
 * nothing else — no name, no address, nothing that identifies anybody.
 *
 * The fourth mark is granted for entering a signature that is valid for
 * the case and is not your own. So it cannot be taken alone: somebody else
 * has to have done the work, and then to have handed you the result.
 * VRAXXIS has no way of putting the two of you in touch. That is left,
 * deliberately, to the world outside it.
 */
export function signatureFor(n: number, observerId: string): string {
  const body = enc(seedFrom(`${observerId}::${n}`) % 1_048_576, 4);
  const head = enc(n, 3);
  const sum = seedFrom(`${head}${body}`) % 32;
  return `${head}-${body}-${SIG_ALPHABET[sum]}`;
}

export type CorroborationResult = 'accepted' | 'malformed' | 'wrong-case' | 'own';

export function verifySignature(n: number, observerId: string, input: string): CorroborationResult {
  const clean = input.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (clean.length !== 8) return 'malformed';
  const head = clean.slice(0, 3);
  const body = clean.slice(3, 7);
  const sum = clean[7];
  if (SIG_ALPHABET[seedFrom(`${head}${body}`) % 32] !== sum) return 'malformed';
  if (head !== enc(n, 3)) return 'wrong-case';
  if (`${head}-${body}-${sum}` === signatureFor(n, observerId)) return 'own';
  return 'accepted';
}

// ---------------------------------------------------------------------------
// THE CASE
// ---------------------------------------------------------------------------

export type CaseState = 'open' | 'sealed' | 'unopened';

export interface Case {
  n: number;
  designation: string;
  opened: number;
  /** Days it has been open. 0 is the day it opened. */
  age: number;
  state: CaseState;
  classification: string;
  /** Withheld line printed under the designation. Explains nothing. */
  note: string;
  witness: { source: WitnessSource; detail?: string; instruction: string };
  figure: Figure;
}

const CLASSES = [
  'UNCLASSIFIED', 'RECURRENT', 'NON-RECURRENT', 'SPATIAL', 'CLERICAL',
  'INSTRUMENT FAULT', 'NOT A FAULT', 'ATTRIBUTED IN ERROR', 'UNATTRIBUTED',
] as const;

const NOTES = [
  'REPORTED BY NOBODY',
  'THE REPORT PRECEDES THE EVENT',
  'NO INSTRUMENT WAS PRESENT',
  'WITNESSED, NOT OBSERVED',
  'FILED BEFORE IT OCCURRED',
  'THE FILE IS OLDER THAN THE CASE',
  'CONSISTENT WITH NOTHING',
  'DECLINED BY THE REGISTER',
  'TWO ACCOUNTS. ONE OBSERVER.',
  'NO ONE HAS ASKED ABOUT THIS',
] as const;

export function buildCase(n: number, today: number = dayIndex()): Case {
  const age = today - n;
  const source = pick(`case/${n}/source`, ['register', 'depth', 'field', 'residue', 'check', 'console'] as const);
  const detail = source === 'register'
    ? INDEX_ENTRIES[Math.floor(keyed(`case/${n}/witness-entry`, 0, INDEX_ENTRIES.length))].id
    : source === 'console'
      ? pick(`case/${n}/witness-word`, ['trace', 'observe', 'depth', 'null', 'vraxx', 'where'] as const)
      : undefined;

  return {
    n,
    designation: `VX-${pad(n, 3)}`,
    opened: n,
    age,
    state: age < 0 ? 'unopened' : age >= WINDOW ? 'sealed' : 'open',
    classification: pick(`case/${n}/class`, CLASSES),
    note: pick(`case/${n}/note`, NOTES),
    witness: {
      source,
      detail,
      instruction: source === 'register'
        ? `THE MARK IS FILED UNDER ENTRY ${detail}`
        : source === 'console'
          ? `THE MARK ANSWERS TO ONE WORD, ENTERED AT THE REMNANT`
          : WITNESS_INSTRUCTION[source],
    },
    figure: buildFigure(n),
  };
}

/** The board: every case currently inside its window, newest first. */
export function openCases(today: number = dayIndex()): Case[] {
  const out: Case[] = [];
  for (let n = today; n > today - WINDOW; n--) if (n >= 0) out.push(buildCase(n, today));
  return out;
}

/** The most recently sealed case, shown as a headstone under the board. */
export function lastSealed(today: number = dayIndex()): Case | null {
  const n = today - WINDOW;
  return n >= 0 ? buildCase(n, today) : null;
}

export const resolutionOf = (held: readonly MarkId[]) =>
  held.reduce((sum, m) => sum + MARK_WEIGHT[m], 0);
