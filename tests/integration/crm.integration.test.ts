/**
 * Integration coverage for the relationship desk: the actions write what the
 * read layer reads, the automatic stage moves land, and do-not-contact holds.
 *
 * Runs only when DATABASE_URL is set. Everything it creates is namespaced and
 * removed again; the creator's delete cascades to the relationship rows.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const actor = vi.hoisted(() => ({ id: null as string | null }));

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/server/audit', () => ({ recordAudit: async () => undefined }));
vi.mock('@/lib/auth/guards', () => ({
  authorise: async () => ({
    user: { id: actor.id, role: 'moderator', email: 'crm-integration@test.invalid' },
  }),
}));

import { addCrmTask, logTouchpoint, saveRelationship, toggleCrmTask } from '@/server/actions/crm';
import { getCrmCreator, getCrmPipeline, listCrmCreators } from '@/server/data/crm';
import { createId } from '@/server/db/ids';
import { closeSql, sql } from '@/server/db/sql';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const SUFFIX = `crm-it-${Date.now()}`;
const idle = { status: 'idle' as const };

let creatorId = '';
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
    await closeSql();
  });

  it('treats a creator nobody has touched as an unowned prospect', async () => {
    const record = await getCrmCreator(slug);
    expect(record?.relationship.exists).toBe(false);
    expect(record?.relationship.stage).toBe('prospect');

    const rows = await listCrmCreators({ query: SUFFIX, stage: 'prospect', owner: 'none' });
    expect(rows.map((row) => row.slug)).toContain(slug);
  });

  it('moves a prospect to contacted on the first approach', async () => {
    const result = await logTouchpoint(
      idle,
      form({
        creatorId,
        kind: 'message',
        direction: 'outbound',
        summary: 'Invited them to claim the record through their platform inbox.',
        occurredAt: new Date().toISOString().slice(0, 10),
        nextFollowUpAt: '2099-01-15',
      }),
    );
    expect(result.status).toBe('success');

    const record = await getCrmCreator(slug);
    expect(record?.relationship.stage).toBe('contacted');
    expect(record?.relationship.lastContactAt).not.toBeNull();
    expect(record?.relationship.nextFollowUpAt).toBe('2099-01-15T00:00:00.000Z');
    expect(record?.touchpoints).toHaveLength(1);
  });

  it('refuses a touchpoint that carries an address', async () => {
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
    expect((await getCrmCreator(slug))?.touchpoints).toHaveLength(1);
  });

  it('saves stage, priority and tags, and filters by them', async () => {
    const result = await saveRelationship(
      idle,
      form({
        creatorId,
        stage: 'in_conversation',
        priority: 'high',
        ownerId: '',
        contactRoute: 'platform_message',
        nextFollowUpAt: '2000-01-01',
        tags: `Ceremony 2027, ${SUFFIX}`,
      }),
    );
    expect(result.status).toBe('success');

    const record = await getCrmCreator(slug);
    expect(record?.relationship.priority).toBe('high');
    expect(record?.relationship.tags).toContain('ceremony-2027');

    const overdue = await listCrmCreators({ due: 'overdue', tag: 'ceremony-2027', query: SUFFIX });
    expect(overdue.map((row) => row.slug)).toEqual([slug]);

    const pipeline = await getCrmPipeline();
    expect(pipeline.stages.in_conversation).toBeGreaterThanOrEqual(1);
    expect(pipeline.overdue).toBeGreaterThanOrEqual(1);
  });

  it('adds a task, ticks it off and reopens it', async () => {
    const added = await addCrmTask(
      idle,
      form({ creatorId, title: 'Send the ceremony pack', dueAt: '2099-02-01', assigneeId: '' }),
    );
    expect(added.status).toBe('success');

    let record = await getCrmCreator(slug);
    const task = record?.tasks[0];
    expect(task?.completedAt).toBeNull();
    expect((await listCrmCreators({ query: SUFFIX }))[0]?.openTasks).toBe(1);

    await toggleCrmTask(form({ taskId: task!.id, done: 'true' }));
    record = await getCrmCreator(slug);
    expect(record?.tasks[0]?.completedAt).not.toBeNull();

    await toggleCrmTask(form({ taskId: task!.id, done: 'false' }));
    record = await getCrmCreator(slug);
    expect(record?.tasks[0]?.completedAt).toBeNull();
  });

  it('holds do not contact: no follow-up, no approach, inbound still recorded', async () => {
    await saveRelationship(
      idle,
      form({
        creatorId,
        stage: 'do_not_contact',
        priority: 'normal',
        ownerId: '',
        contactRoute: '',
        nextFollowUpAt: '2099-03-01',
        tags: '',
      }),
    );

    let record = await getCrmCreator(slug);
    expect(record?.relationship.stage).toBe('do_not_contact');
    expect(record?.relationship.nextFollowUpAt).toBeNull();
    expect(record?.relationship.tags).toEqual([]);

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

    record = await getCrmCreator(slug);
    expect(record?.relationship.stage).toBe('do_not_contact');
    expect(record?.touchpoints).toHaveLength(2);
  });
});
