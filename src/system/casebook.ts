import type { MarkId, WitnessSource } from './cases';

/**
 * THE CASEBOOK
 *
 * What one observer holds. It lives in this browser and goes no further:
 * there is no account, no identifier that means anything anywhere else,
 * and nothing is transmitted. Clear the storage and the casebook is gone,
 * which is consistent with everything else here.
 *
 * The observer id is a random value with no relationship to the person
 * holding it. Its only job is to make a signature differ from somebody
 * else's signature, so that corroboration means two observers rather than
 * one observer twice.
 */

const KEY = 'vx.casebook.v1';

export interface Submission {
  id: string;
  at: number;
  designation: string;
  where: string;
  account: string;
}

interface Book {
  observer: string;
  /** caseNumber -> marks held */
  marks: Record<string, MarkId[]>;
  /** Acts performed inside the artefact, and when. */
  witnessed: Record<string, number>;
  submissions: Submission[];
  /** Cases the observer has looked at, so returning can be noticed. */
  seen: number[];
}

const emptyBook = (): Book => ({
  observer: newObserverId(),
  marks: {},
  witnessed: {},
  submissions: [],
  seen: [],
});

function newObserverId(): string {
  try {
    const buf = new Uint32Array(2);
    crypto.getRandomValues(buf);
    return `${buf[0].toString(36)}${buf[1].toString(36)}`;
  } catch {
    return `x${Math.floor(Math.random() * 1e12).toString(36)}`;
  }
}

let book: Book | null = null;
/** Used when storage is refused: the casebook still works, for this tab. */
let volatile = false;

function load(): Book {
  if (book) return book;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Book>;
      book = {
        observer: typeof parsed.observer === 'string' ? parsed.observer : newObserverId(),
        marks: parsed.marks ?? {},
        witnessed: parsed.witnessed ?? {},
        submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
        seen: Array.isArray(parsed.seen) ? parsed.seen : [],
      };
    } else {
      book = emptyBook();
    }
  } catch {
    // Storage refused, or the record is unreadable. The observer starts
    // again, and the interface does not mention it.
    book = emptyBook();
    volatile = true;
  }
  return book;
}

function save() {
  if (volatile || !book) return;
  try { localStorage.setItem(KEY, JSON.stringify(book)); }
  catch { volatile = true; }
}

// --- notification ----------------------------------------------------------

const listeners = new Set<() => void>();
export function subscribeCasebook(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
/** Bumped on every change; components use it as a `useSyncExternalStore` snapshot. */
let revision = 0;
export const casebookRevision = () => revision;
function changed() { revision += 1; listeners.forEach((fn) => fn()); }

// --- reads -----------------------------------------------------------------

export const observerId = () => load().observer;
export const isVolatile = () => { load(); return volatile; };
export const marksFor = (n: number): MarkId[] => load().marks[String(n)] ?? [];
export const holds = (n: number, mark: MarkId) => marksFor(n).includes(mark);
export const submissions = () => load().submissions;
export const witnessedAt = (source: WitnessSource, detail?: string): number | undefined =>
  load().witnessed[witnessKey(source, detail)];

const witnessKey = (source: WitnessSource, detail?: string) =>
  detail ? `${source}:${detail}` : source;

// --- writes ----------------------------------------------------------------

export function grant(n: number, mark: MarkId): boolean {
  const b = load();
  const key = String(n);
  const held = b.marks[key] ?? [];
  if (held.includes(mark)) return false;
  b.marks[key] = [...held, mark];
  save();
  changed();
  return true;
}

/**
 * Records an act performed inside the artefact. Cases watching for that
 * act take their trace mark from it — including cases opened later, which
 * is why the record is kept rather than merely broadcast. Somebody who
 * swept the field last week does not have to sweep it again.
 */
export function witness(source: WitnessSource, detail?: string) {
  const b = load();
  const key = witnessKey(source, detail);
  if (b.witnessed[key]) return;
  b.witnessed[key] = Date.now();
  save();
  changed();
}

export function noteSeen(n: number): boolean {
  const b = load();
  if (b.seen.includes(n)) return true;
  b.seen.push(n);
  if (b.seen.length > 400) b.seen = b.seen.slice(-400);
  save();
  changed();
  return false;
}

export function fileSubmission(entry: Omit<Submission, 'id' | 'at'>): Submission {
  const b = load();
  const record: Submission = { ...entry, id: newObserverId().slice(0, 8).toUpperCase(), at: Date.now() };
  b.submissions = [record, ...b.submissions].slice(0, 60);
  save();
  changed();
  return record;
}

/** The observer's own record, in full, as text they can take away. */
export function exportCasebook(): string {
  const b = load();
  return JSON.stringify(
    {
      observer: b.observer,
      marks: b.marks,
      witnessed: Object.keys(b.witnessed),
      submissions: b.submissions,
    },
    null,
    2
  );
}

export function burnCasebook() {
  book = emptyBook();
  try { localStorage.removeItem(KEY); } catch { /* nothing to remove */ }
  changed();
}
