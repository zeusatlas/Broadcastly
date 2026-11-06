import { router, type Href } from 'expo-router';
import { IdCard, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, type ColorValue } from 'react-native';

import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  ConfirmDialog,
  QueryState,
  Text,
} from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import { cn } from '@/utils/helpers';

import {
  useDeactivateMemberMutation,
  useReactivateMemberMutation,
  useReadMemberQuery,
} from '../hooks/use_members';
import type { MemberResponse } from '../types';

interface MemberDetailSheetProps {
  memberId: string | null;
  onClose: () => void;
  // Called after a change, so the list behind the sheet can reload.
  onChanged?: () => void;
  // The platform admin opens the executive account (access, credits) from here.
  onOpenExecutive?: (member: MemberResponse) => void;
}

function DetailRow({
  icon: Icon,
  label,
  value,
  color,
  isLast = false,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  color: ColorValue;
  isLast?: boolean;
}) {
  return (
    <View className={cn('flex-row items-center gap-3 py-3.5', !isLast && 'border-b border-border')}>
      <Icon size={19} color={color} />
      <View className="flex-1 gap-0.5">
        <Text variant="caption">{label}</Text>
        <Text variant="label">{value}</Text>
      </View>
    </View>
  );
}

export function MemberDetailSheet({
  memberId,
  onClose,
  onChanged,
  onOpenExecutive,
}: MemberDetailSheetProps) {
  const theme = useTheme();
  const canManage = useHasPermission('member.manage');
  const member = useReadMemberQuery(memberId ?? '');
  const deactivate = useDeactivateMemberMutation();
  const reactivate = useReactivateMemberMutation();
  const [isConfirming, setIsConfirming] = useState(false);
  const statusError = deactivate.error ?? reactivate.error;

  // A refused change (e.g. 409: the member is an executive) is explained, not treated as a crash.
  useEffect(() => {
    if (!statusError) return;
    if (statusError.kind === 'conflict') notify.warning(statusError.message);
    else notify.apiError(statusError);
  }, [statusError]);

  if (!memberId) return null;
  const data = member.data;
  const isActive = data?.status === 'active';
  const statusChange = isActive ? deactivate : reactivate;

  const changeStatus = async () => {
    if (!data) return;
    const response = await statusChange.mutate({ memberId: data.id });
    setIsConfirming(false);
    if (!response) return;
    notify.success(isActive ? 'Member deactivated' : 'Member reactivated');
    member.refetch();
    onChanged?.();
  };

  return (
    <BottomSheet
      isVisible
      onClose={onClose}
      title={data?.fullName ?? 'Member'}
      description={data ? (data.isExecutive ? 'Executive' : 'Member') : undefined}
      closeLabel="Close member details"
      footer={
        data && (canManage || (data.isExecutive && onOpenExecutive)) ? (
          <>
            {data.isExecutive && onOpenExecutive ? (
              <Button
                label="Executive account"
                variant="outline"
                fullWidth
                onPress={() => {
                  onClose();
                  onOpenExecutive(data);
                }}
              />
            ) : null}
            {canManage ? (
              <>
                <Button
                  label="Edit details"
                  variant="outline"
                  fullWidth
                  onPress={() => {
                    onClose();
                    router.push(`/members/edit/${data.id}` as Href);
                  }}
                />
                <Button
                  label={isActive ? 'Deactivate member' : 'Reactivate member'}
                  variant={isActive ? 'ghost' : 'primary'}
                  fullWidth
                  onPress={() => setIsConfirming(true)}
                />
              </>
            ) : null}
          </>
        ) : undefined
      }
    >
      {!data ? (
        <QueryState
          isLoading={member.isLoading || member.isFetching}
          error={member.error}
          isEmpty={false}
          emptyText=""
          onRetry={member.refetch}
        />
      ) : (
        <>
          <View className="flex-row items-center gap-3">
            <Avatar name={data.fullName} />
            <Badge
              label={isActive ? 'Active' : 'Inactive'}
              tone={isActive ? 'success' : 'neutral'}
              variant="subtle"
            />
          </View>
          <View className="mt-4 border-t border-border">
            <DetailRow
              icon={MapPin}
              label="Unit"
              value={data.unitName ?? 'No unit'}
              color={theme.mutedForeground}
            />
            <DetailRow
              icon={IdCard}
              label="Member ID"
              value={data.memberNumber ?? 'Not recorded'}
              color={theme.mutedForeground}
            />
            <DetailRow
              icon={Phone}
              label="Phone"
              value={data.phone ?? 'Not recorded'}
              color={theme.mutedForeground}
            />
            {data.isExecutive && data.email ? (
              <DetailRow
                icon={Mail}
                label="Email (signs in with)"
                value={data.email}
                color={theme.mutedForeground}
              />
            ) : null}
            <DetailRow
              icon={ShieldCheck}
              label="Broadcasts"
              value={isActive ? 'Receives broadcasts' : 'Not sent: the member is inactive'}
              color={theme.mutedForeground}
              isLast
            />
          </View>
        </>
      )}
      <ConfirmDialog
        isVisible={isConfirming}
        title={isActive ? 'Deactivate this member?' : 'Reactivate this member?'}
        message={
          isActive
            ? 'Broadcasts will stop reaching them. Their record is kept and you can reactivate them later.'
            : 'They will receive broadcasts again.'
        }
        confirmLabel={isActive ? 'Deactivate' : 'Reactivate'}
        confirmingLabel={isActive ? 'Deactivating…' : 'Reactivating…'}
        confirmVariant={isActive ? 'destructive' : 'primary'}
        isConfirming={statusChange.isPending}
        onConfirm={changeStatus}
        onCancel={() => setIsConfirming(false)}
      />
    </BottomSheet>
  );
}
