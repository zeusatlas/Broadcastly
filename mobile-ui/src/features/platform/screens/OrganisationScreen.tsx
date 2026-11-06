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
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
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
import { notify } from '@/lib/notify';
import { pickLogoForm } from '@/utils/media';

import { organisationTypeLabel } from '../utils/organisation_types';

import { MenuRow } from '../components/AdminRows';
import {
  useOpenWorkspaceMutation,
  useReactivateOrganisationMutation,
  useRemoveOrganisationLogoMutation,
  useUploadOrganisationLogoMutation,
  useReadOrganisationQuery,
  useSuspendOrganisationMutation,
} from '../hooks/use_platform_api';

// One organisation for the platform admin: head, totals, status, its members and its activity.
export function OrganisationScreen({ organisationId }: { organisationId: string }) {
  const canManageOrganisation = useHasPermission('platform.organisation.manage');
  const canViewFinance = useHasPermission('platform.finance.view');
  const canViewBroadcasts = useHasPermission('platform.broadcast.view');
  const canAdjustCredits = useHasPermission('platform.credit.manage');
  const canOperate = useHasPermission('platform.organisation.operate');
  const openWorkspace = useOpenWorkspaceMutation();
  const enterOrganisation = useAuthStore((state) => state.enterOrganisation);
  const [isConfirmingStatus, setIsConfirmingStatus] = useState(false);
  const details = useReadOrganisationQuery(organisationId);
  const suspendOrganisation = useSuspendOrganisationMutation();
  const reactivateOrganisation = useReactivateOrganisationMutation();
  const uploadLogo = useUploadOrganisationLogoMutation();
  const removeLogo = useRemoveOrganisationLogoMutation();
  const [isConfirmingLogo, setIsConfirmingLogo] = useState(false);
  const reload = useRef(() => {});
  const hasFocusedOnce = useRef(false);

  useEffect(() => {
    reload.current = () => details.refetch();
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
    canOperate && {
      title: 'Members',
      description: 'Everyone in this organisation, executives included.',
      icon: Users,
      pathname: '/admin/organisations/members' as const,
    },
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

  return (
    <>
      <PageScreen
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
      >
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

          {canManageOrganisation && organisation.status !== 'inactive' ? (
            <Button
              label={isSuspended ? 'Reactivate organisation' : 'Suspend organisation'}
              variant={isSuspended ? 'outline' : 'destructive'}
              className="mt-2"
              onPress={() => setIsConfirmingStatus(true)}
            />
          ) : null}
        </View>
      </PageScreen>

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
