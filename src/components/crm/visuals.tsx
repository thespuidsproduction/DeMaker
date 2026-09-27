import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  BellRing,
  CalendarDays,
  Mail,
  MessageCircle,
  Milestone,
  Phone,
  StickyNote,
  Users,
} from 'lucide-react';
import { Glyph, Tag } from '@/components/desk/surface';
import {
  CRM_DIRECTION_LABEL,
  CRM_JOURNEY,
  CRM_OFF_PATH,
  CRM_STAGE_LABEL,
  CRM_STAGE_TONE,
  CRM_TOUCHPOINT_KIND_LABEL,
  followUpState,
  initials,
  type CrmDirection,
  type CrmStage,
  type CrmTouchpointKind,
} from '@/domain/crm';
import { formatShortDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ───────────────────────────────────────────────────────────────────────────
   The relationship desk's visuals

   Server components only, like the desk surfaces they sit on: several take an
   icon, and an icon cannot cross into a client component.

   Colour carries one meaning everywhere on this desk. Quiet is waiting, gold
   is PALMA's move, green is the creator moving with PALMA, red is a line
   nobody crosses. A stage tag, a monogram ring, the journey rail and the
   history rail all read from the same table, so they cannot disagree.
   ─────────────────────────────────────────────────────────────────────────── */

const TONE_VAR = {
  neutral: 'var(--text-quiet)',
  accent: 'var(--accent)',
  positive: 'var(--positive)',
  alert: 'var(--alert)',
} as const;

const toneVar = (stage: CrmStage) =>
  ({ ['--tone']: TONE_VAR[CRM_STAGE_TONE[stage]] }) as React.CSSProperties;

export function StageTag({ stage }: { stage: CrmStage }) {
  return <Tag tone={CRM_STAGE_TONE[stage]}>{CRM_STAGE_LABEL[stage]}</Tag>;
}

/** The creator's initials, ringed in the colour of where the relationship stands. */
export function Monogram({
  name,
  stage,
  size = 'md',
}: {
  name: string;
  stage: CrmStage;
  size?: 'md' | 'lg';
}) {
  return (
    <span
      className={cn('monogram', size === 'lg' ? 'size-16 text-xl' : 'size-10 text-[0.8125rem]')}
      style={toneVar(stage)}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/** When the next follow-up is, said the way the desk would say it. */
export function FollowUpTag({ at, now }: { at: string | null; now: Date }) {
  const state = followUpState(at, now);
  if (state === 'none') return <span className="row-note">No follow-up</span>;
  if (state === 'overdue') {
    return (
      <Tag tone="alert">
        <span className="dot" data-tone="alert" aria-hidden />
        Overdue · {formatShortDate(at)}
      </Tag>
    );
  }
  if (state === 'today') return <Tag tone="accent">Today</Tag>;
  return <Tag>{formatShortDate(at)}</Tag>;
}

/**
 * The journey.
 *
 * On a creator's page it is the stage control: one tap on a stop moves the
 * relationship there, and the move is written into its history. On the list
 * it is the pipeline: each stop carries its count and filters the list.
 */
export function JourneyRail(
  props:
    | {
        mode: 'move';
        stage: CrmStage;
        creatorId: string;
        action?: (formData: FormData) => Promise<void>;
      }
    | {
        mode: 'filter';
        counts: Record<CrmStage, number>;
        active: CrmStage | null;
        hrefFor: (stage: CrmStage | null) => string;
      },
) {
  const current = props.mode === 'move' ? props.stage : props.active;
  const index = current ? (CRM_JOURNEY as readonly string[]).indexOf(current) : -1;
  const progress = props.mode === 'filter' ? 1 : index < 0 ? 0 : index / (CRM_JOURNEY.length - 1);

  const stateOf = (stage: CrmStage, i: number) => {
    if (stage === current) return 'current';
    if (props.mode === 'move' && index >= 0 && i < index) return 'passed';
    return 'ahead';
  };

  const stop = (stage: CrmStage, i: number) => {
    const inner = (
      <>
        <span className="journey-node">
          {props.mode === 'filter' ? props.counts[stage] : i + 1}
        </span>
        <span className="text-[0.75rem] leading-tight">{CRM_STAGE_LABEL[stage]}</span>
      </>
    );
    const common = {
      className: 'journey-stop',
      'data-state': stateOf(stage, i),
      style: toneVar(stage),
    };

    if (props.mode === 'filter') {
      return (
        <Link key={stage} href={props.hrefFor(current === stage ? null : stage)} {...common}>
          {inner}
        </Link>
      );
    }
    if (props.action) {
      return (
        <button
          key={stage}
          type="submit"
          name="stage"
          value={stage}
          aria-pressed={stage === current}
          {...common}
        >
          {inner}
        </button>
      );
    }
    return (
      <span key={stage} {...common}>
        {inner}
      </span>
    );
  };

  const offPath = CRM_OFF_PATH.map((stage) => {
    const active = stage === current;
    const label =
      props.mode === 'filter'
        ? `${CRM_STAGE_LABEL[stage]} · ${props.counts[stage]}`
        : CRM_STAGE_LABEL[stage];
    const pill = cn(
      'seg-item',
      stage === 'do_not_contact' && active && 'text-[color:var(--alert)]!',
    );

    if (props.mode === 'filter') {
      return (
        <Link
          key={stage}
          href={props.hrefFor(active ? null : stage)}
          className={pill}
          data-active={active}
        >
          {label}
        </Link>
      );
    }
    if (props.action) {
      return (
        <button
          key={stage}
          type="submit"
          name="stage"
          value={stage}
          className={pill}
          data-active={active}
        >
          {label}
        </button>
      );
    }
    return (
      <span key={stage} className={pill} data-active={active}>
        {label}
      </span>
    );
  });

  const body = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
      <div className="journey flex-1" style={{ ['--progress']: progress } as React.CSSProperties}>
        <span className="journey-track" aria-hidden>
          <span className="journey-fill block" />
        </span>
        {CRM_JOURNEY.map((stage, i) => stop(stage, i))}
      </div>
      <div className="seg self-start lg:self-center" role="group" aria-label="Off the path">
        {offPath}
      </div>
    </div>
  );

  if (props.mode === 'move' && props.action) {
    return (
      <form action={props.action} aria-label="Move the relationship">
        <input type="hidden" name="creatorId" value={props.creatorId} />
        {body}
      </form>
    );
  }
  return body;
}

const KIND_ICON: Record<CrmTouchpointKind, LucideIcon> = {
  email: Mail,
  message: MessageCircle,
  call: Phone,
  meeting: Users,
  event: CalendarDays,
  note: StickyNote,
  stage: Milestone,
  reminder: BellRing,
};

const DIRECTION_TONE: Record<CrmDirection, 'accent' | 'positive' | 'neutral'> = {
  outbound: 'accent',
  inbound: 'positive',
  internal: 'neutral',
};

export type HistoryEntry = {
  id: string;
  kind: CrmTouchpointKind;
  direction: CrmDirection;
  summary: string;
  occurredAt: string;
  author: string | null;
  creator?: { slug: string; displayName: string };
};

const STAGE_BY_LABEL = new Map(
  (Object.entries(CRM_STAGE_LABEL) as [CrmStage, string][]).map(([stage, label]) => [label, stage]),
);

/** "Contacted → In conversation", drawn as the two stages it joins. */
function StageMove({ summary }: { summary: string }) {
  const [from, to] = summary.split(' → ').map((label) => STAGE_BY_LABEL.get(label.trim()));
  if (!from || !to) {
    return <p className="text-[0.875rem] text-[color:var(--text-soft)]">{summary}</p>;
  }
  return (
    <p className="flex flex-wrap items-center gap-2">
      <StageTag stage={from} />
      <span className="text-[color:var(--text-quiet)]" aria-label="to">
        →
      </span>
      <StageTag stage={to} />
    </p>
  );
}

const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * The history rail.
 *
 * One line down the page, a node per entry, grouped by month. The node's
 * colour is who moved: gold when PALMA reached out, green when the creator
 * did, quiet for the desk's own notes. Stage moves and PALMA's automatic
 * season emails sit on the same rail, so the story reads in one pass.
 */
export function HistoryStream({ entries }: { entries: HistoryEntry[] }) {
  const months: { label: string; entries: HistoryEntry[] }[] = [];
  for (const entry of entries) {
    const label = MONTH.format(new Date(entry.occurredAt));
    const last = months[months.length - 1];
    if (last?.label === label) last.entries.push(entry);
    else months.push({ label, entries: [entry] });
  }

  return (
    <div className="flex flex-col gap-2" data-lift="list">
      {months.map((month) => (
        <section key={month.label}>
          <h3 className="label mb-1 px-1 pt-2 text-[10px]">{month.label}</h3>
          <ol className="relative flex flex-col">
            <span
              className="absolute top-4 bottom-4 left-[0.875rem] w-px bg-[color:var(--line)]"
              aria-hidden
            />
            {month.entries.map((entry) => {
              const automatic = entry.kind === 'reminder';
              const move = entry.kind === 'stage';
              const tone = move ? 'neutral' : DIRECTION_TONE[entry.direction];

              return (
                <li key={entry.id} className="relative flex gap-3.5 py-2.5">
                  <Glyph
                    icon={KIND_ICON[entry.kind]}
                    size="sm"
                    tone={tone}
                    className="relative ring-4 ring-[color:var(--surface-1)]"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {entry.creator ? (
                        <Link
                          href={`/portal/crm/${entry.creator.slug}`}
                          className="font-display text-[0.9375rem] text-[color:var(--text)] hover:text-[color:var(--accent)]"
                        >
                          {entry.creator.displayName}
                        </Link>
                      ) : null}
                      <span className="label text-[10px]">
                        {move
                          ? 'Moved'
                          : automatic
                            ? 'Season email · automatic'
                            : entry.kind === 'note'
                              ? 'Note'
                              : `${CRM_TOUCHPOINT_KIND_LABEL[entry.kind]} · ${CRM_DIRECTION_LABEL[entry.direction]}`}
                      </span>
                    </div>
                    {move ? (
                      <StageMove summary={entry.summary} />
                    ) : (
                      <p className="text-[0.875rem] leading-relaxed whitespace-pre-line text-[color:var(--text)]">
                        {entry.summary}
                      </p>
                    )}
                    <p className="text-[0.75rem] text-[color:var(--text-quiet)]">
                      {automatic ? 'PALMA' : (entry.author ?? 'PALMA')} ·{' '}
                      {formatShortDate(entry.occurredAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** Tabs across the top of a page, in the desk's segmented control. */
export function Tabs({
  items,
  active,
  label,
}: {
  items: { href: string; label: string; count?: number }[];
  active: string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="seg max-w-full self-start overflow-x-auto" data-lift="hero">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="seg-item focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
          data-active={item.href === active}
          aria-current={item.href === active ? 'page' : undefined}
        >
          {item.label}
          {item.count !== undefined ? (
            <span className="text-[0.6875rem] text-[color:var(--text-quiet)] tabular-nums">
              {item.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

export const CRM_TABS = [
  { href: '/portal/crm', label: 'Creators' },
  { href: '/portal/crm/history', label: 'History' },
  { href: '/portal/crm/reminders', label: 'Season emails' },
];

export type CountdownPin = {
  key: string;
  label: string;
  sendOn: string;
  state: 'sent' | 'next' | 'later';
};

/**
 * The season's countdown, drawn to scale: today, each scheduled email as a
 * pin on its day, the milestone at the end.
 */
export function Countdown({
  now,
  milestoneAt,
  milestoneLabel,
  pins,
}: {
  now: Date;
  milestoneAt: string;
  milestoneLabel: string;
  pins: CountdownPin[];
}) {
  const end = new Date(milestoneAt).getTime();
  const start = Math.min(now.getTime(), ...pins.map((pin) => new Date(pin.sendOn).getTime()));
  const span = Math.max(1, end - start);
  const at = (value: number) => Math.min(1, Math.max(0, (value - start) / span));
  const style = (value: number) => ({ ['--at']: at(value) }) as React.CSSProperties;

  return (
    <div className="countdown" role="img" aria-label={`Countdown to ${milestoneLabel}`}>
      <span className="countdown-track" aria-hidden />
      <span className="countdown-pin" data-state="today" style={style(now.getTime())}>
        <span className="countdown-dot" />
        <span className="label text-[9.5px]">Today</span>
      </span>
      {pins.map((pin) => (
        <span
          key={pin.key}
          className="countdown-pin"
          data-state={pin.state}
          style={style(new Date(pin.sendOn).getTime())}
        >
          <span className="countdown-dot" />
          <span className="flex flex-col items-center">
            <span className="text-[0.75rem] font-medium text-[color:var(--text)]">{pin.label}</span>
            <span className="text-[0.6875rem] text-[color:var(--text-quiet)]">
              {formatShortDate(pin.sendOn)}
            </span>
          </span>
        </span>
      ))}
      <span className="countdown-pin" data-state="milestone" style={style(end)}>
        <span className="countdown-dot" />
        <span className="flex flex-col items-center">
          <span className="text-[0.75rem] font-medium text-[color:var(--positive)]">
            {milestoneLabel}
          </span>
          <span className="text-[0.6875rem] text-[color:var(--text-quiet)]">
            {formatShortDate(milestoneAt)}
          </span>
        </span>
      </span>
    </div>
  );
}
