import { router, type Href } from 'expo-router';
import {
  CreditCard,
  History,
  Megaphone,
  ScrollText,
  SlidersHorizontal,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { EmptyState, Text } from '@/components/ui';
import { useAccess } from '@/features/auth';
import type { PlatformPermission } from '@/types/models';

import { MenuRow } from '../components/AdminRows';

interface Tool {
  title: string;
  description: string;
  icon: LucideIcon;
  href: Href;
  // Without it the tool is hidden; the API refuses it anyway.
  permission?: PlatformPermission;
}

const TOOLS: Tool[] = [
  {
    title: 'Payments',
    description: 'Credit purchases by every organisation, and what was paid.',
    icon: CreditCard,
    href: '/admin/payments',
    permission: 'platform.finance.view',
  },
  {
    title: 'Credit history',
    description: 'Every credit bought, given, used or adjusted.',
    icon: History,
    href: '/admin/credit-history',
    permission: 'platform.finance.view',
  },
  {
    title: 'Adjust credits',
    description: 'Add or remove credits for an organisation, with a reason.',
    icon: Wallet,
    href: '/admin/adjust-credits',
    permission: 'platform.credit.manage',
  },
  {
    title: 'Broadcasts',
    description: 'Messages sent by every organisation and how they went.',
    icon: Megaphone,
    href: '/admin/broadcasts',
    permission: 'platform.broadcast.view',
  },
  {
    title: 'Audit log',
    description: 'Who did what, and when, across the platform.',
    icon: ScrollText,
    href: '/admin/audit',
    permission: 'platform.audit.view',
  },
  {
    title: 'Platform settings',
    description: 'Member import limits and platform notifications.',
    icon: SlidersHorizontal,
    href: '/admin/settings',
  },
];

export function AdminMoreScreen() {
  const access = useAccess();
  const tools = TOOLS.filter((tool) => !tool.permission || access.can(tool.permission));

  return (
    <PageScreen title="More" isTabRoot>
      <Text variant="bodyMuted">Tools for running the platform.</Text>
      {tools.length === 0 ? (
        <EmptyState
          title="No tools yet"
          description="Ask the main admin to give you permissions."
        />
      ) : (
        <View className="mt-2">
          {tools.map((tool, index) => (
            <MenuRow
              key={tool.title}
              icon={tool.icon}
              title={tool.title}
              description={tool.description}
              onPress={() => router.push(tool.href)}
              isLast={index === tools.length - 1}
            />
          ))}
        </View>
      )}
    </PageScreen>
  );
}
