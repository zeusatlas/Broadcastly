import { useLocalSearchParams } from 'expo-router';

import { AppointHeadScreen } from '@/features/platform';

export default function AppointHeadRoute() {
  const { organisationId, headTitle } = useLocalSearchParams<{
    organisationId: string;
    headTitle?: string;
  }>();
  return <AppointHeadScreen organisationId={organisationId} headTitle={headTitle ?? 'Head'} />;
}
