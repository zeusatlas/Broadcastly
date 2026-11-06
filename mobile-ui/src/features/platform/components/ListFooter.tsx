import { Search, X, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Button, FilterButton, SearchField, type FilterButtonProps } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

interface ListFooterProps<K extends string> {
  filter: FilterButtonProps<K>;
  isSearching: boolean;
  onToggleSearch: () => void;
  searchLabel: string;
  action?: { label: string; accessibilityLabel: string; icon: LucideIcon; onPress: () => void };
}

// The bottom bar of every admin list: filter on the left, search and the primary action on the right.
export function ListFooter<K extends string>({
  filter,
  isSearching,
  onToggleSearch,
  searchLabel,
  action,
}: ListFooterProps<K>) {
  const theme = useTheme();

  return (
    <View className="flex-row items-center justify-between gap-3">
      <FilterButton {...filter} />
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSearching ? 'Hide search' : searchLabel}
          accessibilityState={{ selected: isSearching }}
          onPress={onToggleSearch}
          className={cn(
            'h-14 w-14 items-center justify-center rounded-full active:opacity-70',
            isSearching ? 'bg-primary' : 'bg-card',
          )}
        >
          <Search size={21} color={isSearching ? theme.primaryForeground : theme.foreground} />
        </Pressable>
        {action ? (
          <Button
            label={action.label}
            accessibilityLabel={action.accessibilityLabel}
            icon={action.icon}
            variant="accent"
            shape="pill"
            onPress={action.onPress}
          />
        ) : null}
      </View>
    </View>
  );
}

interface InlineSearchProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onClose: () => void;
}

export function InlineSearch({ value, onChangeText, placeholder, onClose }: InlineSearchProps) {
  const theme = useTheme();

  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-1">
        <SearchField
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          autoFocus
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close search"
        onPress={onClose}
        className="h-12 w-12 items-center justify-center rounded-full bg-card active:opacity-70"
      >
        <X size={20} color={theme.foreground} />
      </Pressable>
    </View>
  );
}
