import { useLocalSearchParams } from 'expo-router';
import { Check, UserX } from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Avatar, Button, EmptyState, LoadingState, Text } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import type { Permission } from '@/types/models';

import {
  useReadExecutiveQuery,
  useReactivateExecutiveMutation,
  useSuspendExecutiveMutation,
} from '../hooks/use_organisation_api';
import { PERMISSION_GROUPS, PERMISSION_INFO } from '../utils/permission_labels';

export function ExecutiveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const canManage = useHasPermission('appointment.manage');
  const executiveId = typeof id === 'string' ? id : '';
  const query = useReadExecutiveQuery(executiveId, {
    enabled: canManage && executiveId.length > 0,
  });
  const suspend = useSuspendExecutiveMutation();
  const reactivate = useReactivateExecutiveMutation();
  const executive = query.data;

  if (query.isLoading) {
    return (
      <PageScreen title="Executive">
        <LoadingState label="Loading executive details" />
      </PageScreen>
    );
  }

  if (!executive || query.error) {
    return (
      <PageScreen title="Executive">
        <EmptyState
          icon={UserX}
          title="Executive not found"
          description={
            query.error?.message ?? 'They may have been removed, or you can no longer see them.'
          }
          action={
            query.error?.isRetryable ? { label: 'Try again', onPress: query.refetch } : undefined
          }
        />
      </PageScreen>
    );
  }

  const permissions = [
    ...new Set(executive.appointments.flatMap((appointment) => appointment.permissions)),
  ] as Permission[];

  return (
    <PageScreen title="Executive details">
      <View className="gap-8">
        <View className="items-center gap-3">
          <Avatar name={executive.fullName} size="xl" />
          <Text accessibilityRole="header" className="font-sans-extrabold text-3xl text-foreground">
            {executive.fullName}
          </Text>
          <Text variant="bodyMuted" className="text-center">
            {executive.appointments[0]?.positionTitle ?? 'No appointment'} ·{' '}
            {executive.appointments[0]?.unitName ?? 'Organisation-wide'}
          </Text>
          <Text className="font-sans-semibold text-sm text-success">
            {executive.status === 'active' ? 'Active account' : 'Suspended account'}
          </Text>
        </View>

        <View className="gap-1">
          <Text variant="overline">Contact</Text>
          <View className="border-b border-border py-3">
            <Text variant="caption">Email</Text>
            <Text variant="label">{executive.email}</Text>
          </View>
          <View className="border-b border-border py-3">
            <Text variant="caption">Phone</Text>
            <Text variant="label">{executive.phone ?? 'No phone number'}</Text>
          </View>
        </View>

        <View className="gap-1">
          <Text variant="overline">What they can do</Text>
          {permissions.length === 0 ? (
            <Text variant="bodyMuted" className="py-3">
              Nothing yet. They can sign in, but can’t act until someone gives them permissions.
            </Text>
          ) : (
            <View className="mt-2 gap-5">
              {PERMISSION_GROUPS.map((group) => {
                const held = group.permissions.filter((item) => permissions.includes(item));
                if (held.length === 0) return null;
                const Icon = group.icon;
                return (
                  <View key={group.title} className="gap-2">
                    <View className="flex-row items-center gap-2">
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-accent/15">
                        <Icon size={16} color={theme.accentEmphasis} />
                      </View>
                      <Text className="font-sans-bold text-base text-foreground">
                        {group.title}
                      </Text>
                    </View>
                    {held.map((permission) => (
                      <View key={permission} className="flex-row items-start gap-3 pl-10">
                        <Check size={16} color={theme.success} style={{ marginTop: 3 }} />
                        <View className="flex-1 gap-0.5">
                          <Text className="font-sans-semibold text-[15px] text-foreground">
                            {PERMISSION_INFO[permission].label}
                          </Text>
                          <Text variant="caption">{PERMISSION_INFO[permission].description}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {canManage ? (
          <View className="gap-3">
            <Button
              label={executive.status === 'active' ? 'Suspend access' : 'Reactivate access'}
              variant="ghost"
              fullWidth
              isLoading={suspend.isPending || reactivate.isPending}
              onPress={async () => {
                const mutation = executive.status === 'active' ? suspend : reactivate;
                const response = await mutation.mutate({ executiveId });
                if (!response) return;
                notify.success(
                  executive.status === 'active' ? 'Account suspended.' : 'Account reactivated.',
                );
                query.refetch();
              }}
            />
            {(suspend.error ?? reactivate.error) ? (
              <Text className="text-center font-sans text-sm text-destructive">
                {(suspend.error ?? reactivate.error)?.message}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </PageScreen>
  );
}
