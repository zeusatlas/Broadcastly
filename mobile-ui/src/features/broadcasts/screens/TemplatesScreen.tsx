import { ChevronLeft, ListFilter, Plus, Search, X } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCollapsingTitle } from '@/components/shared';
import { GlassHeaderButton } from '@/components/shared/HeaderButton';
import { Button, Text } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const selectedFilter = FILTERS.find((item) => item.key === filter)?.label ?? 'All templates';

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Templates' }} />
      <TemplateList
        filters={{ category: filter === 'all' ? undefined : filter }}
        collapsing={collapsing}
        paddingBottom={insets.bottom + 96}
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
        <View
          className={cn(
            'flex-row items-center gap-2 rounded-full',
            filter !== 'all' && 'bg-card pr-3',
          )}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open template filters"
            accessibilityState={{ selected: filter !== 'all' }}
            onPress={() => setIsFilterOpen(true)}
            className={cn(
              'h-14 w-14 items-center justify-center rounded-full active:opacity-70',
              filter !== 'all' ? 'bg-primary' : 'bg-card',
            )}
          >
            <ListFilter
              size={21}
              color={filter !== 'all' ? theme.primaryForeground : theme.foreground}
            />
          </Pressable>
          {filter !== 'all' ? (
            <Text className="px-1 font-sans-semibold text-base text-foreground">
              {selectedFilter}
            </Text>
          ) : null}
        </View>
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

      <Modal
        visible={isFilterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterOpen(false)}
      >
        <View className="flex-1 justify-end bg-backdrop/60">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close template filters"
            onPress={() => setIsFilterOpen(false)}
            className="flex-1"
          />
          <View
            className="max-h-[72%] rounded-t-3xl bg-background px-5 pt-5"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <View className="gap-0.5">
                <Text variant="heading">Filter templates</Text>
                <Text variant="caption">Choose a template category.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close template filters"
                onPress={() => setIsFilterOpen(false)}
                className="h-11 w-11 items-center justify-center rounded-full bg-muted"
              >
                <X size={20} color={theme.foreground} />
              </Pressable>
            </View>
            {FILTERS.map((item) => {
              const isSelected = item.key === filter;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="radio"
                  accessibilityLabel={item.label}
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => {
                    setFilter(item.key);
                    setIsFilterOpen(false);
                  }}
                  className="flex-row items-center justify-between border-b border-border py-4 active:opacity-60"
                >
                  <Text className="font-sans-semibold text-base text-foreground">{item.label}</Text>
                  <View
                    className={cn(
                      'h-6 w-6 rounded-full border',
                      isSelected ? 'border-primary bg-primary' : 'border-input',
                    )}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}
