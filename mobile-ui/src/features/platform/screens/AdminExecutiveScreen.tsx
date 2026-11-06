import { useLocalSearchParams } from 'expo-router';
import { UserX } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  FigureRow,
  LoadingState,
  PageSection,
  Text,
} from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { notify } from '@/lib/notify';
import { formatDateTime } from '@/utils/helpers';

import {
  useReactivateExecutiveMutation,
  useReadOrganisationExecutiveQuery,
  useSuspendExecutiveMutation,
} from '../hooks/use_platform_api';

const STATUS: Record<
  string,
  { label: string; tone: 'success' | 'warning' | 'destructive' | 'neutral' }
> = {
  active: { label: 'Active', tone: 'success' },
  invited: { label: 'Invited', tone: 'warning' },
  suspended: { label: 'Suspended', tone: 'destructive' },
  deactivated: { label: 'Deactivated', tone: 'neutral' },
};

function DetailRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View className={isLast ? 'py-3' : 'border-b border-border py-3'}>
      <Text variant="caption">{label}</Text>
      <Text variant="label">{value}</Text>
    </View>
  );
}

// One executive of one organisation, as the platform admin sees them: no member records, no messages.
export function AdminExecutiveScreen() {
  const { organisationId, executiveId } = useLocalSearchParams<{
    organisationId: string;
    executiveId: string;
  }>();
  const canManage = useHasPermission('platform.executive.manage');
  const query = useReadOrganisationExecutiveQuery(organisationId, executiveId);
  const suspend = useSuspendExecutiveMutation();
  const reactivate = useReactivateExecutiveMutation();
  const [isConfirming, setIsConfirming] = useState(false);
  const executive = query.data;

  if (!executive) {
    return (
      <PageScreen title="Executive">
        {query.isLoading ? (
          <LoadingState label="Loading executive" />
        ) : (
          <EmptyState
            icon={UserX}
            title="Executive not found"
            description={query.error?.message}
            action={
              query.error?.isRetryable ? { label: 'Try again', onPress: query.refetch } : undefined
            }
          />
        )}
      </PageScreen>
    );
  }

  const isActive = executive.status === 'active' || executive.status === 'invited';
  const canChange = canManage && executive.status !== 'deactivated';
  const mutation = isActive ? suspend : reactivate;
  const status = STATUS[executive.status] ?? STATUS.active!;

  const changeStatus = async () => {
    const response = await mutation.mutate({ uuid: organisationId, executiveId });
    setIsConfirming(false);
    if (!response) {
      notify.error('Could not change their access', 'Check your connection and try again.');
      return;
    }
    query.refetch();
    notify.success(isActive ? 'Executive suspended' : 'Executive reactivated', executive.fullName);
  };

  return (
    <PageScreen title={executive.fullName} contentClassName="gap-6">
      <View className="flex-row items-center gap-4">
        <Avatar name={executive.fullName} size="lg" />
        <View className="flex-1 gap-1.5">
          <Text variant="bodyMuted">{executive.positions.join(', ') || 'No position'}</Text>
          <View className="flex-row">
            <Badge label={status.label} tone={status.tone} variant="subtle" />
          </View>
        </View>
      </View>

      <FigureRow figures={[{ label: 'Credits', value: executive.creditBalance }]} />

      <PageSection title="Contact" className="mt-0">
        <View>
          <DetailRow label="Email" value={executive.email} />
          <DetailRow label="Phone" value={executive.phone ?? 'Not recorded'} />
          <DetailRow label="Member ID" value={executive.memberNumber ?? 'Not recorded'} isLast />
        </View>
      </PageSection>

      <PageSection title="Activity">
        <View>
          <DetailRow
            label="Last signed in"
            value={executive.lastSignInAt ? formatDateTime(executive.lastSignInAt) : 'Never'}
          />
          <DetailRow label="Executive since" value={formatDateTime(executive.createdAt)} isLast />
        </View>
      </PageSection>

      {canChange ? (
        <Button
          label={isActive ? 'Suspend access' : 'Reactivate access'}
          variant={isActive ? 'destructive' : 'outline'}
          onPress={() => setIsConfirming(true)}
        />
      ) : null}

      <ConfirmDialog
        isVisible={isConfirming}
        title={isActive ? `Suspend ${executive.fullName}?` : `Reactivate ${executive.fullName}?`}
        message={
          isActive
            ? 'They are signed out at once and cannot sign in until reactivated.'
            : 'They can sign in again with their current appointments.'
        }
        confirmLabel={isActive ? 'Suspend' : 'Reactivate'}
        confirmingLabel="Saving…"
        confirmVariant={isActive ? 'destructive' : 'primary'}
        isConfirming={mutation.isPending}
        onConfirm={changeStatus}
        onCancel={() => setIsConfirming(false)}
      />
    </PageScreen>
  );
}
