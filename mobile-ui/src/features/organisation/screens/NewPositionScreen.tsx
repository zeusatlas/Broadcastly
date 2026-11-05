import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';

import { PageScreen } from '@/components/shared';
import { Button, Text, TextField } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { notify } from '@/lib/notify';

import { useCreatePositionMutation } from '../hooks/use_organisation_api';

export function NewPositionScreen() {
  const canManage = useHasPermission('appointment.manage');
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const createPosition = useCreatePositionMutation();

  const submit = async () => {
    const response = await createPosition.mutate({
      title: title.trim(),
      ...(scope.trim() ? { unitType: scope.trim().toLowerCase().replaceAll(' ', '_') } : {}),
    });
    if (!response) return;
    router.back();
    notify.success('Position created.');
  };

  return (
    <PageScreen
      title="New position"
      backIcon={X}
      backLabel="Close new position"
      actions={
        <>
          <Button
            label="Create position"
            variant="accent"
            size="lg"
            fullWidth
            disabled={!canManage || !title.trim()}
            isLoading={createPosition.isPending}
            loadingLabel="Creating position…"
            onPress={submit}
          />
          {createPosition.error ? (
            <Text variant="bodyMuted" className="text-center text-destructive">
              {createPosition.error.message}
            </Text>
          ) : null}
        </>
      }
    >
      <Text variant="bodyMuted" className="mt-0">
        Create a position that can be assigned to an executive. It can apply to the whole
        organisation or a configured unit.
      </Text>
      <TextField
        label="Position title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Operations coordinator"
        autoCapitalize="words"
        className="mt-6"
      />
      <TextField
        label="Scope or unit type (optional)"
        value={scope}
        onChangeText={setScope}
        placeholder="e.g. Organisation-wide, Department or Site"
        autoCapitalize="words"
        className="mt-5"
      />
      <Text variant="caption" className="mt-2">
        Leave this blank when the position is not tied to a specific unit.
      </Text>
    </PageScreen>
  );
}
