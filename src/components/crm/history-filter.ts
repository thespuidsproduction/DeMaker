import type { CrmTouchpointKind } from '@/domain/crm';

/** The History tab's views. Conversations are what people did; the rest PALMA did. */
export const HISTORY_VIEWS = [
  { key: 'all', label: 'Everything' },
  { key: 'contact', label: 'Conversations' },
  { key: 'stage', label: 'Stage moves' },
  { key: 'reminder', label: 'Season emails' },
] as const;

export type HistoryView = (typeof HISTORY_VIEWS)[number]['key'];

export function historyView(value: string | undefined): HistoryView {
  return HISTORY_VIEWS.some((view) => view.key === value) ? (value as HistoryView) : 'all';
}

export function inView(kind: CrmTouchpointKind, view: HistoryView): boolean {
  if (view === 'all') return true;
  if (view === 'stage' || view === 'reminder') return kind === view;
  return kind !== 'stage' && kind !== 'reminder';
}
