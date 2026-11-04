import { useLocalSearchParams } from 'expo-router';
import { UserRoundCheck } from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Avatar, Button, Text } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { notify } from '@/lib/notify';

import { DEMO_EXECUTIVES } from '../demo_data';

export function ExecutiveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const canManage = useHasPermission('appointment.manage');
  const executive = DEMO_EXECUTIVES.find((item) => item.id === id);

  if (!executive) {
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
          <Avatar name={executive.name} size="xl" />
          <Text accessibilityRole="header" className="font-sans-extrabold text-3xl text-foreground">
            {executive.name}
          </Text>
          <Text variant="bodyMuted" className="text-center">
            {executive.position} · {executive.unit}
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
            <Text variant="label">{executive.phone}</Text>
          </View>
        </View>

        <View className="gap-1">
          <Text variant="overline">Permissions</Text>
          {executive.permissions.map((permission) => (
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
              onPress={() => notify.info('Appointment management is ready for API wiring')}
            />
            <Button
              label={executive.status === 'active' ? 'Suspend access' : 'Reactivate access'}
              variant="ghost"
              fullWidth
              onPress={() => notify.info('Account status changes are ready for API wiring')}
            />
          </View>
        ) : null}
      </View>
    </PageScreen>
  );
}
