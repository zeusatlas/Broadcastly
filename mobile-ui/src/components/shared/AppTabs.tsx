import { Tabs } from 'expo-router';
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

import { Colors, Fonts } from '@/constants/theme';
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

export function AppTabs({ tabs }: { tabs: TabDefinition[] }) {
  const palette = Colors[useThemeName()];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Gold, not navy: on the dark canvas only gold clears 3:1 against the bar.
        tabBarActiveTintColor: palette.accentEmphasis,
        tabBarInactiveTintColor: palette.mutedForeground,
        tabBarStyle: {
          backgroundColor: palette.background,
          borderTopColor: palette.border,
        },
        tabBarLabelStyle: { fontSize: 10, fontFamily: Fonts.medium },
      }}
    >
      {tabs.map(({ name, title, icon: Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => <Icon color={color} size={size - 4} />,
          }}
        />
      ))}
    </Tabs>
  );
}
