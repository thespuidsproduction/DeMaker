import Link from 'next/link';
import { BookOpen, History } from 'lucide-react';
import { Card, Empty } from '@/components/desk/surface';
import { PageHead } from '@/components/desk/blocks';
import { CRM_TABS, HistoryStream, Tabs } from '@/components/crm/visuals';
import { HISTORY_VIEWS, historyView } from '@/components/crm/history-filter';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { listCrmActivity } from '@/server/data/crm';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'CRM history',
  description: 'Everything the relationship desk has recorded, newest first.',
  path: '/portal/crm/history',
  noIndex: true,
});

export default async function CrmHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  await requirePermission('crm:view', '/portal/crm/history');
  const view = historyView((await searchParams).show);
  const entries = await listCrmActivity({ limit: 200, kind: view === 'all' ? undefined : view });

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        eyebrow="Creator CRM"
        eyebrowIcon={History}
        title="History"
        statement="Every conversation, stage move and season email across the desk, newest first. Open a name to see one creator's whole story."
      />

      <Tabs items={CRM_TABS} active="/portal/crm/history" label="Creator CRM" />

      <nav className="seg max-w-full flex-wrap self-start" aria-label="Show">
        {HISTORY_VIEWS.map((item) => (
          <Link
            key={item.key}
            href={
              item.key === 'all' ? '/portal/crm/history' : `/portal/crm/history?show=${item.key}`
            }
            className="seg-item"
            data-active={item.key === view}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {entries.length === 0 ? (
        <Empty
          icon={BookOpen}
          title="Nothing yet"
          description="The desk has not recorded anything of this kind."
        />
      ) : (
        <Card className="glow px-4 py-2 sm:px-6" data-lift="section">
          <HistoryStream entries={entries} />
        </Card>
      )}
    </div>
  );
}
