import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, Text, TextField } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import type { ApiError } from '@/lib/api';
import { normaliseGhanaPhone } from '@/utils/helpers';

import { UnitPicker, type UnitChoice } from './UnitPicker';

export interface MemberFormValues {
  firstName: string;
  middleName: string;
  lastName: string;
  memberNumber: string;
  phone: string;
  dateOfBirth: string;
  unit: UnitChoice | null;
}

export const EMPTY_MEMBER_FORM: MemberFormValues = {
  firstName: '',
  middleName: '',
  lastName: '',
  memberNumber: '',
  phone: '',
  dateOfBirth: '',
  unit: null,
};

interface MemberFormScreenProps {
  title: string;
  initialValues: MemberFormValues;
  submitLabel: string;
  loadingLabel: string;
  isPending: boolean;
  error: ApiError | null;
  onSubmit: (values: MemberFormValues) => void;
}

// One form for adding and editing a member. Server field errors appear under their inputs.
export function MemberFormScreen({
  title,
  initialValues,
  submitLabel,
  loadingLabel,
  isPending,
  error,
  onSubmit,
}: MemberFormScreenProps) {
  const user = useCurrentUser();
  // An appointment without a unit covers the whole organisation; anyone else must place the member.
  const isOrganisationWide = user?.appointments.some((appointment) => !appointment.unitId) ?? false;
  const [values, setValues] = useState(initialValues);
  const set = (field: keyof MemberFormValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const phoneIsValid = !values.phone.trim() || normaliseGhanaPhone(values.phone) !== null;
  const canSubmit = Boolean(
    values.firstName.trim() &&
    values.lastName.trim() &&
    phoneIsValid &&
    (values.unit || isOrganisationWide),
  );
  const fieldError = (field: string) => error?.fieldError(field);
  const hasFieldErrors = Object.keys(error?.fieldErrors ?? {}).length > 0;

  return (
    <PageScreen
      title={title}
      actions={
        <>
          <Button
            label={submitLabel}
            variant="accent"
            size="lg"
            fullWidth
            disabled={!canSubmit}
            isLoading={isPending}
            loadingLabel={loadingLabel}
            onPress={() => canSubmit && onSubmit(values)}
          />
          {error && !hasFieldErrors ? (
            <Text variant="bodyMuted" className="text-center text-destructive">
              {error.message}
            </Text>
          ) : null}
        </>
      }
    >
      <View className="gap-4">
        <TextField
          label="First name"
          value={values.firstName}
          onChangeText={set('firstName')}
          autoCapitalize="words"
          error={fieldError('firstName')}
        />
        <TextField
          label="Middle name"
          value={values.middleName}
          onChangeText={set('middleName')}
          autoCapitalize="words"
          error={fieldError('middleName')}
        />
        <TextField
          label="Last name"
          value={values.lastName}
          onChangeText={set('lastName')}
          autoCapitalize="words"
          error={fieldError('lastName')}
        />
        <TextField
          label="Member ID"
          value={values.memberNumber}
          onChangeText={set('memberNumber')}
          autoCapitalize="characters"
          error={fieldError('memberNumber')}
        />
        <TextField
          label="Phone number"
          value={values.phone}
          onChangeText={set('phone')}
          keyboardType="phone-pad"
          error={
            values.phone && !phoneIsValid
              ? 'Enter a valid Ghanaian phone number.'
              : fieldError('phone')
          }
        />
        <TextField
          label="Date of birth"
          value={values.dateOfBirth}
          onChangeText={set('dateOfBirth')}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          error={fieldError('dateOfBirth')}
        />
        <UnitPicker
          label="Unit"
          value={values.unit}
          placeholder={isOrganisationWide ? 'No unit (optional)' : 'Choose the member’s unit'}
          noneLabel={isOrganisationWide && !initialValues.unit ? 'No unit' : undefined}
          error={fieldError('unitId')}
          onChange={(unit) => setValues((current) => ({ ...current, unit }))}
        />
      </View>
    </PageScreen>
  );
}
