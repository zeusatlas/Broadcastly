import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, SelectField, Text, TextField } from '@/components/ui';
import { notify } from '@/lib/notify';

import { DescriptionField } from '../components/DescriptionField';
import { useCreateOrganisationMutation } from '../hooks/use_platform_api';
import {
  DESCRIPTION_MAX_WORDS,
  ORGANISATION_TYPE_OPTIONS,
  wordCount,
  type OrganisationType,
} from '../utils/organisation_types';

export function NewOrganisationScreen() {
  const create = useCreateOrganisationMutation();
  const [name, setName] = useState('');
  const [type, setType] = useState<OrganisationType | null>(null);
  const [description, setDescription] = useState('');
  const isReady =
    name.trim().length >= 2 && type !== null && wordCount(description) <= DESCRIPTION_MAX_WORDS;
  const shownErrors = ['name', 'type', 'description'];

  const submit = async () => {
    if (!type) return;
    const response = await create.mutate({
      name: name.trim(),
      type,
      description: description.trim() || null,
    });
    if (!response) return;
    router.back();
    notify.success('Organisation created', 'Open it to appoint its head.');
  };

  return (
    <PageScreen
      title="New organisation"
      backIcon={X}
      backLabel="Close"
      actions={
        <>
          <Button
            label="Create organisation"
            variant="accent"
            size="lg"
            fullWidth
            disabled={!isReady}
            isLoading={create.isPending}
            loadingLabel="Creating…"
            onPress={submit}
          />
          {create.error && !shownErrors.some((field) => create.error?.fieldError(field)) ? (
            <Text className="text-center font-sans text-sm text-destructive">
              {create.error.message}
            </Text>
          ) : null}
        </>
      }
    >
      <Text variant="bodyMuted">
        It starts without a head. Appoint one next; they set up its people and messages.
      </Text>
      <View className="mt-6 gap-5">
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Central Constituency"
          autoCapitalize="words"
          error={create.error?.fieldError('name')}
        />
        <SelectField
          label="Type"
          value={type}
          options={ORGANISATION_TYPE_OPTIONS}
          onChange={setType}
          placeholder="Choose what kind it is"
          sheetTitle="What kind of organisation?"
          error={create.error?.fieldError('type')}
        />
        <DescriptionField
          value={description}
          onChangeText={setDescription}
          error={create.error?.fieldError('description')}
        />
      </View>
    </PageScreen>
  );
}
