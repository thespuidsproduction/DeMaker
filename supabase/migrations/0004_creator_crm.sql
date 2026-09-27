-- The creator relationship desk. Staff-only working material, apart from the
-- record: nothing here is published, shown to the creator, or read by judging.
-- It holds no contact details by design; see src/domain/crm.ts.
--
-- Timestamps follow the rest of the schema: timestamp(3) without time zone,
-- holding UTC wall clock.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'CrmStage') then
    create type "CrmStage" as enum (
      'prospect', 'contacted', 'in_conversation', 'onboarding', 'active', 'dormant', 'do_not_contact'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'CrmPriority') then
    create type "CrmPriority" as enum ('low', 'normal', 'high');
  end if;
  if not exists (select 1 from pg_type where typname = 'CrmContactRoute') then
    create type "CrmContactRoute" as enum (
      'account_email', 'platform_message', 'representative', 'in_person', 'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'CrmTouchpointKind') then
    create type "CrmTouchpointKind" as enum ('email', 'message', 'call', 'meeting', 'event', 'note');
  end if;
  if not exists (select 1 from pg_type where typname = 'CrmDirection') then
    create type "CrmDirection" as enum ('outbound', 'inbound', 'internal');
  end if;
end;
$$;

-- One row per creator the desk has touched. A creator without a row is a
-- prospect nobody owns; the read layer treats the absence that way.
create table if not exists "CreatorRelationship" (
  "creatorId" text primary key references "Creator" (id) on delete cascade on update cascade,
  stage "CrmStage" not null default 'prospect',
  priority "CrmPriority" not null default 'normal',
  "ownerId" text references "User" (id) on delete set null on update cascade,
  "contactRoute" "CrmContactRoute",
  tags text[] not null default '{}',
  "nextFollowUpAt" timestamp(3),
  "lastContactAt" timestamp(3),
  "stageChangedAt" timestamp(3) not null default (now() at time zone 'utc'),
  "createdAt" timestamp(3) not null default (now() at time zone 'utc'),
  "updatedAt" timestamp(3) not null default (now() at time zone 'utc'),
  constraint "CreatorRelationship_tags_bounded" check (cardinality(tags) <= 8)
);

create index if not exists "CreatorRelationship_stage_idx"
  on "CreatorRelationship" (stage);
create index if not exists "CreatorRelationship_ownerId_idx"
  on "CreatorRelationship" ("ownerId");
create index if not exists "CreatorRelationship_nextFollowUpAt_idx"
  on "CreatorRelationship" ("nextFollowUpAt")
  where "nextFollowUpAt" is not null;
create index if not exists "CreatorRelationship_tags_idx"
  on "CreatorRelationship" using gin (tags);

-- What passed between PALMA and the creator. Append-only in the application.
create table if not exists "CreatorTouchpoint" (
  id text primary key,
  "creatorId" text not null references "Creator" (id) on delete cascade on update cascade,
  "authorId" text references "User" (id) on delete set null on update cascade,
  kind "CrmTouchpointKind" not null,
  direction "CrmDirection" not null,
  summary text not null,
  "occurredAt" timestamp(3) not null,
  "createdAt" timestamp(3) not null default (now() at time zone 'utc'),
  constraint "CreatorTouchpoint_summary_length" check (char_length(summary) between 3 and 2000)
);

create index if not exists "CreatorTouchpoint_creator_occurred_idx"
  on "CreatorTouchpoint" ("creatorId", "occurredAt" desc);

-- What somebody at the desk has promised to do next.
create table if not exists "CreatorTask" (
  id text primary key,
  "creatorId" text not null references "Creator" (id) on delete cascade on update cascade,
  title text not null,
  "dueAt" timestamp(3),
  "assigneeId" text references "User" (id) on delete set null on update cascade,
  "createdById" text references "User" (id) on delete set null on update cascade,
  "completedAt" timestamp(3),
  "completedById" text references "User" (id) on delete set null on update cascade,
  "createdAt" timestamp(3) not null default (now() at time zone 'utc'),
  "updatedAt" timestamp(3) not null default (now() at time zone 'utc'),
  constraint "CreatorTask_title_length" check (char_length(title) between 3 and 200)
);

create index if not exists "CreatorTask_creatorId_idx"
  on "CreatorTask" ("creatorId");
create index if not exists "CreatorTask_open_due_idx"
  on "CreatorTask" ("dueAt")
  where "completedAt" is null;
create index if not exists "CreatorTask_assignee_open_idx"
  on "CreatorTask" ("assigneeId")
  where "completedAt" is null;

-- set_updated_at() is defined in 0002. The trigger writes now(), which is the
-- same convention every other updatedAt column already follows.
drop trigger if exists set_updated_at on "CreatorRelationship";
create trigger set_updated_at before update on "CreatorRelationship"
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at on "CreatorTask";
create trigger set_updated_at before update on "CreatorTask"
  for each row execute function set_updated_at();

-- Supabase exposes the public schema through PostgREST. These tables are only
-- ever read by the server with the database role, so keep them out of the
-- anon/authenticated API entirely.
alter table "CreatorRelationship" enable row level security;
alter table "CreatorTouchpoint" enable row level security;
alter table "CreatorTask" enable row level security;
