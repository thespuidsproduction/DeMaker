/**
 * The creator relationship desk.
 *
 * The record says what PALMA decided about a creator. This says how PALMA is
 * getting on with them: who at the desk is looking after the relationship,
 * where it has got to, when somebody last spoke to them, and what has been
 * promised next. It is staff-only working material, like an internal note,
 * and it never reaches the public record, the creator or a judge.
 *
 * Two lines it deliberately does not cross:
 *
 *  1. **It holds no contact details.** An unclaimed record may not hold an
 *     email, a phone number or an address (see `record-minimalism.ts`), and a
 *     CRM is exactly where those would quietly pile up. A relationship records
 *     the *route* PALMA uses to reach somebody, never the address itself: the
 *     account email for a claimed record, or the links the creator published.
 *  2. **It holds nothing about judging.** No nomination count, no score, no
 *     candidacy status. Popularity brings a creator to PALMA's attention and
 *     stops there; a relationship desk that showed the count would be a
 *     second route to it.
 *
 * Pure: no I/O, so the rules can be read and tested without a database.
 */

export const CRM_STAGES = [
  'prospect',
  'contacted',
  'in_conversation',
  'onboarding',
  'active',
  'dormant',
  'do_not_contact',
] as const;

export type CrmStage = (typeof CRM_STAGES)[number];

export const CRM_STAGE_LABEL: Record<CrmStage, string> = {
  prospect: 'Prospect',
  contacted: 'Contacted',
  in_conversation: 'In conversation',
  onboarding: 'Onboarding',
  active: 'Active',
  dormant: 'Dormant',
  do_not_contact: 'Do not contact',
};

export const CRM_STAGE_DETAIL: Record<CrmStage, string> = {
  prospect: 'On the record, not yet approached.',
  contacted: 'Approached; no reply yet.',
  in_conversation: 'Talking to the desk.',
  onboarding: 'Claiming the record or verifying.',
  active: 'Holds the record and is in regular touch.',
  dormant: 'Gone quiet. Worth a check-in.',
  do_not_contact: 'Asked not to be contacted, or objected. Nothing outbound.',
};

export const CRM_PRIORITIES = ['low', 'normal', 'high'] as const;
export type CrmPriority = (typeof CRM_PRIORITIES)[number];

export const CRM_PRIORITY_LABEL: Record<CrmPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

/** How PALMA reaches the creator. A route, never an address. */
export const CRM_CONTACT_ROUTES = [
  'account_email',
  'platform_message',
  'representative',
  'in_person',
  'other',
] as const;

export type CrmContactRoute = (typeof CRM_CONTACT_ROUTES)[number];

export const CRM_CONTACT_ROUTE_LABEL: Record<CrmContactRoute, string> = {
  account_email: 'Account email',
  platform_message: 'Message on their platform',
  representative: 'Through a representative',
  in_person: 'In person',
  other: 'Other',
};

export const CRM_TOUCHPOINT_KINDS = [
  'email',
  'message',
  'call',
  'meeting',
  'event',
  'note',
] as const;

export type CrmTouchpointKind = (typeof CRM_TOUCHPOINT_KINDS)[number];

export const CRM_TOUCHPOINT_KIND_LABEL: Record<CrmTouchpointKind, string> = {
  email: 'Email',
  message: 'Platform message',
  call: 'Call',
  meeting: 'Meeting',
  event: 'At an event',
  note: 'Desk note',
};

export const CRM_DIRECTIONS = ['outbound', 'inbound', 'internal'] as const;
export type CrmDirection = (typeof CRM_DIRECTIONS)[number];

export const CRM_DIRECTION_LABEL: Record<CrmDirection, string> = {
  outbound: 'PALMA to creator',
  inbound: 'Creator to PALMA',
  internal: 'Internal',
};

export function isCrmStage(value: unknown): value is CrmStage {
  return typeof value === 'string' && (CRM_STAGES as readonly string[]).includes(value);
}

export function isCrmPriority(value: unknown): value is CrmPriority {
  return typeof value === 'string' && (CRM_PRIORITIES as readonly string[]).includes(value);
}

/**
 * Whether the desk may reach out at all.
 *
 * `do_not_contact` is a hard stop, not a preference: it is where an objection
 * or a request to be left alone lands, and nothing outbound is logged or
 * scheduled against it. Inbound contact is still recorded, because a creator
 * who writes to PALMA deserves an answer.
 */
export function mayContact(stage: CrmStage): boolean {
  return stage !== 'do_not_contact';
}

/** Whether a touchpoint of this direction may be logged against this stage. */
export function mayLogTouchpoint(stage: CrmStage, direction: CrmDirection): boolean {
  return mayContact(stage) || direction !== 'outbound';
}

/**
 * Where a relationship goes after a touchpoint, if nobody says otherwise.
 *
 * Only the obvious moves are automatic: a first outbound message makes a
 * prospect contacted; a reply puts the conversation in motion; a dormant
 * creator who writes in is awake again. Everything else is a person's call.
 */
export function stageAfterTouchpoint(stage: CrmStage, direction: CrmDirection): CrmStage {
  if (direction === 'internal') return stage;
  if (stage === 'prospect' && direction === 'outbound') return 'contacted';
  if ((stage === 'prospect' || stage === 'contacted') && direction === 'inbound') {
    return 'in_conversation';
  }
  if (stage === 'dormant' && direction === 'inbound') return 'in_conversation';
  return stage;
}

export type FollowUpState = 'none' | 'overdue' | 'today' | 'this_week' | 'later';

const DAY = 24 * 60 * 60 * 1000;

function utcDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

/** Where a follow-up date sits relative to today, by UTC calendar day. */
export function followUpState(
  due: Date | string | null | undefined,
  now: Date = new Date(),
): FollowUpState {
  if (!due) return 'none';
  const date = typeof due === 'string' ? new Date(due) : due;
  if (Number.isNaN(date.getTime())) return 'none';

  const days = Math.round((utcDay(date) - utcDay(now)) / DAY);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 7) return 'this_week';
  return 'later';
}

export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 32;

/**
 * Tags as the desk types them, cleaned: lower case, hyphenated, deduplicated,
 * capped. Anything that looks like an email address or a phone number is
 * dropped: a tag is a label for the desk, not a place to park contact details.
 */
export function normaliseTags(input: string | readonly string[] | null | undefined): string[] {
  const raw = typeof input === 'string' ? input.split(',') : (input ?? []);
  const seen = new Set<string>();

  for (const entry of raw) {
    const tag = entry
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, MAX_TAG_LENGTH);

    if (!tag) continue;
    if (looksLikeContactDetail(entry)) continue;
    seen.add(tag);
    if (seen.size >= MAX_TAGS) break;
  }

  return [...seen];
}

/**
 * A cheap guard against contact details typed into free text.
 *
 * Not a privacy system, and not meant to be: the rule is that nobody types an
 * address into the relationship desk, and this is the check that catches the
 * accident. An email address, or seven or more digits in a row once spaces,
 * dashes, dots and brackets are ignored, counts.
 */
export function looksLikeContactDetail(text: string): boolean {
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) return true;
  const digits = text.replace(/[\s\-().+]/g, '');
  return /\d{7,}/.test(digits);
}

export type PipelineRow = { stage: CrmStage };

/** Count per stage, every stage present, in pipeline order. */
export function pipelineCounts(rows: readonly PipelineRow[]): Record<CrmStage, number> {
  const counts = Object.fromEntries(CRM_STAGES.map((stage) => [stage, 0])) as Record<
    CrmStage,
    number
  >;
  for (const row of rows) counts[row.stage] += 1;
  return counts;
}
