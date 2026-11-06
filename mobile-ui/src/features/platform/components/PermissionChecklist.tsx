import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import type { PlatformPermission } from '@/types/models';
import { cn } from '@/utils/helpers';

import { PLATFORM_PERMISSION_OPTIONS } from '../utils/platform_permissions';

interface PermissionChecklistProps {
  selected: readonly PlatformPermission[];
  // Permissions the signed-in admin holds: only these can be given or taken away.
  grantable: readonly PlatformPermission[];
  onToggle?: (permission: PlatformPermission) => void;
  isReadOnly?: boolean;
}

export function PermissionChecklist({
  selected,
  grantable,
  onToggle,
  isReadOnly = false,
}: PermissionChecklistProps) {
  const theme = useTheme();

  return (
    <View>
      {PLATFORM_PERMISSION_OPTIONS.map((option, index) => {
        const isChecked = selected.includes(option.key);
        const isDisabled = isReadOnly || !grantable.includes(option.key);
        return (
          <Pressable
            key={option.key}
            accessibilityRole="checkbox"
            accessibilityLabel={option.label}
            accessibilityHint={option.description}
            accessibilityState={{ checked: isChecked, disabled: isDisabled }}
            disabled={isDisabled}
            onPress={() => onToggle?.(option.key)}
            className={cn(
              'flex-row items-center gap-3 py-3.5 active:opacity-60',
              index < PLATFORM_PERMISSION_OPTIONS.length - 1 && 'border-b border-border',
            )}
          >
            <View
              className={cn(
                'h-6 w-6 items-center justify-center rounded-md border',
                isChecked ? 'border-primary bg-primary' : 'border-input',
                isDisabled && 'opacity-50',
              )}
            >
              {isChecked ? <Check size={16} color={theme.primaryForeground} /> : null}
            </View>
            <View className={cn('flex-1 gap-0.5', isDisabled && 'opacity-60')}>
              <Text className="font-sans-semibold text-base text-foreground">{option.label}</Text>
              <Text variant="caption">{option.description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
