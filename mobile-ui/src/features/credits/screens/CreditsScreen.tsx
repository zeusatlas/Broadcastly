import { router, useFocusEffect } from 'expo-router';
import { Plus, Send, Wallet } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SectionList, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCollapsingTitle } from '@/components/shared';
import {
  Button,
  Card,
  FigureRow,
  FILTER_THRESHOLD,
  FilterButton,
  QueryState,
  Text,
} from '@/components/ui';
import { enterRow } from '@/constants/motion';
import { MaxContentWidth } from '@/constants/theme';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { cn, dateSectionTitle, groupIntoSections, type ListSection } from '@/utils/helpers';

import { TransactionRow } from '../components/TransactionRow';
import {
  useAllocationPages,
  useCreditTransactionPages,
  useReadCreditBalancesQuery,
} from '../hooks/use_credits_api';
import type { CreditSummary, CreditTransaction, CreditTransactionType } from '../types';

type HistoryFilter = 'all' | 'added' | 'allocated' | 'used';

const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList<CreditTransaction, ListSection<CreditTransaction>>,
);

const FILTERS: { key: HistoryFilter; label: string; types?: CreditTransactionType[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'added', label: 'Added', types: ['purchase', 'allocation_in', 'refund'] },
  { key: 'allocated', label: 'Allocated', types: ['allocation_out'] },
  { key: 'used', label: 'Used', types: ['reservation', 'release', 'consumption'] },
];

function SpendingLimit({ spent, limit }: { spent: number; limit: number }) {
  const percent = Math.min(100, Math.round((spent / limit) * 100));

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text variant="caption">Monthly limit</Text>
        <Text variant="caption">
          {spent.toLocaleString()} of {limit.toLocaleString()} used
        </Text>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-muted">
        <View
          className={cn('h-full rounded-full', percent >= 90 ? 'bg-warning' : 'bg-primary')}
          style={{ width: `${percent}%` }}
        />
      </View>
    </View>
  );
}

// Balance, the actions the user may take, and their ledger (FR-CR-01..10, hybrid policy).
export function CreditsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const collapsing = useCollapsingTitle('Credits', { header: 'tab' });
  const canAllocate = useHasPermission('credit.allocate');
  const canPurchase = useHasPermission('credit.purchase');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const balances = useReadCreditBalancesQuery();
  const total = balances.data?.organisationTotal ?? null;
  const mine = balances.data?.mine;
  // Who may see the organisation's credits sees everyone's here, and everyone's history.
  const wallet = total ? 'organisation' : 'mine';
  const showsAllocations = canAllocate && filter === 'allocated';
  // The server filters by kind and pages, so long histories never load at once.
  const ledger = useCreditTransactionPages(wallet, FILTERS.find((f) => f.key === filter)?.types);
  const allocations = useAllocationPages(showsAllocations);
  const reload = useRef(() => {});
  const hasFocusedOnce = useRef(false);

  useEffect(() => {
    reload.current = () => {
      balances.refetch();
      ledger.reload();
      if (showsAllocations) allocations.reload();
    };
  });

  // Coming back from allocating shows the new balance and history.
  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnce.current) reload.current();
      hasFocusedOnce.current = true;
    }, []),
  );
  const summary: CreditSummary = {
    available: (total ?? mine)?.available ?? 0,
    reserved: (total ?? mine)?.reserved ?? 0,
    spendingLimit: null,
    spentThisPeriod: 0,
  };

  const liveLedger = ledger.items.map<CreditTransaction>((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    title: transaction.reason ?? transaction.type.replaceAll('_', ' '),
    amount: transaction.amount,
    occurredAt: new Date(transaction.createdAt).toLocaleDateString(),
    createdAt: transaction.createdAt,
    // The organisation-wide history says whose credits moved; your own says who moved them.
    initiatedBy:
      wallet === 'organisation'
        ? (transaction.walletOwner ?? 'Organisation')
        : (transaction.initiatedBy ?? 'System'),
  }));

  const allocationRows = allocations.items.map<CreditTransaction>((allocation) => ({
    id: allocation.id,
    type: 'allocation_out',
    title: allocation.reason
      ? `To ${allocation.executiveName} · ${allocation.reason}`
      : `To ${allocation.executiveName}`,
    amount: -allocation.credits,
    occurredAt: new Date(allocation.createdAt).toLocaleDateString(),
    createdAt: allocation.createdAt,
    initiatedBy: allocation.initiatedBy ?? 'System',
  }));
  const listQuery = showsAllocations ? allocations : ledger;
  const showsFilter = filter !== 'all' || ledger.total > FILTER_THRESHOLD;

  const items = showsAllocations ? allocationRows : liveLedger;
  const sections = useMemo(
    () => groupIntoSections(items, (item) => dateSectionTitle(item.createdAt)),
    [items],
  );

  return (
    <>
      <AnimatedSectionList
        sections={sections}
        stickySectionHeadersEnabled={false}
        onScroll={collapsing.onScroll}
        scrollEventThrottle={16}
        onLayout={collapsing.onLayout}
        className="flex-1 bg-background"
        keyExtractor={(item) => item.id}
        onEndReached={listQuery.loadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{
          width: '100%',
          maxWidth: MaxContentWidth,
          alignSelf: 'center',
          minHeight: collapsing.minHeight,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + (showsFilter ? 84 : 24),
        }}
        ListHeaderComponent={
          <View className="pb-2">
            {collapsing.largeTitle}

            <Card className="gap-4 p-5">
              <View className="flex-row items-start justify-between">
                <View className="gap-1">
                  <Text variant="overline">{total ? 'Organisation credits' : 'Your credits'}</Text>
                  <Text className="font-sans-extrabold text-4xl leading-tight text-foreground">
                    {summary.available.toLocaleString()}
                  </Text>
                  <Text variant="caption">
                    {total ? 'available across the whole organisation' : 'available to spend now'}
                  </Text>
                  {!total && summary.reserved > 0 ? (
                    <Text variant="caption">
                      {summary.reserved.toLocaleString()} more set aside for scheduled broadcasts
                    </Text>
                  ) : null}
                </View>
                <View className="h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                  <Wallet size={20} color={theme.accentEmphasis} />
                </View>
              </View>
              {total ? (
                <>
                  <FigureRow
                    figures={[
                      { label: 'Scheduled', value: total.reserved },
                      { label: 'Yours', value: mine?.available ?? 0 },
                    ]}
                  />
                  <Text variant="caption">
                    Everyone’s credits added together. Scheduled is the cost of broadcasts that
                    haven’t gone out yet: it’s set aside now and deducted when they’re sent.
                  </Text>
                </>
              ) : (
                <Text variant="caption">
                  Given to you by your organisation. Your broadcasts are paid from here.
                </Text>
              )}
              {summary.spendingLimit ? (
                <SpendingLimit spent={summary.spentThisPeriod} limit={summary.spendingLimit} />
              ) : null}
            </Card>

            <View className="mt-4 flex-row gap-3">
              {canPurchase ? (
                <View className="flex-1">
                  <Button
                    label="Buy"
                    accessibilityLabel="Buy credits"
                    icon={Plus}
                    variant="accent"
                    shape="pill"
                    fullWidth
                    onPress={() => router.push('/credits/buy')}
                  />
                </View>
              ) : null}
              {canAllocate ? (
                <View className="flex-1">
                  <Button
                    label="Allocate"
                    accessibilityLabel="Allocate credits"
                    icon={Send}
                    variant="outline"
                    shape="pill"
                    fullWidth
                    onPress={() => router.push('/credits/allocate')}
                  />
                </View>
              ) : null}
            </View>

            <Text accessibilityRole="header" variant="overline" className="mt-8">
              History
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View className="flex-row items-baseline justify-between bg-background pb-1 pt-5">
            <Text
              accessibilityRole="header"
              className="font-sans-bold text-xs uppercase tracking-widest text-accent-emphasis"
            >
              {section.title}
            </Text>
            <Text variant="caption">{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <Animated.View entering={enterRow(index)}>
            <TransactionRow transaction={item} isLast={index === section.data.length - 1} />
          </Animated.View>
        )}
        ListEmptyComponent={
          <QueryState
            isLoading={listQuery.isLoading}
            error={listQuery.error ?? balances.error}
            isEmpty={!listQuery.isLoading && items.length === 0}
            emptyText="No credit transactions yet."
            onRetry={() => {
              balances.refetch();
              listQuery.reload();
            }}
          />
        }
      />
      {collapsing.bar}

      {showsFilter ? (
        <View
          pointerEvents="box-none"
          className="absolute bottom-0 left-0 right-0 flex-row items-center justify-end px-5"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <FilterButton
            align="right"
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            defaultValue="all"
            title="Filter history"
            description="Choose which credit movements to show."
            accessibilityLabel="Open credit history filters"
          />
        </View>
      ) : null}
    </>
  );
}
