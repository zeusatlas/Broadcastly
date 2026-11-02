import { Stack } from 'expo-router';

import { GATED_ROUTES } from '@/constants/routes';
import { useAccess } from '@/features/auth';

// Every route in this group requires a session (guarded in app/_layout.tsx).
// Routes listed in GATED_ROUTES additionally require access; add new gated screens there.
// Gated screens already built on PageScreen draw their own header.
const PAGE_OPTIONS: Record<string, { headerShown: false; animation: 'slide_from_bottom' }> = {
  'broadcasts/new': { headerShown: false, animation: 'slide_from_bottom' },
};

export default function AppLayout() {
  const access = useAccess();

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
      {GATED_ROUTES.map(({ name, access: rule }) => (
        <Stack.Protected key={name} guard={access.check(rule)}>
          <Stack.Screen name={name} options={PAGE_OPTIONS[name]} />
        </Stack.Protected>
      ))}
    </Stack>
  );
}
