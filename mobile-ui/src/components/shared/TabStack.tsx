import { Stack } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useStackHeaderOptions } from '@/hooks/use_header_options';

import { androidHeaderBack } from './HeaderButton';

interface TabStackProps {
  title: string;
  // Home keeps the native header (avatar left, bell right); other tab roots draw their own title.
  hasHeader?: boolean;
}

// The bottom inset a tab's screens see. iOS: the system tab bar floats over the tab, so a provider
// measured here includes it. Android: our tab bar sits below the tab, so nothing is left to clear.
function TabInsets({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'ios') return <SafeAreaProvider>{children}</SafeAreaProvider>;
  return (
    <SafeAreaInsetsContext.Provider value={{ ...insets, bottom: 0 }}>
      {children}
    </SafeAreaInsetsContext.Provider>
  );
}

// A tab's own stack. Bottom-pinned buttons and list padding add useSafeAreaInsets().bottom.
export function TabStack({ title, hasHeader = false }: TabStackProps) {
  const options = useStackHeaderOptions();

  return (
    <TabInsets>
      <Stack
        screenOptions={{ ...options, headerLeft: androidHeaderBack, animation: 'slide_from_right' }}
      >
        <Stack.Screen
          name="index"
          options={{ title: hasHeader ? '' : title, headerShown: hasHeader }}
        />
      </Stack>
    </TabInsets>
  );
}
