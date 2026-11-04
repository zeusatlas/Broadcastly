import { Smartphone, X } from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Text } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { formatShortDate } from '../utils/format';

export function DevicesScreen() {
  const user = useCurrentUser();
  const theme = useTheme();
  return (
    <PageScreen title="Signed-in devices" backIcon={X} backLabel="Close signed-in devices">
      <View className="gap-6">
        <Text variant="bodyMuted">Review where your account is currently active.</Text>
        <View className="flex-row items-center gap-4 border-b border-border py-4">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-muted">
            <Smartphone size={20} color={theme.mutedForeground} />
          </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground">This device</Text>
            <Text variant="caption">Active session</Text>
            <Text variant="caption">
              Last sign-in{' '}
              {user?.lastSignInAt ? formatShortDate(user.lastSignInAt) : 'not available'}
            </Text>
          </View>
      <Text className="font-sans-semibold text-xs text-success">
            Active
          </Text>
        </View>
      </View>
    </PageScreen>
  );
}
