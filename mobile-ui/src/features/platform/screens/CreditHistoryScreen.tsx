import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { History, SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { SectionListPage } from '@/components/shared';
import { Button, FilterGroupsButton, QueryState, type FilterGroup } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { dateSectionTitle, formatDateTime, groupIntoSections } from '@/utils/helpers';

import { ActivityRow } from '../components/AdminRows';
import { usePlatformCreditPages } from '../hooks/use_platform_api';
import type { PlatformCreditTransactionType, PlatformPeriod } from '../types';
import { CREDIT_TYPE_LABEL, PERIOD_OPTIONS, signed } from '../utils/admin_labels';

type Kind = 'all' | PlatformCreditTransactionType;

const KINDS: { key: Kind; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'purchase', label: 'Bought' },
  { key: 'allocation_out', label: 'Given to executives' },
  { key: 'consumption', label: 'Used for broadcasts' },
  { key: 'adjustment', label: 'Adjusted by Broadcastly' },
];

// Every credit movement on the platform, or one organisation's when opened from its page.
export function CreditHistoryScreen() {
  const params = useLocalSearchParams<{ organisationId?: string; organisationName?: string }>();
  const canAdjust = useHasPermission('platform.credit.manage');
  const [period, setPeriod] = useState<PlatformPeriod>('all_time');
  const [kind, setKind] = useState<Kind>('all');
  const pages = usePlatformCreditPages({
    period,
    type: kind === 'all' ? undefined : kind,
    organisationId: params.organisationId,
  });
  const sections = useMemo(
    () => groupIntoSections(pages.items, (item) => dateSectionTitle(item.createdAt)),
    [pages.items],
  );
  const reload = useRef(pages.reload);
  const hasFocusedOnce = useRef(false);
  useEffect(() => {
    reload.current = pages.reload;
  });

  // Back from an adjustment, show it.
  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnce.current) reload.current();
      hasFocusedOnce.current = true;
    }, []),
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
      title: 'Kind',
      options: KINDS,
      value: kind,
      defaultValue: 'all',
      onChange: (value) => setKind(value as Kind),
    },
  ];

  return (
    <SectionListPage
      title={params.organisationName ? `${params.organisationName} credits` : 'Credit history'}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={(item, { isLast }) => (
        <ActivityRow
          title={item.reason ?? CREDIT_TYPE_LABEL[item.type]}
          detail={[item.organisationName, item.walletOwner].filter(Boolean).join(' · ')}
          meta={`${CREDIT_TYPE_LABEL[item.type]} · ${formatDateTime(item.createdAt)}`}
          trailing={signed(item.amount)}
          isLast={isLast}
        />
      )}
      onEndReached={pages.loadMore}
      isLoadingMore={pages.hasNextPage && pages.isFetching}
      isRefreshing={pages.isFetching && !pages.isLoading}
      onRefresh={pages.reload}
      empty={
        <QueryState
          isLoading={pages.isLoading}
          error={pages.error}
          isEmpty
          emptyText="No credit movements"
          emptyDescription="Purchases, allocations, broadcasts and adjustments appear here."
          emptyIcon={History}
          onRetry={pages.reload}
        />
      }
      footer={
        <View className="flex-row items-center justify-between gap-3">
          <FilterGroupsButton
            groups={groups}
            onReset={() => {
              setPeriod('all_time');
              setKind('all');
            }}
            title="Filter credit history"
            description="Choose a period and a kind of movement."
            accessibilityLabel="Open credit history filters"
          />
          {canAdjust ? (
            <Button
              label="Adjust"
              accessibilityLabel="Adjust an organisation's credits"
              icon={SlidersHorizontal}
              variant="accent"
              shape="pill"
              onPress={() =>
                router.push({
                  pathname: '/admin/adjust-credits',
                  params: params.organisationId
                    ? {
                        organisationId: params.organisationId,
                        organisationName: params.organisationName,
                      }
                    : {},
                })
              }
            />
          ) : null}
        </View>
      }
    />
  );
}
