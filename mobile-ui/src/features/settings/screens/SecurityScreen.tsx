import { ShieldCheck, X } from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Text } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';

export function SecurityScreen() {
  const user = useCurrentUser();
  const theme = useTheme();
  return <PageScreen title="Sign-in & security" backIcon={X} backLabel="Close security"><View className="gap-7"><View className="items-center gap-3"><View className="h-16 w-16 items-center justify-center rounded-full bg-success/15"><ShieldCheck size={30} color={theme.success} /></View><Text variant="heading">Your account is protected</Text><Text variant="bodyMuted" className="text-center">Sign-in uses your email, phone number and a one-time code.</Text></View><View className="gap-1"><Text variant="overline">Account</Text><View className="border-b border-border py-3"><Text variant="caption">Email</Text><Text variant="label">{user?.email ?? '—'}</Text></View><View className="border-b border-border py-3"><Text variant="caption">Session</Text><Text variant="label">Active on this device</Text></View></View></View></PageScreen>;
}
