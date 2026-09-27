'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import {
  CRM_CONTACT_ROUTES,
  CRM_CONTACT_ROUTE_LABEL,
  CRM_DIRECTIONS,
  CRM_DIRECTION_LABEL,
  CRM_PRIORITIES,
  CRM_PRIORITY_LABEL,
  CRM_STAGES,
  CRM_STAGE_LABEL,
  CRM_TOUCHPOINT_KINDS,
  CRM_TOUCHPOINT_KIND_LABEL,
  mayContact,
  type CrmContactRoute,
  type CrmPriority,
  type CrmStage,
} from '@/domain/crm';
import { addCrmTask, logTouchpoint, saveRelationship, type CrmState } from '@/server/actions/crm';

const idle: CrmState = { status: 'idle' };

type Staff = { id: string; name: string };

function Feedback({ state }: { state: CrmState }) {
  if (state.status === 'idle' || !state.message) return null;
  return <Notice tone={state.status === 'error' ? 'error' : 'ceremonial'}>{state.message}</Notice>;
}

/** `YYYY-MM-DD` for a date input, from an ISO string. */
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

/** Clear a form once its action succeeds, so the next entry starts empty. */
function useResetOnSuccess(state: CrmState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === 'success') ref.current?.reset();
  }, [state]);
  return ref;
}

export function RelationshipForm({
  creatorId,
  staff,
  relationship,
}: {
  creatorId: string;
  staff: Staff[];
  relationship: {
    stage: CrmStage;
    priority: CrmPriority;
    ownerId: string | null;
    contactRoute: CrmContactRoute | null;
    tags: string[];
    nextFollowUpAt: string | null;
  };
}) {
  const [state, action, pending] = useActionState(saveRelationship, idle);
  const errors = state.errors ?? {};

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="creatorId" value={creatorId} />
      <Feedback state={state} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Stage" htmlFor="crm-stage" error={errors.stage}>
          <Select id="crm-stage" name="stage" defaultValue={relationship.stage}>
            {CRM_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {CRM_STAGE_LABEL[stage]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Priority" htmlFor="crm-priority" error={errors.priority}>
          <Select id="crm-priority" name="priority" defaultValue={relationship.priority}>
            {CRM_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {CRM_PRIORITY_LABEL[priority]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Owner" htmlFor="crm-owner" error={errors.ownerId}>
        <Select id="crm-owner" name="ownerId" defaultValue={relationship.ownerId ?? ''}>
          <option value="">Nobody yet</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="How PALMA reaches them"
        hint="The route, never the address."
        htmlFor="crm-route"
        error={errors.contactRoute}
      >
        <Select id="crm-route" name="contactRoute" defaultValue={relationship.contactRoute ?? ''}>
          <option value="">Not decided</option>
          {CRM_CONTACT_ROUTES.map((route) => (
            <option key={route} value={route}>
              {CRM_CONTACT_ROUTE_LABEL[route]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Next follow-up"
        hint={
          mayContact(relationship.stage)
            ? undefined
            : 'Ignored while the creator is marked do not contact.'
        }
        htmlFor="crm-follow-up"
        error={errors.nextFollowUpAt}
      >
        <Input
          id="crm-follow-up"
          name="nextFollowUpAt"
          type="date"
          defaultValue={day(relationship.nextFollowUpAt)}
        />
      </Field>

      <Field
        label="Tags"
        hint="Comma separated, up to eight. For example: ceremony-2027, press, uk-south."
        htmlFor="crm-tags"
        error={errors.tags}
      >
        <Input
          id="crm-tags"
          name="tags"
          defaultValue={relationship.tags.join(', ')}
          maxLength={400}
          autoComplete="off"
        />
      </Field>

      <Button type="submit" size="md" disabled={pending} className="self-start">
        {pending ? 'Saving…' : 'Save relationship'}
      </Button>
    </form>
  );
}

export function TouchpointForm({ creatorId, stage }: { creatorId: string; stage: CrmStage }) {
  const [state, action, pending] = useActionState(logTouchpoint, idle);
  const ref = useResetOnSuccess(state);
  const errors = state.errors ?? {};
  const contactable = mayContact(stage);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-5">
      <input type="hidden" name="creatorId" value={creatorId} />
      <Feedback state={state} />

      {contactable ? null : (
        <Notice tone="warning" title="Do not contact">
          Only record what the creator sent PALMA, or an internal note. Nothing outbound.
        </Notice>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="What" htmlFor="tp-kind" error={errors.kind}>
          <Select id="tp-kind" name="kind" defaultValue="message">
            {CRM_TOUCHPOINT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {CRM_TOUCHPOINT_KIND_LABEL[kind]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Direction" htmlFor="tp-direction" error={errors.direction}>
          <Select
            id="tp-direction"
            name="direction"
            defaultValue={contactable ? 'outbound' : 'inbound'}
          >
            {CRM_DIRECTIONS.map((direction) => (
              <option
                key={direction}
                value={direction}
                disabled={!contactable && direction === 'outbound'}
              >
                {CRM_DIRECTION_LABEL[direction]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="When" htmlFor="tp-when" error={errors.occurredAt}>
          <Input id="tp-when" name="occurredAt" type="date" />
        </Field>
      </div>

      <Field label="What happened" htmlFor="tp-summary" error={errors.summary}>
        <Textarea
          id="tp-summary"
          name="summary"
          className="min-h-28"
          maxLength={2000}
          required
          placeholder="Staff only. No addresses or numbers: record the route, not the contact."
        />
      </Field>

      {contactable ? (
        <Field
          label="Next follow-up"
          hint="Optional. Leaves the current date alone if blank."
          htmlFor="tp-follow-up"
          error={errors.nextFollowUpAt}
        >
          <Input id="tp-follow-up" name="nextFollowUpAt" type="date" />
        </Field>
      ) : null}

      <Button type="submit" variant="outline" size="md" disabled={pending} className="self-start">
        {pending ? 'Logging…' : 'Log touchpoint'}
      </Button>
    </form>
  );
}

export function TaskForm({
  creatorId,
  staff,
  defaultAssigneeId,
}: {
  creatorId: string;
  staff: Staff[];
  defaultAssigneeId: string | null;
}) {
  const [state, action, pending] = useActionState(addCrmTask, idle);
  const ref = useResetOnSuccess(state);
  const errors = state.errors ?? {};

  return (
    <form ref={ref} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="creatorId" value={creatorId} />
      <Feedback state={state} />

      <Field label="Task" htmlFor="task-title" error={errors.title}>
        <Input id="task-title" name="title" maxLength={200} required autoComplete="off" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Due" htmlFor="task-due" error={errors.dueAt}>
          <Input id="task-due" name="dueAt" type="date" />
        </Field>
        <Field label="Assignee" htmlFor="task-assignee" error={errors.assigneeId}>
          <Select id="task-assignee" name="assigneeId" defaultValue={defaultAssigneeId ?? ''}>
            <option value="">Unassigned</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Button type="submit" variant="outline" size="sm" disabled={pending} className="self-start">
        {pending ? 'Adding…' : 'Add task'}
      </Button>
    </form>
  );
}
