import { router } from 'expo-router';

import { notify } from '@/lib/notify';
import { normaliseGhanaPhone } from '@/utils/helpers';

import { EMPTY_MEMBER_FORM, MemberFormScreen } from '../components/MemberFormScreen';
import { useCreateMemberMutation } from '../hooks/use_members';

export function NewMemberScreen() {
  const createMember = useCreateMemberMutation();

  return (
    <MemberFormScreen
      title="Add member"
      initialValues={EMPTY_MEMBER_FORM}
      submitLabel="Add member"
      loadingLabel="Adding member…"
      isPending={createMember.isPending}
      error={createMember.error}
      onSubmit={async (values) => {
        const response = await createMember.mutate({
          firstName: values.firstName.trim(),
          middleName: values.middleName.trim() || undefined,
          lastName: values.lastName.trim(),
          partyId: values.partyId.trim() || undefined,
          phone: values.phone.trim() ? (normaliseGhanaPhone(values.phone) ?? undefined) : undefined,
          dateOfBirth: values.dateOfBirth.trim() || undefined,
          unitId: values.unit?.id,
        });
        if (!response) return;
        notify.success('Member added', 'The member is now in your organisation directory.');
        router.back();
      }}
    />
  );
}
