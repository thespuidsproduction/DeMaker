/**
 * THE RELAY
 *
 * VRAXXIS runs with no server, and everything it currently claims is true
 * without one. There are, however, three things it cannot know alone:
 *
 *   how many observers are on a case
 *   whether a submitted anomaly reached anybody
 *   whether a corroboration was genuine or invented
 *
 * Rather than print plausible numbers for those and hope nobody checks,
 * the interface asks the relay, gets nothing, and says so. UNCOUNTED is
 * accurate. "4 OBSERVERS" would not be, and inventing a crowd to make a
 * page feel busy is the one dishonesty this build will not commit.
 *
 * Attaching a relay is the only thing that changes those readings. Nothing
 * else in VRAXXIS depends on one, and nothing here opens a connection: the
 * default implementation returns null and holds submissions locally. The
 * artefact still works with the cable out, which was always the rule.
 */

import type { Submission } from './casebook';

export interface Relay {
  /** Observers on a case, or null where it cannot be established. */
  observers(caseNumber: number): Promise<number | null>;
  /** Corroborations recorded against a case, or null. */
  corroborations(caseNumber: number): Promise<number | null>;
  /** Hand a filed anomaly onward. Returns whether it was accepted. */
  transmit(submission: Submission): Promise<boolean>;
}

/** What is installed. It answers honestly and reaches nothing. */
export const LOCAL_RELAY: Relay = {
  async observers() { return null; },
  async corroborations() { return null; },
  async transmit() { return false; },
};

let relay: Relay = LOCAL_RELAY;

/**
 * Install a relay to light up the fields the artefact currently declines
 * to fill in. Call it once, before render. Nothing else needs changing:
 * every reading that says UNCOUNTED becomes a number the moment a relay
 * returns one, and a submission that says HELD says TRANSMITTED.
 */
export const attachRelay = (r: Relay) => { relay = r; };
export const currentRelay = () => relay;
export const relayAttached = () => relay !== LOCAL_RELAY;
