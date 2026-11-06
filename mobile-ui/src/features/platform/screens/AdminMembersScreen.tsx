import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/features/auth';
import { MembersScreen } from '@/features/members';

// One organisation's members for the platform admin: the organisation's own Members screen and
// member details, scoped to it by X-Organisation-Id while this screen is open.
export function AdminMembersScreen() {
  const { organisationId } = useLocalSearchParams<{ organisationId: string }>();
  const viewOrganisation = useAuthStore((state) => state.viewOrganisation);
  // Nothing loads until requests carry this organisation, so no other data can show first.
  const isReady = useAuthStore((state) => state.viewingOrganisationId === organisationId);

  useEffect(() => {
    viewOrganisation(organisationId);
    return () => viewOrganisation(null);
  }, [organisationId, viewOrganisation]);

  if (!isReady) return null;

  return (
    <MembersScreen
      isTabRoot={false}
      onOpenExecutive={(member) =>
        router.push({
          pathname: '/admin/organisations/executive',
          params: { organisationId, memberId: member.id },
        })
      }
    />
  );
}
