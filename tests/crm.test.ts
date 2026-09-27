import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CRM_STAGES,
  MAX_TAGS,
  followUpState,
  looksLikeContactDetail,
  mayContact,
  mayLogTouchpoint,
  normaliseTags,
  pipelineCounts,
  stageAfterTouchpoint,
} from '@/domain/crm';
import {
  COMMERCIAL_PERMISSIONS,
  JUDGING_CONFIDENTIAL_PERMISSIONS,
  ROLES,
  can,
  type Role,
} from '@/lib/auth/rbac';
import { ADMIN_NAV, MODERATION_NAV, navFor } from '@/lib/admin-nav';
import { taskSchema, touchpointSchema } from '@/lib/validation/crm';

const here = fileURLToPath(new URL('.', import.meta.url));
const read = (file: string) => readFileSync(join(here, '..', file), 'utf8');

describe('the relationship pipeline', () => {
  it('counts every stage, including the empty ones, in order', () => {
    const counts = pipelineCounts([
      { stage: 'prospect' },
      { stage: 'prospect' },
      { stage: 'active' },
    ]);
    expect(Object.keys(counts)).toEqual([...CRM_STAGES]);
    expect(counts.prospect).toBe(2);
    expect(counts.active).toBe(1);
    expect(counts.dormant).toBe(0);
  });

  it('moves only the obvious steps on its own', () => {
    expect(stageAfterTouchpoint('prospect', 'outbound')).toBe('contacted');
    expect(stageAfterTouchpoint('prospect', 'inbound')).toBe('in_conversation');
    expect(stageAfterTouchpoint('contacted', 'inbound')).toBe('in_conversation');
    expect(stageAfterTouchpoint('dormant', 'inbound')).toBe('in_conversation');
    expect(stageAfterTouchpoint('contacted', 'outbound')).toBe('contacted');
    expect(stageAfterTouchpoint('active', 'inbound')).toBe('active');
    expect(stageAfterTouchpoint('onboarding', 'outbound')).toBe('onboarding');
    for (const stage of CRM_STAGES) {
      expect(stageAfterTouchpoint(stage, 'internal'), stage).toBe(stage);
    }
  });

  it('never moves anybody out of do not contact', () => {
    for (const direction of ['outbound', 'inbound', 'internal'] as const) {
      expect(stageAfterTouchpoint('do_not_contact', direction)).toBe('do_not_contact');
    }
  });

  it('refuses outbound contact with somebody who asked to be left alone', () => {
    expect(mayContact('do_not_contact')).toBe(false);
    expect(mayLogTouchpoint('do_not_contact', 'outbound')).toBe(false);
    // A creator who writes in still deserves to have it recorded and answered.
    expect(mayLogTouchpoint('do_not_contact', 'inbound')).toBe(true);
    expect(mayLogTouchpoint('do_not_contact', 'internal')).toBe(true);
    for (const stage of CRM_STAGES.filter((s) => s !== 'do_not_contact')) {
      expect(mayContact(stage), stage).toBe(true);
    }
  });
});

describe('follow-up dates', () => {
  const now = new Date('2026-09-27T15:00:00.000Z');

  it('sorts a date into overdue, today, this week and later by UTC day', () => {
    expect(followUpState(null, now)).toBe('none');
    expect(followUpState('not a date', now)).toBe('none');
    expect(followUpState('2026-09-26T00:00:00.000Z', now)).toBe('overdue');
    expect(followUpState('2026-09-27T00:00:00.000Z', now)).toBe('today');
    expect(followUpState('2026-09-28T00:00:00.000Z', now)).toBe('this_week');
    expect(followUpState('2026-10-04T00:00:00.000Z', now)).toBe('this_week');
    expect(followUpState('2026-10-05T00:00:00.000Z', now)).toBe('later');
  });
});

describe('what the relationship desk will not hold', () => {
  it('recognises email addresses and phone numbers', () => {
    expect(looksLikeContactDetail('wrote to jo@example.com about the ceremony')).toBe(true);
    expect(looksLikeContactDetail('call +44 (0)20 7946 0958 after six')).toBe(true);
    expect(looksLikeContactDetail('07700 900123')).toBe(true);
    expect(looksLikeContactDetail('Spoke at the 2026 ceremony about category 3')).toBe(false);
    expect(looksLikeContactDetail('DM on their platform, replied within the hour')).toBe(false);
  });

  it('refuses a touchpoint or a task that carries one', () => {
    const touchpoint = touchpointSchema.safeParse({
      creatorId: 'c1',
      kind: 'email',
      direction: 'outbound',
      summary: 'Sent the invite to jo@example.com',
    });
    expect(touchpoint.success).toBe(false);

    const task = taskSchema.safeParse({ creatorId: 'c1', title: 'Ring them on 07700900123' });
    expect(task.success).toBe(false);

    const fine = touchpointSchema.safeParse({
      creatorId: 'c1',
      kind: 'message',
      direction: 'outbound',
      summary: 'Invited them to claim the record via their platform inbox.',
      occurredAt: '2026-09-20',
    });
    expect(fine.success).toBe(true);
  });

  it('keeps tags as labels, not a place to park contact details', () => {
    expect(normaliseTags('Ceremony 2027, PRESS, press,  uk--south ')).toEqual([
      'ceremony-2027',
      'press',
      'uk-south',
    ]);
    expect(normaliseTags('vip, jo@example.com, 07700 900123')).toEqual(['vip']);
    expect(normaliseTags(Array.from({ length: 20 }, (_, i) => `tag${i}`))).toHaveLength(MAX_TAGS);
    expect(normaliseTags('')).toEqual([]);
    expect(normaliseTags(null)).toEqual([]);
  });

  it('has no contact columns in its tables', () => {
    const migration = read('supabase/migrations/0004_creator_crm.sql').toLowerCase();
    for (const column of ['email', 'phone', 'address', '"dateofbirth"', 'legalname']) {
      expect(migration, column).not.toMatch(new RegExp(`^\\s*"?${column}"?\\s+text`, 'm'));
    }
  });

  it('reads nothing from judging', () => {
    // Popularity brings a creator to PALMA's attention and stops there. The
    // relationship desk is not a second route to the count.
    for (const file of ['src/server/data/crm.ts', 'src/server/actions/crm.ts']) {
      const body = read(file);
      for (const table of [
        '"Nomination"',
        '"Candidacy"',
        '"JudgingScore"',
        '"JudgingAssignment"',
      ]) {
        expect(body, `${file} reads ${table}`).not.toContain(table);
      }
    }
  });
});

describe('who reaches the relationship desk', () => {
  it('is staff, and only staff', () => {
    for (const role of ['moderator', 'admin', 'super_admin'] as Role[]) {
      expect(can(role, 'crm:view'), role).toBe(true);
      expect(can(role, 'crm:manage'), role).toBe(true);
    }
    for (const role of ['visitor', 'creator', 'judge'] as Role[]) {
      expect(can(role, 'crm:view'), role).toBe(false);
      expect(can(role, 'crm:manage'), role).toBe(false);
    }
  });

  it('sits on neither side of the commercial and judging firewall', () => {
    for (const permission of ['crm:view', 'crm:manage'] as const) {
      expect(COMMERCIAL_PERMISSIONS).not.toContain(permission);
      expect(JUDGING_CONFIDENTIAL_PERMISSIONS).not.toContain(permission);
    }
  });

  it('is in both sidebars for the roles that hold it', () => {
    for (const nav of [MODERATION_NAV, ADMIN_NAV]) {
      const hrefs = nav.flatMap((group) => group.items.map((item) => item.href));
      expect(hrefs).toContain('/portal/crm');
    }
    for (const role of ROLES) {
      const hrefs = navFor(role, MODERATION_NAV).flatMap((g) => g.items.map((i) => i.href));
      expect(hrefs.includes('/portal/crm'), role).toBe(can(role, 'crm:view'));
    }
  });
});
