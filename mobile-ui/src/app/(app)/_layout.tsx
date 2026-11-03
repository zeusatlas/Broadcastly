import { Stack } from 'expo-router';

import { GATED_ROUTES } from '@/constants/routes';
import { useAccess, useHasRole } from '@/features/auth';

// Every route in this group requires a session (guarded in app/_layout.tsx). The role picks the
// app: platform admins get admin/(tabs), everyone else the executive tabs. UX only; the API re-checks.
const PAGE_OPTIONS: Record<string, { headerShown: false; animation: 'slide_from_bottom' }> = {
  'broadcasts/new': { headerShown: false, animation: 'slide_from_bottom' },
};

export default function AppLayout() {
  const access = useAccess();
  const isPlatformAdmin = useHasRole('platform_admin');

  return (
    <Stack>
      <Stack.Protected guard={!isPlatformAdmin}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {GATED_ROUTES.map(({ name, access: rule }) => (
          <Stack.Protected key={name} guard={access.check(rule)}>
            <Stack.Screen name={name} options={PAGE_OPTIONS[name]} />
          </Stack.Protected>
        ))}
      </Stack.Protected>
      <Stack.Protected guard={isPlatformAdmin}>
        <Stack.Screen name="admin/(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin/organisations/[id]" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen
        // Slides up like a sheet, but full screen with its own back button.
        name="profile"
        options={{
          headerShown: false,
          animation: 'slide_from_bottom',
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen name="settings/index" options={{ headerShown: false }} />
      <Stack.Screen name="settings/support" options={{ headerShown: false }} />
      <Stack.Screen
        name="notifications"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
