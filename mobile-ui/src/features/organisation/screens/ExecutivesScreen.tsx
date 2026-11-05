import { router } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, Chip, QueryState, Text } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';

import { ExecutiveRow } from '../components/ExecutiveRow';
import { useReadExecutivesQuery } from '../hooks/use_organisation_api';

type ExecutiveFilter = 'all' | 'active' | 'suspended';

const FILTERS: { key: ExecutiveFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
];

export function ExecutivesScreen() {
  const theme = useTheme();
  const canManage = useHasPermission('appointment.manage');
  const [filter, setFilter] = useState<ExecutiveFilter>('all');
  const query = useReadExecutivesQuery(
    { page: 1, pageSize: 50, ...(filter === 'all' ? {} : { status: filter }) },
    { enabled: canManage },
  );
  const executives = useMemo(
    () =>
      (query.data?.items ?? []).map((executive) => ({
        id: executive.id,
        name: executive.fullName,
        position: executive.appointments[0]?.positionTitle ?? 'No appointment',
        unit: executive.appointments[0]?.unitName ?? 'Organisation-wide',
        status: executive.status,
        email: executive.email,
        phone: executive.phone ?? 'No phone number',
        permissions: executive.appointments.flatMap((appointment) => appointment.permissions),
      })),
    [query.data],
  );

  return (
    <PageScreen
      title="Executives"
      footer={
        <View className="flex-row items-center justify-between gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search executives"
            onPress={() => router.push('/executives/search')}
            className="h-14 w-14 items-center justify-center rounded-full bg-card active:opacity-70"
          >
            <Search size={21} color={theme.foreground} />
          </Pressable>
          {canManage ? (
            <Button
              label="New executive"
              icon={Plus}
              variant="accent"
              shape="pill"
              onPress={() => router.push('/executives/new')}
            />
          ) : null}
        </View>
      }
    >
      <View className="gap-5">
        <Text variant="bodyMuted">
          Browse appointments within your permitted scope. Permissions are enforced by the server.
        </Text>

        <View className="flex-row gap-2">
          {FILTERS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              isSelected={item.key === filter}
              onPress={() => setFilter(item.key)}
            />
          ))}
        </View>

        <QueryState
          isLoading={query.isLoading}
          error={query.error}
          isEmpty={!query.isLoading && executives.length === 0}
          emptyText="There are no executives in this view."
          onRetry={query.refetch}
        />
        <Text variant="caption">
          {executives.length} {executives.length === 1 ? 'executive' : 'executives'}
        </Text>

        <View>
          {executives.length > 0
            ? executives.map((executive, index) => (
                <ExecutiveRow
                  key={executive.id}
                  executive={executive}
                  isLast={index === executives.length - 1}
                />
              ))
            : null}
        </View>
      </View>
    </PageScreen>
  );
}
