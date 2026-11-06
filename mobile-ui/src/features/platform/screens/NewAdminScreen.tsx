import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, Text, TextField } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import { notify } from '@/lib/notify';
import type { PlatformPermission } from '@/types/models';

import { PermissionChecklist } from '../components/PermissionChecklist';
import { useCreatePlatformAdminMutation } from '../hooks/use_platform_api';
import { PLATFORM_PERMISSION_OPTIONS } from '../utils/platform_permissions';

export function NewAdminScreen() {
  const held = useCurrentUser()?.permissions ?? [];
  const grantable = PLATFORM_PERMISSION_OPTIONS.map((option) => option.key).filter((key) =>
    held.includes(key),
  );
  const create = useCreatePlatformAdminMutation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [permissions, setPermissions] = useState<PlatformPermission[]>([]);
  const fieldError = (field: string) => create.error?.fieldError(field);
  const isReady = [firstName, lastName, email, phone].every((value) => value.trim());

  const toggle = (permission: PlatformPermission) =>
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );

  const submit = async () => {
    const response = await create.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      permissions,
    });
    if (!response) return;
    router.back();
    notify.success('Admin added.', `${response.data.fullName} can now sign in.`);
  };

  return (
    <PageScreen
      title="Add admin"
      backIcon={X}
      backLabel="Close"
      actions={
        <>
          <Button
            label="Add admin"
            variant="accent"
            size="lg"
            fullWidth
            disabled={!isReady}
            isLoading={create.isPending}
            loadingLabel="Adding…"
            onPress={submit}
          />
          {create.error && Object.keys(create.error.fieldErrors ?? {}).length === 0 ? (
            <Text className="text-center font-sans text-sm text-destructive">
              {create.error.message}
            </Text>
          ) : null}
        </>
      }
    >
      <Text variant="bodyMuted">
        They sign in with this email and phone. Tick only what they need; you can change it later.
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
      </View>
      <Text variant="overline" className="mt-8">
        Permissions
      </Text>
      <Text variant="caption" className="mt-1">
        Everyone can view organisations, executives and admins. You can give only what you hold.
      </Text>
      <PermissionChecklist selected={permissions} grantable={grantable} onToggle={toggle} />
      {fieldError('permissions') ? (
        <Text className="font-sans text-sm text-destructive">{fieldError('permissions')}</Text>
      ) : null}
    </PageScreen>
  );
}
