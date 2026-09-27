import { NextResponse } from 'next/server';
import { constantTimeEquals } from '@/lib/crypto';
import { env } from '@/lib/env';
import { runRetentionSweep } from '@/server/services/retention';
import { runSeasonReminders } from '@/server/services/season-reminders';

export const dynamic = 'force-dynamic';

/**
 * The scheduled sweep.
 *
 * Guarded by a shared secret in the Authorization header rather than by a
 * session, because a scheduler has no session. Without `CRON_SECRET` set the
 * route refuses everything — an unauthenticated endpoint that deletes rows is
 * worse than no endpoint at all, so this fails closed.
 *
 * It is also the daily clock for the Creator CRM's season reminders, so the
 * one schedule already in place drives both and nobody has to set up a second.
 * A reminder that fails does not stop the sweep, and the other way round.
 *
 * Point any scheduler at it daily:
 *
 *   curl -fsS -X POST https://palmaawards.com/api/cron/retention \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: 'No CRON_SECRET is configured. The sweep cannot be triggered remotely.' },
      { status: 503 },
    );
  }

  const header = request.headers.get('authorization') ?? '';
  const offered = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!offered || !constantTimeEquals(offered, secret)) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  }

  const [retention, seasonReminders] = await Promise.allSettled([
    runRetentionSweep({ label: 'scheduler' }),
    runSeasonReminders(),
  ]);

  if (seasonReminders.status === 'rejected') {
    console.error('[palma:cron] season reminders failed', seasonReminders.reason);
  }
  if (retention.status === 'rejected') throw retention.reason;

  return NextResponse.json({
    ...retention.value,
    seasonReminders:
      seasonReminders.status === 'fulfilled'
        ? seasonReminders.value
        : { error: 'Season reminders could not run. See the server log.' },
  });
}
