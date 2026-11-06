import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, SelectField, Text, TextField } from '@/components/ui';
import { notify } from '@/lib/notify';
import { cn } from '@/utils/helpers';

import { DescriptionField } from '../components/DescriptionField';
import { HeadFields, useHeadForm } from '../components/HeadFields';
import { useAppointHeadMutation, useCreateOrganisationMutation } from '../hooks/use_platform_api';
import type { OrganisationResponse } from '../types';
import {
  DESCRIPTION_MAX_WORDS,
  ORGANISATION_TYPE_OPTIONS,
  wordCount,
  type OrganisationType,
} from '../utils/organisation_types';

const STEPS = ['Details', 'Head'];

function StepIndicator({ step }: { step: number }) {
  return (
    <View className="gap-2" accessibilityLabel={`Step ${step + 1} of ${STEPS.length}`}>
      <View className="flex-row gap-2">
        {STEPS.map((label, index) => (
          <View
            key={label}
            className={cn('h-1.5 flex-1 rounded-full', index <= step ? 'bg-primary' : 'bg-muted')}
          />
        ))}
      </View>
      <Text variant="caption">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </Text>
    </View>
  );
}

// Two steps, two endpoints: step 1 creates the organisation, step 2 appoints its head. Skipping
// step 2 leaves it under "No head yet", where its head can be appointed later.
export function NewOrganisationScreen() {
  const create = useCreateOrganisationMutation();
  const appoint = useAppointHeadMutation();
  const head = useHeadForm();
  const [name, setName] = useState('');
  const [type, setType] = useState<OrganisationType | null>(null);
  const [description, setDescription] = useState('');
  const [created, setCreated] = useState<OrganisationResponse | null>(null);
  const isDetailsReady =
    name.trim().length >= 2 && type !== null && wordCount(description) <= DESCRIPTION_MAX_WORDS;
  const shownErrors = ['name', 'type', 'description'];
  const headTitle = created?.headTitle ?? 'Head';

  const createOrganisation = async () => {
    if (!type) return;
    const response = await create.mutate({
      name: name.trim(),
      type,
      description: description.trim() || null,
    });
    if (response) setCreated(response.data);
  };

  const appointHead = async () => {
    if (!created) return;
    const credentials = head.toRequest();
    const response = await appoint.mutate({ uuid: created.id, credentials });
    if (!response) return;
    router.back();
    notify.success(
      `${created.name} is ready`,
      `${credentials.firstName} can now sign in as its ${headTitle.toLowerCase()}.`,
    );
  };

  const skipHead = () => {
    router.back();
    if (created) {
      notify.success(
        'Organisation created',
        `Listed under "No head yet" until you appoint its ${headTitle.toLowerCase()}.`,
      );
    }
  };

  if (created) {
    return (
      <PageScreen
        key="head"
        title={`Appoint ${headTitle.toLowerCase()}`}
        backIcon={X}
        backLabel="Close"
        onBack={skipHead}
        actions={
          <>
            <Button
              label={`Appoint ${headTitle.toLowerCase()}`}
              variant="accent"
              size="lg"
              fullWidth
              disabled={!head.isReady}
              isLoading={appoint.isPending}
              loadingLabel="Appointing…"
              onPress={appointHead}
            />
            <Button label="Skip for now" variant="ghost" fullWidth onPress={skipHead} />
            {appoint.error && Object.keys(appoint.error.fieldErrors ?? {}).length === 0 ? (
              <Text className="text-center font-sans text-sm text-destructive">
                {appoint.error.message}
              </Text>
            ) : null}
          </>
        }
      >
        <StepIndicator step={1} />
        <Text variant="bodyMuted" className="mt-4">
          {created.name} is created. Its {headTitle.toLowerCase()} signs in with this email and
          phone, then sets up its people and messages.
        </Text>
        <View className="mt-6">
          <HeadFields form={head} fieldError={(field) => appoint.error?.fieldError(field)} />
        </View>
      </PageScreen>
    );
  }

  return (
    <PageScreen
      key="details"
      title="New organisation"
      backIcon={X}
      backLabel="Close"
      actions={
        <>
          <Button
            label="Continue"
            variant="accent"
            size="lg"
            fullWidth
            disabled={!isDetailsReady}
            isLoading={create.isPending}
            loadingLabel="Creating…"
            onPress={createOrganisation}
          />
          {create.error && !shownErrors.some((field) => create.error?.fieldError(field)) ? (
            <Text className="text-center font-sans text-sm text-destructive">
              {create.error.message}
            </Text>
          ) : null}
        </>
      }
    >
      <StepIndicator step={0} />
      <Text variant="bodyMuted" className="mt-4">
        Continue creates the organisation. Next you can appoint its head, or skip and do it later.
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
