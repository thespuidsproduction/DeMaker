import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, Contact } from 'lucide-react';
import { Card, Empty } from '@/components/desk/surface';
import { PageHead } from '@/components/desk/blocks';
import { HistoryStream, Monogram, StageTag, Tabs } from '@/components/crm/visuals';
import { HISTORY_VIEWS, historyView, inView } from '@/components/crm/history-filter';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { formatShortDate } from '@/lib/format';
import { getCrmCreator } from '@/server/data/crm';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Relationship history',
  description: 'Everything that has passed between PALMA and one creator.',
  path: '/portal/crm',
  noIndex: true,
});

export default async function CrmCreatorHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const [{ slug }, { show }] = await Promise.all([params, searchParams]);
  await requirePermission('crm:view', `/portal/crm/${slug}/history`);

  const creator = await getCrmCreator(slug, { touchpoints: 1000 });
  if (!creator) notFound();

  const view = historyView(show);
  const entries = creator.touchpoints.filter((entry) => inView(entry.kind, view));
  const first = creator.touchpoints[creator.touchpoints.length - 1];
  const base = `/portal/crm/${creator.slug}/history`;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/portal/crm"
        className="label inline-flex items-center gap-1.5 self-start hover:text-[color:var(--text)]"
      >
        <ArrowLeft className="size-3.5" /> Creator CRM
      </Link>

      <PageHead
        eyebrow="History"
        eyebrowIcon={Contact}
        title={creator.displayName}
        statement={
          first
            ? `${creator.touchpointCount} entr${creator.touchpointCount === 1 ? 'y' : 'ies'} since ${formatShortDate(first.occurredAt)}. Gold is PALMA reaching out, green is them getting in touch.`
            : 'Nothing has passed between PALMA and them yet.'
        }
        aside={<Monogram name={creator.displayName} stage={creator.relationship.stage} size="lg" />}
      >
        <StageTag stage={creator.relationship.stage} />
      </PageHead>

      <Tabs
        label="Relationship"
        active={base}
        items={[
          { href: `/portal/crm/${creator.slug}`, label: 'Overview' },
          { href: base, label: 'History', count: creator.touchpointCount },
        ]}
      />

      <nav className="seg max-w-full flex-wrap self-start" aria-label="Show">
        {HISTORY_VIEWS.map((item) => (
          <Link
            key={item.key}
            href={item.key === 'all' ? base : `${base}?show=${item.key}`}
            className="seg-item"
            data-active={item.key === view}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {entries.length === 0 ? (
        <Empty icon={BookOpen} title="Nothing here" description="No entries of this kind yet." />
      ) : (
        <Card className="glow px-4 py-2 sm:px-6" data-lift="section">
          <HistoryStream entries={entries} />
        </Card>
      )}
    </div>
  );
}
