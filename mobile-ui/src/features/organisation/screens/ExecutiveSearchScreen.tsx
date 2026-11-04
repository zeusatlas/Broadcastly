import { useMemo, useState } from 'react';
import { X } from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { SearchField, Text } from '@/components/ui';

import { ExecutiveRow } from '../components/ExecutiveRow';
import { DEMO_EXECUTIVES } from '../demo_data';

export function ExecutiveSearchScreen() {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const results = useMemo(
    () =>
      DEMO_EXECUTIVES.filter(
        (executive) =>
          executive.name.toLowerCase().includes(query) ||
          executive.position.toLowerCase().includes(query) ||
          executive.unit.toLowerCase().includes(query),
      ),
    [query],
  );

  return (
    <PageScreen backIcon={X} backLabel="Close search">
      <View className="gap-4">
        <SearchField
          autoFocus
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, position or unit"
        />
        <Text variant="caption">
          {results.length} {results.length === 1 ? 'executive' : 'executives'} found
        </Text>
        <View>
          {results.length > 0 ? (
            results.map((executive, index) => (
              <ExecutiveRow
                key={executive.id}
                executive={executive}
                isLast={index === results.length - 1}
              />
            ))
          ) : (
            <View className="items-center gap-2 py-16">
              <Text variant="heading">No executives found</Text>
              <Text variant="bodyMuted" className="text-center">
                Try a different name, position or unit.
              </Text>
            </View>
          )}
        </View>
      </View>
    </PageScreen>
  );
}
