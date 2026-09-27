/**
 * Season reminders.
 *
 * Before a season opens, PALMA writes to the creators who hold a record, on
 * whatever days the desk has scheduled. The schedule is the desk's to
 * change, because dates move and so does what is worth a reminder, so it is
 * data rather than code: a list of "N days before <milestone>".
 *
 * Pure: no I/O. The service reads the seasons and the schedule, asks this file
 * what is due, and sends it.
 */

export const REMINDER_MILESTONES = [
  'nominationsOpenAt',
  'nominationsCloseAt',
  'ceremonyAt',
] as const;
export type ReminderMilestone = (typeof REMINDER_MILESTONES)[number];

export const MILESTONE_LABEL: Record<ReminderMilestone, string> = {
  nominationsOpenAt: 'Season opens',
  nominationsCloseAt: 'Nominations close',
  ceremonyAt: 'The ceremony',
};

/** How the milestone reads in the middle of a sentence. */
export const MILESTONE_PHRASE: Record<ReminderMilestone, string> = {
  nominationsOpenAt: 'nominations open',
  nominationsCloseAt: 'nominations close',
  ceremonyAt: 'the ceremony',
};

export type Reminder = { daysBefore: number; milestone: ReminderMilestone };

export type ReminderSchedule = {
  enabled: boolean;
  reminders: Reminder[];
};

export const MAX_REMINDERS = 8;
export const MAX_DAYS_BEFORE = 120;

/**
 * Nothing is scheduled until somebody schedules it. There is no built-in
 * default: the schedule is the desk's data, kept in the database, and an empty
 * one sends nothing.
 */
export const EMPTY_SCHEDULE: ReminderSchedule = { enabled: true, reminders: [] };

/**
 * A reminder stays sendable for this many days after its date, so a daily run
 * that missed a day (a deploy, an outage) still catches it. Short enough that
 * a reminder is never sent so late it reads as a mistake.
 */
export const GRACE_DAYS = 2;

export function isMilestone(value: unknown): value is ReminderMilestone {
  return typeof value === 'string' && (REMINDER_MILESTONES as readonly string[]).includes(value);
}

/** Clean, dedupe and sort: furthest out first, the way the desk reads a countdown. */
export function normaliseReminders(input: readonly unknown[]): Reminder[] {
  const seen = new Set<string>();
  const out: Reminder[] = [];

  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue;
    const { daysBefore, milestone } = entry as Record<string, unknown>;
    const days = Number(daysBefore);
    if (!Number.isInteger(days) || days < 0 || days > MAX_DAYS_BEFORE) continue;
    if (!isMilestone(milestone)) continue;
    const key = `${milestone}:${days}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ daysBefore: days, milestone });
  }

  return out
    .sort(
      (a, b) =>
        REMINDER_MILESTONES.indexOf(a.milestone) - REMINDER_MILESTONES.indexOf(b.milestone) ||
        b.daysBefore - a.daysBefore,
    )
    .slice(0, MAX_REMINDERS);
}

/**
 * Read the stored setting. Nothing stored, or something unreadable, is an
 * empty schedule: a corrupted setting must never turn into emails nobody chose.
 */
export function parseSchedule(raw: string | null | undefined): ReminderSchedule {
  if (!raw) return EMPTY_SCHEDULE;
  try {
    const parsed = JSON.parse(raw) as { enabled?: unknown; reminders?: unknown };
    return {
      enabled: parsed.enabled !== false,
      reminders: Array.isArray(parsed.reminders) ? normaliseReminders(parsed.reminders) : [],
    };
  } catch {
    return EMPTY_SCHEDULE;
  }
}

export function serialiseSchedule(schedule: ReminderSchedule): string {
  return JSON.stringify({
    enabled: schedule.enabled,
    reminders: normaliseReminders(schedule.reminders),
  });
}

export type SeasonDates = {
  id: string;
  year: number;
  title: string;
} & Record<ReminderMilestone, string | Date | null>;

const DAY = 24 * 60 * 60 * 1000;

function utcDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function asDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The calendar day a reminder goes out, as midnight UTC. */
export function sendDay(milestoneAt: string | Date, daysBefore: number): Date {
  const at = asDate(milestoneAt)!;
  return new Date(utcDay(at) - daysBefore * DAY);
}

export type PlannedReminder = {
  season: SeasonDates;
  reminder: Reminder;
  milestoneAt: Date;
  sendOn: Date;
};

/** Every reminder the schedule implies for these seasons, whether past or future. */
export function planReminders(
  schedule: ReminderSchedule,
  seasons: readonly SeasonDates[],
): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  for (const season of seasons) {
    for (const reminder of schedule.reminders) {
      const milestoneAt = asDate(season[reminder.milestone]);
      if (!milestoneAt) continue;
      planned.push({
        season,
        reminder,
        milestoneAt,
        sendOn: sendDay(milestoneAt, reminder.daysBefore),
      });
    }
  }
  return planned.sort((a, b) => a.sendOn.getTime() - b.sendOn.getTime());
}

/**
 * What goes out today.
 *
 * A reminder is due from its send day for `GRACE_DAYS`, and never once its
 * milestone has passed. Where a missed run leaves two reminders for the same
 * milestone due at once, only the nearest goes: nobody needs "two weeks to go"
 * and "one week to go" in the same inbox on the same morning.
 */
export function dueReminders(
  schedule: ReminderSchedule,
  seasons: readonly SeasonDates[],
  now: Date = new Date(),
): PlannedReminder[] {
  if (!schedule.enabled) return [];
  const today = utcDay(now);

  const due = planReminders(schedule, seasons).filter((plan) => {
    const from = plan.sendOn.getTime();
    return today >= from && today <= from + GRACE_DAYS * DAY && now < plan.milestoneAt;
  });

  const nearest = new Map<string, PlannedReminder>();
  for (const plan of due) {
    const key = `${plan.season.id}:${plan.reminder.milestone}`;
    const held = nearest.get(key);
    if (!held || plan.reminder.daysBefore < held.reminder.daysBefore) nearest.set(key, plan);
  }
  return [...nearest.values()];
}

/** The reminders still to come, soonest first. */
export function upcomingReminders(
  schedule: ReminderSchedule,
  seasons: readonly SeasonDates[],
  now: Date = new Date(),
): PlannedReminder[] {
  const today = utcDay(now);
  return planReminders(schedule, seasons).filter(
    (plan) => plan.sendOn.getTime() >= today && now < plan.milestoneAt,
  );
}

/** "in 14 days", "tomorrow", "today". */
export function countdownPhrase(daysBefore: number): string {
  if (daysBefore === 0) return 'today';
  if (daysBefore === 1) return 'tomorrow';
  if (daysBefore % 7 === 0 && daysBefore <= 28) {
    const weeks = daysBefore / 7;
    return weeks === 1 ? 'in one week' : `in ${weeks} weeks`;
  }
  return `in ${daysBefore} days`;
}

/** Whole days from today to a date, by UTC calendar day. Negative once past. */
export function daysUntil(value: string | Date, now: Date = new Date()): number {
  return Math.round((utcDay(asDate(value)!) - utcDay(now)) / DAY);
}
