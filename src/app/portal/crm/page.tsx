import Link from 'next/link';
import {
  AlarmClock,
  BellRing,
  ChevronRight,
  Contact,
  ListTodo,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import { Card, Empty, List, Row, RowText, SectionHead, Tag } from '@/components/desk/surface';
import { Dial, Masthead, Panel, Stat } from '@/components/desk/blocks';
import {
  CRM_TABS,
  FollowUpTag,
  JourneyRail,
  Monogram,
  StageTag,
  Tabs,
} from '@/components/crm/visuals';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { countryName, formatShortDate } from '@/lib/format';
import { CRM_JOURNEY, followUpState, isCrmPriority, isCrmStage, type CrmStage } from '@/domain/crm';
import {
  MILESTONE_PHRASE,
  countdownPhrase,
  daysUntil,
  upcomingReminders,
} from '@/domain/season-reminders';
import {
  getCrmPipeline,
  listCrmCreators,
  listCrmTags,
  listOpenCrmTasks,
  type CrmListFilter,
} from '@/server/data/crm';
import { getReminderSchedule, reminderSeasons } from '@/server/services/season-reminders';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Creator CRM',
  description: 'How PALMA is getting on with the creators on its record.',
  path: '/portal/crm',
  noIndex: true,
});

type Search = {
  q?: string;
  stage?: string;
  owner?: string;
  due?: string;
  tag?: string;
  priority?: string;
};

/** A link to this page with one thing changed and everything else kept. */
function hrefWith(current: Search, change: Partial<Search>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...change })) {
    if (typeof value === 'string' && value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/portal/crm?${query}` : '/portal/crm';
}

export default async function CrmPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requirePermission('crm:view', '/portal/crm');
  const search = await searchParams;
  const now = new Date();

  const filter: CrmListFilter = {
    query: search.q?.trim() || undefined,
    stage: isCrmStage(search.stage) ? search.stage : undefined,
    priority: isCrmPriority(search.priority) ? search.priority : undefined,
    owner: search.owner === 'me' ? session.user.id : search.owner === 'none' ? 'none' : undefined,
    due: search.due === 'overdue' || search.due === 'week' ? search.due : undefined,
    tag: search.tag?.trim() || undefined,
  };

  const [pipeline, rows, tags, myTasks, { schedule }, seasons] = await Promise.all([
    getCrmPipeline(),
    listCrmCreators(filter),
    listCrmTags(12),
    listOpenCrmTasks({ assigneeId: session.user.id, limit: 6 }),
    getReminderSchedule(),
    reminderSeasons(),
  ]);

  const total = Object.values(pipeline.stages).reduce((sum, n) => sum + n, 0);
  const reachable = total - pipeline.stages.do_not_contact;
  const inTouch = CRM_JOURNEY.slice(1).reduce((sum, stage) => sum + pipeline.stages[stage], 0);
  const nextEmail = schedule.enabled ? upcomingReminders(schedule, seasons, now)[0] : undefined;

  const needs = pipeline.overdue;
  const statement =
    needs > 0
      ? `${needs} follow-up${needs === 1 ? ' is' : 's are'} overdue. Start there; everything else can wait its turn.`
      : pipeline.dueThisWeek > 0
        ? `Nothing overdue. ${pipeline.dueThisWeek} follow-up${pipeline.dueThisWeek === 1 ? '' : 's'} coming up this week.`
        : 'Nothing overdue and nothing due this week. A good day to pick up a prospect.';

  const quick: { key: keyof Search; value: string; label: string }[] = [
    { key: 'owner', value: 'me', label: 'Mine' },
    { key: 'due', value: 'overdue', label: 'Overdue' },
    { key: 'priority', value: 'high', label: 'High priority' },
    { key: 'owner', value: 'none', label: 'Nobody owns' },
  ];
  const anyFilter = Object.values(search).some(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <Masthead
        eyebrow="Creator CRM"
        eyebrowIcon={Contact}
        title="Every creator, and where we stand."
        statement={statement}
        aside={
          <Dial
            value={inTouch}
            total={Math.max(1, reachable)}
            caption="in touch with PALMA"
            tone={inTouch >= reachable / 2 ? 'positive' : 'accent'}
          />
        }
      >
        {nextEmail ? (
          <Link href="/portal/crm/reminders">
            <Tag tone="accent">
              <BellRing className="size-3.5" />
              Season email {countdownPhrase(daysUntil(nextEmail.sendOn, now))}:{' '}
              {MILESTONE_PHRASE[nextEmail.reminder.milestone]}{' '}
              {countdownPhrase(nextEmail.reminder.daysBefore)}
            </Tag>
          </Link>
        ) : (
          <Link href="/portal/crm/reminders">
            <Tag>
              <BellRing className="size-3.5" />
              {schedule.enabled ? 'No season email scheduled yet' : 'Season emails paused'}
            </Tag>
          </Link>
        )}
      </Masthead>

      <Tabs items={CRM_TABS} active="/portal/crm" label="Creator CRM" />

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat
          icon={AlarmClock}
          label="Overdue"
          value={pipeline.overdue}
          tone="attention"
          href={hrefWith({}, { due: 'overdue' })}
        />
        <Stat
          icon={AlarmClock}
          label="Due this week"
          value={pipeline.dueThisWeek}
          tone="accent"
          href={hrefWith({}, { due: 'week' })}
        />
        <Stat
          icon={UserPlus}
          label="Nobody looks after"
          value={pipeline.unowned}
          href={hrefWith({}, { owner: 'none' })}
        />
        <Stat icon={ListTodo} label="Open tasks" value={pipeline.openTasks} />
      </div>

      <Card className="glow p-5 pb-4" data-lift="section">
        <JourneyRail
          mode="filter"
          counts={pipeline.stages}
          active={filter.stage ?? null}
          hrefFor={(stage: CrmStage | null) => hrefWith(search, { stage: stage ?? undefined })}
        />
      </Card>

      <div className="grid gap-5 xl:grid-cols-12">
        <section className="flex min-w-0 flex-col gap-3 xl:col-span-8" data-lift="section">
          <div className="flex flex-wrap items-center gap-3">
            <nav className="seg max-w-full flex-wrap" aria-label="Quick filters">
              <Link href="/portal/crm" className="seg-item" data-active={!anyFilter}>
                All
              </Link>
              {quick.map((item) => {
                const active = search[item.key] === item.value;
                return (
                  <Link
                    key={item.label}
                    href={hrefWith(search, { [item.key]: active ? undefined : item.value })}
                    className="seg-item"
                    data-active={active}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <form action="/portal/crm" className="relative ml-auto min-w-0 flex-1 sm:max-w-64">
              {Object.entries(search)
                .filter(([key, value]) => key !== 'q' && typeof value === 'string' && value)
                .map(([key, value]) => (
                  <input key={key} type="hidden" name={key} value={value as string} />
                ))}
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[color:var(--text-quiet)]"
                aria-hidden
              />
              <input
                name="q"
                defaultValue={search.q}
                placeholder="Find a creator"
                aria-label="Find a creator"
                className="h-9 w-full rounded-full border border-[color:var(--line)] bg-[color:var(--surface-1)] pr-3 pl-8 text-sm text-[color:var(--text)] placeholder:text-[color:var(--text-quiet)] focus:border-[color:var(--accent)] focus:outline-none"
              />
            </form>
          </div>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map(({ tag, count }) => (
                <Link
                  key={tag}
                  href={hrefWith(search, { tag: filter.tag === tag ? undefined : tag })}
                >
                  <Tag tone={filter.tag === tag ? 'accent' : 'neutral'}>
                    #{tag}
                    <span className="text-[color:var(--text-quiet)] tabular-nums">{count}</span>
                  </Tag>
                </Link>
              ))}
            </div>
          ) : null}

          {rows.length === 0 ? (
            <Empty
              icon={Users}
              title="Nobody here"
              description="No creator matches this view. Clear a filter to see more."
            />
          ) : (
            <List className="glow" data-lift="list">
              {rows.map((row) => {
                const due = followUpState(row.nextFollowUpAt, now);
                return (
                  <Row
                    key={row.creatorId}
                    href={`/portal/crm/${row.slug}`}
                    className={due === 'overdue' ? 'bg-[color:var(--alert-wash)]/40' : undefined}
                  >
                    <Monogram name={row.displayName} stage={row.stage} />
                    <RowText
                      title={
                        <span className="flex items-center gap-2">
                          {row.displayName}
                          {row.priority === 'high' ? (
                            <span className="dot" data-tone="accent" title="High priority" />
                          ) : null}
                        </span>
                      }
                      note={[
                        countryName(row.countryCode),
                        row.isClaimed ? 'Holds the record' : 'Unclaimed',
                        row.owner ? row.owner.name : 'Nobody looks after',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      noteFromSm
                    />
                    <span className="ml-auto flex shrink-0 items-center gap-2">
                      <span className="hidden sm:inline-flex">
                        <StageTag stage={row.stage} />
                      </span>
                      <FollowUpTag at={row.nextFollowUpAt} now={now} />
                      {row.openTasks > 0 ? (
                        <span className="label hidden text-[10px] tabular-nums md:inline">
                          {row.openTasks} task{row.openTasks === 1 ? '' : 's'}
                        </span>
                      ) : null}
                      <ChevronRight
                        className="size-4 -translate-x-1 text-[color:var(--text-quiet)] opacity-0 transition-all duration-400 group-hover:translate-x-0 group-hover:opacity-100"
                        aria-hidden
                      />
                    </span>
                  </Row>
                );
              })}
            </List>
          )}
          {rows.length === 300 ? (
            <p className="text-xs text-[color:var(--text-quiet)]">
              Showing the first 300. Narrow the view to see the rest.
            </p>
          ) : null}
        </section>

        <aside className="flex min-w-0 flex-col gap-3.5 xl:col-span-4">
          <section data-lift="section">
            <SectionHead icon={ListTodo} title="On your list" />
            {myTasks.length === 0 ? (
              <Card className="glow p-4 text-sm text-[color:var(--text-quiet)]">
                Nothing assigned to you. Tasks you add on a creator land here.
              </Card>
            ) : (
              <List className="glow">
                {myTasks.map((task) => {
                  const taskDue = followUpState(task.dueAt, now);
                  return (
                    <Row key={task.id} href={`/portal/crm/${task.creator.slug}`}>
                      <RowText title={task.title} note={task.creator.displayName} />
                      {task.dueAt ? (
                        <span className="ml-auto shrink-0">
                          <Tag
                            tone={
                              taskDue === 'overdue'
                                ? 'alert'
                                : taskDue === 'today'
                                  ? 'accent'
                                  : 'neutral'
                            }
                          >
                            {taskDue === 'today' ? 'Today' : formatShortDate(task.dueAt)}
                          </Tag>
                        </span>
                      ) : null}
                    </Row>
                  );
                })}
              </List>
            )}
          </section>

          <Panel icon={Contact} title="What the colours mean">
            <span className="flex flex-col gap-1.5">
              <span>
                <Tag>Quiet</Tag> waiting on PALMA to begin.
              </span>
              <span>
                <Tag tone="accent">Gold</Tag> PALMA is making the running.
              </span>
              <span>
                <Tag tone="positive">Green</Tag> the creator is walking with PALMA.
              </span>
              <span>
                <Tag tone="alert">Red</Tag> do not contact. Nothing outbound.
              </span>
            </span>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
