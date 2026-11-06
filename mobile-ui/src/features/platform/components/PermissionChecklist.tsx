import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import type { PlatformPermission } from '@/types/models';
import { cn } from '@/utils/helpers';

import {
  PLATFORM_PERMISSION_GROUPS,
  PLATFORM_PERMISSION_OPTIONS,
} from '../utils/platform_permissions';

interface PermissionChecklistProps {
  selected: readonly PlatformPermission[];
  // Permissions the signed-in admin holds: only these can be given or taken away.
  grantable: readonly PlatformPermission[];
  onToggle?: (permission: PlatformPermission) => void;
  isReadOnly?: boolean;
}

const INFO = Object.fromEntries(PLATFORM_PERMISSION_OPTIONS.map((option) => [option.key, option]));

// Grouped like an executive's permissions on the organisation side: a gold icon chip per group,
// then each permission in plain words with its tick box.
export function PermissionChecklist({
  selected,
  grantable,
  onToggle,
  isReadOnly = false,
}: PermissionChecklistProps) {
  const theme = useTheme();

  return (
    <View className="gap-6">
      {PLATFORM_PERMISSION_GROUPS.map((group) => {
        const Icon = group.icon;
        const count = group.permissions.filter((key) => selected.includes(key)).length;
        return (
          <View key={group.title} className="gap-1">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-accent/15">
                <Icon size={16} color={theme.accentEmphasis} />
              </View>
              <Text className="flex-1 font-sans-bold text-base text-foreground">{group.title}</Text>
              <Text variant="caption">
                {count} of {group.permissions.length}
              </Text>
            </View>
            {group.permissions.map((key, index) => {
              const option = INFO[key];
              if (!option) return null;
              const isChecked = selected.includes(key);
              const isDisabled = isReadOnly || !grantable.includes(key);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="checkbox"
                  accessibilityLabel={option.label}
                  accessibilityHint={option.description}
                  accessibilityState={{ checked: isChecked, disabled: isDisabled }}
                  disabled={isDisabled}
                  onPress={() => onToggle?.(key)}
                  className={cn(
                    'ml-10 flex-row items-start gap-3 py-3 active:opacity-60',
                    index < group.permissions.length - 1 && 'border-b border-border',
                  )}
                >
                  <View className={cn('flex-1 gap-0.5', isDisabled && !isChecked && 'opacity-60')}>
                    <Text className="font-sans-semibold text-[15px] text-foreground">
                      {option.label}
                    </Text>
                    <Text variant="caption">
                      {isDisabled && !isReadOnly
                        ? `${option.description} Only an admin who holds it can give it.`
                        : option.description}
                    </Text>
                  </View>
                  <View
                    className={cn(
                      'mt-0.5 h-6 w-6 items-center justify-center rounded-md border',
                      isChecked ? 'border-primary bg-primary' : 'border-input',
                      isDisabled && 'opacity-50',
                    )}
                  >
                    {isChecked ? <Check size={16} color={theme.primaryForeground} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
