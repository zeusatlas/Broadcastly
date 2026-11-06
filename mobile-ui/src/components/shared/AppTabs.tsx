import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeTabs, type SFSymbolIcon } from 'expo-router/native-tabs';
import { Tabs, useSegments } from 'expo-router';
import { useEffect, useRef, type ComponentProps } from 'react';
import { Platform } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useThemeName } from '@/hooks/use_theme';
import { haptics } from '@/utils/haptics';

import { FloatingTabBar } from './FloatingTabBar';

export interface TabDefinition {
  name: string;
  title: string;
  // SF Symbol on iOS (outline, filled when selected); Material icon on Android's FloatingTabBar.
  sf: NonNullable<SFSymbolIcon['sf']>;
  md: ComponentProps<typeof MaterialIcons>['name'];
}

// Per FR-IAM-03 this must become a derivation of the executive's permissions and scope.
export const EXECUTIVE_TABS: TabDefinition[] = [
  { name: '(home)', title: 'Home', sf: { default: 'house', selected: 'house.fill' }, md: 'home' },
  {
    name: 'broadcasts',
    title: 'Broadcasts',
    sf: { default: 'paperplane', selected: 'paperplane.fill' },
    md: 'send',
  },
  {
    name: 'members',
    title: 'Members',
    sf: { default: 'person.2', selected: 'person.2.fill' },
    md: 'group',
  },
  {
    name: 'credits',
    title: 'Credits',
    sf: { default: 'creditcard', selected: 'creditcard.fill' },
    md: 'account-balance-wallet',
  },
  {
    name: 'more',
    title: 'More',
    sf: { default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' },
    md: 'more-horiz',
  },
];

export const ADMIN_TABS: TabDefinition[] = [
  { name: '(home)', title: 'Home', sf: { default: 'house', selected: 'house.fill' }, md: 'home' },
  {
    name: 'organisations',
    title: 'Organisations',
    sf: { default: 'building.2', selected: 'building.2.fill' },
    md: 'apartment',
  },
  {
    name: 'admins',
    title: 'Admins',
    sf: { default: 'checkmark.shield', selected: 'checkmark.shield.fill' },
    md: 'admin-panel-settings',
  },
  {
    name: 'more',
    title: 'More',
    sf: { default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' },
    md: 'more-horiz',
  },
];

// iOS: the system tab bar, like WhatsApp and Telegram (native Liquid Glass on iOS 26). Android's
// system bar is plain Material, so it gets our own floating glass pill instead (FloatingTabBar).
export function AppTabs({ tabs }: { tabs: TabDefinition[] }) {
  return Platform.OS === 'ios' ? <IosTabs tabs={tabs} /> : <AndroidTabs tabs={tabs} />;
}

function AndroidTabs({ tabs }: { tabs: TabDefinition[] }) {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} tabs={tabs} />}
      screenOptions={{ headerShown: false, animation: 'shift' }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}

// The system bar does not reliably report taps as `tabPress`, so the haptic follows the active tab:
// it plays whenever the selected tab changes, and never when leaving the tabs for a pushed page.
function useTabChangeHaptic(tabs: TabDefinition[]) {
  const segments = useSegments() as string[];
  const active = segments.find((segment) => tabs.some((tab) => tab.name === segment));
  const previous = useRef(active);

  useEffect(() => {
    if (active && previous.current && active !== previous.current) haptics.press();
    previous.current = active;
  }, [active]);
}

function IosTabs({ tabs }: { tabs: TabDefinition[] }) {
  useTabChangeHaptic(tabs);
  const themeName = useThemeName();
  const palette = Colors[themeName];
  const activeColor = themeName === 'light' ? palette.primary : palette.accentEmphasis;

  return (
    <NativeTabs
      tintColor={activeColor}
      iconColor={{ default: palette.mutedForeground, selected: activeColor }}
      labelStyle={{
        default: { fontFamily: Fonts.semibold, fontSize: 11, color: palette.mutedForeground },
        selected: { fontFamily: Fonts.bold, fontSize: 11, color: activeColor },
      }}
    >
      {tabs.map((tab) => (
        // Each tab is a TabStack that draws its own title, so automatic content insets stay off.
        <NativeTabs.Trigger key={tab.name} name={tab.name} disableAutomaticContentInsets>
          <NativeTabs.Trigger.Icon sf={tab.sf} />
          <NativeTabs.Trigger.Label>{tab.title}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
