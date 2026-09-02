import { keyed, pick, rng, seedFrom } from './rng';

/**
 * THE SESSION.
 *
 * VRAXXIS is not the same on two visits, and it is not different at random.
 *
 * One value is drawn when the page loads. Everything that is permitted to
 * vary between visits is derived from it: which coordinates appear in which
 * empty field, where the objects in NULL are standing, which record the
 * register has misfiled, what temperament the system is in today, and the
 * rhythm at which it will act. Within a single visit all of it is fixed and
 * reproducible; across visits none of it is.
 *
 * The architecture never varies. The regions, their order, their contents
 * and their behaviour are the same every time. Only the anomalies move.
 * That is the difference between a system with a mood and a page with a
 * random number generator in it.
 */

function draw(): string {
  try {
    const buf = new Uint32Array(2);
    crypto.getRandomValues(buf);
    return `${buf[0].toString(36)}${buf[1].toString(36)}`;
  } catch {
    // No entropy source. The visit proceeds under a fixed identity, which
    // is itself a kind of anomaly.
    return 'vx-0000';
  }
}

/** Drawn once, at load. Never written anywhere and never transmitted. */
export const SESSION = draw();

/** The session's own generator, for one-off draws made during setup. */
export const sessionRng = rng(seedFrom(SESSION));

/** Deterministic within this visit, unpredictable across visits. */
export const skeyed = (key: string, min = 0, max = 1) => keyed(`${SESSION}/${key}`, min, max);

export const spick = <T,>(key: string, list: readonly T[]): T => pick(`${SESSION}/${key}`, list);

/** A coin the session has already flipped. Used to decide whether a given
    empty field contains anything at all — some genuinely do not. */
export const soccurs = (key: string, probability: number) => skeyed(`occurs/${key}`) < probability;

/**
 * A short identifier the interface can print at itself. It looks like a
 * build number, a case reference or a specimen tag depending on where it
 * appears, and it is none of those.
 */
export const SESSION_TAG = SESSION.slice(0, 6).toUpperCase().padEnd(6, 'X');
