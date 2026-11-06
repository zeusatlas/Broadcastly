import { useLocalSearchParams } from 'expo-router';
import { CreditCard } from 'lucide-react-native';
import { useMemo, useState } from 'react';

import { SectionListPage } from '@/components/shared';
import {
  Badge,
  FigureRow,
  FilterGroupsButton,
  QueryState,
  Text,
  type FilterGroup,
} from '@/components/ui';
import { dateSectionTitle, formatDateTime, groupIntoSections } from '@/utils/helpers';

import { ActivityRow } from '../components/AdminRows';
import { usePlatformPurchasePages, useReadPurchaseSummaryQuery } from '../hooks/use_platform_api';
import type { PlatformPeriod, PurchaseStatus } from '../types';
import { cedis, PERIOD_OPTIONS, PURCHASE_STATUS_LABEL } from '../utils/admin_labels';

const TONE = { completed: 'success', pending: 'warning', failed: 'destructive' } as const;

// Credit purchases across the platform, or one organisation's when opened from its page.
export function PaymentsScreen() {
  const params = useLocalSearchParams<{ organisationId?: string; organisationName?: string }>();
  const [period, setPeriod] = useState<PlatformPeriod>('all_time');
  const [status, setStatus] = useState<'all' | PurchaseStatus>('all');
  const pages = usePlatformPurchasePages({
    period,
    status: status === 'all' ? undefined : status,
    organisationId: params.organisationId,
  });
  const summary = useReadPurchaseSummaryQuery(period);
  const sections = useMemo(
    () => groupIntoSections(pages.items, (item) => dateSectionTitle(item.createdAt)),
    [pages.items],
  );

  const groups: FilterGroup[] = [
    {
      title: 'Period',
      options: PERIOD_OPTIONS,
      value: period,
      defaultValue: 'all_time',
      onChange: (value) => setPeriod(value as PlatformPeriod),
    },
    {
      title: 'Status',
      options: [
        { key: 'all', label: 'Any status' },
        { key: 'completed', label: 'Paid' },
        { key: 'pending', label: 'Waiting for payment' },
        { key: 'failed', label: 'Failed' },
      ],
      value: status,
      defaultValue: 'all',
      onChange: (value) => setStatus(value as 'all' | PurchaseStatus),
    },
  ];

  return (
    <SectionListPage
      title={params.organisationName ? `${params.organisationName} payments` : 'Payments'}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={(item, { isLast }) => (
        <ActivityRow
          title={`${item.credits.toLocaleString()} credits · ${cedis(item.amountPesewas)}`}
          detail={[item.organisationName, item.initiatedBy].filter(Boolean).join(' · ')}
          meta={`${formatDateTime(item.createdAt)} · ${item.reference}${item.failureReason ? ` · ${item.failureReason}` : ''}`}
          trailing={
            <Badge
              label={PURCHASE_STATUS_LABEL[item.status]}
              tone={TONE[item.status]}
              variant="subtle"
            />
          }
          isLast={isLast}
        />
      )}
      onEndReached={pages.loadMore}
      isLoadingMore={pages.hasNextPage && pages.isFetching}
      isRefreshing={pages.isFetching && !pages.isLoading}
      onRefresh={() => {
        pages.reload();
        summary.refetch();
      }}
      header={
        params.organisationId ? null : summary.data ? (
          <>
            <FigureRow
              figures={[
                { label: 'Credits bought', value: summary.data.creditsPurchased },
                { label: 'Waiting', value: summary.data.pendingPurchases },
                { label: 'Failed', value: summary.data.failedPurchases },
              ]}
            />
            <Text variant="caption">
              {cedis(summary.data.amountPaidPesewas)} paid
              {period === 'all_time' ? ' in total' : ' in this period'}.
            </Text>
          </>
        ) : null
      }
      empty={
        <QueryState
          isLoading={pages.isLoading}
          error={pages.error}
          isEmpty
          emptyText="No payments here"
          emptyDescription="Credit purchases will appear here once organisations buy credits."
          emptyIcon={CreditCard}
          onRetry={pages.reload}
        />
      }
      footer={
        <FilterGroupsButton
          groups={groups}
          onReset={() => {
            setPeriod('all_time');
            setStatus('all');
          }}
          title="Filter payments"
          description="Choose a period and a status."
          accessibilityLabel="Open payment filters"
        />
      }
    />
  );
}
