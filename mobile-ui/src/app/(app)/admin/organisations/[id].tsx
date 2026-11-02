import { useLocalSearchParams } from 'expo-router';

import { OrganisationScreen } from '@/features/platform';

export default function OrganisationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OrganisationScreen organisationId={id} />;
}
