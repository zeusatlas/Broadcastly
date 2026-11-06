import { router, type Href } from 'expo-router';
import {
  CreditCard,
  History,
  Megaphone,
  ScrollText,
  Settings,
  SlidersHorizontal,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Avatar, Text } from '@/components/ui';
import { useAccess, useCurrentUser } from '@/features/auth';
import { SettingsRow, SettingsSection } from '@/features/settings';
import type { PlatformPermission } from '@/types/models';

interface Tool {
  label: string;
  icon: LucideIcon;
  href: Href;
  // Without it the row is hidden; the API refuses it anyway.
  permission?: PlatformPermission;
}

const ACCOUNT_LINKS: Tool[] = [
  { label: 'Profile', icon: UserRound, href: '/profile' },
  { label: 'Settings', icon: Settings, href: '/settings' },
];

// Laid out like the organisation's More tab: account first, then tools grouped by what they cover.
const SECTIONS: { title: string; links: Tool[] }[] = [
  {
    title: 'Money',
    links: [
      {
        label: 'Payments',
        icon: CreditCard,
        href: '/admin/payments',
        permission: 'platform.finance.view',
      },
      {
        label: 'Credit history',
        icon: History,
        href: '/admin/credit-history',
        permission: 'platform.finance.view',
      },
      {
        label: 'Adjust credits',
        icon: Wallet,
        href: '/admin/adjust-credits',
        permission: 'platform.credit.manage',
      },
    ],
  },
  {
    title: 'Activity',
    links: [
      {
        label: 'Broadcasts',
        icon: Megaphone,
        href: '/admin/broadcasts',
        permission: 'platform.broadcast.view',
      },
      {
        label: 'Audit log',
        icon: ScrollText,
        href: '/admin/audit',
        permission: 'platform.audit.view',
      },
    ],
  },
  {
    title: 'Platform',
    links: [{ label: 'Platform settings', icon: SlidersHorizontal, href: '/admin/settings' }],
  },
];

export function AdminMoreScreen() {
  const access = useAccess();
  const user = useCurrentUser();
  const sections = SECTIONS.map((section) => ({
    ...section,
    links: section.links.filter((link) => !link.permission || access.can(link.permission)),
  })).filter((section) => section.links.length > 0);

  return (
    <PageScreen title="More" isTabRoot>
      <View className="mt-0 flex-row items-center gap-4 rounded-xl border border-border bg-card p-4">
        <Avatar name={user?.fullName ?? ''} size="md" />
        <View className="flex-1 gap-0.5">
          <Text className="font-sans-bold text-lg text-foreground" numberOfLines={1}>
            {user?.fullName ?? 'Your profile'}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            Platform admin · Broadcastly
          </Text>
        </View>
      </View>

      <SettingsSection title="Account">
        {ACCOUNT_LINKS.map((link) => (
          <SettingsRow
            key={link.label}
            icon={link.icon}
            label={link.label}
            onPress={() => router.push(link.href)}
          />
        ))}
      </SettingsSection>

      {sections.map((section) => (
        <SettingsSection key={section.title} title={section.title}>
          {section.links.map((link) => (
            <SettingsRow
              key={link.label}
              icon={link.icon}
              label={link.label}
              onPress={() => router.push(link.href)}
            />
          ))}
        </SettingsSection>
      ))}
    </PageScreen>
  );
}
