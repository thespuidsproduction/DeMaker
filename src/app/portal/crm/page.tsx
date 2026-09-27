import Link from 'next/link';
import { EmptyState } from '@/components/ui/feedback';
import { Badge, Pill } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Stat } from '@/components/ui/stat';
import { CrmStageBadge } from '@/components/operations/CrmStageBadge';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { countryName, formatShortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  CRM_PRIORITY_LABEL,
  CRM_STAGES,
  CRM_STAGE_LABEL,
  followUpState,
  isCrmPriority,
  isCrmStage,
} from '@/domain/crm';
import {
  getCrmPipeline,
  listCrmCreators,
  listCrmTags,
  listOpenCrmTasks,
  type CrmListFilter,
} from '@/server/data/crm';

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

/** Build a filter link that keeps the rest of the current view. */
function hrefWith(current: Search, change: Partial<Search>): string {
  const next = { ...current, ...change };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/portal/crm?${query}` : '/portal/crm';
}

export default async function CrmPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requirePermission('crm:view', '/portal/crm');
  const search = await searchParams;

  const filter: CrmListFilter = {
    query: search.q?.trim() || undefined,
    stage: isCrmStage(search.stage) ? search.stage : undefined,
    priority: isCrmPriority(search.priority) ? search.priority : undefined,
    owner: search.owner === 'me' ? session.user.id : search.owner === 'none' ? 'none' : undefined,
    due: search.due === 'overdue' || search.due === 'week' ? search.due : undefined,
    tag: search.tag?.trim() || undefined,
  };

  const [pipeline, rows, tags, myTasks] = await Promise.all([
    getCrmPipeline(),
    listCrmCreators(filter),
    listCrmTags(),
    listOpenCrmTasks({ assigneeId: session.user.id, limit: 8 }),
  ]);

  const now = new Date();

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">The relationship desk</span>
        <h1 className="text-4xl">Creator CRM</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Who looks after each creator, where the relationship has got to, and what was promised
          next. Staff only: never published, never shown to the creator, and never read by judging.
          Record the route to a creator, never their address.
        </p>
      </div>

      <div className="border-stone-deep mt-10 grid grid-cols-2 gap-6 border-y py-6 sm:grid-cols-4">
        <Link href={hrefWith({}, { due: 'overdue' })} className="hover:text-olive">
          <Stat label="Follow-ups overdue" value={pipeline.overdue} />
        </Link>
        <Link href={hrefWith({}, { due: 'week' })} className="hover:text-olive">
          <Stat label="Due in the next week" value={pipeline.dueThisWeek} />
        </Link>
        <Link href={hrefWith({}, { owner: 'none' })} className="hover:text-olive">
          <Stat label="Nobody owns" value={pipeline.unowned} />
        </Link>
        <Stat label="Open tasks" value={pipeline.openTasks} />
      </div>

      {/* The pipeline, every stage present, in order. Each is a filter. */}
      <nav aria-label="Pipeline" className="mt-8 flex flex-wrap gap-2">
        <Link href={hrefWith(search, { stage: undefined })}>
          <Pill active={!filter.stage}>
            All · {CRM_STAGES.reduce((sum, stage) => sum + pipeline.stages[stage], 0)}
          </Pill>
        </Link>
        {CRM_STAGES.map((stage) => (
          <Link key={stage} href={hrefWith(search, { stage })}>
            <Pill active={filter.stage === stage}>
              {CRM_STAGE_LABEL[stage]} · {pipeline.stages[stage]}
            </Pill>
          </Link>
        ))}
      </nav>

      <div className="border-stone-deep mt-6 flex flex-wrap items-center gap-6 border-b pb-4">
        <nav aria-label="CRM filters" className="flex flex-wrap gap-6">
          {(
            [
              [
                hrefWith(search, { owner: search.owner === 'me' ? undefined : 'me' }),
                'Mine',
                search.owner === 'me',
              ],
              [
                hrefWith(search, { due: search.due === 'overdue' ? undefined : 'overdue' }),
                'Overdue',
                search.due === 'overdue',
              ],
              [
                hrefWith(search, { priority: search.priority === 'high' ? undefined : 'high' }),
                'High priority',
                search.priority === 'high',
              ],
              [
                hrefWith(search, { owner: search.owner === 'none' ? undefined : 'none' }),
                'Unowned',
                search.owner === 'none',
              ],
              ['/portal/crm', 'Clear', false],
            ] as const
          ).map(([href, label, active]) => (
            <Link
              key={label}
              href={href}
              className={cn('palma-label hover:text-ink', active ? 'text-ink' : 'text-taupe-deep')}
              aria-current={active ? 'true' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>

        <form
          action="/portal/crm"
          className="flex min-w-0 flex-1 items-center gap-2 sm:ml-auto sm:flex-none"
        >
          {Object.entries(search)
            .filter(([key, value]) => key !== 'q' && value)
            .map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          <label htmlFor="crm-q" className="sr-only">
            Search creators
          </label>
          <input
            id="crm-q"
            name="q"
            defaultValue={search.q}
            placeholder="Search by name"
            className="border-stone-deep bg-ivory-bright text-ink placeholder:text-taupe focus:border-olive h-10 w-full min-w-0 border px-3 text-sm focus:outline-none sm:w-48"
          />
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
      </div>

      {tags.length > 0 ? (
        <nav aria-label="Tags" className="mt-4 flex flex-wrap gap-2">
          {tags.map(({ tag, count }) => (
            <Link key={tag} href={hrefWith(search, { tag: filter.tag === tag ? undefined : tag })}>
              <Badge variant={filter.tag === tag ? 'ink' : 'default'}>
                #{tag} · {count}
              </Badge>
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="mt-6 grid gap-14 xl:grid-cols-12">
        <section className="min-w-0 xl:col-span-9" aria-label="Creators">
          {rows.length === 0 ? (
            <EmptyState
              className="mt-6"
              title="Nobody here"
              description="No creator matches this view."
            />
          ) : (
            <ul className="flex flex-col">
              {rows.map((row) => {
                const due = followUpState(row.nextFollowUpAt, now);
                return (
                  <li key={row.creatorId}>
                    <Link
                      href={`/portal/crm/${row.slug}`}
                      className="palma-row border-stone-deep grid gap-3 border-b py-5 sm:grid-cols-12 sm:items-baseline sm:gap-6"
                    >
                      <span className="min-w-0 sm:col-span-4">
                        <span className="palma-row-lead font-display block text-xl">
                          {row.displayName}
                        </span>
                        <span className="text-taupe mt-1 block text-xs">
                          {countryName(row.countryCode)} · {row.isClaimed ? 'Claimed' : 'Unclaimed'}
                          {row.tags.length > 0
                            ? ` · ${row.tags.map((t) => `#${t}`).join(' ')}`
                            : ''}
                        </span>
                      </span>

                      <span className="flex flex-wrap items-center gap-2 sm:col-span-3">
                        <CrmStageBadge stage={row.stage} />
                        {row.priority === 'high' ? (
                          <Badge variant="champagne">{CRM_PRIORITY_LABEL.high}</Badge>
                        ) : null}
                      </span>

                      <span className="text-taupe-deep text-sm sm:col-span-2">
                        {row.owner?.name ?? 'Unowned'}
                      </span>

                      <span className="text-sm sm:col-span-3 sm:text-right">
                        {row.nextFollowUpAt ? (
                          <span
                            className={cn(
                              due === 'overdue' ? 'font-medium text-red-900' : 'text-taupe-deep',
                            )}
                          >
                            {due === 'overdue'
                              ? 'Overdue · '
                              : due === 'today'
                                ? 'Today · '
                                : 'Next · '}
                            {formatShortDate(row.nextFollowUpAt)}
                          </span>
                        ) : (
                          <span className="text-taupe">No follow-up</span>
                        )}
                        <span className="text-taupe mt-1 block text-xs">
                          {row.lastContactAt
                            ? `Last contact ${formatShortDate(row.lastContactAt)}`
                            : 'Never contacted'}
                          {row.openTasks > 0
                            ? ` · ${row.openTasks} task${row.openTasks === 1 ? '' : 's'}`
                            : ''}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {rows.length === 300 ? (
            <p className="text-taupe mt-4 text-xs">
              Showing the first 300. Narrow the view to see the rest.
            </p>
          ) : null}
        </section>

        <aside className="flex min-w-0 flex-col gap-4 xl:col-span-3" aria-label="My tasks">
          <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
            My open tasks
          </h2>
          {myTasks.length === 0 ? (
            <p className="text-taupe text-sm">Nothing assigned to you.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {myTasks.map((task) => {
                const due = followUpState(task.dueAt, now);
                return (
                  <li key={task.id} className="border-stone-deep/60 border-l-2 pl-4">
                    <Link
                      href={`/portal/crm/${task.creator.slug}`}
                      className="hover:text-olive block text-sm leading-snug"
                    >
                      {task.title}
                    </Link>
                    <p className="text-taupe mt-1 text-xs">
                      {task.creator.displayName}
                      {task.dueAt ? (
                        <span className={cn(due === 'overdue' && 'text-red-900')}>
                          {' '}
                          · {formatShortDate(task.dueAt)}
                        </span>
                      ) : null}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </>
  );
}
