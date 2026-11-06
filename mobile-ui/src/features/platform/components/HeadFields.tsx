import { useState } from 'react';
import { View } from 'react-native';

import { TextField } from '@/components/ui';

import type { AppointHeadRequest } from '../types';

const EMPTY = {
  firstName: '',
  lastName: '',
  memberNumber: '',
  email: '',
  phone: '',
  dateOfBirth: '',
};

export type HeadForm = ReturnType<typeof useHeadForm>;

// The head's sign-in details, shared by Appoint head and the second step of New organisation.
export function useHeadForm() {
  const [values, setValues] = useState(EMPTY);
  const set = (field: keyof typeof EMPTY) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  const isReady = (['firstName', 'lastName', 'email', 'phone', 'dateOfBirth'] as const).every(
    (field) => values[field].trim(),
  );
  const toRequest = (): AppointHeadRequest => ({
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    memberNumber: values.memberNumber.trim() || undefined,
    email: values.email.trim(),
    phone: values.phone.trim(),
    dateOfBirth: values.dateOfBirth.trim(),
  });
  return { values, set, isReady, toRequest };
}

interface HeadFieldsProps {
  form: HeadForm;
  fieldError: (field: string) => string | undefined;
}

export function HeadFields({ form, fieldError }: HeadFieldsProps) {
  const { values, set } = form;
  return (
    <View className="gap-5">
      <TextField
        label="First name"
        value={values.firstName}
        onChangeText={set('firstName')}
        autoCapitalize="words"
        error={fieldError('firstName')}
      />
      <TextField
        label="Last name"
        value={values.lastName}
        onChangeText={set('lastName')}
        autoCapitalize="words"
        error={fieldError('lastName')}
      />
      <TextField
        label="Member ID (optional)"
        value={values.memberNumber}
        onChangeText={set('memberNumber')}
        autoCapitalize="characters"
        error={fieldError('memberNumber')}
      />
      <TextField
        label="Email"
        value={values.email}
        onChangeText={set('email')}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={fieldError('email')}
      />
      <TextField
        label="Phone"
        value={values.phone}
        onChangeText={set('phone')}
        placeholder="e.g. 024 123 4567"
        keyboardType="phone-pad"
        error={fieldError('phone')}
      />
      <TextField
        label="Date of birth"
        value={values.dateOfBirth}
        onChangeText={set('dateOfBirth')}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        error={fieldError('dateOfBirth')}
      />
    </View>
  );
}
