/**
 * Integration coverage for the relationship desk and its season emails: the
 * actions write what the read layer reads, stage moves land in the history,
 * do-not-contact holds, and a reminder reaches an account exactly once.
 *
 * Runs only when DATABASE_URL is set. Everything it creates is namespaced and
 * removed again; the creator's delete cascades to the relationship rows.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const actor = vi.hoisted(() => ({ id: null as string | null }));
const sent = vi.hoisted(() => ({ count: 0 }));

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/server/audit', () => ({ recordAudit: async () => undefined }));
vi.mock('@/server/email/messages', () => ({
  sendSeasonReminder: async () => {
    sent.count += 1;
    return { status: 'sent' };
  },
}));
vi.mock('@/lib/auth/guards', () => ({
  authorise: async () => ({
    user: {
      id: actor.id,
      name: 'Integration',
      role: 'moderator',
      email: 'crm-integration@test.invalid',
    },
  }),
}));

import {
  addCrmTask,
  logTouchpoint,
  saveDetails,
  setFollowUp,
  setStage,
  toggleCrmTask,
} from '@/server/actions/crm';
import { getCrmCreator, getCrmPipeline, listCrmActivity, listCrmCreators } from '@/server/data/crm';
import { runSeasonReminders } from '@/server/services/season-reminders';
import { createId } from '@/server/db/ids';
import { closeSql, sql } from '@/server/db/sql';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const SUFFIX = `crm-it-${Date.now()}`;
const idle = { status: 'idle' as const };

let creatorId = '';
let seasonId = '';
let userId = '';
const slug = `crm-${SUFFIX}`;

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe.skipIf(!hasDatabase)('the relationship desk (integration)', () => {
  beforeAll(async () => {
    const created = new Date();
    creatorId = createId();
    await sql`
      insert into "Creator" (id, slug, "displayName", "countryCode", "createdAt", "updatedAt")
      values (${creatorId}, ${slug}, 'CRM Integration Creator', 'GB', ${created}, ${created})
    `;
  });

  afterAll(async () => {
    await sql`delete from "Creator" where id = ${creatorId}`;
    if (seasonId) await sql`delete from "AwardYear" where id = ${seasonId}`;
    if (userId) await sql`delete from "User" where id = ${userId}`;
    await closeSql();
  });

  it('treats a creator nobody has touched as an unowned prospect', async () => {
    const record = await getCrmCreator(slug);
    expect(record?.relationship.exists).toBe(false);
    expect(record?.relationship.stage).toBe('prospect');

    const rows = await listCrmCreators({ query: SUFFIX, stage: 'prospect', owner: 'none' });
    expect(rows.map((row) => row.slug)).toContain(slug);
  });

  it('moves a prospect on at the first approach, and writes the move into history', async () => {
    const result = await logTouchpoint(
      idle,
      form({
        creatorId,
        kind: 'message',
        direction: 'outbound',
        summary: 'Invited them to claim the record through their platform inbox.',
        followUpDays: '7',
      }),
    );
    expect(result.status).toBe('success');

    const record = await getCrmCreator(slug);
    expect(record?.relationship.stage).toBe('contacted');
    expect(record?.relationship.lastContactAt).not.toBeNull();
    expect(record?.relationship.nextFollowUpAt).not.toBeNull();
    expect(record?.touchpoints.map((t) => t.kind).sort()).toEqual(['message', 'stage']);
    expect(record?.touchpointCount).toBe(2);
  });

  it('refuses a note that carries an address', async () => {
    const result = await logTouchpoint(
      idle,
      form({
        creatorId,
        kind: 'email',
        direction: 'outbound',
        summary: 'Wrote to them at someone@example.com',
      }),
    );
    expect(result.status).toBe('error');
    expect((await getCrmCreator(slug))?.touchpointCount).toBe(2);
  });

  it('moves the stage in one click, and sets or clears a follow-up in one click', async () => {
    await setStage(form({ creatorId, stage: 'in_conversation' }));
    let record = await getCrmCreator(slug);
    expect(record?.relationship.stage).toBe('in_conversation');
    expect(record?.touchpoints[0]?.summary).toBe('Contacted → In conversation');

    await setFollowUp(form({ creatorId, days: '0' }));
    record = await getCrmCreator(slug);
    expect(record?.relationship.nextFollowUpAt).toBeNull();

    await setFollowUp(form({ creatorId, on: '2000-01-01' }));
    const overdue = await listCrmCreators({ due: 'overdue', query: SUFFIX });
    expect(overdue.map((row) => row.slug)).toEqual([slug]);
    expect((await getCrmPipeline()).overdue).toBeGreaterThanOrEqual(1);
  });

  it('saves the details and filters by tag', async () => {
    const result = await saveDetails(
      idle,
      form({
        creatorId,
        priority: 'high',
        ownerId: '',
        contactRoute: 'platform_message',
        tags: `Ceremony 2027, ${SUFFIX}`,
      }),
    );
    expect(result.status).toBe('success');

    const record = await getCrmCreator(slug);
    expect(record?.relationship.priority).toBe('high');
    expect(record?.relationship.tags).toContain('ceremony-2027');
    expect((await listCrmCreators({ tag: 'ceremony-2027', query: SUFFIX })).length).toBe(1);
  });

  it('adds a task, ticks it off and reopens it', async () => {
    const added = await addCrmTask(
      idle,
      form({ creatorId, title: 'Send the ceremony pack', dueAt: '2099-02-01' }),
    );
    expect(added.status).toBe('success');

    let record = await getCrmCreator(slug);
    const task = record!.tasks[0]!;
    expect(task.completedAt).toBeNull();

    await toggleCrmTask(form({ taskId: task.id, done: 'true' }));
    record = await getCrmCreator(slug);
    expect(record?.tasks[0]?.completedAt).not.toBeNull();

    await toggleCrmTask(form({ taskId: task.id, done: 'false' }));
    record = await getCrmCreator(slug);
    expect(record?.tasks[0]?.completedAt).toBeNull();
  });

  it('sends a due season email once, to a creator who holds a record, and logs it', async () => {
    userId = createId();
    const now = new Date();
    await sql`
      insert into "User" (id, email, name, role, "isActive", "createdAt", "updatedAt")
      values (${userId}, ${`${SUFFIX}@test.invalid`}, 'CRM Integration', 'creator', true, ${now}, ${now})
    `;
    await sql`update "Creator" set "userId" = ${userId} where id = ${creatorId}`;

    // A season opening in exactly seven days: the default schedule's one-week
    // reminder is due today.
    seasonId = createId();
    const opens = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7, 9),
    );
    await sql`
      insert into "AwardYear" (id, year, title, stage, "nominationsOpenAt", "createdAt", "updatedAt")
      values (${seasonId}, ${3000 + (Date.now() % 900)}, ${`PALMA ${SUFFIX}`}, 'announced', ${opens}, ${now}, ${now})
    `;

    const before = sent.count;
    const first = await runSeasonReminders({ now });
    expect(first.sent).toBeGreaterThanOrEqual(1);
    const second = await runSeasonReminders({ now });
    expect(second.alreadySent).toBeGreaterThanOrEqual(1);

    const [row] = await sql<{ count: number }[]>`
      select count(*)::int as count from "SeasonReminderSend"
      where "awardYearId" = ${seasonId} and "userId" = ${userId}
    `;
    expect(row?.count).toBe(1);
    expect(sent.count - before).toBe(first.sent);
    expect(sent.count).toBeGreaterThan(0);

    const history = await listCrmActivity({ kind: 'reminder', limit: 50 });
    expect(history.some((entry) => entry.creator.slug === slug)).toBe(true);
  });

  it('holds do not contact: no follow-up, no approach, no season email, inbound still recorded', async () => {
    await setStage(form({ creatorId, stage: 'do_not_contact' }));

    let record = await getCrmCreator(slug);
    expect(record?.relationship.stage).toBe('do_not_contact');
    expect(record?.relationship.nextFollowUpAt).toBeNull();

    await setFollowUp(form({ creatorId, days: '7' }));
    expect((await getCrmCreator(slug))?.relationship.nextFollowUpAt).toBeNull();

    const approach = await logTouchpoint(
      idle,
      form({ creatorId, kind: 'call', direction: 'outbound', summary: 'Tried to call.' }),
    );
    expect(approach.status).toBe('error');

    const reply = await logTouchpoint(
      idle,
      form({
        creatorId,
        kind: 'email',
        direction: 'inbound',
        summary: 'They wrote to confirm they want no contact.',
      }),
    );
    expect(reply.status).toBe('success');

    await sql`delete from "SeasonReminderSend" where "userId" = ${userId}`;
    await runSeasonReminders();
    const [row] = await sql<{ count: number }[]>`
      select count(*)::int as count from "SeasonReminderSend" where "userId" = ${userId}
    `;
    expect(row?.count).toBe(0);

    record = await getCrmCreator(slug);
    expect(record?.relationship.stage).toBe('do_not_contact');
  });
});
