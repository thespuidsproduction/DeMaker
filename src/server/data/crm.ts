import 'server-only';
import { sql } from '@/server/db/sql';
import {
  CRM_STAGES,
  type CrmContactRoute,
  type CrmDirection,
  type CrmPriority,
  type CrmStage,
  type CrmTouchpointKind,
} from '@/domain/crm';

/**
 * The relationship desk read layer.
 *
 * Reads the same Creator and User rows the rest of the back office reads, plus
 * the three relationship tables. A creator with no relationship row is a
 * prospect nobody owns, so every query coalesces rather than requiring a row
 * to exist: the whole archive is the pipeline, not only the part somebody has
 * already touched.
 *
 * Deliberately absent: nomination counts, candidacies and scores. See
 * `src/domain/crm.ts` for why.
 */

/**
 * DateTime columns are `timestamp(3)` without time zone, holding UTC wall
 * clock. Render the same wall-clock UTC ISO string straight out of Postgres so
 * the DTOs do not depend on the session time zone. Returns a raw SQL fragment;
 * only ever called with static, quoted column references.
 */
const isoTs = (ref: string) => sql.unsafe(`to_char(${ref}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);

/**
 * A substring filter escapes LIKE metacharacters before matching; ILIKE with
 * the default backslash escape behaves the same way.
 */
const likePattern = (value: string) => `%${value.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;

const STAFF_ROLES = ['moderator', 'admin', 'super_admin'];

export type CrmStaffMember = { id: string; name: string; email: string };

export type CrmListFilter = {
  query?: string;
  stage?: CrmStage;
  /** A user id, or `none` for relationships nobody owns. */
  owner?: string;
  due?: 'overdue' | 'week';
  tag?: string;
  priority?: CrmPriority;
};

export type CrmListRow = {
  creatorId: string;
  slug: string;
  displayName: string;
  countryCode: string;
  isClaimed: boolean;
  isPublished: boolean;
  stage: CrmStage;
  priority: CrmPriority;
  owner: { id: string; name: string } | null;
  tags: string[];
  nextFollowUpAt: string | null;
  lastContactAt: string | null;
  openTasks: number;
};

export async function listCrmCreators(filter: CrmListFilter = {}): Promise<CrmListRow[]> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekOut = new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000);

  const rows = await sql<
    {
      creatorId: string;
      slug: string;
      displayName: string;
      countryCode: string;
      userId: string | null;
      isPublished: boolean;
      stage: CrmStage;
      priority: CrmPriority;
      ownerId: string | null;
      ownerName: string | null;
      tags: string[] | null;
      nextFollowUpAt: string | null;
      lastContactAt: string | null;
      openTasks: number;
    }[]
  >`
    select
      c.id as "creatorId",
      c.slug,
      c."displayName",
      c."countryCode",
      c."userId",
      c."isPublished",
      coalesce(r.stage, 'prospect') as stage,
      coalesce(r.priority, 'normal') as priority,
      r."ownerId",
      o.name as "ownerName",
      r.tags,
      ${isoTs('r."nextFollowUpAt"')} as "nextFollowUpAt",
      ${isoTs('r."lastContactAt"')} as "lastContactAt",
      (select count(*)::int from "CreatorTask" t
        where t."creatorId" = c.id and t."completedAt" is null) as "openTasks"
    from "Creator" c
    left join "CreatorRelationship" r on r."creatorId" = c.id
    left join "User" o on o.id = r."ownerId"
    where true
      ${
        filter.query
          ? sql`and (c."displayName" ilike ${likePattern(filter.query)}
                 or c.slug ilike ${likePattern(filter.query)})`
          : sql``
      }
      ${
        filter.stage
          ? sql`and coalesce(r.stage, 'prospect'::"CrmStage") = ${filter.stage}::"CrmStage"`
          : sql``
      }
      ${
        filter.priority
          ? sql`and coalesce(r.priority, 'normal'::"CrmPriority") = ${filter.priority}::"CrmPriority"`
          : sql``
      }
      ${filter.owner === 'none' ? sql`and r."ownerId" is null` : sql``}
      ${filter.owner && filter.owner !== 'none' ? sql`and r."ownerId" = ${filter.owner}` : sql``}
      ${filter.due === 'overdue' ? sql`and r."nextFollowUpAt" < ${today}` : sql``}
      ${filter.due === 'week' ? sql`and r."nextFollowUpAt" < ${weekOut}` : sql``}
      ${filter.tag ? sql`and r.tags @> array[${filter.tag}]::text[]` : sql``}
    order by
      (r."nextFollowUpAt" is null) asc,
      r."nextFollowUpAt" asc,
      case coalesce(r.priority, 'normal') when 'high' then 0 when 'normal' then 1 else 2 end,
      c."displayName" asc
    limit 300
  `;

  return rows.map((row) => ({
    creatorId: row.creatorId,
    slug: row.slug,
    displayName: row.displayName,
    countryCode: row.countryCode,
    isClaimed: Boolean(row.userId),
    isPublished: row.isPublished,
    stage: row.stage,
    priority: row.priority,
    owner: row.ownerId && row.ownerName ? { id: row.ownerId, name: row.ownerName } : null,
    tags: row.tags ?? [],
    nextFollowUpAt: row.nextFollowUpAt,
    lastContactAt: row.lastContactAt,
    openTasks: row.openTasks,
  }));
}

export type CrmPipeline = {
  stages: Record<CrmStage, number>;
  overdue: number;
  dueThisWeek: number;
  unowned: number;
  openTasks: number;
};

export async function getCrmPipeline(): Promise<CrmPipeline> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekOut = new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000);

  const [stageRows, [totals]] = await Promise.all([
    sql<{ stage: CrmStage; count: number }[]>`
      select coalesce(r.stage, 'prospect') as stage, count(*)::int as count
      from "Creator" c
      left join "CreatorRelationship" r on r."creatorId" = c.id
      group by 1
    `,
    sql<{ overdue: number; dueThisWeek: number; unowned: number; openTasks: number }[]>`
      select
        (select count(*)::int from "CreatorRelationship"
          where "nextFollowUpAt" < ${today}) as overdue,
        (select count(*)::int from "CreatorRelationship"
          where "nextFollowUpAt" >= ${today} and "nextFollowUpAt" < ${weekOut}) as "dueThisWeek",
        (select count(*)::int from "Creator" c
          left join "CreatorRelationship" r on r."creatorId" = c.id
          where r."ownerId" is null
            and coalesce(r.stage, 'prospect'::"CrmStage") <> 'do_not_contact') as unowned,
        (select count(*)::int from "CreatorTask" where "completedAt" is null) as "openTasks"
    `,
  ]);

  const stages = Object.fromEntries(CRM_STAGES.map((stage) => [stage, 0])) as Record<
    CrmStage,
    number
  >;
  for (const row of stageRows) stages[row.stage] = row.count;

  return {
    stages,
    overdue: totals?.overdue ?? 0,
    dueThisWeek: totals?.dueThisWeek ?? 0,
    unowned: totals?.unowned ?? 0,
    openTasks: totals?.openTasks ?? 0,
  };
}

export type CrmTaskRow = {
  id: string;
  title: string;
  dueAt: string | null;
  completedAt: string | null;
  assignee: { id: string; name: string } | null;
  creator: { slug: string; displayName: string };
};

/** Open tasks across the desk, soonest first. */
export async function listOpenCrmTasks(
  filter: { assigneeId?: string; limit?: number } = {},
): Promise<CrmTaskRow[]> {
  const rows = await sql<
    {
      id: string;
      title: string;
      dueAt: string | null;
      assigneeId: string | null;
      assigneeName: string | null;
      slug: string;
      displayName: string;
    }[]
  >`
    select
      t.id,
      t.title,
      ${isoTs('t."dueAt"')} as "dueAt",
      t."assigneeId",
      a.name as "assigneeName",
      c.slug,
      c."displayName"
    from "CreatorTask" t
    join "Creator" c on c.id = t."creatorId"
    left join "User" a on a.id = t."assigneeId"
    where t."completedAt" is null
      ${filter.assigneeId ? sql`and t."assigneeId" = ${filter.assigneeId}` : sql``}
    order by (t."dueAt" is null) asc, t."dueAt" asc, t."createdAt" asc
    limit ${filter.limit ?? 20}
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    dueAt: row.dueAt,
    completedAt: null,
    assignee:
      row.assigneeId && row.assigneeName ? { id: row.assigneeId, name: row.assigneeName } : null,
    creator: { slug: row.slug, displayName: row.displayName },
  }));
}

export type CrmTouchpoint = {
  id: string;
  kind: CrmTouchpointKind;
  direction: CrmDirection;
  summary: string;
  occurredAt: string;
  author: string | null;
};

export type CrmCreator = {
  creatorId: string;
  slug: string;
  displayName: string;
  countryCode: string;
  isPublished: boolean;
  isSuspended: boolean;
  /** The account holder, when there is one. Their account email is the route. */
  heldBy: { name: string; email: string } | null;
  verificationStatus: string;
  activeHonours: number;
  links: { id: string; label: string; url: string }[];
  relationship: {
    exists: boolean;
    stage: CrmStage;
    priority: CrmPriority;
    owner: { id: string; name: string } | null;
    contactRoute: CrmContactRoute | null;
    tags: string[];
    nextFollowUpAt: string | null;
    lastContactAt: string | null;
    stageChangedAt: string | null;
  };
  touchpoints: CrmTouchpoint[];
  tasks: {
    id: string;
    title: string;
    dueAt: string | null;
    completedAt: string | null;
    assignee: { id: string; name: string } | null;
  }[];
};

export async function getCrmCreator(slug: string): Promise<CrmCreator | null> {
  const [creator] = await sql<
    {
      id: string;
      slug: string;
      displayName: string;
      countryCode: string;
      isPublished: boolean;
      isSuspended: boolean;
      holderName: string | null;
      holderEmail: string | null;
      verificationStatus: string | null;
      activeHonours: number;
      hasRelationship: boolean;
      stage: CrmStage | null;
      priority: CrmPriority | null;
      ownerId: string | null;
      ownerName: string | null;
      contactRoute: CrmContactRoute | null;
      tags: string[] | null;
      nextFollowUpAt: string | null;
      lastContactAt: string | null;
      stageChangedAt: string | null;
    }[]
  >`
    select
      c.id,
      c.slug,
      c."displayName",
      c."countryCode",
      c."isPublished",
      c."isSuspended",
      u.name as "holderName",
      u.email as "holderEmail",
      cv.status as "verificationStatus",
      (select count(*)::int from "Honour" h
        where h."creatorId" = c.id and h.state = 'active') as "activeHonours",
      (r."creatorId" is not null) as "hasRelationship",
      r.stage,
      r.priority,
      r."ownerId",
      o.name as "ownerName",
      r."contactRoute",
      r.tags,
      ${isoTs('r."nextFollowUpAt"')} as "nextFollowUpAt",
      ${isoTs('r."lastContactAt"')} as "lastContactAt",
      ${isoTs('r."stageChangedAt"')} as "stageChangedAt"
    from "Creator" c
    left join "User" u on u.id = c."userId"
    left join "CreatorVerification" cv on cv."creatorId" = c.id
    left join "CreatorRelationship" r on r."creatorId" = c.id
    left join "User" o on o.id = r."ownerId"
    where c.slug = ${slug}
    limit 1
  `;

  if (!creator) return null;

  const [links, touchpoints, tasks] = await Promise.all([
    sql<{ id: string; label: string; url: string }[]>`
      select id, label, url
      from "CreatorLink"
      where "creatorId" = ${creator.id}
      order by position asc
    `,
    sql<CrmTouchpoint[]>`
      select
        t.id,
        t.kind,
        t.direction,
        t.summary,
        ${isoTs('t."occurredAt"')} as "occurredAt",
        coalesce(a.name, a.email) as author
      from "CreatorTouchpoint" t
      left join "User" a on a.id = t."authorId"
      where t."creatorId" = ${creator.id}
      order by t."occurredAt" desc, t."createdAt" desc
      limit 100
    `,
    sql<
      {
        id: string;
        title: string;
        dueAt: string | null;
        completedAt: string | null;
        assigneeId: string | null;
        assigneeName: string | null;
      }[]
    >`
      select
        t.id,
        t.title,
        ${isoTs('t."dueAt"')} as "dueAt",
        ${isoTs('t."completedAt"')} as "completedAt",
        t."assigneeId",
        a.name as "assigneeName"
      from "CreatorTask" t
      left join "User" a on a.id = t."assigneeId"
      where t."creatorId" = ${creator.id}
        and (t."completedAt" is null
          or t."completedAt" > (now() at time zone 'utc') - interval '90 days')
      order by (t."completedAt" is not null) asc, (t."dueAt" is null) asc, t."dueAt" asc,
        t."completedAt" desc
      limit 50
    `,
  ]);

  return {
    creatorId: creator.id,
    slug: creator.slug,
    displayName: creator.displayName,
    countryCode: creator.countryCode,
    isPublished: creator.isPublished,
    isSuspended: creator.isSuspended,
    heldBy:
      creator.holderEmail && creator.holderName
        ? { name: creator.holderName, email: creator.holderEmail }
        : null,
    verificationStatus: creator.verificationStatus ?? 'unverified',
    activeHonours: creator.activeHonours,
    links,
    relationship: {
      exists: creator.hasRelationship,
      stage: creator.stage ?? 'prospect',
      priority: creator.priority ?? 'normal',
      owner:
        creator.ownerId && creator.ownerName
          ? { id: creator.ownerId, name: creator.ownerName }
          : null,
      contactRoute: creator.contactRoute,
      tags: creator.tags ?? [],
      nextFollowUpAt: creator.nextFollowUpAt,
      lastContactAt: creator.lastContactAt,
      stageChangedAt: creator.stageChangedAt,
    },
    touchpoints,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      dueAt: task.dueAt,
      completedAt: task.completedAt,
      assignee:
        task.assigneeId && task.assigneeName
          ? { id: task.assigneeId, name: task.assigneeName }
          : null,
    })),
  };
}

/** The people a relationship can be given to: active staff accounts. */
export async function listCrmStaff(): Promise<CrmStaffMember[]> {
  return sql<CrmStaffMember[]>`
    select id, name, email
    from "User"
    where role::text in ${sql(STAFF_ROLES)}
      and "isActive" = true
    order by name asc
  `;
}

/** Whether a user id belongs to an active member of staff. */
export async function isCrmStaff(userId: string): Promise<boolean> {
  const [row] = await sql<{ ok: boolean }[]>`
    select true as ok
    from "User"
    where id = ${userId}
      and role::text in ${sql(STAFF_ROLES)}
      and "isActive" = true
    limit 1
  `;
  return Boolean(row?.ok);
}

/** Every tag in use, most used first, for the filter row. */
export async function listCrmTags(limit = 24): Promise<{ tag: string; count: number }[]> {
  return sql<{ tag: string; count: number }[]>`
    select tag, count(*)::int as count
    from "CreatorRelationship", unnest(tags) as tag
    group by tag
    order by count desc, tag asc
    limit ${limit}
  `;
}
