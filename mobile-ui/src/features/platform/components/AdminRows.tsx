import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

interface MenuRowProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onPress: () => void;
  isLast?: boolean;
}

// One tool on the admin's More tab: gold icon chip, name, one line on what it is for.
export function MenuRow({ icon: Icon, title, description, onPress, isLast = false }: MenuRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 py-4 active:opacity-60',
        !isLast && 'border-b border-border',
      )}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-accent/15">
        <Icon size={20} color={theme.accentEmphasis} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground">{title}</Text>
        <Text variant="caption">{description}</Text>
      </View>
      <ChevronRight size={18} color={theme.mutedForeground} />
    </Pressable>
  );
}

interface ActivityRowProps {
  title: string;
  detail: string;
  meta?: string;
  // Right-hand value, e.g. "+500" or a status badge.
  trailing?: ReactNode;
  isLast?: boolean;
}

// A plain line in an admin list (a payment, a credit movement, an audit entry).
export function ActivityRow({ title, detail, meta, trailing, isLast = false }: ActivityRowProps) {
  return (
    <View
      accessible
      accessibilityLabel={[title, detail, meta].filter(Boolean).join(', ')}
      className={cn('flex-row items-center gap-3 py-3.5', !isLast && 'border-b border-border')}
    >
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" numberOfLines={2}>
          {detail}
        </Text>
        {meta ? <Text variant="caption">{meta}</Text> : null}
      </View>
      {typeof trailing === 'string' ? (
        <Text className="font-sans-bold text-base text-foreground">{trailing}</Text>
      ) : (
        trailing
      )}
    </View>
  );
}
