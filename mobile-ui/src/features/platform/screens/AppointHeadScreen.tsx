import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, Text } from '@/components/ui';
import { notify } from '@/lib/notify';

import { HeadFields, useHeadForm } from '../components/HeadFields';
import { useAppointHeadMutation } from '../hooks/use_platform_api';

interface AppointHeadScreenProps {
  organisationId: string;
  headTitle: string;
}

// Appoints the head of an organisation created without one; a matching member ID promotes that member.
export function AppointHeadScreen({ organisationId, headTitle }: AppointHeadScreenProps) {
  const appoint = useAppointHeadMutation();
  const form = useHeadForm();
  const title = headTitle.toLowerCase();

  const submit = async () => {
    const credentials = form.toRequest();
    const response = await appoint.mutate({ uuid: organisationId, credentials });
    if (!response) return;
    router.back();
    notify.success(
      `${headTitle} appointed.`,
      `${credentials.firstName} can now sign in on the app.`,
    );
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
            disabled={!form.isReady}
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
      <View className="mt-6">
        <HeadFields form={form} fieldError={(field) => appoint.error?.fieldError(field)} />
      </View>
    </PageScreen>
  );
}
