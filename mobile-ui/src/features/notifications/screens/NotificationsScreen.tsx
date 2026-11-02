import { CheckCheck, X } from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Text } from '@/components/ui';

import { NotificationItem } from '../components/NotificationItem';
import type { NotificationItemData } from '../types';

// TODO(notifications API): static sample data; becomes a paginated FlatList once FR-NOT-01 is wired.
const GROUPS: { title: string; items: NotificationItemData[] }[] = [
  {
    title: 'Today',
    items: [
      {
        id: '1',
        type: 'approval_request',
        title: 'Approval needed',
        body: 'Membership dues reminder (8,412 recipients) is waiting for your approval.',
        time: '09:12',
        isUnread: true,
      },
      {
        id: '2',
        type: 'broadcast_delivered',
        title: 'Broadcast delivered',
        body: 'Executive meeting — Saturday 9am reached 142 of 146 recipients.',
        time: '08:20',
        isUnread: true,
      },
    ],
  },
  {
    title: 'Earlier',
    items: [
      {
        id: '3',
        type: 'broadcast_partially_failed',
        title: 'Some messages failed',
        body: 'Polling station verification notice: 124 messages could not be delivered.',
        time: 'Yesterday',
        isUnread: false,
      },
      {
        id: '4',
        type: 'import_completed',
        title: 'Member import finished',
        body: '1,204 members imported, 12 rows need attention.',
        time: 'Mon',
        isUnread: false,
      },
      {
        id: '5',
        type: 'approval_decision',
        title: 'Broadcast approved',
        body: 'Youth rally reminder was approved by the Constituency Secretary.',
        time: '28 Oct',
        isUnread: false,
      },
    ],
  },
];

// Opens from the home bell, sliding in from the right; X closes it.
export function NotificationsScreen() {
  return (
    <PageScreen
      title="Notifications"
      backIcon={X}
      backLabel="Close notifications"
      headerRight={{ icon: CheckCheck, label: 'Mark all as read' }}
    >
      {GROUPS.map((group) => (
        <View key={group.title} className="mt-6">
          <Text
            accessibilityRole="header"
            className="font-sans-bold text-xs uppercase tracking-widest text-muted-foreground"
          >
            {group.title}
          </Text>
          {group.items.map((item, index) => (
            <NotificationItem
              key={item.id}
              notification={item}
              isLast={index === group.items.length - 1}
            />
          ))}
        </View>
      ))}
    </PageScreen>
  );
}
