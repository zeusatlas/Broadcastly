import { Check, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QueryState, SearchField, Text } from '@/components/ui';
import type { UnitResponse } from '@/features/organisation';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import { useDebouncedValue } from '@/hooks/use_pages';

import { useReadUnitChoicesQuery } from '../hooks/use_members';

export interface UnitChoice {
  id: string;
  name: string;
}

interface UnitPickerProps {
  label: string;
  value: UnitChoice | null;
  placeholder: string;
  error?: string;
  onChange: (unit: UnitChoice | null) => void;
  // Shown as the first option when choosing no unit is allowed.
  noneLabel?: string;
}

const UNIT_PAGE_SIZE = 100;

function UnitSheet({
  selectedId,
  noneLabel,
  onSelect,
  onClose,
}: {
  selectedId?: string;
  noneLabel?: string;
  onSelect: (unit: UnitChoice | null) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [path, setPath] = useState<UnitResponse[]>([]);
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const parent = path.at(-1);
  const units = useReadUnitChoicesQuery({
    page: 1,
    pageSize: UNIT_PAGE_SIZE,
    search: query || undefined,
    parentId: query ? undefined : parent?.id,
  });
  const items = units.data?.items ?? [];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        // A modal is its own window, so the page's keyboard handling can't reach it; lift the sheet here.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end bg-backdrop/60">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close unit selection"
            onPress={onClose}
            className="flex-1"
          />
          <View
            className="max-h-[80%] rounded-t-3xl bg-background px-5 pt-5"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="mb-4 flex-row items-center gap-2">
              {parent && !query ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to the level above"
                  onPress={() => setPath(path.slice(0, -1))}
                  className="h-11 w-11 items-center justify-center rounded-full bg-muted"
                >
                  <ChevronLeft size={20} color={theme.foreground} />
                </Pressable>
              ) : null}
              <Text variant="heading" className="flex-1" numberOfLines={1}>
                {parent && !query ? parent.name : 'Choose a unit'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close unit selection"
                onPress={onClose}
                className="h-11 w-11 items-center justify-center rounded-full bg-muted"
              >
                <X size={20} color={theme.foreground} />
              </Pressable>
            </View>
            <SearchField value={search} onChangeText={setSearch} placeholder="Search units" />
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                noneLabel && !parent && !query ? (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={noneLabel}
                    accessibilityState={{ checked: !selectedId }}
                    onPress={() => onSelect(null)}
                    className="min-h-14 flex-row items-center gap-3 border-b border-border py-3 active:opacity-60"
                  >
                    <Text className="flex-1 font-sans-semibold text-base text-foreground">
                      {noneLabel}
                    </Text>
                    {!selectedId ? <Check size={20} color={theme.accentEmphasis} /> : null}
                  </Pressable>
                ) : undefined
              }
              renderItem={({ item }) => {
                const isSelected = item.id === selectedId;
                return (
                  <View className="min-h-14 flex-row items-center border-b border-border">
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityLabel={`${item.name}, ${item.type.replace('_', ' ')}`}
                      accessibilityState={{ checked: isSelected }}
                      onPress={() => onSelect({ id: item.id, name: item.name })}
                      className="flex-1 flex-row items-center gap-3 py-3 active:opacity-60"
                    >
                      <View className="flex-1 gap-0.5">
                        <Text className="font-sans-semibold text-base text-foreground">
                          {item.name}
                        </Text>
                        <Text variant="caption" className="capitalize">
                          {item.type.replace('_', ' ')}
                        </Text>
                      </View>
                      {isSelected ? <Check size={20} color={theme.accentEmphasis} /> : null}
                    </Pressable>
                    {item.childCount > 0 && !query ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Show units inside ${item.name}`}
                        onPress={() => setPath([...path, item])}
                        className="h-11 w-11 items-center justify-center active:opacity-60"
                      >
                        <ChevronRight size={20} color={theme.mutedForeground} />
                      </Pressable>
                    ) : null}
                  </View>
                );
              }}
              ListEmptyComponent={
                <QueryState
                  isLoading={units.isLoading}
                  error={units.error}
                  isEmpty
                  emptyText={query ? 'No units match your search.' : 'No units here.'}
                  onRetry={units.refetch}
                />
              }
              ListFooterComponent={
                units.data?.hasNextPage ? (
                  <Text variant="caption" className="py-3 text-center">
                    Showing the first {UNIT_PAGE_SIZE}. Search to find others.
                  </Text>
                ) : undefined
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function UnitPicker({
  label,
  value,
  placeholder,
  error,
  onChange,
  noneLabel,
}: UnitPickerProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View className="gap-2">
      <Text className="font-sans-bold text-base text-foreground">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value?.name ?? placeholder}`}
        accessibilityHint={error}
        onPress={() => setIsOpen(true)}
        className={cn(
          'min-h-14 flex-row items-center gap-3 rounded-lg border bg-muted/40 px-4 active:opacity-70',
          error ? 'border-destructive' : 'border-input',
        )}
      >
        <Text
          className={cn(
            'flex-1 font-sans-medium text-base',
            value ? 'text-foreground' : 'text-muted-foreground',
          )}
          numberOfLines={1}
        >
          {value?.name ?? placeholder}
        </Text>
        <ChevronDown size={20} color={theme.mutedForeground} />
      </Pressable>
      {error ? <Text className="font-sans text-sm text-destructive">{error}</Text> : null}
      {isOpen ? (
        <UnitSheet
          selectedId={value?.id}
          noneLabel={noneLabel}
          onSelect={(unit) => {
            onChange(unit);
            setIsOpen(false);
          }}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </View>
  );
}
