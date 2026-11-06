import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, LoadingState, Text, TextField } from '@/components/ui';
import { notify } from '@/lib/notify';

import { DescriptionField } from '../components/DescriptionField';

import { useReadOrganisationQuery, useUpdateOrganisationMutation } from '../hooks/use_platform_api';
import { DESCRIPTION_MAX_WORDS, wordCount } from '../utils/organisation_types';

const SUGGESTED_TITLES = ['Head', 'Director', 'Manager', 'President', 'Leader', 'Coordinator'];

// Rename an organisation and choose what it calls its head (the office stays the same).
export function EditOrganisationScreen() {
  const { organisationId } = useLocalSearchParams<{ organisationId: string }>();
  const details = useReadOrganisationQuery(organisationId);
  const update = useUpdateOrganisationMutation();
  const [name, setName] = useState<string | null>(null);
  const [headTitle, setHeadTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const organisation = details.data;

  if (!organisation) {
    return (
      <PageScreen title="Edit organisation" backIcon={X} backLabel="Close">
        <LoadingState label="Loading organisation" />
      </PageScreen>
    );
  }

  const nextName = (name ?? organisation.name).trim();
  const nextTitle = (headTitle ?? organisation.headTitle).trim();
  const nextDescription = (description ?? organisation.description ?? '').trim() || null;
  const isChanged =
    nextName !== organisation.name ||
    nextTitle !== organisation.headTitle ||
    nextDescription !== organisation.description;
  const isReady =
    isChanged &&
    nextName.length >= 2 &&
    nextTitle.length >= 2 &&
    wordCount(nextDescription ?? '') <= DESCRIPTION_MAX_WORDS;

  const submit = async () => {
    const response = await update.mutate({
      uuid: organisation.id,
      credentials: {
        ...(nextName !== organisation.name ? { name: nextName } : {}),
        ...(nextTitle !== organisation.headTitle ? { headTitle: nextTitle } : {}),
        ...(nextDescription !== organisation.description ? { description: nextDescription } : {}),
      },
    });
    if (!response) return;
    router.back();
    notify.success('Organisation updated', response.data.name);
  };

  return (
    <PageScreen
      title="Edit organisation"
      backIcon={X}
      backLabel="Close"
      actions={
        <>
          <Button
            label="Save changes"
            variant="accent"
            size="lg"
            fullWidth
            disabled={!isReady}
            isLoading={update.isPending}
            loadingLabel="Saving…"
            onPress={submit}
          />
          {update.error && Object.keys(update.error.fieldErrors ?? {}).length === 0 ? (
            <Text className="text-center font-sans text-sm text-destructive">
              {update.error.message}
            </Text>
          ) : null}
        </>
      }
    >
      <View className="gap-5">
        <TextField
          label="Name"
          value={name ?? organisation.name}
          onChangeText={setName}
          autoCapitalize="words"
          error={update.error?.fieldError('name')}
        />
        <View className="gap-2">
          <TextField
            label="What they call their head"
            value={headTitle ?? organisation.headTitle}
            onChangeText={setHeadTitle}
            autoCapitalize="words"
            placeholder="e.g. Head, Director"
            error={update.error?.fieldError('headTitle')}
          />
          <Text variant="caption">
            Shown to everyone in this organisation. Common choices: {SUGGESTED_TITLES.join(', ')}.
          </Text>
        </View>
        <DescriptionField
          value={description ?? organisation.description ?? ''}
          onChangeText={setDescription}
          error={update.error?.fieldError('description')}
        />
      </View>
    </PageScreen>
  );
}
