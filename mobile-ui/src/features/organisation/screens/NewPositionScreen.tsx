import { X } from 'lucide-react-native';
import { useState } from 'react';

import { PageScreen } from '@/components/shared';
import { Button, Text, TextField } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { notify } from '@/lib/notify';

export function NewPositionScreen() {
  const canManage = useHasPermission('appointment.manage');
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');

  return (
    <PageScreen
      title="New position"
      backIcon={X}
      backLabel="Close new position"
      actions={
        <Button
          label="Review position"
          variant="accent"
          size="lg"
          fullWidth
          disabled={!canManage || !title.trim()}
          onPress={() => notify.info('Position review is ready for API wiring')}
        />
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
