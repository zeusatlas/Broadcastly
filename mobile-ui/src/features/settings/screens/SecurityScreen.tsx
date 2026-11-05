import { router } from 'expo-router';
import { MonitorSmartphone, ShieldCheck, X } from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Text } from '@/components/ui';
import { useAuthStore, useCurrentUser } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { formatGhanaPhone } from '@/utils/helpers';

import { SettingsRow } from '../components/SettingsRow';
import { formatShortDate } from '../utils/format';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View className="border-b border-border py-3">
      <Text variant="caption">{label}</Text>
      <Text variant="label">{value}</Text>
    </View>
  );
}

export function SecurityScreen() {
  const user = useCurrentUser();
  const sessionExpiresAt = useAuthStore((state) => state.sessionExpiresAt);
  const theme = useTheme();

  return (
    <PageScreen title="Sign-in & security" backIcon={X} backLabel="Close security">
      <View className="gap-7">
        <View className="items-center gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-success/15">
            <ShieldCheck size={30} color={theme.success} />
          </View>
          <Text variant="heading">Your account is protected</Text>
          <Text variant="bodyMuted" className="text-center">
            There is no password. You sign in with your email and phone number, then a one-time code
            sent to that phone by SMS.
          </Text>
        </View>
        <View className="gap-1">
          <Text variant="overline">Sign-in</Text>
          <Fact label="Email" value={user?.email ?? '—'} />
          <Fact
            label="Codes are sent to"
            value={user?.phone ? formatGhanaPhone(user.phone) : '—'}
          />
          <Fact
            label="Last sign-in"
            value={user?.lastSignInAt ? formatShortDate(user.lastSignInAt) : 'Not recorded'}
          />
          <Fact
            // Sessions last 24 hours from sign-in; refreshing never extends them.
            label="This session ends"
            value={
              sessionExpiresAt ? formatShortDate(new Date(sessionExpiresAt).toISOString()) : '—'
            }
          />
        </View>
        <SettingsRow
          icon={MonitorSmartphone}
          label="Signed-in devices"
          onPress={() => router.push('/settings/devices')}
          isLast
        />
      </View>
    </PageScreen>
  );
}
