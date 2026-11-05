import { Building2, UserRoundPlus, UsersRound } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Avatar, Button, Card, QueryState, StatTile, Text } from '@/components/ui';
import type { ExecutiveStatus } from '@/types/models';

import { ListControls } from '../components/ListControls';
import { PersonRow } from '../components/PersonRow';
import {
  useReadOrganisationExecutivesQuery,
  useReadOrganisationQuery,
} from '../hooks/use_platform_api';
import { PAGE_SIZE, pageFootnote } from '../utils/paging';

const FILTERS = ['All', 'Active', 'Suspended'] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_STATUS: Record<Filter, ExecutiveStatus | undefined> = {
  All: undefined,
  Active: 'active',
  Suspended: 'suspended',
};

// One organisation for the platform admin: its head, totals and executives.
export function OrganisationScreen({ organisationId }: { organisationId: string }) {
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const details = useReadOrganisationQuery(organisationId);
  const executives = useReadOrganisationExecutivesQuery(organisationId, {
    status: FILTER_STATUS[filter],
    search: search || undefined,
    pageSize: PAGE_SIZE,
  });
  const organisation = details.data;
  const rows = executives.data?.items ?? [];
  const footnote = pageFootnote(executives.data);

  if (!organisation) {
    return (
      <PageScreen title="Organisation">
        <QueryState
          isLoading={details.isLoading}
          error={details.error}
          isEmpty
          emptyText="Organisation not found."
          onRetry={details.refetch}
        />
      </PageScreen>
    );
  }

  const { head } = organisation;

  return (
    <PageScreen title={organisation.name} contentClassName="gap-6">
      <Card className="flex-row items-center gap-3">
        {head ? (
          <>
            <Avatar name={head.fullName} size="md" />
            <View className="flex-1 gap-0.5">
              <Text variant="caption">{organisation.headTitle}</Text>
              <Text className="font-sans-bold text-base text-foreground" numberOfLines={1}>
                {head.fullName}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {head.email}
              </Text>
            </View>
          </>
        ) : (
          <View className="flex-1 gap-3">
            <Text variant="bodyMuted">
              No head appointed yet. Appoint one so they can set up executives.
            </Text>
          <Button label={`Appoint ${organisation.headTitle.toLowerCase()}`} icon={UserRoundPlus} variant="accent" />
          </View>
        )}
      </Card>

      <View className="flex-row gap-3">
        <StatTile
          label="Members"
          value={organisation.memberCount.toLocaleString()}
          caption={organisation.type}
          icon={Building2}
        />
        <StatTile
          label="Executives"
          value={organisation.executiveCount.toLocaleString()}
          caption={`Set by the ${organisation.headTitle.toLowerCase()}`}
          icon={UsersRound}
        />
      </View>

      <View className="gap-3">
        <Text variant="heading">Executives</Text>
        <ListControls
          searchPlaceholder="Search name, email or party ID"
          onSearch={setSearch}
          filters={FILTERS}
          filter={filter}
          onFilterChange={setFilter}
        />
        <QueryState
          isLoading={executives.isLoading}
          error={executives.error}
          isEmpty={rows.length === 0}
          emptyText="No executives match."
          onRetry={executives.refetch}
        />
        <View>
          {rows.map((executive, index) => (
            <PersonRow
              key={executive.id}
              name={executive.fullName}
              detail={executive.positions.join(', ') || 'No position'}
              status={executive.status}
              isLast={index === rows.length - 1}
            />
          ))}
        </View>
        {footnote ? (
          <Text variant="caption" className="text-center">
            {footnote}
          </Text>
        ) : null}
      </View>
    </PageScreen>
  );
}
