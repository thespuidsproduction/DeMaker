'use server';

import { revalidatePath } from 'next/cache';
import { authorise } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/session';
import {
  MAX_REMINDERS,
  MILESTONE_LABEL,
  normaliseReminders,
  type ReminderSchedule,
} from '@/domain/season-reminders';
import { reminderSchema } from '@/lib/validation/crm';
import { recordAudit } from '@/server/audit';
import {
  getReminderSchedule,
  runSeasonReminders,
  saveReminderSchedule,
} from '@/server/services/season-reminders';
import { SETTINGS } from '@/server/settings';

/**
 * Changing the schedule changes who PALMA writes to and when, so it takes the
 * same permission as writing to a whole list. The desk can see it; an
 * administrator sets it.
 */
async function sender() {
  try {
    return await authorise('communications:send_list');
  } catch {
    return null;
  }
}

export type ReminderState = { status: 'idle' | 'error' | 'success'; message?: string };

const PATH = '/portal/crm/reminders';

async function store(
  session: NonNullable<Awaited<ReturnType<typeof sender>>>,
  change: (current: ReminderSchedule) => ReminderSchedule,
  summary: string,
) {
  const { schedule } = await getReminderSchedule();
  const next = change(schedule);
  const saved = { enabled: next.enabled, reminders: normaliseReminders(next.reminders) };
  await saveReminderSchedule(saved, session.user.id);
  await recordAudit({
    action: 'crm.reminders_configured',
    entityType: 'SystemSetting',
    entityId: SETTINGS.seasonReminders,
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
    summary,
    before: schedule,
    after: saved,
  });
  revalidatePath(PATH);
  revalidatePath('/portal/crm');
}

export async function addReminder(
  _previous: ReminderState,
  formData: FormData,
): Promise<ReminderState> {
  await assertSameOrigin();
  const session = await sender();
  if (!session)
    return { status: 'error', message: 'Only an administrator can change the schedule.' };

  const parsed = reminderSchema.safeParse({
    daysBefore: formData.get('daysBefore'),
    milestone: formData.get('milestone'),
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the reminder.' };
  }

  const { schedule } = await getReminderSchedule();
  if (schedule.reminders.length >= MAX_REMINDERS) {
    return {
      status: 'error',
      message: `${MAX_REMINDERS} reminders is the most. Remove one first.`,
    };
  }

  const { daysBefore, milestone } = parsed.data;
  await store(
    session,
    (current) => ({ ...current, reminders: [...current.reminders, { daysBefore, milestone }] }),
    `Season reminder added: ${daysBefore} days before ${MILESTONE_LABEL[milestone].toLowerCase()}`,
  );
  return { status: 'success', message: 'Added.' };
}

export async function removeReminder(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const session = await sender();
  if (!session) return;

  const parsed = reminderSchema.safeParse({
    daysBefore: formData.get('daysBefore'),
    milestone: formData.get('milestone'),
  });
  if (!parsed.success) return;

  const { daysBefore, milestone } = parsed.data;
  await store(
    session,
    (current) => ({
      ...current,
      reminders: current.reminders.filter(
        (r) => !(r.daysBefore === daysBefore && r.milestone === milestone),
      ),
    }),
    `Season reminder removed: ${daysBefore} days before ${MILESTONE_LABEL[milestone].toLowerCase()}`,
  );
}

export async function setRemindersEnabled(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const session = await sender();
  if (!session) return;

  const enabled = formData.get('enabled') === 'true';
  await store(
    session,
    (current) => ({ ...current, enabled }),
    enabled ? 'Season reminders switched on' : 'Season reminders paused',
  );
}

/** The daily run, now. Sends only what is due and never twice. */
export async function sendDueRemindersNow(): Promise<ReminderState> {
  await assertSameOrigin();
  const session = await sender();
  if (!session) return { status: 'error', message: 'Only an administrator can send reminders.' };

  const run = await runSeasonReminders({
    actor: { id: session.user.id, role: session.user.role, label: session.user.email },
  });
  revalidatePath(PATH);
  revalidatePath('/portal/crm/history');

  if (run.due === 0) return { status: 'success', message: 'Nothing is due today.' };
  const total = run.sent + run.suppressed + run.failed;
  if (total === 0) return { status: 'success', message: 'Everything due today has already gone.' };
  return {
    status: run.failed > 0 ? 'error' : 'success',
    message: `${run.sent} sent, ${run.suppressed} held back, ${run.failed} failed. Each creator's history says why.`,
  };
}
