import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

// Longer lists get a search box instead of making people scroll through every option.
export const SELECT_SEARCH_THRESHOLD = 8;

export interface SelectOption<T extends string> {
  key: T;
  label: string;
  description?: string;
}

export interface SelectFieldProps<T extends string> {
  label: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  sheetTitle?: string;
  sheetDescription?: string;
  error?: string;
}

// Looks like a TextField; opens a sheet of choices.
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choose one',
  sheetTitle,
  sheetDescription,
  error,
}: SelectFieldProps<T>) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((option) => option.key === value);
  const hasSearch = options.length > SELECT_SEARCH_THRESHOLD;
  const query = search.trim().toLowerCase();
  const shown = query
    ? options.filter((option) =>
        `${option.label} ${option.description ?? ''}`.toLowerCase().includes(query),
      )
    : options;

  const close = () => {
    setIsOpen(false);
    setSearch('');
  };

  return (
    <View className="gap-2">
      <Text className="font-sans-bold text-base text-foreground">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityHint={error}
        onPress={() => setIsOpen(true)}
        className={cn(
          'h-14 flex-row items-center gap-3 rounded-lg border bg-muted/40 px-4 active:opacity-70',
          error ? 'border-destructive' : 'border-input',
        )}
      >
        <Text
          numberOfLines={1}
          className={cn(
            'flex-1 font-sans-medium text-base',
            selected ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={20} color={theme.mutedForeground} />
      </Pressable>
      {error ? <Text className="font-sans-medium text-sm text-destructive">{error}</Text> : null}

      <BottomSheet
        isVisible={isOpen}
        onClose={close}
        title={sheetTitle ?? label}
        description={sheetDescription}
        size={hasSearch ? 'tall' : 'auto'}
      >
        {hasSearch ? (
          <SearchField value={search} onChangeText={setSearch} placeholder="Search" />
        ) : null}
        <FlatList
          data={shown}
          keyExtractor={(option) => option.key}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={hasSearch}
          renderItem={({ item, index }) => {
            const isSelected = item.key === value;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={item.label}
                accessibilityState={{ checked: isSelected }}
                onPress={() => {
                  onChange(item.key);
                  close();
                }}
                className={cn(
                  'flex-row items-center gap-3 py-3.5 active:opacity-60',
                  index < shown.length - 1 && 'border-b border-border',
                )}
              >
                <View className="flex-1 gap-0.5">
                  <Text className="font-sans-semibold text-base text-foreground">{item.label}</Text>
                  {item.description ? (
                    <Text variant="caption" numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <View
                  className={cn(
                    'h-6 w-6 rounded-full border',
                    isSelected ? 'border-primary bg-primary' : 'border-input',
                  )}
                />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState title="Nothing matches" description="Try a different word." />
          }
        />
      </BottomSheet>
    </View>
  );
}
