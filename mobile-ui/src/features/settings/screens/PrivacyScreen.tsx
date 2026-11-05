import { X } from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Text } from '@/components/ui';

export function PrivacyScreen() {
  return (
    <PageScreen title="Privacy & data" backIcon={X} backLabel="Close privacy settings">
      <View className="gap-6">
        <Text variant="bodyMuted">
          Review how your access and organisation data are handled in the app.
        </Text>
        <View className="gap-1">
          <Text variant="overline">Access</Text>
          <View className="border-b border-border py-3">
            <Text className="font-sans-semibold text-base text-foreground">
              Permission-based access
            </Text>
            <Text variant="caption">
              Your active permissions and organisation scope determine which records you can see.
            </Text>
          </View>
          <View className="border-b border-border py-3">
            <Text className="font-sans-semibold text-base text-foreground">
              Server-side protection
            </Text>
            <Text variant="caption">
              Protected actions are checked by the service, not only hidden in the interface.
            </Text>
          </View>
        </View>
        <View className="gap-1">
          <Text variant="overline">Accountability</Text>
          <View className="border-b border-border py-3">
            <Text className="font-sans-semibold text-base text-foreground">Audited actions</Text>
            <Text variant="caption">
              Appointments, broadcasts, approvals and credit activity are recorded for review.
            </Text>
          </View>
        </View>
      </View>
    </PageScreen>
  );
}
