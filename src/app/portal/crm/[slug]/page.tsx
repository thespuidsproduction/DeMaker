import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Circle,
  Contact,
  ListTodo,
  MessageCircle,
  Settings2,
  UserCheck,
} from 'lucide-react';
import { Card, Facts, Row, RowText, SectionHead, Tag } from '@/components/desk/surface';
import { PageHead, Panel, Section } from '@/components/desk/blocks';
import { DetailsForm, QuickLog, TaskQuickAdd } from '@/components/crm/forms';
import {
  FollowUpTag,
  HistoryStream,
  JourneyRail,
  Monogram,
  StageTag,
  Tabs,
} from '@/components/crm/visuals';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { countryName, formatShortDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';
import { CRM_STAGE_DETAIL, FOLLOW_UP_CHOICES, followUpState, mayContact } from '@/domain/crm';
import { setFollowUp, setStage, takeRelationship, toggleCrmTask } from '@/server/actions/crm';
import { getCrmCreator, listCrmStaff } from '@/server/data/crm';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Creator relationship',
  description: 'The relationship desk for one creator.',
  path: '/portal/crm',
  noIndex: true,
});

function ago(iso: string | null, now: Date): string {
  if (!iso) return 'never';
  const days = Math.round((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 45) return `${days} days ago`;
  return formatShortDate(iso);
}

export default async function CrmCreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requirePermission('crm:view', `/portal/crm/${slug}`);

  const [creator, staff] = await Promise.all([getCrmCreator(slug), listCrmStaff()]);
  if (!creator) notFound();

  const now = new Date();
  const canManage = can(session.user.role, 'crm:manage');
  const { relationship } = creator;
  const contactable = mayContact(relationship.stage);
  const mine = relationship.owner?.id === session.user.id;
  const openTasks = creator.tasks.filter((task) => !task.completedAt);
  const due = followUpState(relationship.nextFollowUpAt, now);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/portal/crm"
        className="label inline-flex items-center gap-1.5 self-start hover:text-[color:var(--text)]"
      >
        <ArrowLeft className="size-3.5" /> Creator CRM
      </Link>

      <PageHead
        eyebrow="Relationship"
        eyebrowIcon={Contact}
        title={creator.displayName}
        statement={`${CRM_STAGE_DETAIL[relationship.stage]} Last contact ${ago(relationship.lastContactAt, now)}.`}
        aside={<Monogram name={creator.displayName} stage={relationship.stage} size="lg" />}
      >
        <StageTag stage={relationship.stage} />
        {relationship.priority === 'high' ? <Tag tone="accent">High priority</Tag> : null}
        <Tag tone={creator.heldBy ? 'positive' : 'neutral'}>
          {creator.heldBy ? 'Holds the record' : 'Unclaimed'}
        </Tag>
        {relationship.tags.map((tag) => (
          <Link key={tag} href={`/portal/crm?tag=${encodeURIComponent(tag)}`}>
            <Tag>#{tag}</Tag>
          </Link>
        ))}
        <span className="ml-auto flex items-center gap-2 text-[0.8125rem] text-[color:var(--text-soft)]">
          <UserCheck className="size-3.5" />
          {relationship.owner ? relationship.owner.name : 'Nobody looks after them yet'}
          {canManage && !mine ? (
            <form action={takeRelationship}>
              <input type="hidden" name="creatorId" value={creator.creatorId} />
              <button
                type="submit"
                className="rounded-full border border-[color:var(--line)] px-2.5 py-0.5 text-[0.75rem] font-medium text-[color:var(--text)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              >
                {relationship.owner ? 'Take over' : "I'll take it"}
              </button>
            </form>
          ) : null}
        </span>
      </PageHead>

      <Tabs
        label="Relationship"
        active={`/portal/crm/${creator.slug}`}
        items={[
          { href: `/portal/crm/${creator.slug}`, label: 'Overview' },
          {
            href: `/portal/crm/${creator.slug}/history`,
            label: 'History',
            count: creator.touchpointCount,
          },
        ]}
      />

      <Card className="glow p-5 pb-4" data-lift="section">
        <JourneyRail
          mode="move"
          stage={relationship.stage}
          creatorId={creator.creatorId}
          action={canManage ? setStage : undefined}
        />
        {canManage ? (
          <p className="mt-3 text-center text-[0.75rem] text-[color:var(--text-quiet)]">
            Tap a stop to move them. The move goes into their history.
          </p>
        ) : null}
      </Card>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-7">
          {canManage ? (
            <Section icon={MessageCircle} title="Log contact">
              <QuickLog creatorId={creator.creatorId} contactable={contactable} />
            </Section>
          ) : null}

          <section data-lift="section">
            <SectionHead
              icon={BookOpen}
              title="Latest"
              action={
                creator.touchpointCount > creator.touchpoints.length ? (
                  <Link
                    href={`/portal/crm/${creator.slug}/history`}
                    className="label inline-flex items-center gap-1 hover:text-[color:var(--text)]"
                  >
                    All {creator.touchpointCount} <ArrowRight className="size-3" />
                  </Link>
                ) : null
              }
            />
            <Card className="glow px-4 py-2">
              {creator.touchpoints.length === 0 ? (
                <p className="py-6 text-center text-sm text-[color:var(--text-quiet)]">
                  Nothing yet. The first note starts the story.
                </p>
              ) : (
                <HistoryStream entries={creator.touchpoints} />
              )}
            </Card>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-5 xl:col-span-5">
          <Panel
            icon={AlarmClock}
            title="Next follow-up"
            tone={due === 'overdue' ? 'alert' : due === 'none' ? 'neutral' : 'accent'}
            badge={<FollowUpTag at={relationship.nextFollowUpAt} now={now} />}
          >
            {!contactable ? (
              'Marked do not contact, so there is nothing to follow up.'
            ) : canManage ? (
              <form action={setFollowUp} className="flex flex-wrap gap-1.5">
                <input type="hidden" name="creatorId" value={creator.creatorId} />
                {FOLLOW_UP_CHOICES.map((choice) => (
                  <button
                    key={choice.days}
                    type="submit"
                    name="days"
                    value={choice.days}
                    className="rounded-full border border-[color:var(--line)] px-3 py-1 text-[0.75rem] text-[color:var(--text-soft)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--text)]"
                  >
                    {choice.label}
                  </button>
                ))}
                {relationship.nextFollowUpAt ? (
                  <button
                    type="submit"
                    name="days"
                    value="0"
                    className="rounded-full px-3 py-1 text-[0.75rem] text-[color:var(--text-quiet)] hover:text-[color:var(--alert)]"
                  >
                    Clear
                  </button>
                ) : null}
              </form>
            ) : (
              'Read-only for your role.'
            )}
          </Panel>

          <section data-lift="section">
            <SectionHead
              icon={ListTodo}
              title="Tasks"
              action={
                openTasks.length ? <span className="label">{openTasks.length} open</span> : null
              }
            />
            <Card className="glow list overflow-hidden">
              {openTasks.map((task) => {
                const taskDue = followUpState(task.dueAt, now);
                return (
                  <Row key={task.id} className="gap-3">
                    {canManage ? (
                      <form action={toggleCrmTask} className="shrink-0">
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="done" value="true" />
                        <button
                          type="submit"
                          aria-label={`Mark "${task.title}" done`}
                          className="grid size-5 place-items-center rounded-full text-[color:var(--text-quiet)] transition-colors hover:text-[color:var(--positive)]"
                        >
                          <Circle className="size-4.5" strokeWidth={1.5} />
                        </button>
                      </form>
                    ) : null}
                    <RowText title={task.title} note={task.assignee?.name ?? 'Unassigned'} />
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
              {canManage ? (
                <div className="p-3.5">
                  <TaskQuickAdd creatorId={creator.creatorId} />
                </div>
              ) : openTasks.length === 0 ? (
                <p className="p-4 text-sm text-[color:var(--text-quiet)]">No open tasks.</p>
              ) : null}
            </Card>
          </section>

          {canManage ? (
            <Section icon={Settings2} title="Details">
              <DetailsForm
                key={[
                  relationship.priority,
                  relationship.owner?.id,
                  relationship.contactRoute,
                  relationship.tags.join(','),
                ].join('|')}
                creatorId={creator.creatorId}
                staff={staff.map((member) => ({ id: member.id, name: member.name }))}
                details={{
                  priority: relationship.priority,
                  ownerId: relationship.owner?.id ?? null,
                  contactRoute: relationship.contactRoute,
                  tags: relationship.tags,
                }}
              />
            </Section>
          ) : null}

          <Section
            icon={BookOpen}
            title="On the record"
            action={
              can(session.user.role, 'creators:view_records') ? (
                <Link
                  href={`/portal/creators/${creator.slug}`}
                  className="label inline-flex items-center gap-1 hover:text-[color:var(--text)]"
                >
                  Open <ArrowRight className="size-3" />
                </Link>
              ) : null
            }
          >
            <Facts
              items={[
                { term: 'Country', value: countryName(creator.countryCode) },
                ...(creator.heldBy && relationship.contactRoute === 'account_email'
                  ? [{ term: 'Account email', value: creator.heldBy.email }]
                  : []),
                { term: 'Verification', value: titleCase(creator.verificationStatus) },
                { term: 'Active honours', value: String(creator.activeHonours) },
                ...creator.links.map((link) => ({
                  term: link.label,
                  value: (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="break-all underline-offset-4 hover:underline"
                    >
                      {link.url.replace(/^https?:\/\//, '')}
                    </a>
                  ),
                })),
              ]}
            />
          </Section>
        </aside>
      </div>
    </div>
  );
}
