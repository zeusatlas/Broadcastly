import { router, Stack } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GLASS_BUTTON_SIZE, GlassHeaderButton } from '@/components/shared/HeaderButton';
import { SearchField } from '@/components/ui';

import { TemplateList } from '../components/TemplateList';
import { useDebouncedValue } from '../hooks/use_templates';

export function TemplateSearchScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Search templates' }} />
      <TemplateList
        filters={{ search: debouncedSearch || undefined }}
        paddingTop={insets.top + GLASS_BUTTON_SIZE + 16}
        paddingBottom={insets.bottom + 24}
        emptyText={debouncedSearch ? 'No templates match your search.' : 'No templates yet.'}
        header={
          <SearchField
            autoFocus
            value={search}
            onChangeText={setSearch}
            placeholder="Search templates"
            className="h-14"
          />
        }
      />
      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 top-0 flex-row items-center px-4"
        style={{ paddingTop: insets.top + 4 }}
      >
        <GlassHeaderButton icon={X} label="Close search" onPress={() => router.back()} />
      </View>
    </>
  );
}
