'use server';

import { revalidatePath } from 'next/cache';
import { authorise } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/session';
import {
  CRM_STAGE_LABEL,
  daysFromToday,
  mayContact,
  mayLogTouchpoint,
  normaliseTags,
  stageAfterTouchpoint,
  type CrmStage,
} from '@/domain/crm';
import {
  dayToDate,
  detailsSchema,
  followUpSchema,
  stageSchema,
  taskSchema,
  taskToggleSchema,
  touchpointSchema,
} from '@/lib/validation/crm';
import { fieldErrors } from '@/lib/validation/nomination';
import { recordAudit } from '@/server/audit';
import { isCrmStaff } from '@/server/data/crm';
import { createId } from '@/server/db/ids';
import { sql, withTransaction, type TransactionSql } from '@/server/db/sql';

/**
 * The relationship desk's writes.
 *
 * Most of them are one click: move the stage, take the relationship, set a
 * follow-up. Only the things that need words (a note, a task, the details)
 * are forms, and each of those is one field and a button.
 */

export type CrmState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  errors?: Record<string, string>;
};

type CreatorRef = {
  id: string;
  slug: string;
  displayName: string;
  stage: CrmStage | null;
};

async function findCreator(creatorId: string): Promise<CreatorRef | null> {
  const [creator] = await sql<CreatorRef[]>`
    select c.id, c.slug, c."displayName", r.stage
    from "Creator" c
    left join "CreatorRelationship" r on r."creatorId" = c.id
    where c.id = ${creatorId}
    limit 1
  `;
  return creator ?? null;
}

function revalidateCrm(slug: string) {
  revalidatePath('/portal/crm');
  revalidatePath('/portal/crm/history');
  revalidatePath(`/portal/crm/${slug}`);
  revalidatePath(`/portal/crm/${slug}/history`);
}

async function manager() {
  try {
    return await authorise('crm:manage');
  } catch {
    return null;
  }
}

type Session = NonNullable<Awaited<ReturnType<typeof manager>>>;

const actorOf = (session: Session) => ({
  id: session.user.id,
  role: session.user.role,
  label: session.user.email,
});

/** Make sure the relationship row exists, so every update below is a plain update. */
async function ensureRelationship(tx: TransactionSql | typeof sql, creatorId: string) {
  const now = new Date();
  await tx`
    insert into "CreatorRelationship" ("creatorId", "stageChangedAt", "createdAt", "updatedAt")
    values (${creatorId}, ${now}, ${now}, ${now})
    on conflict ("creatorId") do nothing
  `;
}

/**
 * Move a relationship, and write the move into its history.
 *
 * Moving to do-not-contact clears the follow-up: a reminder to write to
 * somebody who asked not to be written to is the one reminder the desk must
 * never be given.
 */
async function moveStage(
  tx: TransactionSql,
  creatorId: string,
  from: CrmStage,
  to: CrmStage,
  authorId: string | null,
) {
  const now = new Date();
  await tx`
    update "CreatorRelationship" set
      stage = ${to}::"CrmStage",
      "stageChangedAt" = ${now},
      "nextFollowUpAt" = case when ${to} = 'do_not_contact' then null else "nextFollowUpAt" end
    where "creatorId" = ${creatorId}
  `;
  await tx`
    insert into "CreatorTouchpoint" (
      id, "creatorId", "authorId", kind, direction, summary, "occurredAt", "createdAt"
    ) values (
      ${createId()}, ${creatorId}, ${authorId}, 'stage', 'internal',
      ${`${CRM_STAGE_LABEL[from]} → ${CRM_STAGE_LABEL[to]}`}, ${now}, ${now}
    )
  `;
}

/** One click on the journey rail. */
export async function setStage(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const session = await manager();
  if (!session) return;

  const parsed = stageSchema.safeParse({
    creatorId: formData.get('creatorId'),
    stage: formData.get('stage'),
  });
  if (!parsed.success) return;

  const creator = await findCreator(parsed.data.creatorId);
  if (!creator) return;

  const from = creator.stage ?? 'prospect';
  const to = parsed.data.stage;
  if (from === to) return;

  await withTransaction(async (tx) => {
    await ensureRelationship(tx, creator.id);
    await moveStage(tx, creator.id, from, to, session.user.id);
  });

  await recordAudit({
    action: 'crm.relationship_updated',
    entityType: 'Creator',
    entityId: creator.id,
    actor: actorOf(session),
    summary: `${creator.displayName} moved from ${CRM_STAGE_LABEL[from]} to ${CRM_STAGE_LABEL[to]}`,
    before: { stage: from },
    after: { stage: to },
  });

  revalidateCrm(creator.slug);
}

/** "I'll look after this one." */
export async function takeRelationship(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const session = await manager();
  if (!session) return;

  const creator = await findCreator(String(formData.get('creatorId') ?? ''));
  if (!creator) return;

  await ensureRelationship(sql, creator.id);
  await sql`
    update "CreatorRelationship" set "ownerId" = ${session.user.id}
    where "creatorId" = ${creator.id}
  `;

  await recordAudit({
    action: 'crm.relationship_updated',
    entityType: 'Creator',
    entityId: creator.id,
    actor: actorOf(session),
    summary: `${session.user.name} took the relationship with ${creator.displayName}`,
    after: { ownerId: session.user.id },
  });

  revalidateCrm(creator.slug);
}

/** One of the quick picks, a date, or clear. */
export async function setFollowUp(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const session = await manager();
  if (!session) return;

  const parsed = followUpSchema.safeParse({
    creatorId: formData.get('creatorId'),
    days: formData.get('days') ?? '',
    on: formData.get('on') ?? '',
  });
  if (!parsed.success) return;

  const creator = await findCreator(parsed.data.creatorId);
  if (!creator) return;
  if (!mayContact(creator.stage ?? 'prospect')) return;

  const { days, on } = parsed.data;
  const next = on ? dayToDate(on) : days && days !== '0' ? daysFromToday(Number(days)) : null;

  await ensureRelationship(sql, creator.id);
  await sql`
    update "CreatorRelationship" set "nextFollowUpAt" = ${next}
    where "creatorId" = ${creator.id}
  `;

  revalidateCrm(creator.slug);
}

/** Owner, priority, route and tags. The things that change rarely. */
export async function saveDetails(_previous: CrmState, formData: FormData): Promise<CrmState> {
  await assertSameOrigin();

  const session = await manager();
  if (!session) return { status: 'error', message: 'You are not authorised to change this.' };

  const parsed = detailsSchema.safeParse({
    creatorId: formData.get('creatorId'),
    priority: formData.get('priority'),
    ownerId: formData.get('ownerId') ?? '',
    contactRoute: formData.get('contactRoute') ?? '',
    tags: formData.get('tags') ?? '',
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the highlighted fields.',
      errors: fieldErrors(parsed.error),
    };
  }

  const input = parsed.data;
  const creator = await findCreator(input.creatorId);
  if (!creator) return { status: 'error', message: 'That record does not exist.' };

  const ownerId = input.ownerId || null;
  if (ownerId && !(await isCrmStaff(ownerId))) {
    return {
      status: 'error',
      message: 'A relationship can only be given to an active member of staff.',
      errors: { ownerId: 'Choose a member of staff.' },
    };
  }

  const tags = normaliseTags(input.tags ?? '');

  await ensureRelationship(sql, creator.id);
  await sql`
    update "CreatorRelationship" set
      priority = ${input.priority}::"CrmPriority",
      "ownerId" = ${ownerId},
      "contactRoute" = ${input.contactRoute || null}::"CrmContactRoute",
      tags = ${tags}::text[]
    where "creatorId" = ${creator.id}
  `;

  await recordAudit({
    action: 'crm.relationship_updated',
    entityType: 'Creator',
    entityId: creator.id,
    actor: actorOf(session),
    summary: `Relationship details for ${creator.displayName} updated`,
    after: { priority: input.priority, ownerId, contactRoute: input.contactRoute || null, tags },
  });

  revalidateCrm(creator.slug);
  return { status: 'success', message: 'Saved.' };
}

/**
 * What passed between PALMA and the creator.
 *
 * Also moves the relationship on where the move is obvious (a first approach
 * makes a prospect contacted, a reply starts a conversation), stamps the last
 * contact, and sets the follow-up when one was picked.
 */
export async function logTouchpoint(_previous: CrmState, formData: FormData): Promise<CrmState> {
  await assertSameOrigin();

  const session = await manager();
  if (!session) return { status: 'error', message: 'You are not authorised to log contact.' };

  const parsed = touchpointSchema.safeParse({
    creatorId: formData.get('creatorId'),
    kind: formData.get('kind'),
    direction: formData.get('direction'),
    summary: formData.get('summary'),
    occurredAt: formData.get('occurredAt') ?? '',
    followUpDays: formData.get('followUpDays') ?? '',
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the highlighted fields.',
      errors: fieldErrors(parsed.error),
    };
  }

  const input = parsed.data;
  const creator = await findCreator(input.creatorId);
  if (!creator) return { status: 'error', message: 'That record does not exist.' };

  const stage = creator.stage ?? 'prospect';
  if (!mayLogTouchpoint(stage, input.direction)) {
    return {
      status: 'error',
      message: 'Marked do not contact. Record what they sent PALMA, never an approach.',
    };
  }

  const now = new Date();
  const occurredAt = dayToDate(input.occurredAt) ?? now;
  if (occurredAt.getTime() > now.getTime()) {
    return {
      status: 'error',
      message: 'A note is about something that already happened.',
      errors: { occurredAt: 'Choose today or earlier.' },
    };
  }

  const nextStage = stageAfterTouchpoint(stage, input.direction);
  const days = Number(input.followUpDays || 0);
  const followUp = days > 0 && mayContact(nextStage) ? daysFromToday(days, now) : null;
  const contact = input.direction === 'internal' ? null : occurredAt;

  await withTransaction(async (tx) => {
    await ensureRelationship(tx, creator.id);
    await tx`
      insert into "CreatorTouchpoint" (
        id, "creatorId", "authorId", kind, direction, summary, "occurredAt", "createdAt"
      ) values (
        ${createId()}, ${creator.id}, ${session.user.id},
        ${input.kind}::"CrmTouchpointKind", ${input.direction}::"CrmDirection",
        ${input.summary}, ${occurredAt}, ${now}
      )
    `;
    await tx`
      update "CreatorRelationship" set
        "lastContactAt" = greatest("lastContactAt", ${contact}),
        "nextFollowUpAt" = coalesce(${followUp}, "nextFollowUpAt")
      where "creatorId" = ${creator.id}
    `;
    if (nextStage !== stage) await moveStage(tx, creator.id, stage, nextStage, session.user.id);
  });

  await recordAudit({
    action: 'crm.touchpoint_logged',
    entityType: 'Creator',
    entityId: creator.id,
    actor: actorOf(session),
    summary: `${input.direction} ${input.kind} logged for ${creator.displayName}`,
    after: { kind: input.kind, direction: input.direction, stage: nextStage },
  });

  revalidateCrm(creator.slug);
  return {
    status: 'success',
    message:
      nextStage === stage
        ? 'Logged.'
        : `Logged, and moved to ${CRM_STAGE_LABEL[nextStage].toLowerCase()}.`,
  };
}

export async function addCrmTask(_previous: CrmState, formData: FormData): Promise<CrmState> {
  await assertSameOrigin();

  const session = await manager();
  if (!session) return { status: 'error', message: 'You are not authorised to add tasks.' };

  const parsed = taskSchema.safeParse({
    creatorId: formData.get('creatorId'),
    title: formData.get('title'),
    dueAt: formData.get('dueAt') ?? '',
    assigneeId: formData.get('assigneeId') ?? '',
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the highlighted fields.',
      errors: fieldErrors(parsed.error),
    };
  }

  const input = parsed.data;
  const creator = await findCreator(input.creatorId);
  if (!creator) return { status: 'error', message: 'That record does not exist.' };

  // Nobody named: it is yours. Assigning is a choice, not a required field.
  const assigneeId = input.assigneeId || session.user.id;
  if (assigneeId !== session.user.id && !(await isCrmStaff(assigneeId))) {
    return {
      status: 'error',
      message: 'A task can only be given to an active member of staff.',
      errors: { assigneeId: 'Choose a member of staff.' },
    };
  }

  const id = createId();
  const now = new Date();
  await sql`
    insert into "CreatorTask" (
      id, "creatorId", title, "dueAt", "assigneeId", "createdById", "createdAt", "updatedAt"
    ) values (
      ${id}, ${creator.id}, ${input.title}, ${dayToDate(input.dueAt)},
      ${assigneeId}, ${session.user.id}, ${now}, ${now}
    )
  `;

  await recordAudit({
    action: 'crm.task_created',
    entityType: 'CreatorTask',
    entityId: id,
    actor: actorOf(session),
    summary: `Task added for ${creator.displayName}`,
    after: { creatorId: creator.id, assigneeId, dueAt: input.dueAt || null },
  });

  revalidateCrm(creator.slug);
  return { status: 'success', message: 'Added.' };
}

/** Tick a task off, or put it back. */
export async function toggleCrmTask(formData: FormData): Promise<void> {
  await assertSameOrigin();

  const session = await manager();
  if (!session) return;

  const parsed = taskToggleSchema.safeParse({
    taskId: formData.get('taskId'),
    done: formData.get('done'),
  });
  if (!parsed.success) return;

  const done = parsed.data.done === 'true';
  const [task] = await sql<{ id: string; slug: string; displayName: string }[]>`
    update "CreatorTask" t set
      "completedAt" = ${done ? new Date() : null},
      "completedById" = ${done ? session.user.id : null}
    from "Creator" c
    where t.id = ${parsed.data.taskId}
      and c.id = t."creatorId"
      and (t."completedAt" is null) = ${done}
    returning t.id, c.slug, c."displayName"
  `;

  if (!task) return;

  await recordAudit({
    action: done ? 'crm.task_completed' : 'crm.task_reopened',
    entityType: 'CreatorTask',
    entityId: task.id,
    actor: actorOf(session),
    summary: `Task for ${task.displayName} ${done ? 'completed' : 'reopened'}`,
  });

  revalidateCrm(task.slug);
}
