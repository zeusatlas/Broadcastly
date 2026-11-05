import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, Chip, Text, TextField } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { UnitPicker, type UnitChoice } from '@/features/members';
import { notify } from '@/lib/notify';

import {
  useCreateUnitMutation,
  useReadOrganisationOverviewQuery,
} from '../hooks/use_organisation_api';

// The API stores types as lowercase words joined by underscores, e.g. polling_station.
function toUnitType(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function AddUnitScreen() {
  const canManage = useHasPermission('appointment.manage');
  const overview = useReadOrganisationOverviewQuery({ enabled: canManage });
  const [name, setName] = useState('');
  const [unitType, setUnitType] = useState('');
  const [parent, setParent] = useState<UnitChoice | null>(null);
  const createUnit = useCreateUnitMutation();
  const knownTypes = (overview.data?.unitsByType ?? []).map((item) => item.type);
  const type = toUnitType(unitType);

  const submit = async () => {
    const response = await createUnit.mutate({
      name: name.trim(),
      type,
      ...(parent ? { parentId: parent.id } : {}),
    });
    if (!response) return;
    router.back();
    notify.success('Unit created.');
  };

  return (
    <PageScreen
      title="Add unit"
      backIcon={X}
      backLabel="Close add unit"
      actions={
        <>
          <Button
            label="Create unit"
            variant="accent"
            size="lg"
            fullWidth
            disabled={!canManage || !name.trim() || !type}
            isLoading={createUnit.isPending}
            loadingLabel="Creating unit…"
            onPress={submit}
          />
          {createUnit.error ? (
            <Text className="text-center font-sans text-sm text-destructive">
              {createUnit.error.message}
            </Text>
          ) : null}
        </>
      }
    >
      <Text variant="bodyMuted" className="mt-0">
        Add a unit to the structure you manage.
      </Text>
      <TextField
        label="Unit name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Asafo Branch"
        autoCapitalize="words"
        error={createUnit.error?.fieldError('name')}
        className="mt-6"
      />
      <View className="mt-5 gap-2">
        <Text className="font-sans-bold text-base text-foreground">Unit type</Text>
        {knownTypes.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {knownTypes.map((item) => (
              <Chip
                key={item}
                label={item.replace(/_/g, ' ')}
                isSelected={item === type}
                onPress={() => setUnitType(item)}
              />
            ))}
          </View>
        ) : null}
        <TextField
          label={knownTypes.length > 0 ? 'Or a new type' : 'Type'}
          value={knownTypes.includes(type) ? '' : unitType}
          onChangeText={setUnitType}
          placeholder="e.g. polling station"
          autoCapitalize="none"
          error={createUnit.error?.fieldError('type')}
        />
      </View>
      <View className="mt-5">
        <UnitPicker
          label="Parent unit"
          value={parent}
          placeholder="None (top-level unit)"
          noneLabel="None (top-level unit)"
          error={createUnit.error?.fieldError('parentId')}
          onChange={setParent}
        />
      </View>
    </PageScreen>
  );
}
