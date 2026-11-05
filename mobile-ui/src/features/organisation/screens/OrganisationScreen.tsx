import { BriefcaseBusiness, MapPinned, Plus, UsersRound } from 'lucide-react-native';
import { router } from 'expo-router';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, QueryState, StatTile, Text } from '@/components/ui';
import { useAccess } from '@/features/auth';

import { UnitTree } from '../components/UnitTree';
import {
  useReadOrganisationOverviewQuery,
  useReadPositionsQuery,
} from '../hooks/use_organisation_api';
import { formatUnitType } from '../utils/format_unit_type';

const count = (value: number | null | undefined) =>
  value === undefined || value === null ? '—' : value.toLocaleString();

export function OrganisationScreen() {
  const access = useAccess();
  const canManage = access.check({ permission: 'appointment.manage' });
  const overview = useReadOrganisationOverviewQuery({ enabled: canManage });
  const positions = useReadPositionsQuery({ enabled: canManage });
  const totals = overview.data;
  const positionItems = positions.data ?? [];

  return (
    <PageScreen title="Organisation">
      <View className="gap-6">
        <Text variant="bodyMuted">
          View your organisation structure, positions and executive activity.
        </Text>

        <View className="gap-3">
          <View className="flex-row gap-3">
            <StatTile
              label="Executives"
              value={count(totals?.activeExecutives)}
              caption={`${count(totals?.suspendedExecutives)} suspended`}
              icon={UsersRound}
            />
            <StatTile
              label="Units"
              value={count(totals?.units)}
              caption="In your reach"
              icon={MapPinned}
            />
          </View>
          <View className="flex-row gap-3">
            <StatTile
              label="Positions"
              value={count(totals?.positions)}
              caption="Configured offices"
              icon={BriefcaseBusiness}
            />
            <StatTile
              label="Members"
              value={count(totals?.members)}
              caption="In your organisation"
              icon={UsersRound}
            />
          </View>
        </View>

        <UnitTree />

        <View className="gap-1">
          <Text variant="overline">Positions</Text>
          <QueryState
            isLoading={positions.isLoading}
            error={positions.error ?? overview.error}
            isEmpty={!positions.isLoading && positionItems.length === 0}
            emptyText="No positions have been configured yet."
            onRetry={() => {
              overview.refetch();
              positions.refetch();
            }}
          />
          {positionItems.map((position, index) => (
            <View
              key={position.id}
              className={
                index < positionItems.length - 1
                  ? 'flex-row items-center justify-between border-b border-border py-3'
                  : 'flex-row items-center justify-between py-3'
              }
            >
              <View className="flex-1 gap-0.5">
                <Text variant="label" numberOfLines={1}>
                  {position.title}
                </Text>
                <Text variant="caption">{formatUnitType(position.unitType)}</Text>
              </View>
              <Text variant="caption">
                {position.holderCount} {position.holderCount === 1 ? 'holder' : 'holders'}
              </Text>
            </View>
          ))}
        </View>

        {canManage ? (
          <View className="gap-3 pt-2">
            <Text variant="overline">Manage organisation</Text>
            <View className="flex-row gap-3">
              <Button
                label="Add unit"
                icon={Plus}
                variant="outline"
                fullWidth
                className="flex-1"
                onPress={() => router.push('/organisation/unit/new')}
              />
              <Button
                label="New position"
                icon={BriefcaseBusiness}
                variant="outline"
                fullWidth
                className="flex-1"
                onPress={() => router.push('/organisation/position/new')}
              />
            </View>
          </View>
        ) : null}
      </View>
    </PageScreen>
  );
}
