'use server';

import { revalidatePath } from 'next/cache';
import { authorise } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/session';
import {
  CRM_STAGE_LABEL,
  mayContact,
  mayLogTouchpoint,
  normaliseTags,
  stageAfterTouchpoint,
  type CrmStage,
} from '@/domain/crm';
import {
  dayToDate,
  relationshipSchema,
  taskSchema,
  taskToggleSchema,
  touchpointSchema,
} from '@/lib/validation/crm';
import { fieldErrors } from '@/lib/validation/nomination';
import { recordAudit } from '@/server/audit';
import { isCrmStaff } from '@/server/data/crm';
import { createId } from '@/server/db/ids';
import { sql, withTransaction } from '@/server/db/sql';

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
  revalidatePath(`/portal/crm/${slug}`);
}

async function manager() {
  try {
    return await authorise('crm:manage');
  } catch {
    return null;
  }
}

/**
 * Stage, priority, owner, route, follow-up date and tags, in one form.
 *
 * Moving a creator to `do_not_contact` clears the follow-up date: a reminder to
 * write to somebody who asked not to be written to is the one reminder the desk
 * must never be given.
 */
export async function saveRelationship(_previous: CrmState, formData: FormData): Promise<CrmState> {
  await assertSameOrigin();

  const session = await manager();
  if (!session) return { status: 'error', message: 'You are not authorised to change this.' };

  const parsed = relationshipSchema.safeParse({
    creatorId: formData.get('creatorId'),
    stage: formData.get('stage'),
    priority: formData.get('priority'),
    ownerId: formData.get('ownerId') ?? '',
    contactRoute: formData.get('contactRoute') ?? '',
    nextFollowUpAt: formData.get('nextFollowUpAt') ?? '',
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
  const followUp = mayContact(input.stage) ? dayToDate(input.nextFollowUpAt) : null;
  const previousStage = creator.stage ?? 'prospect';
  const now = new Date();

  await sql`
    insert into "CreatorRelationship" (
      "creatorId", stage, priority, "ownerId", "contactRoute", tags, "nextFollowUpAt",
      "stageChangedAt", "createdAt", "updatedAt"
    ) values (
      ${creator.id},
      ${input.stage}::"CrmStage",
      ${input.priority}::"CrmPriority",
      ${ownerId},
      ${input.contactRoute || null}::"CrmContactRoute",
      ${tags}::text[],
      ${followUp},
      ${now},
      ${now},
      ${now}
    )
    on conflict ("creatorId") do update set
      stage = excluded.stage,
      priority = excluded.priority,
      "ownerId" = excluded."ownerId",
      "contactRoute" = excluded."contactRoute",
      tags = excluded.tags,
      "nextFollowUpAt" = excluded."nextFollowUpAt",
      "stageChangedAt" = case
        when "CreatorRelationship".stage is distinct from excluded.stage then excluded."stageChangedAt"
        else "CreatorRelationship"."stageChangedAt"
      end
  `;

  await recordAudit({
    action: 'crm.relationship_updated',
    entityType: 'Creator',
    entityId: creator.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary:
      previousStage === input.stage
        ? `Relationship with ${creator.displayName} updated`
        : `${creator.displayName} moved from ${CRM_STAGE_LABEL[previousStage]} to ${CRM_STAGE_LABEL[input.stage]}`,
    before: { stage: previousStage },
    after: {
      stage: input.stage,
      priority: input.priority,
      ownerId,
      contactRoute: input.contactRoute || null,
      tags,
      nextFollowUpAt: followUp,
    },
  });

  revalidateCrm(creator.slug);
  return {
    status: 'success',
    message:
      input.stage === 'do_not_contact'
        ? 'Saved. Nothing outbound will be scheduled or logged for this creator.'
        : 'Relationship saved.',
  };
}

/**
 * What passed between PALMA and the creator.
 *
 * Logging a touchpoint also moves the relationship on where the move is
 * obvious (see `stageAfterTouchpoint`), stamps the last contact, and sets the
 * next follow-up when one is given.
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
    nextFollowUpAt: formData.get('nextFollowUpAt') ?? '',
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
      message:
        'This creator is marked do not contact. Record what they sent PALMA, never an approach.',
    };
  }

  const now = new Date();
  const occurredAt = dayToDate(input.occurredAt) ?? now;
  if (occurredAt.getTime() > now.getTime()) {
    return {
      status: 'error',
      message: 'A touchpoint is something that already happened.',
      errors: { occurredAt: 'Choose today or earlier.' },
    };
  }

  const nextStage = stageAfterTouchpoint(stage, input.direction);
  const followUp = mayContact(nextStage) ? dayToDate(input.nextFollowUpAt) : null;
  const contact = input.direction === 'internal' ? null : occurredAt;

  await withTransaction(async (tx) => {
    await tx`
      insert into "CreatorTouchpoint" (
        id, "creatorId", "authorId", kind, direction, summary, "occurredAt", "createdAt"
      ) values (
        ${createId()},
        ${creator.id},
        ${session.user.id},
        ${input.kind}::"CrmTouchpointKind",
        ${input.direction}::"CrmDirection",
        ${input.summary},
        ${occurredAt},
        ${now}
      )
    `;

    await tx`
      insert into "CreatorRelationship" (
        "creatorId", stage, "lastContactAt", "nextFollowUpAt", "stageChangedAt",
        "createdAt", "updatedAt"
      ) values (
        ${creator.id},
        ${nextStage}::"CrmStage",
        ${contact},
        ${followUp},
        ${now},
        ${now},
        ${now}
      )
      on conflict ("creatorId") do update set
        stage = excluded.stage,
        "lastContactAt" = greatest("CreatorRelationship"."lastContactAt", excluded."lastContactAt"),
        "nextFollowUpAt" = coalesce(excluded."nextFollowUpAt", "CreatorRelationship"."nextFollowUpAt"),
        "stageChangedAt" = case
          when "CreatorRelationship".stage is distinct from excluded.stage then excluded."stageChangedAt"
          else "CreatorRelationship"."stageChangedAt"
        end
    `;
  });

  await recordAudit({
    action: 'crm.touchpoint_logged',
    entityType: 'Creator',
    entityId: creator.id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `${input.direction} ${input.kind} logged for ${creator.displayName}`,
    after: { kind: input.kind, direction: input.direction, stage: nextStage },
  });

  revalidateCrm(creator.slug);
  return {
    status: 'success',
    message:
      nextStage === stage
        ? 'Logged.'
        : `Logged. ${creator.displayName} is now ${CRM_STAGE_LABEL[nextStage].toLowerCase()}.`,
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

  const assigneeId = input.assigneeId || null;
  if (assigneeId && !(await isCrmStaff(assigneeId))) {
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
      ${id},
      ${creator.id},
      ${input.title},
      ${dayToDate(input.dueAt)},
      ${assigneeId},
      ${session.user.id},
      ${now},
      ${now}
    )
  `;

  await recordAudit({
    action: 'crm.task_created',
    entityType: 'CreatorTask',
    entityId: id,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `Task added for ${creator.displayName}`,
    after: { creatorId: creator.id, assigneeId, dueAt: input.dueAt || null },
  });

  revalidateCrm(creator.slug);
  return { status: 'success', message: 'Task added.' };
}

/** Tick a task off, or put it back. Used straight from a form, so it returns nothing. */
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
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary: `Task for ${task.displayName} ${done ? 'completed' : 'reopened'}`,
  });

  revalidateCrm(task.slug);
}
