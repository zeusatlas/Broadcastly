import { router, type Href } from 'expo-router';
import {
  ChartColumn,
  CheckCheck,
  FileText,
  History,
  Network,
  Settings,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Avatar, Text } from '@/components/ui';
import { GATED_ROUTES } from '@/constants/routes';
import { useAccess, useCurrentUser } from '@/features/auth';

import { SettingsRow } from '../components/SettingsRow';
import { SettingsSection } from '../components/SettingsSection';

interface MoreLink {
  label: string;
  icon: LucideIcon;
  href: Href;
  // Route name in GATED_ROUTES; the row hides when the user lacks that access (display only).
  route: string;
}

const href = (path: string) => path as Href;

const ACCOUNT_LINKS = [
  { label: 'Profile', icon: UserRound, href: '/profile' as Href },
  { label: 'Settings', icon: Settings, href: '/settings' as Href },
] as const;

// Grouped from the SRS: structure and people, messaging, then records.
const SECTIONS: { title: string; links: MoreLink[] }[] = [
  {
    title: 'Organisation',
    links: [
      { label: 'Structure', icon: Network, href: '/organisation', route: 'organisation/index' },
      {
        label: 'Executives',
        icon: UsersRound,
        href: href('/executives'),
        route: 'executives/index',
      },
    ],
  },
  {
    title: 'Messaging',
    links: [
      { label: 'Approvals', icon: CheckCheck, href: '/approvals', route: 'approvals/index' },
      { label: 'Templates', icon: FileText, href: href('/templates'), route: 'templates/index' },
    ],
  },
  {
    title: 'Records',
    links: [
      { label: 'Reports', icon: ChartColumn, href: '/reports', route: 'reports/index' },
      {
        label: 'Import activity',
        icon: History,
        href: '/members/imports',
        route: 'members/imports',
      },
    ],
  },
];

// Management tools that aren't tabs, shown by access. Profile, settings and support live on the profile.
export function MoreScreen() {
  const access = useAccess();
  const user = useCurrentUser();
  const sections = SECTIONS.map((section) => ({
    ...section,
    links: section.links.filter((link) => {
      const gate = GATED_ROUTES.find((r) => r.name === link.route);
      return gate ? access.check(gate.access) : true;
    }),
  })).filter((section) => section.links.length > 0);

  return (
    <PageScreen title="More" isTabRoot>
      <View className="mt-0 flex-row items-center gap-4 rounded-xl border border-border bg-card p-4">
        <Avatar
          name={user?.organisation?.name ?? user?.fullName ?? ''}
          imageUrl={user?.organisation?.logoUrl}
          size="md"
        />
        <View className="flex-1 gap-0.5">
          <Text className="font-sans-bold text-lg text-foreground" numberOfLines={1}>
            {user?.fullName ?? 'Your profile'}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {user?.appointments[0]?.positionTitle ?? 'Executive'}
            {user?.organisation?.name ? ` · ${user.organisation.name}` : ''}
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
