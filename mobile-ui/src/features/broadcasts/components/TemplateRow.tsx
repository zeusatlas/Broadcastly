import { ChevronRight, FileText } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import type { TemplateResponse } from '../types';
import { categoryLabel, formatUpdated } from '../utils/templates';

interface TemplateRowProps {
  template: TemplateResponse;
  isLast?: boolean;
  onPress: () => void;
}

export function TemplateRow({ template, isLast = false, onPress }: TemplateRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open template ${template.name}`}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 py-4 active:opacity-60',
        !isLast && 'border-b border-border',
      )}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-accent/15">
        <FileText size={20} color={theme.accentEmphasis} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground" numberOfLines={1}>
          {template.name}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {categoryLabel(template.category)} · {formatUpdated(template.updatedAt)}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {template.body}
        </Text>
      </View>
      <ChevronRight size={18} color={theme.mutedForeground} />
    </Pressable>
  );
}
