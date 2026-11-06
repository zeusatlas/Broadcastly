import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { QueryState } from '@/components/ui';
import { notify } from '@/lib/notify';
import { normaliseGhanaPhone } from '@/utils/helpers';

import { MemberFormScreen, type MemberFormValues } from '../components/MemberFormScreen';
import { useReadMemberQuery, useUpdateMemberMutation } from '../hooks/use_members';
import type { MemberResponse, UpdateMemberRequest } from '../types';

const toFormValues = (member: MemberResponse): MemberFormValues => ({
  firstName: member.firstName,
  middleName: member.middleName ?? '',
  lastName: member.lastName,
  memberNumber: member.memberNumber ?? '',
  phone: member.phone ?? '',
  dateOfBirth: member.dateOfBirth ?? '',
  unit: member.unitId ? { id: member.unitId, name: member.unitName ?? 'Unit' } : null,
});

// Sends only what changed; a cleared optional field becomes null so the server clears it.
function changesOf(member: MemberResponse, values: MemberFormValues): UpdateMemberRequest {
  const optional = (value: string, current: string | null) => {
    const next = value.trim() || null;
    return next === current ? undefined : next;
  };
  const phone = values.phone.trim() ? normaliseGhanaPhone(values.phone) : null;
  return {
    firstName: values.firstName.trim() !== member.firstName ? values.firstName.trim() : undefined,
    lastName: values.lastName.trim() !== member.lastName ? values.lastName.trim() : undefined,
    middleName: optional(values.middleName, member.middleName),
    memberNumber: optional(values.memberNumber, member.memberNumber),
    phone: phone === member.phone ? undefined : phone,
    dateOfBirth: optional(values.dateOfBirth, member.dateOfBirth),
    unitId: values.unit && values.unit.id !== member.unitId ? values.unit.id : undefined,
  };
}

export function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
  const member = useReadMemberQuery(memberId);
  const updateMember = useUpdateMemberMutation();

  if (!member.data) {
    return (
      <PageScreen title="Edit member">
        <View>
          <QueryState
            isLoading={member.isLoading || member.isFetching}
            error={member.error}
            isEmpty={false}
            emptyText=""
            onRetry={member.refetch}
          />
        </View>
      </PageScreen>
    );
  }

  const current = member.data;
  return (
    <MemberFormScreen
      key={current.id}
      title="Edit member"
      initialValues={toFormValues(current)}
      submitLabel="Save changes"
      loadingLabel="Saving…"
      isPending={updateMember.isPending}
      error={updateMember.error}
      onSubmit={async (values) => {
        const changes = changesOf(current, values);
        const changed = Object.fromEntries(
          Object.entries(changes).filter(([, value]) => value !== undefined),
        ) as UpdateMemberRequest;
        if (Object.keys(changed).length === 0) {
          router.back();
          return;
        }
        const response = await updateMember.mutate({ memberId: current.id, credentials: changed });
        if (!response) return;
        notify.success('Member updated');
        router.back();
      }}
    />
  );
}
