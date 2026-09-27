-- Season reminders, and two kinds of history the relationship desk writes for
-- itself: a stage move, and a reminder email PALMA sent on its own.

alter type "CrmTouchpointKind" add value if not exists 'stage';
alter type "CrmTouchpointKind" add value if not exists 'reminder';

-- One row per reminder per account per season. The unique key is what makes the
-- daily run safe to repeat: a reminder that went yesterday cannot go again.
create table if not exists "SeasonReminderSend" (
  id text primary key,
  "awardYearId" text not null references "AwardYear" (id) on delete cascade on update cascade,
  milestone text not null,
  "daysBefore" integer not null,
  "userId" text not null references "User" (id) on delete cascade on update cascade,
  "creatorId" text references "Creator" (id) on delete set null on update cascade,
  status text not null,
  "sentAt" timestamp(3) not null default (now() at time zone 'utc'),
  constraint "SeasonReminderSend_once" unique ("awardYearId", milestone, "daysBefore", "userId")
);

create index if not exists "SeasonReminderSend_sentAt_idx"
  on "SeasonReminderSend" ("sentAt" desc);

alter table "SeasonReminderSend" enable row level security;
