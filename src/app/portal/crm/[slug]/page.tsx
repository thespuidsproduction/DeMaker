import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Notice } from '@/components/ui/feedback';
import { SubmitButton } from '@/components/ui/submit-button';
import { CrmStageBadge } from '@/components/operations/CrmStageBadge';
import { RelationshipForm, TaskForm, TouchpointForm } from '@/components/operations/CrmForms';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { countryName, formatDate, formatShortDate } from '@/lib/format';
import { cn, titleCase } from '@/lib/utils';
import {
  CRM_CONTACT_ROUTE_LABEL,
  CRM_DIRECTION_LABEL,
  CRM_PRIORITY_LABEL,
  CRM_STAGE_DETAIL,
  CRM_TOUCHPOINT_KIND_LABEL,
  followUpState,
} from '@/domain/crm';
import { toggleCrmTask } from '@/server/actions/crm';
import { getCrmCreator, listCrmStaff } from '@/server/data/crm';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Creator relationship',
  description: 'The relationship desk for one creator.',
  path: '/portal/crm',
  noIndex: true,
});

export default async function CrmCreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requirePermission('crm:view', `/portal/crm/${slug}`);

  const [creator, staff] = await Promise.all([getCrmCreator(slug), listCrmStaff()]);
  if (!creator) notFound();

  const canManage = can(session.user.role, 'crm:manage');
  const { relationship } = creator;
  const now = new Date();
  const due = followUpState(relationship.nextFollowUpAt, now);
  const staffOptions = staff.map((member) => ({ id: member.id, name: member.name }));
  const openTasks = creator.tasks.filter((task) => !task.completedAt);
  const doneTasks = creator.tasks.filter((task) => task.completedAt);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <Link href="/portal/crm" className="palma-label text-taupe-deep hover:text-ink">
          ← Creator CRM
        </Link>
        <div className="flex flex-wrap gap-6">
          {can(session.user.role, 'creators:view_records') ? (
            <Link
              href={`/portal/creators/${creator.slug}`}
              className="palma-link text-taupe-deep text-sm"
            >
              The creator record
            </Link>
          ) : null}
          {creator.isPublished ? (
            <Link href={`/creators/${creator.slug}`} className="palma-link text-taupe-deep text-sm">
              The public page
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Relationship</span>
        <h1 className="text-4xl">{creator.displayName}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <CrmStageBadge stage={relationship.stage} />
          {relationship.priority !== 'normal' ? (
            <Badge variant={relationship.priority === 'high' ? 'champagne' : 'muted'}>
              {CRM_PRIORITY_LABEL[relationship.priority]} priority
            </Badge>
          ) : null}
          <Badge variant={creator.heldBy ? 'olive' : 'muted'}>
            {creator.heldBy ? 'Claimed' : 'Unclaimed'}
          </Badge>
          {creator.isSuspended ? <Badge variant="muted">Suspended</Badge> : null}
          {relationship.tags.map((tag) => (
            <Link key={tag} href={`/portal/crm?tag=${encodeURIComponent(tag)}`}>
              <Badge>#{tag}</Badge>
            </Link>
          ))}
        </div>
        <p className="text-taupe-deep text-sm">{CRM_STAGE_DETAIL[relationship.stage]}</p>
      </div>

      <dl className="border-stone-deep mt-10 grid grid-cols-2 gap-6 border-y py-6 text-sm sm:grid-cols-4">
        {(
          [
            ['Owner', relationship.owner?.name ?? 'Nobody yet'],
            [
              'Next follow-up',
              relationship.nextFollowUpAt
                ? `${due === 'overdue' ? 'Overdue · ' : ''}${formatShortDate(relationship.nextFollowUpAt)}`
                : '—',
            ],
            [
              'Last contact',
              relationship.lastContactAt ? formatShortDate(relationship.lastContactAt) : 'Never',
            ],
            [
              'Reached by',
              relationship.contactRoute
                ? CRM_CONTACT_ROUTE_LABEL[relationship.contactRoute]
                : 'Not decided',
            ],
          ] as const
        ).map(([term, value]) => (
          <div key={term} className="flex flex-col gap-1.5">
            <dt className="palma-label text-taupe-deep">{term}</dt>
            <dd className={cn(term === 'Next follow-up' && due === 'overdue' && 'text-red-900')}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="flex min-w-0 flex-col gap-14 lg:col-span-7">
          {canManage ? (
            <section>
              <h2 className="palma-label text-taupe-deep border-stone-deep mb-6 border-b pb-3">
                Log a touchpoint
              </h2>
              <TouchpointForm creatorId={creator.creatorId} stage={relationship.stage} />
            </section>
          ) : null}

          <section>
            <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">History</h2>
            {creator.touchpoints.length === 0 ? (
              <p className="text-taupe mt-6 text-sm">
                Nothing has passed between PALMA and them yet.
              </p>
            ) : (
              <ol className="mt-6 flex flex-col gap-6">
                {creator.touchpoints.map((touchpoint) => (
                  <li
                    key={touchpoint.id}
                    className={cn(
                      'border-l-2 pl-4',
                      touchpoint.direction === 'inbound'
                        ? 'border-olive'
                        : touchpoint.direction === 'internal'
                          ? 'border-stone-deep/60'
                          : 'border-champagne-deep',
                    )}
                  >
                    <p className="palma-label text-taupe-deep">
                      {CRM_TOUCHPOINT_KIND_LABEL[touchpoint.kind]} ·{' '}
                      {CRM_DIRECTION_LABEL[touchpoint.direction]}
                    </p>
                    <p className="text-ink/85 mt-2 text-sm leading-relaxed whitespace-pre-line">
                      {touchpoint.summary}
                    </p>
                    <p className="text-taupe mt-2 text-xs">
                      {touchpoint.author ?? 'PALMA'} · {formatDate(touchpoint.occurredAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-10 lg:col-span-5">
          <section className="border-stone-deep border p-6">
            <h2 className="palma-label text-taupe-deep mb-5">Relationship</h2>
            {canManage ? (
              <RelationshipForm
                // Remount when the saved values move, so a stage changed by a
                // touchpoint shows here without a reload.
                key={[
                  relationship.stage,
                  relationship.priority,
                  relationship.owner?.id,
                  relationship.contactRoute,
                  relationship.nextFollowUpAt,
                  relationship.tags.join(','),
                ].join('|')}
                creatorId={creator.creatorId}
                staff={staffOptions}
                relationship={{
                  stage: relationship.stage,
                  priority: relationship.priority,
                  ownerId: relationship.owner?.id ?? null,
                  contactRoute: relationship.contactRoute,
                  tags: relationship.tags,
                  nextFollowUpAt: relationship.nextFollowUpAt,
                }}
              />
            ) : (
              <p className="text-taupe text-sm">Read-only for your role.</p>
            )}
            {relationship.stageChangedAt ? (
              <p className="text-taupe mt-5 text-xs">
                At this stage since {formatDate(relationship.stageChangedAt)}.
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">Tasks</h2>

            {openTasks.length === 0 ? (
              <p className="text-taupe mt-5 text-sm">No open tasks.</p>
            ) : (
              <ul className="mt-4 flex flex-col">
                {openTasks.map((task) => {
                  const taskDue = followUpState(task.dueAt, now);
                  return (
                    <li
                      key={task.id}
                      className="border-stone-deep/60 flex items-start justify-between gap-4 border-b py-3 last:border-none"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm leading-snug">{task.title}</span>
                        <span className="text-taupe mt-1 block text-xs">
                          {task.assignee?.name ?? 'Unassigned'}
                          {task.dueAt ? (
                            <span className={cn(taskDue === 'overdue' && 'text-red-900')}>
                              {' '}
                              · due {formatShortDate(task.dueAt)}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      {canManage ? (
                        <form action={toggleCrmTask}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <input type="hidden" name="done" value="true" />
                          <SubmitButton variant="outline" size="sm" pendingLabel="…">
                            Done
                          </SubmitButton>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            {canManage ? (
              <div className="border-stone-deep mt-6 border-t pt-6">
                <TaskForm
                  creatorId={creator.creatorId}
                  staff={staffOptions}
                  defaultAssigneeId={relationship.owner?.id ?? session.user.id}
                />
              </div>
            ) : null}

            {doneTasks.length > 0 ? (
              <details className="mt-6">
                <summary className="palma-label text-taupe-deep cursor-pointer">
                  Done in the last 90 days · {doneTasks.length}
                </summary>
                <ul className="mt-3 flex flex-col">
                  {doneTasks.map((task) => (
                    <li
                      key={task.id}
                      className="border-stone-deep/60 flex items-start justify-between gap-4 border-b py-3 last:border-none"
                    >
                      <span className="text-taupe min-w-0 text-sm line-through">{task.title}</span>
                      {canManage ? (
                        <form action={toggleCrmTask}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <input type="hidden" name="done" value="false" />
                          <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                            Reopen
                          </SubmitButton>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>

          <section className="border-stone-deep border p-6">
            <h2 className="palma-label text-taupe-deep mb-4">On the record</h2>
            <dl className="flex flex-col gap-3 text-sm">
              {(
                [
                  ['Country', countryName(creator.countryCode)],
                  ['Held by', creator.heldBy ? creator.heldBy.name : 'Unclaimed'],
                  ['Verification', titleCase(creator.verificationStatus)],
                  ['Active honours', String(creator.activeHonours)],
                  ['Published', creator.isPublished ? 'Yes' : 'No'],
                ] as const
              ).map(([term, value]) => (
                <div key={term} className="flex justify-between gap-4">
                  <dt className="text-taupe">{term}</dt>
                  <dd className="text-right break-all">{value}</dd>
                </div>
              ))}
            </dl>

            {creator.heldBy && relationship.contactRoute === 'account_email' ? (
              <p className="text-taupe-deep border-stone-deep mt-5 border-t pt-4 text-xs leading-relaxed">
                Account email: <span className="text-ink break-all">{creator.heldBy.email}</span>.
                Held on the account the creator controls, not copied here.
              </p>
            ) : null}

            {creator.links.length > 0 ? (
              <ul className="border-stone-deep mt-5 flex flex-col gap-2 border-t pt-4 text-sm">
                {creator.links.map((link) => (
                  <li
                    key={link.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-4"
                  >
                    <span className="palma-label text-taupe-deep">{link.label}</span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="palma-link min-w-0 break-all"
                    >
                      {link.url}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {!creator.heldBy && relationship.contactRoute === 'account_email' ? (
            <Notice tone="warning" title="No account to write to">
              This record is unclaimed, so there is no account email. Reach them through the links
              they published, and invite them to claim the record.
            </Notice>
          ) : null}
        </div>
      </div>
    </>
  );
}
