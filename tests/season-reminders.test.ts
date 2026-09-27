import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCHEDULE,
  GRACE_DAYS,
  MAX_REMINDERS,
  countdownPhrase,
  daysUntil,
  dueReminders,
  normaliseReminders,
  parseSchedule,
  serialiseSchedule,
  upcomingReminders,
  type SeasonDates,
} from '@/domain/season-reminders';
import { TEMPLATES, isSuppressible } from '@/server/email/register';

const season: SeasonDates = {
  id: 's27',
  year: 2027,
  title: 'PALMA 2027',
  nominationsOpenAt: '2027-04-01T09:00:00.000Z',
  nominationsCloseAt: '2027-04-29T23:00:00.000Z',
  ceremonyAt: null,
};

const at = (iso: string) => new Date(iso);

describe('the default schedule', () => {
  it('is two weeks, one week and the day before the season opens', () => {
    expect(DEFAULT_SCHEDULE.enabled).toBe(true);
    expect(DEFAULT_SCHEDULE.reminders).toEqual([
      { daysBefore: 14, milestone: 'nominationsOpenAt' },
      { daysBefore: 7, milestone: 'nominationsOpenAt' },
      { daysBefore: 1, milestone: 'nominationsOpenAt' },
    ]);
  });

  it('is what an empty or unreadable setting falls back to', () => {
    expect(parseSchedule(null)).toEqual(DEFAULT_SCHEDULE);
    expect(parseSchedule('not json')).toEqual(DEFAULT_SCHEDULE);
  });

  it('survives a round trip through the settings table', () => {
    const schedule = {
      enabled: false,
      reminders: [
        { daysBefore: 3, milestone: 'nominationsCloseAt' as const },
        { daysBefore: 21, milestone: 'nominationsOpenAt' as const },
      ],
    };
    expect(parseSchedule(serialiseSchedule(schedule))).toEqual({
      enabled: false,
      reminders: [
        { daysBefore: 21, milestone: 'nominationsOpenAt' },
        { daysBefore: 3, milestone: 'nominationsCloseAt' },
      ],
    });
  });
});

describe('cleaning a schedule', () => {
  it('drops duplicates, nonsense and anything out of range, and sorts furthest out first', () => {
    expect(
      normaliseReminders([
        { daysBefore: 7, milestone: 'nominationsOpenAt' },
        { daysBefore: 7, milestone: 'nominationsOpenAt' },
        { daysBefore: -1, milestone: 'nominationsOpenAt' },
        { daysBefore: 500, milestone: 'nominationsOpenAt' },
        { daysBefore: 2.5, milestone: 'nominationsOpenAt' },
        { daysBefore: 3, milestone: 'somewhere' },
        null,
        { daysBefore: 14, milestone: 'nominationsOpenAt' },
      ]),
    ).toEqual([
      { daysBefore: 14, milestone: 'nominationsOpenAt' },
      { daysBefore: 7, milestone: 'nominationsOpenAt' },
    ]);
  });

  it('caps the number of reminders', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ daysBefore: i, milestone: 'ceremonyAt' }));
    expect(normaliseReminders(many)).toHaveLength(MAX_REMINDERS);
  });
});

describe('what goes out today', () => {
  it('sends the two-week reminder fourteen days before the season opens', () => {
    const due = dueReminders(DEFAULT_SCHEDULE, [season], at('2027-03-18T06:00:00Z'));
    expect(due.map((d) => d.reminder.daysBefore)).toEqual([14]);
  });

  it('still sends it within the grace window after a missed day, and not after', () => {
    expect(dueReminders(DEFAULT_SCHEDULE, [season], at('2027-03-20T06:00:00Z'))).toHaveLength(1);
    const late = new Date(Date.UTC(2027, 2, 18 + GRACE_DAYS + 1, 6));
    expect(dueReminders(DEFAULT_SCHEDULE, [season], late)).toHaveLength(0);
  });

  it('sends only the nearest when two fall due at once', () => {
    const schedule = {
      enabled: true,
      reminders: [
        { daysBefore: 2, milestone: 'nominationsOpenAt' as const },
        { daysBefore: 1, milestone: 'nominationsOpenAt' as const },
      ],
    };
    const due = dueReminders(schedule, [season], at('2027-03-31T06:00:00Z'));
    expect(due.map((d) => d.reminder.daysBefore)).toEqual([1]);
  });

  it('sends nothing once the milestone has passed, or while paused', () => {
    const sameDay = {
      enabled: true,
      reminders: [{ daysBefore: 0, milestone: 'nominationsOpenAt' as const }],
    };
    expect(dueReminders(sameDay, [season], at('2027-04-01T06:00:00Z'))).toHaveLength(1);
    expect(dueReminders(sameDay, [season], at('2027-04-01T10:00:00Z'))).toHaveLength(0);
    expect(
      dueReminders({ ...DEFAULT_SCHEDULE, enabled: false }, [season], at('2027-03-18T06:00:00Z')),
    ).toHaveLength(0);
  });

  it('ignores a milestone the season has no date for', () => {
    const schedule = {
      enabled: true,
      reminders: [{ daysBefore: 7, milestone: 'ceremonyAt' as const }],
    };
    expect(upcomingReminders(schedule, [season], at('2027-01-01T00:00:00Z'))).toHaveLength(0);
  });

  it('lists what is still to come, soonest first', () => {
    const upcoming = upcomingReminders(DEFAULT_SCHEDULE, [season], at('2027-03-20T00:00:00Z'));
    expect(upcoming.map((p) => p.reminder.daysBefore)).toEqual([7, 1]);
    expect(upcoming[0]?.sendOn.toISOString()).toBe('2027-03-25T00:00:00.000Z');
  });
});

describe('how the countdown reads', () => {
  it('says weeks when it is a whole number of them', () => {
    expect(countdownPhrase(14)).toBe('in 2 weeks');
    expect(countdownPhrase(7)).toBe('in one week');
    expect(countdownPhrase(1)).toBe('tomorrow');
    expect(countdownPhrase(0)).toBe('today');
    expect(countdownPhrase(10)).toBe('in 10 days');
  });

  it('counts calendar days', () => {
    expect(daysUntil('2027-04-01T09:00:00Z', at('2027-03-31T23:00:00Z'))).toBe(1);
  });
});

describe('the season email', () => {
  it('is news, so a creator can switch it off with season announcements', () => {
    expect(TEMPLATES.season_reminder.gate).toBe('seasonAnnouncements');
    expect(isSuppressible('season_reminder')).toBe(true);
  });
});
