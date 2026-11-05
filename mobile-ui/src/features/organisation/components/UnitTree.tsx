import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { QueryState, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';

import { useReadUnitsQuery } from '../hooks/use_organisation_api';
import type { UnitResponse } from '../types';
import { formatUnitType } from '../utils/format_unit_type';

// Browses the organisation one level at a time (FR-ORG-02); the server limits it to the caller's reach.
export function UnitTree() {
  const theme = useTheme();
  const [path, setPath] = useState<UnitResponse[]>([]);
  const parent = path.at(-1);
  const units = useReadUnitsQuery({ page: 1, pageSize: 100, parentId: parent?.id });
  const items = units.data?.items ?? [];
  const refetch = useRef(units.refetch);
  useEffect(() => {
    refetch.current = units.refetch;
  });
  // Coming back from "Add unit" shows the new unit without a manual refresh.
  useFocusEffect(useCallback(() => refetch.current(), []));

  return (
    <View className="gap-1">
      <Text variant="overline">Units</Text>
      {parent ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Back to ${path.at(-2)?.name ?? 'top level'}`}
          onPress={() => setPath((current) => current.slice(0, -1))}
          className="h-11 flex-row items-center gap-1 active:opacity-60"
        >
          <ChevronLeft size={18} color={theme.accentEmphasis} />
          <Text className="font-sans-semibold text-accent-emphasis">
            {path.at(-2)?.name ?? 'All units'}
          </Text>
          <Text variant="caption"> · inside {parent.name}</Text>
        </Pressable>
      ) : null}
      <QueryState
        isLoading={units.isLoading}
        error={units.error}
        isEmpty={!units.isLoading && !units.error && items.length === 0}
        emptyText={
          parent ? `${parent.name} has no sub-units yet.` : 'No units have been added yet.'
        }
        onRetry={units.refetch}
      />
      {items.map((unit, index) => {
        const hasChildren = unit.childCount > 0;
        return (
          <Pressable
            key={unit.id}
            accessibilityRole="button"
            accessibilityLabel={`${unit.name}, ${formatUnitType(unit.type)}${hasChildren ? `, ${unit.childCount} sub-units` : ''}`}
            disabled={!hasChildren}
            onPress={() => setPath((current) => [...current, unit])}
            className={`min-h-11 flex-row items-center gap-3 py-3 active:opacity-60 ${
              index < items.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <View className="flex-1 gap-0.5">
              <Text variant="label">{unit.name}</Text>
              <Text variant="caption">
                {formatUnitType(unit.type)}
                {hasChildren
                  ? ` · ${unit.childCount} sub-unit${unit.childCount === 1 ? '' : 's'}`
                  : ''}
              </Text>
            </View>
            {hasChildren ? <ChevronRight size={18} color={theme.mutedForeground} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
