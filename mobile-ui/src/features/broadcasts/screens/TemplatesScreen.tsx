import { ChevronLeft, Plus, Search } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCollapsingTitle } from '@/components/shared';
import { GlassHeaderButton } from '@/components/shared/HeaderButton';
import { Button, FilterButton, Text } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';

import { TemplateList } from '../components/TemplateList';
import type { TemplateCategory } from '../types';
import { TEMPLATE_CATEGORIES } from '../utils/templates';

type TemplateFilter = 'all' | TemplateCategory;

const FILTERS: { key: TemplateFilter; label: string }[] = [
  { key: 'all', label: 'All templates' },
  ...TEMPLATE_CATEGORIES,
];

export function TemplatesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const collapsing = useCollapsingTitle('Templates', { header: 'buttons' });
  const canDraft = useHasPermission('broadcast.draft');
  const [filter, setFilter] = useState<TemplateFilter>('all');
  const [total, setTotal] = useState(0);
  const selectedFilter = FILTERS.find((item) => item.key === filter)?.label ?? 'All templates';

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Templates' }} />
      <TemplateList
        filters={{ category: filter === 'all' ? undefined : filter }}
        collapsing={collapsing}
        paddingBottom={insets.bottom + 96}
        onTotalChange={setTotal}
        emptyText={
          filter === 'all' ? 'No templates yet.' : `No ${selectedFilter.toLowerCase()} templates.`
        }
        header={
          <>
            {collapsing.largeTitle}
            <Text variant="bodyMuted">
              Reuse approved messages and personalisation fields when composing broadcasts.
            </Text>
          </>
        }
      />
      {collapsing.bar}

      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 top-0 flex-row items-center px-4"
        style={{ paddingTop: insets.top + 4 }}
      >
        <GlassHeaderButton icon={ChevronLeft} label="Go back" onPress={() => router.back()} />
      </View>

      <View
        pointerEvents="box-none"
        className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between gap-3 px-5"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <FilterButton
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          defaultValue="all"
          title="Filter templates"
          description="Choose a template category."
          accessibilityLabel="Open template filters"
          total={total}
        />
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search templates"
            onPress={() => router.push('/templates/search')}
            className="h-14 w-14 items-center justify-center rounded-full bg-card active:opacity-70"
          >
            <Search size={21} color={theme.foreground} />
          </Pressable>
          {canDraft ? (
            <Button
              label="New"
              icon={Plus}
              variant="accent"
              shape="pill"
              onPress={() => router.push('/templates/new')}
            />
          ) : null}
        </View>
      </View>
    </>
  );
}
