import { ChevronRight, ListFilter } from 'lucide-react-native';
import { useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Text } from './Text';

export interface FilterOption<K extends string> {
  key: K;
  label: string;
}

export interface FilterButtonProps<K extends string> {
  options: readonly FilterOption<K>[];
  value: K;
  onChange: (value: K) => void;
  // The "no filter" option: while it is selected the button stays plain and shows no label.
  defaultValue: K;
  title: string;
  description: string;
  accessibilityLabel: string;
  align?: FilterAlign;
  total?: number;
}

export const FILTER_THRESHOLD = 15;

export type FilterAlign = 'left' | 'right';

export interface FilterGroup {
  title: string;
  options: readonly FilterOption<string>[];
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
}

// A row that leaves this sheet for another picker (e.g. a unit tree too big for a list here).
export interface FilterLink {
  title: string;
  value: string;
  isActive: boolean;
  onPress: () => void;
}

export interface FilterGroupsButtonProps {
  groups: readonly FilterGroup[];
  links?: readonly FilterLink[];
  onReset: () => void;
  title: string;
  description: string;
  accessibilityLabel: string;
  align?: FilterAlign;
}

function FilterTrigger({
  isActive,
  label,
  accessibilityLabel,
  align = 'left',
  onPress,
}: {
  isActive: boolean;
  label: string;
  accessibilityLabel: string;
  align?: FilterAlign;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <View
      className={cn(
        'min-w-0 shrink items-center gap-2 rounded-full',
        align === 'right' ? 'flex-row-reverse' : 'flex-row',
        isActive && (align === 'right' ? 'bg-card pl-3' : 'bg-card pr-3'),
      )}
      style={{ borderRadius: 999, overflow: 'hidden' }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: isActive }}
        onPress={onPress}
        className={cn(
          'h-14 w-14 shrink-0 items-center justify-center rounded-full active:opacity-70',
          isActive ? 'bg-primary' : 'bg-card',
        )}
      >
        <ListFilter size={21} color={isActive ? theme.primaryForeground : theme.foreground} />
      </Pressable>
      {isActive ? (
        <Text
          numberOfLines={1}
          className="shrink px-1 font-sans-semibold text-base text-foreground"
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

function FilterSheet({
  isOpen,
  title,
  description,
  onClose,
  onDismiss,
  footer,
  children,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onDismiss?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <BottomSheet
      isVisible={isOpen}
      onClose={onClose}
      onDismiss={onDismiss}
      title={title}
      description={description}
      closeLabel="Close filters"
      footer={footer}
    >
      {children}
    </BottomSheet>
  );
}

function RadioRow({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-border py-4 active:opacity-60"
    >
      <Text className="font-sans-semibold text-base text-foreground">{label}</Text>
      <View
        className={cn(
          'h-6 w-6 rounded-full border',
          isSelected ? 'border-primary bg-primary' : 'border-input',
        )}
      />
    </Pressable>
  );
}

export function FilterButton<K extends string>({
  options,
  value,
  onChange,
  defaultValue,
  title,
  description,
  accessibilityLabel,
  align,
  total,
}: FilterButtonProps<K>) {
  const [isOpen, setIsOpen] = useState(false);
  // A short list needs no filter; one already applied stays visible so it can be undone.
  if (total !== undefined && value === defaultValue && total <= FILTER_THRESHOLD) return <View />;

  return (
    <>
      <FilterTrigger
        isActive={value !== defaultValue}
        label={options.find((option) => option.key === value)?.label ?? ''}
        accessibilityLabel={accessibilityLabel}
        align={align}
        onPress={() => setIsOpen(true)}
      />
      <FilterSheet
        isOpen={isOpen}
        title={title}
        description={description}
        onClose={() => setIsOpen(false)}
      >
        {options.map((option) => (
          <RadioRow
            key={option.key}
            label={option.label}
            isSelected={option.key === value}
            onPress={() => {
              onChange(option.key);
              setIsOpen(false);
            }}
          />
        ))}
      </FilterSheet>
    </>
  );
}

// For several independent choices (group, sort, status…). Picks are a draft until Done applies
// them; closing the sheet any other way throws the draft away.
export function FilterGroupsButton({
  groups,
  links = [],
  onReset,
  title,
  description,
  accessibilityLabel,
  align,
}: FilterGroupsButtonProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [isResetPending, setIsResetPending] = useState(false);
  const pendingLink = useRef<(() => void) | null>(null);
  const draftOf = (group: FilterGroup) => draft[group.title] ?? group.value;
  const canReset =
    groups.some((group) => draftOf(group) !== group.defaultValue) ||
    (!isResetPending && links.some((link) => link.isActive));

  const open = () => {
    setDraft({});
    setIsResetPending(false);
    setIsOpen(true);
  };

  const apply = () => {
    if (isResetPending) onReset();
    for (const group of groups) {
      const next = draftOf(group);
      const current = isResetPending ? group.defaultValue : group.value;
      if (next !== current) group.onChange(next);
    }
  };
  const changed = [
    ...groups
      .filter((group) => group.value !== group.defaultValue)
      .map((group) => group.options.find((option) => option.key === group.value)?.label ?? ''),
    ...links.filter((link) => link.isActive).map((link) => link.value),
  ];

  // iOS cannot present the next sheet until this one has fully gone, hence onDismiss.
  const runPendingLink = () => {
    const next = pendingLink.current;
    pendingLink.current = null;
    next?.();
  };

  const followLink = (link: FilterLink) => {
    apply();
    pendingLink.current = link.onPress;
    setIsOpen(false);
    if (Platform.OS !== 'ios') setTimeout(runPendingLink, 0);
  };

  return (
    <>
      <FilterTrigger
        isActive={changed.length > 0}
        label={changed.join(' · ')}
        accessibilityLabel={accessibilityLabel}
        align={align}
        onPress={open}
      />
      <FilterSheet
        isOpen={isOpen}
        title={title}
        description={description}
        onClose={() => setIsOpen(false)}
        onDismiss={runPendingLink}
        footer={
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label="Reset"
                variant="outline"
                fullWidth
                disabled={!canReset}
                onPress={() => {
                  setDraft(Object.fromEntries(groups.map((g) => [g.title, g.defaultValue])));
                  setIsResetPending(true);
                }}
              />
            </View>
            <View className="flex-1">
              <Button
                label="Done"
                fullWidth
                onPress={() => {
                  apply();
                  setIsOpen(false);
                }}
              />
            </View>
          </View>
        }
      >
        {groups.map((group) => (
          <View key={group.title} className="mb-4">
            <Text variant="overline">{group.title}</Text>
            {group.options.map((option) => (
              <RadioRow
                key={option.key}
                label={option.label}
                isSelected={option.key === draftOf(group)}
                onPress={() => setDraft((current) => ({ ...current, [group.title]: option.key }))}
              />
            ))}
          </View>
        ))}
        {links.map((link) => (
          <View key={link.title} className="mb-4">
            <Text variant="overline">{link.title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${link.title}: ${isResetPending ? 'All' : link.value}`}
              onPress={() => followLink(link)}
              className="flex-row items-center justify-between border-b border-border py-4 active:opacity-60"
            >
              <Text className="flex-1 font-sans-semibold text-base text-foreground">
                {isResetPending && link.isActive ? 'Reset on Done' : link.value}
              </Text>
              <ChevronRight size={20} color={theme.mutedForeground} />
            </Pressable>
          </View>
        ))}
      </FilterSheet>
    </>
  );
}
