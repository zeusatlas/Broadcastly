import { UserRoundPlus } from 'lucide-react-native';
import { useState } from 'react';

import { QueryState } from '@/components/ui';

import { AdminListLayout } from '../components/AdminListLayout';
import { PersonRow } from '../components/PersonRow';
import { useReadPlatformAdminsQuery } from '../hooks/use_platform_api';
import type { PlatformAdminStatus } from '../types';
import { PAGE_SIZE, pageFootnote } from '../utils/paging';

const FILTERS = ['All', 'Active', 'Suspended'] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_STATUS: Record<Filter, PlatformAdminStatus | undefined> = {
  All: undefined,
  Active: 'active',
  Suspended: 'suspended',
};

// TODO(add admin): the button opens the add-admin form once it is designed.
export function AdminsScreen() {
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const { data, isLoading, error, refetch } = useReadPlatformAdminsQuery({
    status: FILTER_STATUS[filter],
    search: search || undefined,
    pageSize: PAGE_SIZE,
  });
  const admins = data?.items ?? [];

  return (
    <AdminListLayout
      title="Admins"
      searchPlaceholder="Search admins"
      onSearch={setSearch}
      filters={FILTERS}
      filter={filter}
      onFilterChange={setFilter}
      action={{ label: 'Add platform admin', icon: UserRoundPlus }}
      footnote={pageFootnote(data)}
    >
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={admins.length === 0}
        emptyText="No admins match."
        onRetry={refetch}
      />
      {admins.map((admin, index) => (
        <PersonRow
          key={admin.id}
          name={admin.fullName}
          detail={admin.email}
          status={admin.status}
          isLast={index === admins.length - 1}
        />
      ))}
    </AdminListLayout>
  );
}
