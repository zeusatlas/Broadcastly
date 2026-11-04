import { ChevronRight, CircleCheck, CircleDashed, TriangleAlert } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import type { ReportItem } from '../reports_data';

interface ReportRowProps {
  report: ReportItem;
  isLast?: boolean;
  onPress: () => void;
}

export function ReportRow({ report, isLast = false, onPress }: ReportRowProps) {
  const theme = useTheme();
  const Icon = report.status === 'completed' ? CircleCheck : report.status === 'pending' ? CircleDashed : TriangleAlert;
  const color = report.status === 'completed' ? theme.success : report.status === 'pending' ? theme.mutedForeground : theme.warning;
  const label = report.status === 'completed' ? 'Completed' : report.status === 'pending' ? 'Pending' : 'Partial';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open report for ${report.title}`}
      onPress={onPress}
      className={cn('flex-row items-center gap-3 py-4 active:opacity-60', !isLast && 'border-b border-border')}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-muted">
        <Icon size={20} color={color} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground" numberOfLines={1}>
          {report.title}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {report.audience} · {report.updatedAt}
        </Text>
        <Text variant="caption">
          {report.delivered.toLocaleString()} delivered · {report.failed.toLocaleString()} failed
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text className="font-sans-semibold text-xs" style={{ color }}>
          {label}
        </Text>
        <ChevronRight size={18} color={theme.mutedForeground} />
      </View>
    </Pressable>
  );
}
