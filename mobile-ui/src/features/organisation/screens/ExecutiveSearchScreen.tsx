import { useMemo, useState } from 'react';
import { X } from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { QueryState, SearchField, Text } from '@/components/ui';
import { useHasPermission } from '@/features/auth';

import { ExecutiveRow } from '../components/ExecutiveRow';
import { useReadExecutivesQuery } from '../hooks/use_organisation_api';

export function ExecutiveSearchScreen() {
  const [search, setSearch] = useState('');
  const canManage = useHasPermission('appointment.manage');
  const query = useReadExecutivesQuery(
    { page: 1, pageSize: 50, ...(search.trim() ? { search: search.trim() } : {}) },
    { enabled: canManage },
  );
  const results = useMemo(
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
    <PageScreen backIcon={X} backLabel="Close search">
      <View className="gap-4">
        <SearchField
          autoFocus
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, position or unit"
        />
        <Text variant="caption">
          {results.length} {results.length === 1 ? 'executive' : 'executives'} found
        </Text>
        <QueryState
          isLoading={query.isLoading}
          error={query.error}
          isEmpty={!query.isLoading && results.length === 0}
          emptyText="Try a different name, position or unit."
          onRetry={query.refetch}
        />
        <View>
          {results.length > 0
            ? results.map((executive, index) => (
                <ExecutiveRow
                  key={executive.id}
                  executive={executive}
                  isLast={index === results.length - 1}
                />
              ))
            : null}
        </View>
      </View>
    </PageScreen>
  );
}
