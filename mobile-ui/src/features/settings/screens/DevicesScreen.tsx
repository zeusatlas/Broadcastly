import { Globe, Monitor, Smartphone, X, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { ConfirmDialog, QueryState, Skeleton, Text } from '@/components/ui';
import {
  useReadSessionsQuery,
  useRevokeSessionMutation,
  type SessionResponse,
} from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';

import { formatShortDate } from '../utils/format';

// The server only knows the client's user agent; these cover what our apps send.
function describeDevice(userAgent: string | null): { name: string; icon: LucideIcon } {
  const agent = userAgent ?? '';
  if (/okhttp|android/i.test(agent)) return { name: 'Android phone', icon: Smartphone };
  if (/iphone|ipad|darwin|cfnetwork|expo/i.test(agent))
    return { name: 'iPhone or iPad', icon: Smartphone };
  if (/mozilla|chrome|safari|firefox|edg/i.test(agent)) return { name: 'Web browser', icon: Globe };
  return { name: 'Other device', icon: Monitor };
}

interface SessionRowProps {
  session: SessionResponse;
  isLast: boolean;
  onSignOut: () => void;
}

function SessionRow({ session, isLast, onSignOut }: SessionRowProps) {
  const theme = useTheme();
  const { name, icon: Icon } = describeDevice(session.userAgent);
  const lastActive = session.lastUsedAt ?? session.signedInAt;

  return (
    <View className={`flex-row items-center gap-4 py-4 ${isLast ? '' : 'border-b border-border'}`}>
      <View className="h-11 w-11 items-center justify-center rounded-full bg-muted">
        <Icon size={20} color={theme.mutedForeground} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground">
          {session.isCurrent ? `${name} · this device` : name}
        </Text>
        <Text variant="caption">Signed in {formatShortDate(session.signedInAt)}</Text>
        <Text variant="caption">Last active {formatShortDate(lastActive)}</Text>
      </View>
      {session.isCurrent ? (
        <Text className="font-sans-semibold text-xs text-success">Active now</Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sign out ${name}`}
          onPress={onSignOut}
          className="h-11 justify-center px-2 active:opacity-60"
        >
          <Text className="font-sans-semibold text-sm text-destructive">Sign out</Text>
        </Pressable>
      )}
    </View>
  );
}

export function DevicesScreen() {
  const sessions = useReadSessionsQuery();
  const revoke = useRevokeSessionMutation();
  const [target, setTarget] = useState<SessionResponse | null>(null);
  const items = sessions.data ?? [];

  const signOutTarget = async () => {
    if (!target) return;
    const response = await revoke.mutate({ sessionId: target.id });
    setTarget(null);
    sessions.refetch();
    if (response) notify.success('Device signed out', 'It will need a new code to sign in again.');
    else notify.error('Could not sign that device out', 'It may already be signed out. Try again.');
  };

  return (
    <PageScreen title="Signed-in devices" backIcon={X} backLabel="Close signed-in devices">
      <View className="gap-6">
        <Text variant="bodyMuted">
          Where your account is signed in now. Sign out any device you don’t recognise.
        </Text>
        {sessions.isLoading ? (
          <View className="gap-4">
            {[0, 1].map((index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </View>
        ) : items.length > 0 ? (
          <View>
            {items.map((session, index) => (
              <SessionRow
                key={session.id}
                session={session}
                isLast={index === items.length - 1}
                onSignOut={() => setTarget(session)}
              />
            ))}
          </View>
        ) : (
          <QueryState
            isLoading={false}
            error={sessions.error}
            isEmpty
            emptyText="No other devices are signed in."
            onRetry={sessions.refetch}
          />
        )}
      </View>

      <ConfirmDialog
        isVisible={target !== null}
        title="Sign out this device?"
        message={`${describeDevice(target?.userAgent ?? null).name} will be signed out at once and need a new code to sign in.`}
        confirmLabel="Sign out"
        confirmingLabel="Signing out…"
        isConfirming={revoke.isPending}
        onConfirm={signOutTarget}
        onCancel={() => setTarget(null)}
      />
    </PageScreen>
  );
}
