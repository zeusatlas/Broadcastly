import { router, type Href } from 'expo-router';
import {
  BellOff,
  ChartColumn,
  CheckCheck,
  FileText,
  History,
  Network,
  UsersRound,
  type LucideIcon,
} from 'lucide-react-native';

import { PageScreen } from '@/components/shared';
import { Text } from '@/components/ui';
import { GATED_ROUTES } from '@/constants/routes';
import { useAccess } from '@/features/auth';

import { SettingsRow } from '../components/SettingsRow';
import { SettingsSection } from '../components/SettingsSection';

interface MoreLink {
  label: string;
  icon: LucideIcon;
  href: Href;
  // Route name in GATED_ROUTES; the row hides when the user lacks that access (display only).
  route: string;
}

// Grouped from the SRS: structure and people, messaging, then records.
const SECTIONS: { title: string; links: MoreLink[] }[] = [
  {
    title: 'Organisation',
    links: [
      { label: 'Structure', icon: Network, href: '/organisation', route: 'organisation/index' },
      { label: 'Executives', icon: UsersRound, href: '/executives', route: 'executives/index' },
    ],
  },
  {
    title: 'Messaging',
    links: [
      { label: 'Approvals', icon: CheckCheck, href: '/approvals', route: 'approvals/index' },
      { label: 'Templates', icon: FileText, href: '/templates', route: 'templates/index' },
      { label: 'Opt-outs', icon: BellOff, href: '/opt-outs', route: 'opt-outs/index' },
    ],
  },
  {
    title: 'Records',
    links: [
      { label: 'Reports', icon: ChartColumn, href: '/reports', route: 'reports/index' },
      {
        label: 'Import history',
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
  const sections = SECTIONS.map((section) => ({
    ...section,
    links: section.links.filter((link) => {
      const gate = GATED_ROUTES.find((r) => r.name === link.route);
      return gate ? access.check(gate.access) : true;
    }),
  })).filter((section) => section.links.length > 0);

  return (
    <PageScreen title="More" isTabRoot>
      {sections.length > 0 ? (
        sections.map((section, index) => (
          <SettingsSection
            key={section.title}
            title={section.title}
            className={index === 0 ? 'mt-0' : undefined}
          >
            {section.links.map((link) => (
              <SettingsRow
                key={link.label}
                icon={link.icon}
                label={link.label}
                onPress={() => router.push(link.href)}
              />
            ))}
          </SettingsSection>
        ))
      ) : (
        <Text variant="bodyMuted" className="mt-4">
          Nothing else to manage with your current access.
        </Text>
      )}
    </PageScreen>
  );
}
