import { Building2, ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import type { OrganisationResponse } from '../types';

interface OrganisationRowProps {
  organisation: OrganisationResponse;
  onPress?: () => void;
  isLast?: boolean;
}

// The icon tile's colour carries the state; the text says it too, so colour is never alone.
export function OrganisationRow({ organisation, onPress, isLast = false }: OrganisationRowProps) {
  const theme = useTheme();
  const { name, chairman, memberCount, executiveCount, status } = organisation;
  const isInactive = status === 'inactive';
  const needsChairman = !chairman && !isInactive;
  const subtitle = isInactive
    ? 'Inactive'
    : chairman
      ? `Chairman · ${chairman.fullName}`
      : 'No chairman yet';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${subtitle}, ${memberCount} members`}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 py-3.5 active:opacity-60',
        !isLast && 'border-b border-border',
      )}
    >
      <View
        className={cn(
          'h-11 w-11 items-center justify-center rounded-xl',
          isInactive ? 'bg-muted' : needsChairman ? 'bg-warning' : 'bg-success',
        )}
      >
        <Building2
          size={20}
          color={
            isInactive
              ? theme.mutedForeground
              : needsChairman
                ? theme.warningForeground
                : theme.successForeground
          }
        />
      </View>
      <View className="flex-1 gap-1">
        <Text className="font-sans-bold text-base text-foreground" numberOfLines={1}>
          {name}
        </Text>
        <Text
          className={cn(
            'font-sans-medium text-xs',
            needsChairman ? 'text-accent-emphasis' : 'text-muted-foreground',
          )}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text className="font-sans-bold text-sm text-foreground">
          {memberCount.toLocaleString()}
        </Text>
        <Text variant="caption">{executiveCount} exec.</Text>
      </View>
      <ChevronRight size={18} color={theme.mutedForeground} />
    </Pressable>
  );
}
