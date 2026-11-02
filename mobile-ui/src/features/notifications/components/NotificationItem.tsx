import {
  CheckCheck,
  CircleAlert,
  FileSpreadsheet,
  Send,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import type { NotificationItemData, NotificationType } from '../types';

type Tone = 'accent' | 'success' | 'warning' | 'primary';

const TYPE_STYLE: Record<NotificationType, { icon: LucideIcon; tone: Tone }> = {
  approval_request: { icon: ShieldCheck, tone: 'accent' },
  approval_decision: { icon: CheckCheck, tone: 'success' },
  import_completed: { icon: FileSpreadsheet, tone: 'primary' },
  broadcast_delivered: { icon: Send, tone: 'success' },
  broadcast_partially_failed: { icon: CircleAlert, tone: 'warning' },
};

// Static strings so NativeWind can see every class at build time.
const TILE: Record<Tone, string> = {
  accent: 'bg-accent/15',
  success: 'bg-success/15',
  warning: 'bg-warning/20',
  primary: 'bg-primary/10',
};

interface NotificationItemProps {
  notification: NotificationItemData;
  isLast?: boolean;
}

export function NotificationItem({ notification, isLast = false }: NotificationItemProps) {
  const theme = useTheme();
  const { icon: Icon, tone } = TYPE_STYLE[notification.type];
  const iconColor: Record<Tone, string> = {
    accent: theme.accentEmphasis,
    success: theme.success,
    warning: theme.accentEmphasis,
    primary: theme.primary,
  };
  const { title, body, time, isUnread } = notification;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isUnread ? 'Unread. ' : ''}${title}. ${body}. ${time}`}
      className={cn('flex-row gap-3 py-4 active:opacity-60', !isLast && 'border-b border-border')}
    >
      <View className={cn('h-11 w-11 items-center justify-center rounded-full', TILE[tone])}>
        <Icon size={20} color={iconColor[tone]} />
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <Text
            numberOfLines={1}
            className={cn(
              'flex-1 text-base text-foreground',
              isUnread ? 'font-sans-bold' : 'font-sans-semibold',
            )}
          >
            {title}
          </Text>
          <Text variant="caption">{time}</Text>
        </View>
        <Text variant="bodyMuted" numberOfLines={2} className="text-sm">
          {body}
        </Text>
      </View>
      {/* Unread shows as a dot plus a bolder title, never by colour alone. */}
      <View className="w-2.5 pt-2">
        {isUnread ? <View className="h-2.5 w-2.5 rounded-full bg-accent" /> : null}
      </View>
    </Pressable>
  );
}
