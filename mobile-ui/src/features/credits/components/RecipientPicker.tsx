import { X } from 'lucide-react-native';
import { useDeferredValue, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from 'react-native';

import { QueryState, SearchField, Text } from '@/components/ui';
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
                {item.name}
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
  const theme = useTheme();

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        // A modal is its own window, so the page's keyboard handling can't reach it; lift the sheet here.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end bg-backdrop/60">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close recipient list"
            onPress={onClose}
            className="absolute inset-0"
          />
          <View className="h-[85%] rounded-t-2xl border border-b-0 border-border bg-card px-5 pb-8 pt-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Text accessibilityRole="header" variant="heading">
                Choose an executive
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close recipient list"
                onPress={onClose}
                className="h-11 w-11 items-center justify-center rounded-xl bg-muted"
              >
                <X size={20} color={theme.foreground} />
              </Pressable>
            </View>
            {isVisible ? <RecipientList onSelect={onSelect} /> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
