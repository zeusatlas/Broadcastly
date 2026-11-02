import { useRef, useState, type ComponentRef } from 'react';
import { View, type TextInput } from 'react-native';

import { Button, TextField } from '@/components/ui';
import { notify } from '@/lib/notify';
import { haptics } from '@/utils/haptics';
import { normaliseGhanaPhone } from '@/utils/helpers';

import { useAuthError, useIsAuthSubmitting } from '../hooks/use_session';
import { useAuthStore } from '../store/auth_store';

interface LocalErrors {
  email?: string;
  phone?: string;
}

// Mirrors the backend schema so obvious mistakes cost no round trip or lockout attempt.
// Success needs no navigation here: SignInScreen moves on once a code is pending.
function validate(email: string, phone: string): LocalErrors {
  const errors: LocalErrors = {};
  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!phone.trim()) errors.phone = 'Enter your phone number.';
  else if (!normaliseGhanaPhone(phone)) errors.phone = 'Enter a valid Ghanaian phone number.';

  return errors;
}

export function SignInForm() {
  const requestCode = useAuthStore((s) => s.requestCode);
  const clearError = useAuthStore((s) => s.clearError);
  const serverError = useAuthError();
  const isSubmitting = useIsAuthSubmitting();
  const phoneRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [localErrors, setLocalErrors] = useState<LocalErrors>({});

  const fieldError = (field: keyof LocalErrors) =>
    localErrors[field] ?? serverError?.fieldError(field);

  const edit = (setter: (value: string) => void, field: keyof LocalErrors) => (value: string) => {
    setter(value);
    if (localErrors[field]) setLocalErrors((current) => ({ ...current, [field]: undefined }));
    if (serverError) clearError();
  };

  const submit = async () => {
    const errors = validate(email, phone);
    setLocalErrors(errors);
    if (errors.email || errors.phone) {
      haptics.error();
      return;
    }

    const isSent = await requestCode({
      email: email.trim(),
      phone: normaliseGhanaPhone(phone) ?? phone.trim(),
    });
    if (isSent) return;

    // Field problems show under their field; anything else (wrong details, lockout, offline) as a
    // toast. Success is announced on the verify screen: a sent code is not yet a sign-in.
    const error = useAuthStore.getState().error;
    if (error?.kind === 'validation') haptics.error();
    else if (error) notify.apiError(error);
  };

  return (
    <View className="gap-4">
      <TextField
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={edit(setEmail, 'email')}
        error={fieldError('email')}
        editable={!isSubmitting}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => phoneRef.current?.focus()}
      />
      <TextField
        ref={phoneRef}
        label="Phone number"
        placeholder="024 123 4567"
        value={phone}
        onChangeText={edit(setPhone, 'phone')}
        error={fieldError('phone')}
        editable={!isSubmitting}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Button
        label="Continue"
        size="lg"
        fullWidth
        isLoading={isSubmitting}
        loadingLabel="Sending code…"
        onPress={submit}
        className="mt-2"
      />
    </View>
  );
}
