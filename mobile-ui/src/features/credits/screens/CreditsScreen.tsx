import { router } from 'expo-router';
import { Plus, Send, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useCollapsingTitle } from '@/components/shared';
import { Button, Card, Chip, QueryState, Text } from '@/components/ui';
import { enterRow } from '@/constants/motion';
import { MaxContentWidth } from '@/constants/theme';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import { cn } from '@/utils/helpers';

import { TransactionRow } from '../components/TransactionRow';
import { useReadCreditBalancesQuery, useReadCreditTransactionsQuery } from '../hooks/use_credits_api';
import type { CreditSummary, CreditTransaction, CreditTransactionType } from '../types';

type HistoryFilter = 'all' | 'added' | 'allocated' | 'used';

const FILTERS: { key: HistoryFilter; label: string; types?: CreditTransactionType[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'added', label: 'Added', types: ['purchase', 'allocation_in', 'refund'] },
  { key: 'allocated', label: 'Allocated', types: ['allocation_out'] },
  { key: 'used', label: 'Used', types: ['reservation', 'consumption'] },
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
  const collapsing = useCollapsingTitle('Credits', { header: 'tab' });
  const canAllocate = useHasPermission('credit.allocate');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const balances = useReadCreditBalancesQuery();
  const ledger = useReadCreditTransactionsQuery({ page: 1, pageSize: 50, wallet: 'mine' });
  const summary: CreditSummary = {
    available: balances.data?.mine.available ?? 0,
    reserved: balances.data?.mine.reserved ?? 0,
    spendingLimit: null,
    spentThisPeriod: 0,
  };
  const liveLedger = (ledger.data?.items ?? []).map<CreditTransaction>((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    title: transaction.reason ?? transaction.type.replaceAll('_', ' '),
    amount: transaction.amount,
    occurredAt: new Date(transaction.createdAt).toLocaleDateString(),
    initiatedBy: transaction.initiatedBy ?? 'System',
  }));

  const items = useMemo(() => {
    const types = FILTERS.find((f) => f.key === filter)?.types;
    return types ? liveLedger.filter((t) => types.includes(t.type)) : liveLedger;
  }, [filter, liveLedger]);

  return (
    <>
      <Animated.FlatList<CreditTransaction>
        data={items}
        onScroll={collapsing.onScroll}
        scrollEventThrottle={16}
        onLayout={collapsing.onLayout}
        className="flex-1 bg-background"
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          width: '100%',
          maxWidth: MaxContentWidth,
          alignSelf: 'center',
          minHeight: collapsing.minHeight,
          paddingHorizontal: 20,
          paddingBottom: 24,
        }}
        ListHeaderComponent={
          <View className="pb-2">
            {collapsing.largeTitle}

            <Card className="gap-4 p-5">
              <View className="flex-row items-start justify-between">
                <View className="gap-1">
                  <Text variant="overline">Available</Text>
                  <Text className="font-sans-extrabold text-4xl leading-tight text-foreground">
                    {summary.available.toLocaleString()}
                  </Text>
                  <Text variant="caption">
                    credits · {summary.reserved.toLocaleString()} reserved for scheduled sends
                  </Text>
                </View>
                <View className="h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                  <Wallet size={20} color={theme.accentEmphasis} />
                </View>
              </View>
              {summary.spendingLimit ? (
                <SpendingLimit spent={summary.spentThisPeriod} limit={summary.spendingLimit} />
              ) : null}
            </Card>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="Buy"
                  accessibilityLabel="Buy credits"
                  icon={Plus}
                  variant="accent"
                  shape="pill"
                  fullWidth
                  onPress={() => notify.info('Buying credits is coming soon')}
                />
              </View>
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
            <View className="mt-3 flex-row gap-2">
              {FILTERS.map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  isSelected={f.key === filter}
                  onPress={() => setFilter(f.key)}
                />
              ))}
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={enterRow(index)}>
            <TransactionRow transaction={item} isLast={index === items.length - 1} />
          </Animated.View>
        )}
        ListEmptyComponent={
          <QueryState
            isLoading={ledger.isLoading}
            error={ledger.error ?? balances.error}
            isEmpty={!ledger.isLoading && items.length === 0}
            emptyText="No credit transactions yet."
            onRetry={() => {
              balances.refetch();
              ledger.refetch();
            }}
          />
        }
      />
      {collapsing.bar}
    </>
  );
}
