import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { BottomSheet, QueryState, SearchField, Text } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';

import { useAllocationRecipientPages } from '../hooks/use_allocation_recipients';
import type { AllocationRecipientResponse } from '../types';
import { describePositions } from '../utils/describe_positions';

interface RecipientPickerProps {
  isVisible: boolean;
  onSelect: (recipient: AllocationRecipientResponse) => void;
  onClose: () => void;
}

// Executives come from the server already filtered to the caller's reach (FR-IAM-03).
function RecipientList({ onSelect }: Pick<RecipientPickerProps, 'onSelect'>) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const recipients = useAllocationRecipientPages(deferredSearch);
  const meId = useCurrentUser()?.id;

  return (
    <View className="flex-1 gap-4">
      <SearchField
        placeholder="Search by name or party ID"
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={recipients.items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        onEndReached={recipients.loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Choose ${item.name}`}
            onPress={() => onSelect(item)}
            className={
              index === recipients.items.length - 1
                ? 'min-h-11 gap-1 py-3 active:opacity-60'
                : 'min-h-11 gap-1 border-b border-border py-3 active:opacity-60'
            }
          >
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 font-sans-semibold text-base text-foreground">
                {item.id === meId ? `${item.name} (you)` : item.name}
              </Text>
              <Text variant="caption">{item.wallet.available.toLocaleString()} credits</Text>
            </View>
            <Text variant="caption">{describePositions(item)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <QueryState
            isLoading={recipients.isLoading}
            error={recipients.error}
            isEmpty={!recipients.isLoading && recipients.items.length === 0}
            emptyText={
              deferredSearch
                ? 'No executives match your search.'
                : 'There is no one you can allocate credits to.'
            }
            onRetry={recipients.reload}
          />
        }
        ListFooterComponent={
          recipients.isFetching && recipients.items.length > 0 ? (
            <View className="py-4">
              <ActivityIndicator color={theme.mutedForeground} />
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

export function RecipientPicker({ isVisible, onSelect, onClose }: RecipientPickerProps) {
  return (
    <BottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title="Choose an executive"
      closeLabel="Close recipient list"
      size="tall"
    >
      {isVisible ? <RecipientList onSelect={onSelect} /> : null}
    </BottomSheet>
  );
}
