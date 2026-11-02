import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';

import { QueryState } from '@/components/ui';

import { AdminListLayout } from '../components/AdminListLayout';
import { OrganisationRow } from '../components/OrganisationRow';
import { useReadOrganisationsQuery } from '../hooks/use_platform_api';
import type { ListOrganisationsParams } from '../types';
import { PAGE_SIZE, pageFootnote } from '../utils/paging';

const FILTERS = ['All', 'No chairman', 'Inactive'] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_PARAMS: Record<Filter, ListOrganisationsParams> = {
  All: {},
  'No chairman': { hasChairman: false, status: 'active' },
  Inactive: { status: 'inactive' },
};

export function OrganisationsScreen() {
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const { data, isLoading, error, refetch } = useReadOrganisationsQuery({
    ...FILTER_PARAMS[filter],
    search: search || undefined,
    pageSize: PAGE_SIZE,
  });
  const organisations = data?.items ?? [];

  return (
    <AdminListLayout
      title="Organisations"
      searchPlaceholder="Search organisations"
      onSearch={setSearch}
      filters={FILTERS}
      filter={filter}
      onFilterChange={setFilter}
      action={{ label: 'New organisation', icon: Plus }}
      footnote={pageFootnote(data)}
    >
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={organisations.length === 0}
        emptyText="No organisations match."
        onRetry={refetch}
      />
      {organisations.map((organisation, index) => (
        <OrganisationRow
          key={organisation.id}
          organisation={organisation}
          onPress={() =>
            router.push({ pathname: '/admin/organisations/[id]', params: { id: organisation.id } })
          }
          isLast={index === organisations.length - 1}
        />
      ))}
    </AdminListLayout>
  );
}
