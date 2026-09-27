import {
  BellRing,
  CalendarClock,
  Info,
  Mail,
  MailCheck,
  Pause,
  Play,
  Users,
  X,
} from 'lucide-react';
import {
  Card,
  Empty,
  Facts,
  List,
  Row,
  RowText,
  SectionHead,
  Tag,
} from '@/components/desk/surface';
import { PageHead, Panel, Section } from '@/components/desk/blocks';
import { CRM_TABS, Countdown, Tabs, type CountdownPin } from '@/components/crm/visuals';
import { ReminderAdd, SendNow } from '@/components/crm/forms';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { formatNumber, formatShortDate } from '@/lib/format';
import {
  GRACE_DAYS,
  MILESTONE_LABEL,
  countdownPhrase,
  daysUntil,
  planReminders,
  upcomingReminders,
  type ReminderMilestone,
} from '@/domain/season-reminders';
import { removeReminder, setRemindersEnabled } from '@/server/actions/season-reminders';
import {
  getReminderSchedule,
  recentReminderSends,
  reminderAudience,
  reminderSeasons,
} from '@/server/services/season-reminders';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Season emails',
  description: 'When PALMA writes to creators ahead of the season.',
  path: '/portal/crm/reminders',
  noIndex: true,
});

export default async function SeasonEmailsPage() {
  const session = await requirePermission('crm:view', '/portal/crm/reminders');
  const canSend = can(session.user.role, 'communications:send_list');
  const now = new Date();

  const [{ schedule, updatedAt, updatedBy }, seasons, audience, sends] = await Promise.all([
    getReminderSchedule(),
    reminderSeasons(),
    reminderAudience(),
    recentReminderSends(),
  ]);

  const upcoming = upcomingReminders(schedule, seasons, now);
  const allPlanned = planReminders(schedule, seasons);

  // One countdown per milestone still ahead, for the nearest season that has it.
  const tracks: {
    key: string;
    title: string;
    milestone: ReminderMilestone;
    milestoneAt: string;
    pins: CountdownPin[];
  }[] = [];
  for (const plan of upcoming) {
    const key = `${plan.season.id}:${plan.reminder.milestone}`;
    if (tracks.some((track) => track.key === key) || tracks.length >= 3) continue;
    const siblings = allPlanned.filter(
      (p) => p.season.id === plan.season.id && p.reminder.milestone === plan.reminder.milestone,
    );
    let nextMarked = false;
    tracks.push({
      key,
      title: plan.season.title,
      milestone: plan.reminder.milestone,
      milestoneAt: plan.milestoneAt.toISOString(),
      pins: siblings.map((p) => {
        const past = daysUntil(p.sendOn, now) < 0;
        const state = past ? 'sent' : nextMarked ? 'later' : 'next';
        if (!past) nextMarked = true;
        return {
          key: `${p.reminder.daysBefore}`,
          label: `${p.reminder.daysBefore}d`,
          sendOn: p.sendOn.toISOString(),
          state,
        };
      }),
    });
  }

  const nextFor = (daysBefore: number, milestone: ReminderMilestone) =>
    upcoming.find(
      (p) => p.reminder.daysBefore === daysBefore && p.reminder.milestone === milestone,
    );
  const lastFor = (daysBefore: number, milestone: ReminderMilestone) =>
    allPlanned
      .filter(
        (p) =>
          p.reminder.daysBefore === daysBefore &&
          p.reminder.milestone === milestone &&
          daysUntil(p.sendOn, now) < 0 &&
          now < p.milestoneAt,
      )
      .at(-1);

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        eyebrow="Creator CRM"
        eyebrowIcon={BellRing}
        title="Season emails"
        statement="Before each season, PALMA writes to every creator who holds a record. Set the timings here; the daily run sends them, once each, and logs every one in the creator's history."
        aside={
          schedule.enabled ? (
            <Tag tone="positive">
              <span className="dot" aria-hidden /> Running
            </Tag>
          ) : (
            <Tag tone="alert">Paused</Tag>
          )
        }
      >
        {updatedBy && updatedAt ? (
          <span className="text-[0.75rem] text-[color:var(--text-quiet)]">
            Schedule last changed by {updatedBy}, {formatShortDate(updatedAt)}
          </span>
        ) : null}
      </PageHead>

      <Tabs items={CRM_TABS} active="/portal/crm/reminders" label="Creator CRM" />

      <section data-lift="section">
        <SectionHead icon={CalendarClock} title="The countdown" />
        {tracks.length === 0 ? (
          <Empty
            icon={CalendarClock}
            title="Nothing to count down to"
            description={
              schedule.reminders.length === 0
                ? 'The schedule is empty. Add a reminder below.'
                : 'No season has a date ahead of it yet. Once the next season has its dates, its countdown appears here.'
            }
          />
        ) : (
          <div className="flex flex-col gap-3.5">
            {tracks.map((track) => {
              const left = daysUntil(track.milestoneAt, now);
              return (
                <Card key={track.key} className="glow px-5 pt-4 pb-3">
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-display text-[1.0625rem] text-[color:var(--text)]">
                      {track.title}: {MILESTONE_LABEL[track.milestone].toLowerCase()}
                    </span>
                    <span className="label">
                      {left === 0
                        ? 'Today'
                        : `${formatNumber(left)} day${left === 1 ? '' : 's'} to go`}
                    </span>
                  </div>
                  <Countdown
                    now={now}
                    milestoneAt={track.milestoneAt}
                    milestoneLabel={MILESTONE_LABEL[track.milestone]}
                    pins={track.pins}
                  />
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-7">
          <section data-lift="section">
            <SectionHead
              icon={Mail}
              title="Schedule"
              action={
                canSend ? (
                  <form action={setRemindersEnabled}>
                    <input
                      type="hidden"
                      name="enabled"
                      value={schedule.enabled ? 'false' : 'true'}
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--line)] px-3 py-1 text-[0.75rem] font-medium text-[color:var(--text)] transition-colors hover:border-[color:var(--accent)]"
                    >
                      {schedule.enabled ? (
                        <>
                          <Pause className="size-3" /> Pause all
                        </>
                      ) : (
                        <>
                          <Play className="size-3" /> Resume
                        </>
                      )}
                    </button>
                  </form>
                ) : null
              }
            />
            <Card className="glow list overflow-hidden">
              {schedule.reminders.length === 0 ? (
                <p className="p-4 text-sm text-[color:var(--text-quiet)]">
                  No reminders scheduled.
                </p>
              ) : (
                schedule.reminders.map((reminder) => {
                  const next = nextFor(reminder.daysBefore, reminder.milestone);
                  return (
                    <Row
                      key={`${reminder.milestone}:${reminder.daysBefore}`}
                      className={schedule.enabled ? undefined : 'opacity-60'}
                    >
                      <span className="figure w-12 shrink-0 text-center text-[1.35rem]">
                        {reminder.daysBefore}
                        <span className="block text-[9px] tracking-widest text-[color:var(--text-quiet)] uppercase">
                          days
                        </span>
                      </span>
                      <RowText
                        title={`Before ${MILESTONE_LABEL[reminder.milestone].toLowerCase()}`}
                        note={(() => {
                          const last = lastFor(reminder.daysBefore, reminder.milestone);
                          if (next) {
                            return `Next: ${formatShortDate(next.sendOn)}, ${next.season.title}. Reads "${countdownPhrase(reminder.daysBefore)}".`;
                          }
                          if (last) {
                            return `Went out ${formatShortDate(last.sendOn)} for ${last.season.title}.`;
                          }
                          return 'No season date ahead to send against.';
                        })()}
                      />
                      {canSend ? (
                        <form action={removeReminder} className="ml-auto shrink-0">
                          <input type="hidden" name="daysBefore" value={reminder.daysBefore} />
                          <input type="hidden" name="milestone" value={reminder.milestone} />
                          <button
                            type="submit"
                            aria-label={`Remove the ${reminder.daysBefore}-day reminder`}
                            className="grid size-8 place-items-center rounded-full text-[color:var(--text-quiet)] transition-colors hover:bg-[color:var(--alert-wash)] hover:text-[color:var(--alert)]"
                          >
                            <X className="size-4" />
                          </button>
                        </form>
                      ) : null}
                    </Row>
                  );
                })
              )}
              {canSend ? (
                <div className="p-4">
                  <ReminderAdd />
                </div>
              ) : (
                <p className="p-4 text-[0.8125rem] text-[color:var(--text-quiet)]">
                  An administrator sets the schedule, because it decides who PALMA writes to.
                </p>
              )}
            </Card>
          </section>

          <section data-lift="section">
            <SectionHead icon={MailCheck} title="Sent" action={canSend ? <SendNow /> : null} />
            {sends.length === 0 ? (
              <Card className="glow p-4 text-sm text-[color:var(--text-quiet)]">
                Nothing sent yet. Each run appears here, and on every creator&rsquo;s history.
              </Card>
            ) : (
              <List className="glow">
                {sends.map((group) => (
                  <Row key={`${group.year}-${group.milestone}-${group.daysBefore}-${group.day}`}>
                    <RowText
                      title={`PALMA ${group.year}: ${group.daysBefore} days before ${MILESTONE_LABEL[group.milestone as ReminderMilestone]?.toLowerCase() ?? group.milestone}`}
                      note={formatShortDate(group.day)}
                    />
                    <span className="ml-auto flex shrink-0 flex-wrap justify-end gap-1.5">
                      <Tag tone="positive">{group.sent} sent</Tag>
                      {group.held > 0 ? <Tag>{group.held} held back</Tag> : null}
                      {group.failed > 0 ? <Tag tone="alert">{group.failed} failed</Tag> : null}
                    </span>
                  </Row>
                ))}
              </List>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-5 xl:col-span-5">
          <Section icon={Users} title="Who receives them">
            <Facts
              items={[
                {
                  term: 'Will receive',
                  value: <strong>{formatNumber(audience.reachable)}</strong>,
                },
                { term: 'Switched season news off', value: formatNumber(audience.optedOut) },
                { term: 'Marked do not contact', value: formatNumber(audience.doNotContact) },
                { term: 'Unclaimed, so no address', value: formatNumber(audience.unclaimed) },
              ]}
            />
          </Section>

          <Panel icon={Info} title="How it runs">
            Once a day, on the same schedule as the retention sweep. Each reminder goes to each
            person once, never twice. If a day is missed it still goes within {GRACE_DAYS} days, and
            if two fall due together only the nearer one goes. A creator who switched season news
            off, or whom the desk marked do not contact, is never written to.
          </Panel>
        </aside>
      </div>
    </div>
  );
}
