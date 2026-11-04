import { Tabs } from 'expo-router';
import type { BottomTabBarButtonProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import {
  Pressable,
  Text as RNText,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  View,
} from 'react-native';
import {
  Building2,
  LayoutDashboard,
  Menu,
  Send,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { useHeaderOptions } from '@/hooks/use_header_options';
import { useThemeName } from '@/hooks/use_theme';

export interface TabDefinition {
  name: string;
  title: string;
  icon: LucideIcon;
}

// Per FR-IAM-03 this must become a derivation of the executive's permissions and scope.
export const EXECUTIVE_TABS: TabDefinition[] = [
  { name: 'index', title: 'Home', icon: LayoutDashboard },
  { name: 'broadcasts', title: 'Broadcasts', icon: Send },
  { name: 'members', title: 'Members', icon: Users },
  { name: 'credits', title: 'Credits', icon: Wallet },
  { name: 'more', title: 'More', icon: Menu },
];

export const ADMIN_TABS: TabDefinition[] = [
  { name: 'index', title: 'Home', icon: LayoutDashboard },
  { name: 'organisations', title: 'Organisations', icon: Building2 },
  { name: 'admins', title: 'Admins', icon: ShieldCheck },
];

// Tab bar on the bottom. Home ('index') uses this header with no title and fills its sides itself;
// every other tab is a TabStack with its own large, collapsing title.
export function AppTabs({ tabs }: { tabs: TabDefinition[] }) {
  const themeName = useThemeName();
  const palette = Colors[themeName];
  const headerOptions = useHeaderOptions();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        ...headerOptions,
        animation: 'shift',
        headerLeftContainerStyle: { paddingLeft: 12 },
        headerRightContainerStyle: { paddingRight: 12 },
        // Navy on light, gold on dark: each clears 4.5:1 against the `border` pill behind it.
        tabBarActiveTintColor: themeName === 'light' ? palette.primary : palette.accentEmphasis,
        tabBarInactiveTintColor: palette.mutedForeground,
        tabBarItemStyle: { flex: 1, minWidth: 0 },
        tabBarStyle: {
          backgroundColor: palette.background,
          borderTopColor: palette.border,
          height: 60 + insets.bottom,
          paddingHorizontal: 6,
          paddingTop: 5,
          paddingBottom: insets.bottom + 5,
        },
        tabBarLabelStyle: { fontSize: 10, fontFamily: Fonts.medium, marginTop: 1 },
      }}
    >
      {tabs.map(({ name, title, icon: Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            headerShown: name === 'index',
            headerTitle: '',
            tabBarButton: (props) => <TabBarButton {...props} activeColor={palette.border} />,
            tabBarLabel: ({ color, focused }) => (
              <RNText
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={{
                  color,
                  fontFamily: focused ? Fonts.bold : Fonts.semibold,
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {title}
              </RNText>
            ),
            tabBarIcon: ({ color }) => <Icon color={color} size={20} strokeWidth={2.25} />,
          }}
        />
      ))}
    </Tabs>
  );
}

interface TabBarButtonProps extends BottomTabBarButtonProps {
  activeColor: string;
}

function TabBarButton({
  activeColor,
  accessibilityState,
  children,
  href: _href,
  onPress,
  style,
  ...props
}: TabBarButtonProps) {
  const isSelected = accessibilityState?.selected === true;

  return (
    <Pressable
      {...(props as PressableProps)}
      onPress={onPress as PressableProps['onPress']}
      style={[
        style as StyleProp<ViewStyle>,
        { flex: 1, alignItems: 'stretch', justifyContent: 'center', paddingHorizontal: 2 },
      ]}
    >
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          paddingHorizontal: 8,
          backgroundColor: isSelected ? activeColor : 'transparent',
        }}
      >
        {children}
      </View>
    </Pressable>
  );
}
