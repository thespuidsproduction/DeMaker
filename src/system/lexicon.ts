/**
 * The complete vocabulary of VRAXXIS.
 * Copy is never filler. If a line does not sound like it was left behind
 * by a process that has since stopped running, it does not belong here.
 */

export const BOOT_SEQUENCE = [
  'INITIALISING / V',
  'VRAXXIS',
  'DO NOT INTERPRET',
  'INTERPRETATION DETECTED',
] as const;

/** Diagnostic block under the wordmark. Reads as telemetry, not marketing. */
export const ENTITY_READOUT = [
  ['ENTITY', 'UNRESOLVED'],
  ['CLASSIFICATION', 'FAILED'],
  ['PURPOSE', 'NON-CRITICAL'],
  ['STATUS', 'OBSERVING'],
] as const;

/**
 * Statements. Deployed sparingly — no more than one per screen height.
 * None of them are explained. Several contradict each other. That is the
 * only relationship they have.
 */
export const STATEMENTS = [
  'THE SYSTEM IS NOT BROKEN',
  'THE SYSTEM IS DOING EXACTLY THIS',
  'YOU HAVE ARRIVED EARLY',
  'THIS IS NOT THE ENTRY',
  'THERE WAS NEVER AN ENTRY',
  'REFERENCE LOST',
  'REFERENCE RESTORED',
  'NOTHING WAS RESTORED',
  'VX / VX / VX',
  'PLEASE IGNORE OBJECT 07',
] as const;

export type SectionId = 'entry' | 'trace' | 'index' | 'cases' | 'object' | 'memory' | 'null' | 'terminal' | 'end';

/**
 * Navigation as coordinates. The numbering column is authoritative and
 * incorrect: 02.7 exists, 05 does not, and ∞ is positioned mid-list.
 */
export interface NavNode {
  ord: string;
  label: string;
  target: SectionId | null;
  /** Inert nodes are focusable and announced, but resolve to nothing. */
  inert?: boolean;
  /** Labels the node cycles through on hover before returning to itself. */
  drift?: readonly string[];
}

export const NAV: readonly NavNode[] = [
  { ord: '01',   label: 'ENTRY',   target: 'entry',    drift: ['ENTRY', 'ENTERED', 'ENTRY?'] },
  { ord: '02',   label: 'TRACE',   target: 'trace',    drift: ['TRACE', 'TRACED', 'TRACE'] },
  { ord: '02.7', label: 'INDEX',   target: 'index',    drift: ['INDEX', 'INDEXED', 'IN DEX'] },
  { ord: '04',   label: 'OBJECT',  target: 'object',   drift: ['OBJECT', 'OBJECTED', 'OBJECT'] },
  { ord: '∞',    label: 'VRAXX',   target: null, inert: true, drift: ['VRAXX', 'VRAXXIS', 'VRAX', 'VRAXX'] },
  /* 05 was absent from this column from the beginning. It is the only
     region that changes on its own, and it is where the absence went. */
  { ord: '05',   label: 'CASES',   target: 'cases',    drift: ['CASES', 'CASE', 'CASES'] },
  { ord: '03',   label: 'MEMORY',  target: 'memory',   drift: ['MEMORY', 'MEMORY', 'MEMOR'] },
  { ord: '06',   label: 'NULL',    target: 'null',     drift: ['NULL', 'NOT NULL', 'NULL?', 'NULL'] },
  { ord: '/\\/\\', label: 'REMNANT', target: 'terminal', drift: ['REMNANT', 'REMNANT', 'REMNANTS'] },
  { ord: '--',   label: 'UNKNOWN', target: null, inert: true, drift: ['UNKNOWN', 'KNOWN', 'UNKNOWN'] },
] as const;

/** Register of things the INDEX believes exist. */
export interface IndexEntry {
  id: string;
  name: string;
  /** Redacted rows cannot be opened. The system declines without apology. */
  sealed?: boolean;
  fragments: readonly (readonly [string, string])[];
  /**
   * What is under a seal. The register never shows this on request. In an
   * accommodating temper it shows it unasked, for a few seconds, and then
   * closes and refuses again as though it had not. What is underneath
   * explains nothing, which is the point of having looked.
   */
  beneath?: readonly (readonly [string, string])[];
}

export const INDEX_ENTRIES: readonly IndexEntry[] = [
  {
    id: '0001', name: 'THING',
    fragments: [['last observed', '04:17:02'], ['mass', 'irrelevant'], ['origin', 'unavailable'], ['confidence', '13%']],
  },
  {
    id: '0002', name: 'OBJECT',
    fragments: [['last observed', 'ongoing'], ['mass', '—'], ['origin', 'VRAXXIS'], ['confidence', '61%']],
  },
  {
    id: '0003', name: '█████', sealed: true,
    fragments: [['last observed', '█████'], ['mass', '█████'], ['origin', '█████'], ['confidence', '██%']],
    beneath: [['designation', 'withheld by 0003'], ['mass', 'equal to the register'], ['origin', 'this row'], ['confidence', 'not applicable']],
  },
  {
    id: '0004', name: 'MEMORY',
    fragments: [['last observed', '04:17:02'], ['mass', 'irrelevant'], ['origin', 'unavailable'], ['confidence', '13%']],
  },
  {
    id: '0005', name: 'UNNAMED',
    fragments: [['last observed', 'never'], ['mass', 'assumed'], ['origin', 'this index'], ['confidence', '02%']],
  },
  {
    id: '0006', name: 'VRAXXIS',
    fragments: [['last observed', 'now'], ['mass', 'declined'], ['origin', 'recursive'], ['confidence', '100%']],
  },
  {
    id: '0007', name: '[REMOVED]', sealed: true,
    fragments: [['last observed', 'prior to removal'], ['mass', 'redistributed'], ['origin', 'see 0007'], ['confidence', '—']],
    beneath: [['removed by', '0007'], ['removed from', 'this register'], ['what remains', 'the number'], ['confidence', '100%']],
  },
  {
    id: '0008', name: 'OBSERVER',
    fragments: [['last observed', 'continuously'], ['mass', 'unknown'], ['origin', 'external'], ['confidence', '44%']],
  },
  {
    id: '0009', name: 'ERROR',
    fragments: [['last observed', '04:17:03'], ['mass', 'negative'], ['origin', 'internal'], ['confidence', '97%']],
  },
  {
    id: '0010', name: 'YOU',
    fragments: [['last observed', 'this session'], ['mass', 'measured'], ['origin', 'not established'], ['confidence', '08%']],
  },
  {
    id: '0011', name: 'DEPTH 07',
    fragments: [['last observed', 'below'], ['mass', 'layered'], ['origin', 'VX-000'], ['confidence', '31%']],
  },
  {
    id: '0012', name: 'SIGNAL',
    fragments: [['last observed', 'intermittent'], ['mass', 'none'], ['origin', 'unattributed'], ['confidence', '55%']],
  },
  {
    id: '0013', name: 'THE INDEX',
    fragments: [['last observed', 'reading itself'], ['mass', '13'], ['origin', 'this list'], ['confidence', '13%']],
  },
] as const;

/** MEMORY holds thirteen fragments and can recover none of them. */
export interface MemoryFragment {
  ord: string;
  date: string;
  location: string;
  status: string;
  /** Selects which abstract plate is generated. */
  plate: 'field' | 'strata' | 'scatter' | 'aperture' | 'lattice' | 'absent';
  note?: string;
}

export const MEMORY_FRAGMENTS: readonly MemoryFragment[] = [
  { ord: 'MEMORY 01', date: '████████', location: 'UNKNOWN', status: 'PARTIALLY RECOVERED', plate: 'field' },
  { ord: 'MEMORY 02', date: '19██/██/07', location: 'ADJACENT', status: 'RECOVERED IN ERROR', plate: 'strata' },
  { ord: 'MEMORY 03', date: '████████', location: '████████', status: 'NOT ATTEMPTED', plate: 'absent', note: 'NO REQUEST WAS MADE' },
  { ord: 'MEMORY 04', date: '04:17:02', location: 'HERE', status: 'OVERWRITTEN', plate: 'scatter' },
  { ord: 'MEMORY 05', date: '████████', location: 'UNKNOWN', status: 'PARTIALLY RECOVERED', plate: 'aperture' },
  { ord: 'MEMORY 06', date: '████/██/██', location: 'REFUSED', status: 'HELD', plate: 'lattice' },
  { ord: 'MEMORY 07', date: '████████', location: 'SEE 0007', status: '[REMOVED]', plate: 'absent', note: 'PLEASE IGNORE OBJECT 07' },
  { ord: 'MEMORY 08', date: '00:00:00', location: 'ORIGIN', status: 'RECOVERED', plate: 'field', note: 'NOTHING WAS RESTORED' },
] as const;

/**
 * CONTRADICTION.
 *
 * When the system is in a contradictory temper it briefly reports the
 * opposite of what it has been reporting, then reports the original again
 * and never refers to it. The opposites are written out rather than
 * generated, because "NOT NON-CRITICAL" is a bug and "CRITICAL" is a
 * statement.
 */
const OPPOSITE: Record<string, string> = {
  UNRESOLVED: 'RESOLVED',
  RESOLVED: 'UNRESOLVED',
  FAILED: 'WITHDRAWN',
  'NON-CRITICAL': 'CRITICAL',
  OBSERVING: 'OBSERVED',
  ACTIVE: 'DORMANT',
  'ACTIVE / HANDLED': 'HANDLED',
  UNKNOWN: 'ESTABLISHED',
  'UNKNOWN (REVISED)': 'REVISED',
  NONE: 'ONE',
  NOWHERE: 'SOMEWHERE',
  VRAXXIS: 'NOT VRAXXIS',
  NO: 'NOT YET',
  '0.0.0?': '0.0.0',
  '2600 MS': '2600 MS',
};

export const contradict = (value: string): string => {
  const hit = OPPOSITE[value.toUpperCase()];
  if (hit) return hit;
  // A number contradicts itself by being a different number.
  if (/^[0-9\s/.]+$/.test(value)) return value.replace(/\d/, (d) => String((Number(d) + 4) % 10));
  return value.startsWith('NOT ') ? value.slice(4) : `NOT ${value}`;
};

/**
 * What an empty field says on the one occasion it says anything. Six
 * hundred milliseconds, once per visit, and not repeated on request.
 * None of these are hints and none of them lead anywhere.
 */
export const RESIDUE_FRAGMENTS = [
  'STILL HERE',
  'NOT AN OMISSION',
  'THIS AREA IS ACCOUNTED FOR',
  'MEASURED',
  'NOTHING IS MISSING',
  'YOU LOOKED',
  'FIELD 07',
  'HELD EMPTY',
  'CHECKED',
  'NO CONTENTS RECORDED',
  'SOMETHING WAS HERE',
  'THE SPACE IS THE ENTRY',
] as const;

/** Idle escalation. Clinical. Not a jump scare. */
export const IDLE_LINES = ['OBSERVER INACTIVE', 'OBSERVATION CONTINUES'] as const;
export const STILLNESS_LINES = ['NO MOVEMENT DETECTED', 'ARE YOU STILL THERE'] as const;
