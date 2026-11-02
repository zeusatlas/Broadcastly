import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { useThemeName } from '@/hooks/use_theme';

// Phone chrome follows the app theme: status bar and Android navigation bar icons, plus the native
// window colour behind screens (app.json's light backgroundColor otherwise shows white in dark mode).
export function SystemBars() {
  const scheme = useThemeName();
  const style = scheme === 'dark' ? 'light' : 'dark';

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(Colors[scheme].background).catch(() => {});
  }, [scheme]);

  return (
    <>
      <StatusBar style={style} />
      <NavigationBar style={style} />
    </>
  );
}
