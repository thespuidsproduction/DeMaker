import 'server-only';
import {
  MILESTONE_PHRASE,
  countdownPhrase,
  dueReminders,
  parseSchedule,
  serialiseSchedule,
  type ReminderMilestone,
  type ReminderSchedule,
  type SeasonDates,
} from '@/domain/season-reminders';
import { recordAudit, type AuditActor } from '@/server/audit';
import { createId } from '@/server/db/ids';
import { sql } from '@/server/db/sql';
import { sendSeasonReminder } from '@/server/email/messages';
import { SETTINGS, readSetting, setSetting } from '@/server/settings';

/**
 * Season reminders: the schedule, the audience, and the daily run.
 *
 * Who receives them is decided here and nowhere else:
 *
 *  - a creator who holds a record (a claimed record has an account, and the
 *    account's address is the only address PALMA has; an unclaimed record has
 *    none, by design),
 *  - whose account is active and whose record is not suspended,
 *  - whom the relationship desk has not marked do not contact.
 *
 * Their own "season news" switch and the suppression list are then applied by
 * `dispatch`, the way every other message is, so a reminder can never be the
 * one email that ignores a preference.
 */

const isoTs = (ref: string) => sql.unsafe(`to_char(${ref}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);

export async function getReminderSchedule(): Promise<{
  schedule: ReminderSchedule;
  updatedAt: string | null;
  updatedBy: string | null;
}> {
  const row = await readSetting(SETTINGS.seasonReminders);
  let updatedBy: string | null = null;
  if (row?.updatedById) {
    const [actor] = await sql<{ name: string }[]>`
      select name from "User" where id = ${row.updatedById} limit 1
    `;
    updatedBy = actor?.name ?? null;
  }
  return {
    schedule: parseSchedule(row?.value),
    updatedAt: row ? new Date(row.updatedAt).toISOString() : null,
    updatedBy,
  };
}

export async function saveReminderSchedule(schedule: ReminderSchedule, actorId: string) {
  await setSetting(SETTINGS.seasonReminders, serialiseSchedule(schedule), actorId);
}

/** Seasons that can still have a reminder ahead of them. Archived ones cannot. */
export async function reminderSeasons(): Promise<SeasonDates[]> {
  return sql<SeasonDates[]>`
    select
      id,
      year,
      title,
      ${isoTs('"nominationsOpenAt"')} as "nominationsOpenAt",
      ${isoTs('"nominationsCloseAt"')} as "nominationsCloseAt",
      ${isoTs('"ceremonyAt"')} as "ceremonyAt"
    from "AwardYear"
    where stage::text <> 'archived'
      and coalesce("ceremonyAt", "nominationsCloseAt", "nominationsOpenAt")
        > (now() at time zone 'utc') - interval '1 day'
    order by year asc
  `;
}

type Recipient = {
  userId: string;
  email: string;
  name: string;
  creatorId: string;
};

function audienceQuery() {
  return sql<Recipient[]>`
    select u.id as "userId", u.email, u.name, c.id as "creatorId"
    from "Creator" c
    join "User" u on u.id = c."userId"
    left join "CreatorRelationship" r on r."creatorId" = c.id
    where u."isActive" = true
      and c."isSuspended" = false
      and coalesce(r.stage, 'prospect'::"CrmStage") <> 'do_not_contact'
    order by c."displayName" asc
  `;
}

export type ReminderAudience = {
  /** Would be written to. */
  reachable: number;
  /** Hold a record but switched season news off. */
  optedOut: number;
  /** Marked do not contact on the desk. */
  doNotContact: number;
  /** No account, so no address. */
  unclaimed: number;
};

export async function reminderAudience(): Promise<ReminderAudience> {
  const [row] = await sql<ReminderAudience[]>`
    select
      (select count(*)::int
        from "Creator" c
        join "User" u on u.id = c."userId"
        left join "CreatorRelationship" r on r."creatorId" = c.id
        left join "NotificationPreference" p on p."userId" = u.id
        where u."isActive" = true and c."isSuspended" = false
          and coalesce(r.stage, 'prospect'::"CrmStage") <> 'do_not_contact'
          and coalesce(p."seasonAnnouncements", true) = true) as reachable,
      (select count(*)::int
        from "Creator" c
        join "User" u on u.id = c."userId"
        join "NotificationPreference" p on p."userId" = u.id
        where u."isActive" = true and c."isSuspended" = false
          and p."seasonAnnouncements" = false) as "optedOut",
      (select count(*)::int from "CreatorRelationship"
        where stage = 'do_not_contact') as "doNotContact",
      (select count(*)::int from "Creator" where "userId" is null) as unclaimed
  `;
  return row ?? { reachable: 0, optedOut: 0, doNotContact: 0, unclaimed: 0 };
}

/** What the history says happened to one reminder, in words the desk can act on. */
function outcome(result: { status: string; detail?: string }): string {
  if (result.status === 'sent') return 'Sent.';
  if (result.status === 'failed')
    return `Failed to send${result.detail ? `: ${result.detail}` : '.'}`;
  if (result.detail?.includes('switched off')) return 'Not sent: they switched season news off.';
  const why = result.detail ?? 'Held back.';
  return `Not sent: ${why.charAt(0).toLowerCase()}${why.slice(1)}`;
}

export type ReminderRun = {
  due: number;
  sent: number;
  suppressed: number;
  failed: number;
  alreadySent: number;
};

/**
 * Send whatever is due today. Safe to call as often as anybody likes: the
 * unique key on `SeasonReminderSend` is claimed before anything is sent, so a
 * reminder reaches an account once, however many runs overlap.
 */
export async function runSeasonReminders(
  options: { now?: Date; actor?: AuditActor } = {},
): Promise<ReminderRun> {
  const now = options.now ?? new Date();
  const run: ReminderRun = { due: 0, sent: 0, suppressed: 0, failed: 0, alreadySent: 0 };

  const [{ schedule }, seasons] = await Promise.all([getReminderSchedule(), reminderSeasons()]);
  const due = dueReminders(schedule, seasons, now);
  run.due = due.length;
  if (due.length === 0) return run;

  const audience = await audienceQuery();

  for (const plan of due) {
    const milestone: ReminderMilestone = plan.reminder.milestone;
    const countdown = countdownPhrase(plan.reminder.daysBefore);

    for (const person of audience) {
      const [claimed] = await sql<{ id: string }[]>`
        insert into "SeasonReminderSend" (
          id, "awardYearId", milestone, "daysBefore", "userId", "creatorId", status, "sentAt"
        ) values (
          ${createId()}, ${plan.season.id}, ${milestone}, ${plan.reminder.daysBefore},
          ${person.userId}, ${person.creatorId}, 'queued', ${now}
        )
        on conflict ("awardYearId", milestone, "daysBefore", "userId") do nothing
        returning id
      `;
      if (!claimed) {
        run.alreadySent += 1;
        continue;
      }

      const result = await sendSeasonReminder({
        to: person.email,
        userId: person.userId,
        creatorId: person.creatorId,
        name: person.name,
        year: plan.season.year,
        milestone,
        milestoneAt: plan.milestoneAt,
        countdown,
      });

      run[
        result.status === 'sent' ? 'sent' : result.status === 'suppressed' ? 'suppressed' : 'failed'
      ] += 1;

      await sql`
        update "SeasonReminderSend" set status = ${result.status} where id = ${claimed.id}
      `;

      // The relationship's own history shows it, so nobody at the desk writes
      // to a creator on Tuesday not knowing PALMA already did on Monday.
      await sql`
        insert into "CreatorTouchpoint" (
          id, "creatorId", "authorId", kind, direction, summary, "occurredAt", "createdAt"
        ) values (
          ${createId()}, ${person.creatorId}, null, 'reminder', 'outbound',
          ${`PALMA ${plan.season.year}: ${MILESTONE_PHRASE[milestone]} ${countdown}. ${outcome(result)}`},
          ${now}, ${now}
        )
      `;
    }
  }

  if (run.sent + run.suppressed + run.failed > 0) {
    await recordAudit({
      action: 'crm.reminders_sent',
      entityType: 'SystemSetting',
      entityId: SETTINGS.seasonReminders,
      actor: options.actor ?? { label: 'scheduler' },
      summary: `Season reminders: ${run.sent} sent, ${run.suppressed} held back, ${run.failed} failed`,
      after: run,
    });
  }

  return run;
}

export type ReminderSendGroup = {
  year: number;
  milestone: ReminderMilestone;
  daysBefore: number;
  day: string;
  sent: number;
  held: number;
  failed: number;
};

/** What has gone out, grouped by reminder and day. */
export async function recentReminderSends(limit = 12): Promise<ReminderSendGroup[]> {
  return sql<ReminderSendGroup[]>`
    select
      ay.year,
      s.milestone,
      s."daysBefore",
      to_char(date_trunc('day', s."sentAt"), 'YYYY-MM-DD"T"00:00:00.000"Z"') as day,
      count(*) filter (where s.status = 'sent')::int as sent,
      count(*) filter (where s.status = 'suppressed')::int as held,
      count(*) filter (where s.status not in ('sent', 'suppressed'))::int as failed
    from "SeasonReminderSend" s
    join "AwardYear" ay on ay.id = s."awardYearId"
    group by ay.year, s.milestone, s."daysBefore", date_trunc('day', s."sentAt")
    order by date_trunc('day', s."sentAt") desc, s."daysBefore" asc
    limit ${limit}
  `;
}
