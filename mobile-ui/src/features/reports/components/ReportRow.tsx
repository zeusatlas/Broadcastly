import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { BroadcastStatusBadge } from '@/features/broadcasts';
import { useTheme } from '@/hooks/use_theme';
import { cn, formatDateTime } from '@/utils/helpers';

import type { ReportBroadcastResponse } from '../types';

interface ReportRowProps {
  report: ReportBroadcastResponse;
  isLast?: boolean;
  onPress: () => void;
}

export function ReportRow({ report, isLast = false, onPress }: ReportRowProps) {
  const theme = useTheme();
  const title = report.title ?? 'Untitled broadcast';
  const updatedAt = report.completedAt ?? report.submittedAt ?? report.createdAt;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open report for ${title}`}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 py-4 active:opacity-60',
        !isLast && 'border-b border-border',
      )}
    >
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="flex-1 font-sans-semibold text-base text-foreground" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" className="shrink-0">
            {formatDateTime(updatedAt)}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <BroadcastStatusBadge status={report.status} />
          <Text variant="caption" numberOfLines={1} className="flex-1">
            {report.deliveredCount.toLocaleString()} delivered ·{' '}
            {report.failedCount.toLocaleString()} failed
          </Text>
        </View>
      </View>
      <ChevronRight size={18} color={theme.mutedForeground} />
    </Pressable>
  );
}
