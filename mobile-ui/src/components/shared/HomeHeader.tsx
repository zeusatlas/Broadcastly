import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HomeHeaderProps {
  left: ReactElement;
  right?: ReactElement;
}

// The home tab's top row (avatar left, actions right). iOS keeps the native header; Android's native
// app bar is far taller than the other tabs' titles, so there the row is drawn at the same height.
// Render it first inside the home screen's ScrollScreen (which adds 16pt of top padding).
export function HomeHeader({ left, right }: HomeHeaderProps) {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'ios') {
    return (
      <Stack.Screen
        options={{
          headerLeft: () => left,
          // iOS 26 puts a glass circle behind header items; the avatar shows on its own.
          unstable_headerLeftItems: () => [
            { type: 'custom', element: left, hidesSharedBackground: true },
          ],
          headerRight: right ? () => right : undefined,
        }}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        className="flex-row items-center justify-between"
        style={{ paddingTop: Math.max(insets.top - 4, 0) }}
      >
        {left}
        {right ?? <View />}
      </View>
    </>
  );
}
