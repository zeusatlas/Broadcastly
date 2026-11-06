import { Pencil, Settings } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Avatar, Button, ConfirmDialog, Text } from '@/components/ui';
import { useAuthStore, useCurrentUser, useHasRole, useIsAuthSubmitting } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import { cn, formatGhanaPhone } from '@/utils/helpers';

import { AppointmentRow } from '../components/AppointmentRow';
import { DetailRow } from '../components/DetailRow';
import { useOrganisationLogo } from '../hooks/use_organisation_logo';
import { formatCalendarDate, formatShortDate } from '../utils/format';

type SignOutScope = 'this_device' | 'all_devices';

const CONFIRM: Record<SignOutScope, { title: string; message: string; label: string }> = {
  this_device: {
    title: 'Log out?',
    message: 'You will need your email, phone number and a new code to sign in again.',
    label: 'Log out',
  },
  all_devices: {
    title: 'Log out everywhere?',
    message: 'Every phone signed in to your account will be signed out, including this one.',
    label: 'Log out everywhere',
  },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-8 gap-2">
      <Text accessibilityRole="header" className="px-1 font-sans-bold text-lg text-foreground">
        {title}
      </Text>
      <View>{children}</View>
    </View>
  );
}

// Opened from the home avatar; slides up full screen (see app/(app)/_layout.tsx).
export function ProfileScreen() {
  const theme = useTheme();
  const user = useCurrentUser();
  const signOut = useAuthStore((s) => s.signOut);
  const isSigningOut = useIsAuthSubmitting();
  const [scope, setScope] = useState<SignOutScope | null>(null);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);
  const canChangeLogo = useHasRole('head');
  const logo = useOrganisationLogo();
  const refreshUser = useAuthStore((s) => s.refreshUser);

  // Opening the profile shows the latest details, appointments and logo from the server.
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  // Null for a moment while signing out, before the root guard leaves this screen.
  if (!user) return null;

  const confirmSignOut = async () => {
    if (!scope) return;
    const isConfirmed = await signOut({ allDevices: scope === 'all_devices' });

    // The guard has already moved to sign-in; the toast host lives above the navigator.
    if (isConfirmed) {
      notify.success(scope === 'all_devices' ? 'Logged out on all devices' : 'You’re logged out');
    } else {
      notify.warning(
        'Logged out on this phone',
        'We couldn’t reach the server to end the session.',
      );
    }
  };

  const isActive = user.status === 'active';
  const unitName = user.appointments[0]?.unitName ?? user.organisation?.name;

  const details = [
    { label: 'Member ID', value: user.memberNumber ?? 'Not on record' },
    { label: 'Phone', value: user.phone ? formatGhanaPhone(user.phone) : '—' },
    { label: 'Email', value: user.email },
    {
      label: 'Date of birth',
      value: user.dateOfBirth ? formatCalendarDate(user.dateOfBirth) : 'Not on record',
    },
  ];

  return (
    <PageScreen
      backLabel="Close profile"
      headerRight={{ icon: Settings, label: 'Settings', onPress: () => router.push('/settings') }}
    >
      <View className="items-center pt-4">
        <View className="h-36 w-36 items-center justify-center rounded-full bg-accent/15">
          <Avatar name={user.fullName} imageUrl={user.organisation?.logoUrl} size="xl" />
          {canChangeLogo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change organisation logo"
              disabled={logo.isUploading}
              onPress={logo.pickAndUpload}
              hitSlop={8}
              className="absolute bottom-2 right-2 h-9 w-9 items-center justify-center rounded-full border-4 border-background bg-accent active:opacity-70"
            >
              {logo.isUploading ? (
                <ActivityIndicator size="small" color={theme.accentForeground} />
              ) : (
                <Pencil size={14} color={theme.accentForeground} />
              )}
            </Pressable>
          ) : null}
        </View>
        {canChangeLogo && user.organisation?.logoUrl ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove organisation logo"
            onPress={() => setIsRemovingLogo(true)}
            className="mt-2 h-11 items-center justify-center px-3"
          >
            <Text className="font-sans-semibold text-sm text-destructive">Remove logo</Text>
          </Pressable>
        ) : null}

        <Text
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
          className="mt-5 text-center font-sans-extrabold text-3xl text-foreground"
        >
          {user.fullName}
        </Text>

        <View className="mt-4 flex-row flex-wrap items-center justify-center gap-2">
          <View
            className={cn(
              'flex-row items-center gap-1.5 rounded-full px-3 py-1.5',
              isActive ? 'bg-success/15' : 'bg-muted',
            )}
          >
            <View
              className={cn(
                'h-2 w-2 rounded-full',
                isActive ? 'bg-success' : 'bg-muted-foreground',
              )}
            />
            <Text
              className={cn(
                'font-sans-semibold text-sm',
                isActive ? 'text-success' : 'text-muted-foreground',
              )}
            >
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
          {unitName ? (
            <View className="rounded-full bg-muted px-3 py-1.5">
              <Text className="font-sans-semibold text-sm text-muted-foreground">{unitName}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Section title="Personal details">
        {details.map((detail, index) => (
          <DetailRow key={detail.label} {...detail} isLast={index === details.length - 1} />
        ))}
      </Section>

      <Section title="Appointments">
        {user.appointments.length > 0 ? (
          user.appointments.map((appointment, index) => (
            <AppointmentRow
              key={appointment.id}
              appointment={appointment}
              isLast={index === user.appointments.length - 1}
            />
          ))
        ) : (
          <Text variant="bodyMuted" className="py-4">
            No active appointment.
          </Text>
        )}
      </Section>

      <View className="mt-auto gap-3 pt-10">
        <Button
          label="Log out"
          variant="destructive"
          size="lg"
          fullWidth
          onPress={() => setScope('this_device')}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out of all devices"
          onPress={() => setScope('all_devices')}
          className="h-11 items-center justify-center"
        >
          <Text className="font-sans-bold text-base text-destructive">Log out of all devices</Text>
        </Pressable>
        {user.lastSignInAt ? (
          <Text variant="caption" className="text-center">
            Last signed in {formatShortDate(user.lastSignInAt)}
          </Text>
        ) : null}
      </View>

      <ConfirmDialog
        isVisible={scope !== null}
        title={scope ? CONFIRM[scope].title : ''}
        message={scope ? CONFIRM[scope].message : ''}
        confirmLabel={scope ? CONFIRM[scope].label : ''}
        confirmingLabel="Logging out…"
        isConfirming={isSigningOut}
        onConfirm={confirmSignOut}
        onCancel={() => setScope(null)}
      />

      <ConfirmDialog
        isVisible={isRemovingLogo}
        title="Remove the logo?"
        message="Everyone in your organisation will see their initials instead."
        confirmLabel="Remove logo"
        confirmingLabel="Removing…"
        isConfirming={logo.isRemoving}
        onConfirm={async () => {
          if (await logo.removeLogo()) setIsRemovingLogo(false);
        }}
        onCancel={() => setIsRemovingLogo(false)}
      />
    </PageScreen>
  );
}
