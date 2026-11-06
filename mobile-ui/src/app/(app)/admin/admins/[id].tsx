import { useLocalSearchParams } from 'expo-router';

import { AdminScreen } from '@/features/platform';

export default function AdminRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AdminScreen adminId={id} />;
}
