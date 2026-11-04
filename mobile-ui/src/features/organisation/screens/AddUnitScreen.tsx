import { X } from 'lucide-react-native';
import { useState } from 'react';

import { PageScreen } from '@/components/shared';
import { Button, Text, TextField } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { notify } from '@/lib/notify';

export function AddUnitScreen() {
  const canManage = useHasPermission('appointment.manage');
  const [name, setName] = useState('');
  const [unitType, setUnitType] = useState('');
  const [parentUnit, setParentUnit] = useState('');

  return (
    <PageScreen
      title="Add unit"
      backIcon={X}
      backLabel="Close add unit"
      actions={
        <Button
          label="Review unit"
          variant="accent"
          size="lg"
          fullWidth
          disabled={!canManage || !name.trim()}
          onPress={() => notify.info('Unit review is ready for API wiring')}
        />
      }
    >
      <Text variant="bodyMuted" className="mt-0">
        Add a configurable unit to the structure you manage. Unit type and parent unit are optional.
      </Text>
      <TextField
        label="Unit name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Customer Support"
        autoCapitalize="words"
        className="mt-6"
      />
      <TextField
        label="Unit type (optional)"
        value={unitType}
        onChangeText={setUnitType}
        placeholder="e.g. Department, Team or Location"
        autoCapitalize="words"
        className="mt-5"
      />
      <TextField
        label="Parent unit (optional)"
        value={parentUnit}
        onChangeText={setParentUnit}
        placeholder="Leave blank for a top-level unit"
        autoCapitalize="words"
        className="mt-5"
      />
    </PageScreen>
  );
}
