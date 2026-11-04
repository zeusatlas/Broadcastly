import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { androidHeaderBack } from '@/components/shared';
import { GATED_ROUTES } from '@/constants/routes';
import { useAccess, useHasRole } from '@/features/auth';
import { useStackHeaderOptions } from '@/hooks/use_header_options';

// Every route in this group requires a session (guarded in app/_layout.tsx). The role picks the
// app: platform admins get admin/(tabs), everyone else the executive tabs. UX only; the API re-checks.
const PAGE_OPTIONS: Record<string, { animation: 'slide_from_bottom'; animationDuration: number }> =
  {
    'broadcasts/new': { animation: 'slide_from_bottom', animationDuration: 450 },
  };
// The tab groups draw their own header (AppTabs), so the stack hides its one there.
const TABS = { headerShown: false };

export default function AppLayout() {
  const access = useAccess();
  const isPlatformAdmin = useHasRole('platform_admin');
  const headerOptions = useStackHeaderOptions();

  return (
    <Stack
      screenOptions={{
        ...headerOptions,
        headerLeft: androidHeaderBack,
        // iOS keeps its native, finger-following slide; Android gets the same slide instead of its zoom-fade.
        animation: Platform.OS === 'android' ? 'ios_from_right' : 'default',
      }}
    >
      <Stack.Protected guard={!isPlatformAdmin}>
        <Stack.Screen name="(tabs)" options={TABS} />
        {GATED_ROUTES.map(({ name, access: rule }) => (
          <Stack.Protected key={name} guard={access.check(rule)}>
            <Stack.Screen name={name} options={PAGE_OPTIONS[name]} />
          </Stack.Protected>
        ))}
      </Stack.Protected>
      <Stack.Protected guard={isPlatformAdmin}>
        <Stack.Screen name="admin/(tabs)" options={TABS} />
        <Stack.Screen name="admin/organisations/[id]" />
      </Stack.Protected>
      <Stack.Screen
        // Slides up full screen; its glass buttons are drawn in the page so they travel with it.
        name="profile"
        options={{
          animation: 'slide_from_bottom',
          animationDuration: 450,
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/support" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
