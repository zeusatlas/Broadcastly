import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, Text, TextField } from '@/components/ui';
import { notify } from '@/lib/notify';

import { useAppointHeadMutation } from '../hooks/use_platform_api';

interface AppointHeadScreenProps {
  organisationId: string;
  headTitle: string;
}

// The only way an organisation gets its head; a matching member ID promotes that member instead.
export function AppointHeadScreen({ organisationId, headTitle }: AppointHeadScreenProps) {
  const appoint = useAppointHeadMutation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [memberNumber, setPartyId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const title = headTitle.toLowerCase();
  const fieldError = (field: string) => appoint.error?.fieldError(field);
  const isReady = [firstName, lastName, email, phone, dateOfBirth].every((value) => value.trim());

  const submit = async () => {
    const response = await appoint.mutate({
      uuid: organisationId,
      credentials: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        memberNumber: memberNumber.trim() || undefined,
        email: email.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth.trim(),
      },
    });
    if (!response) return;
    router.back();
    notify.success(`${headTitle} appointed.`, `${firstName.trim()} can now sign in on the app.`);
  };

  return (
    <PageScreen
      title={`Appoint ${title}`}
      backIcon={X}
      backLabel="Close"
      actions={
        <>
          <Button
            label={`Appoint ${title}`}
            variant="accent"
            size="lg"
            fullWidth
            disabled={!isReady}
            isLoading={appoint.isPending}
            loadingLabel="Appointing…"
            onPress={submit}
          />
          {appoint.error && Object.keys(appoint.error.fieldErrors ?? {}).length === 0 ? (
            <Text className="text-center font-sans text-sm text-destructive">
              {appoint.error.message}
            </Text>
          ) : null}
        </>
      }
    >
      <Text variant="bodyMuted">
        They sign in with this email and phone. If the member ID matches a member of this
        organisation, that member is promoted.
      </Text>
      <View className="mt-6 gap-5">
        <TextField
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          error={fieldError('firstName')}
        />
        <TextField
          label="Last name"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          error={fieldError('lastName')}
        />
        <TextField
          label="Member ID (optional)"
          value={memberNumber}
          onChangeText={setPartyId}
          autoCapitalize="characters"
          error={fieldError('memberNumber')}
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={fieldError('email')}
        />
        <TextField
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. 024 123 4567"
          keyboardType="phone-pad"
          error={fieldError('phone')}
        />
        <TextField
          label="Date of birth"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          error={fieldError('dateOfBirth')}
        />
      </View>
    </PageScreen>
  );
}
