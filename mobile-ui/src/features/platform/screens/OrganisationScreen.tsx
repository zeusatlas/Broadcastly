import { router, useFocusEffect } from 'expo-router';
import {
  Building2,
  CreditCard,
  DoorOpen,
  ImagePlus,
  History,
  Megaphone,
  Pencil,
  RefreshCw,
  UserRoundPlus,
  UsersRound,
  Wallet,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { PageScreen, SectionListPage } from '@/components/shared';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  QueryState,
  StatTile,
  Text,
} from '@/components/ui';
import { useAuthStore, useHasPermission } from '@/features/auth';
import { useDebouncedValue } from '@/hooks/use_pages';
import { notify } from '@/lib/notify';
import { groupIntoSections, letterSectionTitle } from '@/utils/helpers';
import { pickLogoForm } from '@/utils/media';

import { organisationTypeLabel } from '../utils/organisation_types';

import { MenuRow } from '../components/AdminRows';
import { InlineSearch, ListFooter } from '../components/ListFooter';
import { PersonRow } from '../components/PersonRow';
import {
  useOpenWorkspaceMutation,
  useReactivateOrganisationMutation,
  useRemoveOrganisationLogoMutation,
  useUploadOrganisationLogoMutation,
  useOrganisationExecutivePages,
  useReadOrganisationQuery,
  useSuspendOrganisationMutation,
} from '../hooks/use_platform_api';

type Filter = 'all' | 'active' | 'suspended' | 'invited';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All executives' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'invited', label: 'Invited' },
];

// One organisation for the platform admin: head, totals, status and executives. Never member data.
export function OrganisationScreen({ organisationId }: { organisationId: string }) {
  const canManageOrganisation = useHasPermission('platform.organisation.manage');
  const canViewFinance = useHasPermission('platform.finance.view');
  const canViewBroadcasts = useHasPermission('platform.broadcast.view');
  const canAdjustCredits = useHasPermission('platform.credit.manage');
  const canOperate = useHasPermission('platform.organisation.operate');
  const openWorkspace = useOpenWorkspaceMutation();
  const enterOrganisation = useAuthStore((state) => state.enterOrganisation);
  const [filter, setFilter] = useState<Filter>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [isConfirmingStatus, setIsConfirmingStatus] = useState(false);
  const query = useDebouncedValue(search.trim());
  const details = useReadOrganisationQuery(organisationId);
  const executives = useOrganisationExecutivePages(organisationId, {
    status: filter === 'all' ? undefined : filter,
    search: query || undefined,
  });
  // The API returns executives by first name, so A–Z sections follow its order.
  const sections = useMemo(
    () => groupIntoSections(executives.items, (item) => letterSectionTitle(item.fullName)),
    [executives.items],
  );
  const suspendOrganisation = useSuspendOrganisationMutation();
  const reactivateOrganisation = useReactivateOrganisationMutation();
  const uploadLogo = useUploadOrganisationLogoMutation();
  const removeLogo = useRemoveOrganisationLogoMutation();
  const [isConfirmingLogo, setIsConfirmingLogo] = useState(false);
  const reload = useRef(() => {});
  const hasFocusedOnce = useRef(false);

  useEffect(() => {
    reload.current = () => {
      details.refetch();
      executives.reload();
    };
  });

  // Back from appointing a head, show them.
  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnce.current) reload.current();
      hasFocusedOnce.current = true;
    }, []),
  );

  const organisation = details.data;
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
  // This organisation's payments, credits and broadcasts, for admins allowed to see them.
  const activity = [
    canViewFinance && {
      title: 'Payments',
      description: 'Credits this organisation bought.',
      icon: CreditCard,
      pathname: '/admin/payments' as const,
    },
    canViewFinance && {
      title: 'Credit history',
      description: 'Every credit bought, given and used here.',
      icon: History,
      pathname: '/admin/credit-history' as const,
    },
    canViewBroadcasts && {
      title: 'Broadcasts',
      description: 'Messages this organisation sent.',
      icon: Megaphone,
      pathname: '/admin/broadcasts' as const,
    },
    canAdjustCredits && {
      title: 'Adjust credits',
      description: 'Add or remove credits for the head, with a reason.',
      icon: Wallet,
      pathname: '/admin/adjust-credits' as const,
    },
  ].filter((item) => item !== false);
  const isSuspended = organisation.status === 'suspended';
  const statusMutation = isSuspended ? reactivateOrganisation : suspendOrganisation;

  // Everything a head can do (members, broadcasts, credits, structure), as this organisation's head.
  const workInside = async () => {
    const response = await openWorkspace.mutate({ uuid: organisationId });
    if (!response) {
      notify.error('Could not open it', openWorkspace.error?.message ?? 'Try again.');
      return;
    }
    enterOrganisation(response.data);
    router.replace('/');
  };

  const changeStatus = async () => {
    const response = await statusMutation.mutate({ uuid: organisationId });
    setIsConfirmingStatus(false);
    if (!response) {
      notify.error('Could not change the status', 'Check your connection and try again.');
      return;
    }
    notify.success(isSuspended ? 'Organisation reactivated.' : 'Organisation suspended.');
    reload.current();
  };

  const changeLogo = async () => {
    const form = await pickLogoForm();
    if (!form) return;
    const response = await uploadLogo.mutate({ uuid: organisationId, form });
    if (!response) {
      notify.error('Logo not updated', 'Use a PNG, JPEG or WebP image up to 2 MB.');
      return;
    }
    notify.success('Logo updated', 'Everyone in this organisation will see it.');
    reload.current();
  };

  const deleteLogo = async () => {
    const response = await removeLogo.mutate({ uuid: organisationId });
    setIsConfirmingLogo(false);
    if (!response) {
      notify.error('Logo not removed', 'Check your connection and try again.');
      return;
    }
    notify.success('Logo removed');
    reload.current();
  };

  const closeSearch = () => {
    setSearch('');
    setIsSearching(false);
  };

  return (
    <>
      <SectionListPage
        title={organisation.name}
        headerRight={
          canManageOrganisation
            ? {
                icon: Pencil,
                label: 'Edit organisation',
                onPress: () =>
                  router.push({
                    pathname: '/admin/organisations/edit',
                    params: { organisationId },
                  }),
              }
            : undefined
        }
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={(executive, { isLast }) => (
          <PersonRow
            name={executive.fullName}
            detail={executive.positions.join(', ') || 'No position'}
            status={executive.status}
            onPress={() =>
              router.push({
                pathname: '/admin/organisations/executive',
                params: { organisationId, executiveId: executive.id },
              })
            }
            isLast={isLast}
          />
        )}
        onEndReached={executives.loadMore}
        isLoadingMore={executives.hasNextPage && executives.isFetching}
        isRefreshing={executives.isFetching && !executives.isLoading}
        onRefresh={() => reload.current()}
        header={
          <View className="gap-6">
            {isSuspended ? (
              <View className="flex-row items-center gap-2">
                <Badge label="Suspended" tone="destructive" variant="subtle" />
                <Text variant="caption" className="flex-1">
                  Its executives cannot sign in. Its data is kept.
                </Text>
              </View>
            ) : null}

            <View className="flex-row items-center gap-4">
              <Avatar name={organisation.name} imageUrl={organisation.logoUrl} size="lg" />
              <View className="flex-1 gap-2">
                <Text variant="caption">{organisationTypeLabel(organisation.type)}</Text>
                {canManageOrganisation ? (
                  <View className="flex-row flex-wrap gap-2">
                    <Button
                      label={organisation.logoUrl ? 'Change logo' : 'Add logo'}
                      icon={ImagePlus}
                      variant="outline"
                      size="sm"
                      shape="pill"
                      isLoading={uploadLogo.isPending}
                      loadingLabel="Uploading…"
                      onPress={changeLogo}
                    />
                    {organisation.logoUrl ? (
                      <Button
                        label="Remove"
                        variant="ghost"
                        size="sm"
                        shape="pill"
                        onPress={() => setIsConfirmingLogo(true)}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>

            {organisation.description ? (
              <Text variant="bodyMuted">{organisation.description}</Text>
            ) : null}

            {canOperate && head && !isSuspended ? (
              <Button
                label="Work inside this organisation"
                icon={DoorOpen}
                variant="accent"
                fullWidth
                isLoading={openWorkspace.isPending}
                loadingLabel="Opening…"
                onPress={workInside}
              />
            ) : null}

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
                  {canManageOrganisation && !isSuspended ? (
                    <Button
                      label="Replace"
                      accessibilityLabel={`Replace the ${organisation.headTitle.toLowerCase()}`}
                      icon={RefreshCw}
                      variant="outline"
                      size="sm"
                      shape="pill"
                      onPress={() =>
                        router.push({
                          pathname: '/admin/organisations/replace-head',
                          params: {
                            organisationId,
                            headTitle: organisation.headTitle,
                            currentHeadId: head.id,
                            currentHeadName: head.fullName,
                          },
                        })
                      }
                    />
                  ) : null}
                </>
              ) : (
                <View className="flex-1 gap-3">
                  <Text variant="bodyMuted">
                    No {organisation.headTitle.toLowerCase()} yet. Appoint one so they can set up
                    executives.
                  </Text>
                  {canManageOrganisation && !isSuspended ? (
                    <Button
                      label={`Appoint ${organisation.headTitle.toLowerCase()}`}
                      icon={UserRoundPlus}
                      variant="accent"
                      onPress={() =>
                        router.push({
                          pathname: '/admin/organisations/appoint',
                          params: { organisationId, headTitle: organisation.headTitle },
                        })
                      }
                    />
                  ) : null}
                </View>
              )}
            </Card>

            <View className="flex-row gap-3">
              <StatTile
                label="Members"
                value={organisation.memberCount.toLocaleString()}
                caption={organisationTypeLabel(organisation.type)}
                icon={Building2}
              />
              <StatTile
                label="Executives"
                value={organisation.executiveCount.toLocaleString()}
                caption={`${organisation.credits.available.toLocaleString()} credits available`}
                icon={UsersRound}
              />
            </View>

            {activity.length > 0 ? (
              <View>
                <Text variant="overline">Activity</Text>
                {activity.map((item, index) => (
                  <MenuRow
                    key={item.title}
                    icon={item.icon}
                    title={item.title}
                    description={item.description}
                    onPress={() =>
                      router.push({
                        pathname: item.pathname,
                        params: { organisationId, organisationName: organisation.name },
                      })
                    }
                    isLast={index === activity.length - 1}
                  />
                ))}
              </View>
            ) : null}

            <View className="gap-3">
              <Text variant="overline">Executives</Text>
              {isSearching ? (
                <InlineSearch
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search name, email or party ID"
                  onClose={closeSearch}
                />
              ) : null}
            </View>
          </View>
        }
        empty={
          <QueryState
            isLoading={executives.isLoading}
            error={executives.error}
            isEmpty
            emptyText={query ? 'No executives match your search.' : 'No executives here.'}
            onRetry={executives.reload}
          />
        }
        listFooter={
          canManageOrganisation && organisation.status !== 'inactive' ? (
            <Button
              label={isSuspended ? 'Reactivate organisation' : 'Suspend organisation'}
              variant={isSuspended ? 'outline' : 'destructive'}
              className="mt-8"
              onPress={() => setIsConfirmingStatus(true)}
            />
          ) : null
        }
        footer={
          <ListFooter
            filter={{
              options: FILTERS,
              value: filter,
              onChange: setFilter,
              defaultValue: 'all',
              title: 'Filter executives',
              description: 'Choose an account status.',
              accessibilityLabel: 'Open executive filters',
              total: executives.total,
            }}
            isSearching={isSearching}
            onToggleSearch={() => (isSearching ? closeSearch() : setIsSearching(true))}
            searchLabel="Search executives"
          />
        }
      />

      <ConfirmDialog
        isVisible={isConfirmingStatus}
        title={isSuspended ? 'Reactivate this organisation?' : 'Suspend this organisation?'}
        message={
          isSuspended
            ? `${organisation.name} can sign in again. Each executive's own status still applies.`
            : `Every executive of ${organisation.name} is signed out at once and cannot sign in until you reactivate it. Nothing is deleted.`
        }
        confirmLabel={isSuspended ? 'Reactivate' : 'Suspend'}
        confirmingLabel={isSuspended ? 'Reactivating…' : 'Suspending…'}
        confirmVariant={isSuspended ? 'primary' : 'destructive'}
        isConfirming={statusMutation.isPending}
        onConfirm={changeStatus}
        onCancel={() => setIsConfirmingStatus(false)}
      />
      <ConfirmDialog
        isVisible={isConfirmingLogo}
        title="Remove the logo?"
        message={`${organisation.name} will show its initials until a new logo is added.`}
        confirmLabel="Remove"
        confirmingLabel="Removing…"
        confirmVariant="destructive"
        isConfirming={removeLogo.isPending}
        onConfirm={deleteLogo}
        onCancel={() => setIsConfirmingLogo(false)}
      />
    </>
  );
}
