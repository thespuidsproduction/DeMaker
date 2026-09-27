import { z } from 'zod';
import {
  CRM_CONTACT_ROUTES,
  CRM_DIRECTIONS,
  CRM_LOGGABLE_KINDS,
  CRM_PRIORITIES,
  CRM_STAGES,
  looksLikeContactDetail,
} from '@/domain/crm';
import { MAX_DAYS_BEFORE, REMINDER_MILESTONES } from '@/domain/season-reminders';

/** A calendar date from an `<input type="date">`, or nothing. */
const optionalDay = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Choose a real date.')
  .optional()
  .or(z.literal(''));

/** The relationship desk records the route to a creator, never the address. */
function withoutContactDetails(schema: z.ZodString, field: string) {
  return schema.refine((value) => !looksLikeContactDetail(value), {
    message: `Leave email addresses and phone numbers out of the ${field}. Record the route, never the address.`,
  });
}

/** Days from today for a follow-up. Empty leaves it alone; 0 clears it. */
const followUpDays = z
  .string()
  .trim()
  .regex(/^\d{1,3}$/)
  .optional()
  .or(z.literal(''));

export const stageSchema = z.object({
  creatorId: z.string().trim().min(1),
  stage: z.enum(CRM_STAGES),
});

export const detailsSchema = z.object({
  creatorId: z.string().trim().min(1),
  priority: z.enum(CRM_PRIORITIES),
  ownerId: z.string().trim().max(40).optional().or(z.literal('')),
  contactRoute: z.enum(CRM_CONTACT_ROUTES).optional().or(z.literal('')),
  tags: z.string().trim().max(400).optional().or(z.literal('')),
});

export const followUpSchema = z.object({
  creatorId: z.string().trim().min(1),
  days: followUpDays,
  on: optionalDay,
});

export const touchpointSchema = z.object({
  creatorId: z.string().trim().min(1),
  kind: z.enum(CRM_LOGGABLE_KINDS),
  direction: z.enum(CRM_DIRECTIONS),
  summary: withoutContactDetails(z.string().trim().min(3, 'Say what happened.').max(2000), 'note'),
  occurredAt: optionalDay,
  followUpDays,
});

export const taskSchema = z.object({
  creatorId: z.string().trim().min(1),
  title: withoutContactDetails(z.string().trim().min(3, 'Say what needs doing.').max(200), 'task'),
  dueAt: optionalDay,
  assigneeId: z.string().trim().max(40).optional().or(z.literal('')),
});

export const taskToggleSchema = z.object({
  taskId: z.string().trim().min(1),
  done: z.enum(['true', 'false']),
});

export const reminderSchema = z.object({
  daysBefore: z.coerce
    .number()
    .int('Whole days only.')
    .min(0, 'Zero or more days.')
    .max(MAX_DAYS_BEFORE, `At most ${MAX_DAYS_BEFORE} days.`),
  milestone: z.enum(REMINDER_MILESTONES),
});

/** `YYYY-MM-DD` as midnight UTC, the convention every timestamp here follows. */
export function dayToDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
