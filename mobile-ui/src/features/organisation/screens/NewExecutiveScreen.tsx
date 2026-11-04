import { Check, ChevronDown, X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageScreen } from '@/components/shared';
import { Button, SearchField, Text } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import type { Permission } from '@/types/models';
import { cn } from '@/utils/helpers';

import { DEMO_EXECUTIVES } from '../demo_data';

interface SelectionOption {
  id: string;
  label: string;
  detail?: string;
}

interface SelectionFieldProps {
  label: string;
  value?: SelectionOption;
  placeholder: string;
  onPress: () => void;
}

type SelectionKind = 'member' | 'position' | 'unit';

const MEMBERS: SelectionOption[] = DEMO_EXECUTIVES.map((executive) => ({
  id: executive.id,
  label: executive.name,
  detail: executive.email,
}));

const POSITIONS: SelectionOption[] = [
  { id: 'position-director', label: 'Operations Director', detail: 'Organisation-wide' },
  { id: 'position-coordinator', label: 'Regional Coordinator', detail: 'Regional unit' },
  { id: 'position-site-lead', label: 'Site Lead', detail: 'Site' },
];

const UNITS: SelectionOption[] = [
  { id: 'unit-organisation', label: 'Organisation-wide', detail: 'All units in reach' },
  { id: 'unit-north', label: 'Northern Region', detail: 'Regional unit' },
  { id: 'unit-central', label: 'Central Office', detail: 'Site' },
];

const PERMISSIONS: { key: Permission; label: string; group: string }[] = [
  { key: 'appointment.manage', label: 'Manage appointments', group: 'Organisation' },
  { key: 'member.manage', label: 'Manage members', group: 'Members' },
  { key: 'member.import', label: 'Import members', group: 'Members' },
  { key: 'broadcast.draft', label: 'Draft broadcasts', group: 'Messaging' },
  { key: 'broadcast.submit', label: 'Submit broadcasts', group: 'Messaging' },
  { key: 'broadcast.send', label: 'Send broadcasts', group: 'Messaging' },
  { key: 'broadcast.select_recipients', label: 'Select recipients', group: 'Messaging' },
  { key: 'broadcast.approve', label: 'Approve broadcasts', group: 'Messaging' },
  { key: 'report.view', label: 'View reports', group: 'Records' },
  { key: 'credit.allocate', label: 'Allocate credits', group: 'Credits' },
  { key: 'credit.purchase', label: 'Purchase credits', group: 'Credits' },
];

function SelectionField({ label, value, placeholder, onPress }: SelectionFieldProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value?.label ?? placeholder}`}
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3 rounded-lg border border-input bg-muted/40 px-4 active:opacity-70"
    >
      <View className="flex-1 gap-0.5">
        <Text
          className={cn(
            'font-sans-medium text-base',
            value ? 'text-foreground' : 'text-muted-foreground',
          )}
          numberOfLines={1}
        >
          {value?.label ?? placeholder}
        </Text>
        {value?.detail ? <Text variant="caption">{value.detail}</Text> : null}
      </View>
      <ChevronDown size={20} color={theme.mutedForeground} />
    </Pressable>
  );
}

interface SelectionSheetProps {
  title: string;
  options: SelectionOption[];
  selectedId?: string;
  onSelect: (option: SelectionOption) => void;
  onClose: () => void;
}

interface PermissionSheetProps {
  selectedPermissions: Permission[];
  search: string;
  onSearchChange: (value: string) => void;
  onToggle: (permission: Permission) => void;
  onClose: () => void;
}

function SelectionSheet({ title, options, selectedId, onSelect, onClose }: SelectionSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const filteredOptions = query
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(query) ||
          option.detail?.toLowerCase().includes(query),
      )
    : options;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-backdrop/60">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close selection"
          onPress={onClose}
          className="flex-1"
        />
        <View
          className="max-h-[75%] rounded-t-3xl bg-background px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text variant="heading">{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close selection"
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full bg-muted"
            >
              <X size={20} color={theme.foreground} />
            </Pressable>
          </View>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${title.toLowerCase()}`}
          />
          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedId;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel={item.detail ? `${item.label}, ${item.detail}` : item.label}
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => onSelect(item)}
                  className="flex-row items-center gap-3 border-b border-border py-4 active:opacity-60"
                >
                  <View className="flex-1 gap-0.5">
                    <Text className="font-sans-semibold text-base text-foreground">
                      {item.label}
                    </Text>
                    {item.detail ? <Text variant="caption">{item.detail}</Text> : null}
                  </View>
                  {isSelected ? <Check size={20} color={theme.accentEmphasis} /> : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text variant="bodyMuted" className="py-12 text-center">
                No matches found.
              </Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

function PermissionSheet({
  selectedPermissions,
  search,
  onSearchChange,
  onToggle,
  onClose,
}: PermissionSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const query = search.trim().toLowerCase();
  const options = query
    ? PERMISSIONS.filter(
        (permission) =>
          permission.label.toLowerCase().includes(query) ||
          permission.group.toLowerCase().includes(query) ||
          permission.key.includes(query),
      )
    : PERMISSIONS;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-backdrop/60">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close permissions"
          onPress={onClose}
          className="flex-1"
        />
        <View
          className="max-h-[80%] rounded-t-3xl bg-background px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="gap-0.5">
              <Text variant="heading">Choose permissions</Text>
              <Text variant="caption">{selectedPermissions.length} selected</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close permissions"
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full bg-muted"
            >
              <X size={20} color={theme.foreground} />
            </Pressable>
          </View>

          <SearchField
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search permissions"
          />

          <FlatList
            data={options}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => {
              const isSelected = selectedPermissions.includes(item.key);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={item.label}
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => onToggle(item.key)}
                  className="flex-row items-center gap-3 border-b border-border py-3.5 active:opacity-60"
                >
                  <View
                    className={cn(
                      'h-6 w-6 items-center justify-center rounded-md border',
                      isSelected ? 'border-primary bg-primary' : 'border-input bg-transparent',
                    )}
                  >
                    {isSelected ? <Check size={16} color={theme.primaryForeground} /> : null}
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="font-sans-medium text-base text-foreground">{item.label}</Text>
                    <Text variant="caption">{item.group}</Text>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text variant="bodyMuted" className="py-12 text-center">
                No permissions match your search.
              </Text>
            }
          />

          <Button label="Done" variant="primary" fullWidth className="mt-4" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

export function NewExecutiveScreen() {
  const canManage = useHasPermission('appointment.manage');
  const [member, setMember] = useState<SelectionOption>();
  const [position, setPosition] = useState<SelectionOption>();
  const [unit, setUnit] = useState<SelectionOption>();
  const [selectionKind, setSelectionKind] = useState<SelectionKind>();
  const [isPermissionSheetOpen, setIsPermissionSheetOpen] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);

  const selectionConfig = selectionKind
    ? {
        member: { title: 'Select member', options: MEMBERS, value: member },
        position: { title: 'Select position', options: POSITIONS, value: position },
        unit: { title: 'Select unit', options: UNITS, value: unit },
      }[selectionKind]
    : null;

  const selectOption = (option: SelectionOption) => {
    if (selectionKind === 'member') setMember(option);
    if (selectionKind === 'position') setPosition(option);
    if (selectionKind === 'unit') setUnit(option);
    setSelectionKind(undefined);
  };

  const togglePermission = (permission: Permission) => {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  };

  const isReady = Boolean(canManage && member && position && unit);

  return (
    <PageScreen
      title="Appoint executive"
      backIcon={X}
      backLabel="Close appointment"
      actions={
        <Button
          label="Review appointment"
          variant="accent"
          size="lg"
          fullWidth
          disabled={!isReady}
          onPress={() => notify.info('Appointment review is ready for API wiring')}
        />
      }
    >
      <Text variant="bodyMuted" className="mt-0">
        Select a member, position, unit and the responsibilities for this appointment.
      </Text>

      <View className="mt-6 gap-3">
        <SelectionField
          label="Member"
          value={member}
          placeholder="Select an existing member"
          onPress={() => setSelectionKind('member')}
        />
        <SelectionField
          label="Position"
          value={position}
          placeholder="Select a configured position"
          onPress={() => setSelectionKind('position')}
        />
        <SelectionField
          label="Unit"
          value={unit}
          placeholder="Select an organisation unit"
          onPress={() => setSelectionKind('unit')}
        />
      </View>

      <View className="mt-8 gap-1">
        <Text variant="overline">Permissions</Text>
        <Text variant="caption">Select the responsibilities this appointment should have.</Text>
        <SelectionField
          label="Responsibilities"
          value={
            selectedPermissions.length
              ? {
                  id: 'permissions',
                  label: `${selectedPermissions.length} selected`,
                  detail: 'Tap to review or change',
                }
              : undefined
          }
          placeholder="Choose responsibilities"
          onPress={() => setIsPermissionSheetOpen(true)}
        />
      </View>

      {selectionConfig ? (
        <SelectionSheet
          title={selectionConfig.title}
          options={selectionConfig.options}
          selectedId={selectionConfig.value?.id}
          onSelect={selectOption}
          onClose={() => setSelectionKind(undefined)}
        />
      ) : null}
      {isPermissionSheetOpen ? (
        <PermissionSheet
          selectedPermissions={selectedPermissions}
          search={permissionSearch}
          onSearchChange={setPermissionSearch}
          onToggle={togglePermission}
          onClose={() => setIsPermissionSheetOpen(false)}
        />
      ) : null}
    </PageScreen>
  );
}
