import { router, useLocalSearchParams } from 'expo-router';

import { MemberDetailSheet } from '@/features/members';

// A link to one member opens the same sheet as tapping them in the list.
export default function MemberDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <MemberDetailSheet memberId={id ?? null} onClose={() => router.back()} />;
}
