'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import {
  CRM_CONTACT_ROUTES,
  CRM_CONTACT_ROUTE_LABEL,
  CRM_DIRECTIONS,
  CRM_DIRECTION_LABEL,
  CRM_LOGGABLE_KINDS,
  CRM_PRIORITIES,
  CRM_PRIORITY_LABEL,
  CRM_TOUCHPOINT_KIND_LABEL,
  FOLLOW_UP_CHOICES,
  type CrmContactRoute,
  type CrmDirection,
  type CrmLoggableKind,
  type CrmPriority,
} from '@/domain/crm';
import { MILESTONE_LABEL, REMINDER_MILESTONES } from '@/domain/season-reminders';
import { addCrmTask, logTouchpoint, saveDetails, type CrmState } from '@/server/actions/crm';
import {
  addReminder,
  sendDueRemindersNow,
  type ReminderState,
} from '@/server/actions/season-reminders';

const idle = { status: 'idle' as const };

/** A single line under a form: what happened, in the desk's own tones. */
function Said({ state }: { state: { status: string; message?: string } }) {
  if (state.status === 'idle' || !state.message) return null;
  return (
    <p
      role="status"
      className={cn(
        'text-[0.8125rem]',
        state.status === 'error' ? 'text-[color:var(--alert)]' : 'text-[color:var(--positive)]',
      )}
    >
      {state.message}
    </p>
  );
}

/** Empty the form once it has done its job, so the next entry starts clean. */
function useClearOnSuccess(state: { status: string }, onClear?: () => void) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === 'success') {
      ref.current?.reset();
      onClear?.();
    }
    // `onClear` is a fresh closure every render; only the result matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return ref;
}

/** A row of pills that behaves as one choice, and posts it. */
function Choice<T extends string>({
  name,
  value,
  onChange,
  options,
  label,
}: {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; disabled?: boolean }[];
  label: string;
}) {
  return (
    <div className="seg max-w-full flex-wrap" role="radiogroup" aria-label={label}>
      <input type="hidden" name={name} value={value} />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
          className="seg-item disabled:opacity-40"
          data-active={option.value === value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Log contact.
 *
 * One box. Say who moved, write a line, optionally pick when to follow up,
 * press the button. The channel and the date are there when they matter and
 * default to what they usually are.
 */
export function QuickLog({ creatorId, contactable }: { creatorId: string; contactable: boolean }) {
  const [state, action, pending] = useActionState<CrmState, FormData>(logTouchpoint, idle);
  const [direction, setDirection] = useState<CrmDirection>(contactable ? 'outbound' : 'inbound');
  const [kind, setKind] = useState<CrmLoggableKind>('message');
  const [followUp, setFollowUp] = useState('');
  const [earlier, setEarlier] = useState(false);
  const ref = useClearOnSuccess(state, () => {
    setFollowUp('');
    setEarlier(false);
  });

  const isNote = direction === 'internal';

  return (
    <form ref={ref} action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="creatorId" value={creatorId} />
      <input type="hidden" name="kind" value={isNote ? 'note' : kind} />

      <Choice
        name="direction"
        label="Who moved"
        value={direction}
        onChange={setDirection}
        options={CRM_DIRECTIONS.map((value) => ({
          value,
          label: CRM_DIRECTION_LABEL[value],
          disabled: value === 'outbound' && !contactable,
        }))}
      />

      <Textarea
        name="summary"
        required
        maxLength={2000}
        className="min-h-24"
        aria-label="What happened"
        aria-invalid={Boolean(state.errors?.summary) || undefined}
        placeholder={
          isNote
            ? 'A note for the desk.'
            : direction === 'inbound'
              ? 'What did they say?'
              : 'What did you send or say?'
        }
      />

      {isNote ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="label w-20 text-[10px]">By</span>
          <Choice
            name="_kind"
            label="Channel"
            value={kind}
            onChange={setKind}
            options={CRM_LOGGABLE_KINDS.filter((k) => k !== 'note').map((value) => ({
              value,
              label: CRM_TOUCHPOINT_KIND_LABEL[value],
            }))}
          />
        </div>
      )}

      {contactable ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="label w-20 text-[10px]">Follow up</span>
          <Choice
            name="followUpDays"
            label="Follow up"
            value={followUp}
            onChange={setFollowUp}
            options={[
              { value: '', label: 'Not now' },
              ...FOLLOW_UP_CHOICES.map((choice) => ({
                value: String(choice.days),
                label: choice.label,
              })),
            ]}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving…' : 'Log it'}
        </Button>
        {earlier ? (
          <Input
            name="occurredAt"
            type="date"
            aria-label="When it happened"
            className="h-9 w-auto py-1 text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEarlier(true)}
            className="text-[0.8125rem] text-[color:var(--text-quiet)] underline-offset-4 hover:text-[color:var(--text)] hover:underline"
          >
            Happened earlier?
          </button>
        )}
        <Said
          state={state.errors?.summary ? { status: 'error', message: state.errors.summary } : state}
        />
      </div>
    </form>
  );
}

/** Type a task, press enter. It is yours unless you say otherwise. */
export function TaskQuickAdd({ creatorId }: { creatorId: string }) {
  const [state, action, pending] = useActionState<CrmState, FormData>(addCrmTask, idle);
  const ref = useClearOnSuccess(state);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="creatorId" value={creatorId} />
      <div className="flex gap-2">
        <Input
          name="title"
          required
          maxLength={200}
          placeholder="Add a task…"
          aria-label="New task"
          autoComplete="off"
          className="h-10 py-2 text-sm"
        />
        <Input
          name="dueAt"
          type="date"
          aria-label="Due"
          className="h-10 w-36 shrink-0 py-2 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending} className="h-10">
          Add
        </Button>
      </div>
      <Said
        state={
          state.errors?.title
            ? { status: 'error', message: state.errors.title }
            : state.status === 'error'
              ? state
              : idle
        }
      />
    </form>
  );
}

/** The things that rarely change, in one short form. */
export function DetailsForm({
  creatorId,
  staff,
  details,
}: {
  creatorId: string;
  staff: { id: string; name: string }[];
  details: {
    priority: CrmPriority;
    ownerId: string | null;
    contactRoute: CrmContactRoute | null;
    tags: string[];
  };
}) {
  const [state, action, pending] = useActionState<CrmState, FormData>(saveDetails, idle);
  const [priority, setPriority] = useState<CrmPriority>(details.priority);

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="creatorId" value={creatorId} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="label w-20 text-[10px]">Priority</span>
        <Choice
          name="priority"
          label="Priority"
          value={priority}
          onChange={setPriority}
          options={CRM_PRIORITIES.map((value) => ({ value, label: CRM_PRIORITY_LABEL[value] }))}
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="label text-[10px]">Looked after by</span>
        <Select name="ownerId" defaultValue={details.ownerId ?? ''}>
          <option value="">Nobody yet</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label text-[10px]">Reached by (the route, never the address)</span>
        <Select name="contactRoute" defaultValue={details.contactRoute ?? ''}>
          <option value="">Not decided</option>
          {CRM_CONTACT_ROUTES.map((route) => (
            <option key={route} value={route}>
              {CRM_CONTACT_ROUTE_LABEL[route]}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label text-[10px]">Tags</span>
        <Input
          name="tags"
          defaultValue={details.tags.join(', ')}
          maxLength={400}
          autoComplete="off"
          placeholder="ceremony-2027, press"
          className="h-10 py-2 text-sm"
        />
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        <Said state={state} />
      </div>
    </form>
  );
}

/** "N days before <milestone>", and Add. */
export function ReminderAdd() {
  const [state, action, pending] = useActionState<ReminderState, FormData>(addReminder, idle);
  const ref = useClearOnSuccess(state);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-[0.875rem] text-[color:var(--text-soft)]">
        <Input
          name="daysBefore"
          type="number"
          min={0}
          max={120}
          required
          defaultValue={3}
          aria-label="Days before"
          className="h-10 w-20 py-2 text-sm"
        />
        <span>days before</span>
        <Select
          name="milestone"
          defaultValue="nominationsOpenAt"
          className="h-10 w-48 py-2 text-sm"
        >
          {REMINDER_MILESTONES.map((milestone) => (
            <option key={milestone} value={milestone}>
              {MILESTONE_LABEL[milestone].toLowerCase()}
            </option>
          ))}
        </Select>
        <Button type="submit" size="sm" variant="outline" disabled={pending} className="h-10">
          Add
        </Button>
      </div>
      <Said state={state} />
    </form>
  );
}

/** Run today's reminders now instead of waiting for the daily run. */
export function SendNow() {
  const [state, action, pending] = useActionState<ReminderState>(sendDueRemindersNow, idle);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Sending…' : 'Send what is due today'}
      </Button>
      <Said state={state} />
    </form>
  );
}
