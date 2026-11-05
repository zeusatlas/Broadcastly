import { useLocalSearchParams } from 'expo-router';
import { UserRoundCheck } from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Avatar, Button, Text } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { notify } from '@/lib/notify';

import {
  useReadExecutiveQuery,
  useReactivateExecutiveMutation,
  useSuspendExecutiveMutation,
} from '../hooks/use_organisation_api';

export function ExecutiveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const canManage = useHasPermission('appointment.manage');
  const executiveId = typeof id === 'string' ? id : '';
  const query = useReadExecutiveQuery(executiveId, { enabled: canManage && executiveId.length > 0 });
  const suspend = useSuspendExecutiveMutation();
  const reactivate = useReactivateExecutiveMutation();
  const executive = query.data;

  if (query.isLoading) {
    return (
      <PageScreen title="Executive">
        <Text variant="bodyMuted">Loading executive details…</Text>
      </PageScreen>
    );
  }

  if (!executive || query.error) {
    return (
      <PageScreen title="Executive">
        <Text variant="bodyMuted">This executive could not be found.</Text>
      </PageScreen>
    );
  }

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
          <Text variant="overline">Permissions</Text>
          {executive.appointments.flatMap((appointment) => appointment.permissions).map((permission) => (
            <Text key={permission} variant="label" className="border-b border-border py-3">
              {permission}
            </Text>
          ))}
        </View>

        {canManage ? (
          <View className="gap-3">
            <Button
              label="Manage appointment"
              icon={UserRoundCheck}
              variant="outline"
              fullWidth
              onPress={() => notify.info('Appointment management is available from the executive tools.')}
            />
            <Button
              label={executive.status === 'active' ? 'Suspend access' : 'Reactivate access'}
              variant="ghost"
              fullWidth
              isLoading={suspend.isPending || reactivate.isPending}
              onPress={async () => {
                const mutation = executive.status === 'active' ? suspend : reactivate;
                const response = await mutation.mutate({ executiveId });
                if (!response) {
                  if (mutation.error) notify.apiError(mutation.error);
                  return;
                }
                notify.success(executive.status === 'active' ? 'Account suspended.' : 'Account reactivated.');
                query.refetch();
              }}
            />
          </View>
        ) : null}
      </View>
    </PageScreen>
  );
}
