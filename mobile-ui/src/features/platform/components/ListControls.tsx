import { useState } from 'react';
import { ScrollView } from 'react-native';

import { Chip, SearchField } from '@/components/ui';

export interface ListControlsProps<F extends string> {
  searchPlaceholder: string;
  onSearch: (search: string) => void;
  filters: readonly F[];
  filter: F;
  onFilterChange: (filter: F) => void;
}

// Search applies on submit (or when cleared), so typing never fires a request per keystroke.
export function ListControls<F extends string>({
  searchPlaceholder,
  onSearch,
  filters,
  filter,
  onFilterChange,
}: ListControlsProps<F>) {
  const [text, setText] = useState('');

  return (
    <>
      <SearchField
        placeholder={searchPlaceholder}
        value={text}
        onChangeText={(value) => {
          setText(value);
          if (!value) onSearch('');
        }}
        onSubmitEditing={() => onSearch(text.trim())}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {filters.map((option) => (
          <Chip
            key={option}
            label={option}
            isSelected={option === filter}
            onPress={() => onFilterChange(option)}
          />
        ))}
      </ScrollView>
    </>
  );
}
