import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Avatar, Badge, Button, ConfirmDialog, QueryState, Text } from '@/components/ui';
import { useCurrentUser, useHasPermission } from '@/features/auth';
import { notify } from '@/lib/notify';
import type { PlatformPermission } from '@/types/models';

import { PermissionChecklist } from '../components/PermissionChecklist';
import {
  useReactivatePlatformAdminMutation,
  useReadPlatformAdminQuery,
  useSuspendPlatformAdminMutation,
  useUpdatePlatformAdminPermissionsMutation,
} from '../hooks/use_platform_api';
import { PLATFORM_PERMISSION_OPTIONS } from '../utils/platform_permissions';

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item) => b.includes(item));

export function AdminScreen({ adminId }: { adminId: string }) {
  const me = useCurrentUser();
  const canManage = useHasPermission('platform.admin.manage');
  const held = me?.permissions ?? [];
  const grantable = PLATFORM_PERMISSION_OPTIONS.map((option) => option.key).filter((key) =>
    held.includes(key),
  );
  const query = useReadPlatformAdminQuery(adminId);
  const mine = useReadPlatformAdminQuery(me?.id ?? '');
  const save = useUpdatePlatformAdminPermissionsMutation();
  const suspend = useSuspendPlatformAdminMutation();
  const reactivate = useReactivatePlatformAdminMutation();
  const [draft, setDraft] = useState<PlatformPermission[] | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const admin = query.data;

  if (!admin) {
    return (
      <PageScreen title="Admin">
        <QueryState
          isLoading={query.isLoading}
          error={query.error}
          isEmpty
          emptyText="Admin not found."
          onRetry={query.refetch}
        />
      </PageScreen>
    );
  }

  const isYou = admin.id === me?.id;
  const iAmMain = mine.data?.isSuperAdmin === true;
  const canEditPermissions = canManage && !isYou && !admin.isSuperAdmin;
  const canChangeStatus = canManage && !isYou && (!admin.isSuperAdmin || iAmMain);
  const isSuspended = admin.status === 'suspended';
  const selected = draft ?? admin.permissions;
  const isDirty = draft !== null && !sameSet(draft, admin.permissions);
  const statusMutation = isSuspended ? reactivate : suspend;

  const toggle = (permission: PlatformPermission) =>
    setDraft(
      selected.includes(permission)
        ? selected.filter((item) => item !== permission)
        : [...selected, permission],
    );

  const savePermissions = async () => {
    const response = await save.mutate({ uuid: admin.id, credentials: { permissions: selected } });
    if (!response) return;
    setDraft(null);
    query.refetch();
    notify.success('Permissions saved.', 'They apply from their next action.');
  };

  const changeStatus = async () => {
    const response = await statusMutation.mutate({ uuid: admin.id });
    setIsConfirming(false);
    if (!response) {
      notify.error('Could not change the status', 'Check your connection and try again.');
      return;
    }
    query.refetch();
    notify.success(isSuspended ? 'Admin reactivated.' : 'Admin suspended.', admin.fullName);
  };

  return (
    <PageScreen
      title={admin.fullName}
      contentClassName="gap-6"
      actions={
        isDirty ? (
          <>
            <Button
              label="Save permissions"
              variant="accent"
              size="lg"
              fullWidth
              isLoading={save.isPending}
              loadingLabel="Saving…"
              onPress={savePermissions}
            />
            {save.error ? (
              <Text className="text-center font-sans text-sm text-destructive">
                {save.error.message}
              </Text>
            ) : null}
          </>
        ) : undefined
      }
    >
      <View className="flex-row items-center gap-3">
        <Avatar name={admin.fullName} size="md" />
        <View className="flex-1 gap-0.5">
          <Text className="font-sans-semibold text-base text-foreground">{admin.email}</Text>
          <Text variant="caption">{admin.phone}</Text>
        </View>
        {isSuspended ? <Badge label="Suspended" tone="destructive" variant="subtle" /> : null}
      </View>

      <View>
        <Text variant="overline">Permissions</Text>
        <Text variant="caption" className="mt-1">
          {admin.isSuperAdmin
            ? 'The main admin can do everything, always.'
            : isYou
              ? 'Another admin manages your permissions.'
              : canEditPermissions
                ? 'You can give or remove only what you hold. Changes apply at once.'
                : 'You cannot change admins.'}
        </Text>
        <PermissionChecklist
          selected={selected}
          grantable={grantable}
          onToggle={toggle}
          isReadOnly={!canEditPermissions}
        />
      </View>

      {canChangeStatus ? (
        <Button
          label={isSuspended ? 'Reactivate admin' : 'Suspend admin'}
          variant={isSuspended ? 'outline' : 'destructive'}
          onPress={() => setIsConfirming(true)}
        />
      ) : null}

      <ConfirmDialog
        isVisible={isConfirming}
        title={isSuspended ? `Reactivate ${admin.fullName}?` : `Suspend ${admin.fullName}?`}
        message={
          isSuspended
            ? 'They can sign in again with their current permissions.'
            : 'They are signed out everywhere at once and cannot sign in until reactivated.'
        }
        confirmLabel={isSuspended ? 'Reactivate' : 'Suspend'}
        confirmingLabel="Saving…"
        confirmVariant={isSuspended ? 'primary' : 'destructive'}
        isConfirming={statusMutation.isPending}
        onConfirm={changeStatus}
        onCancel={() => setIsConfirming(false)}
      />
    </PageScreen>
  );
}
