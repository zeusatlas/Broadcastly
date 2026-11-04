import { Stack } from 'expo-router';

import { useStackHeaderOptions } from '@/hooks/use_header_options';

import { androidHeaderBack } from './HeaderButton';

// A tab's own stack. Its root hides the native bar; the screen draws its title with
// useCollapsingTitle(title, { header: 'tab' }) or PageScreen isTabRoot.
export function TabStack({ title }: { title: string }) {
  const options = useStackHeaderOptions();

  return (
    <Stack screenOptions={{ ...options, headerLeft: androidHeaderBack }}>
      <Stack.Screen name="index" options={{ title, headerShown: false }} />
    </Stack>
  );
}
