import { router, type Href } from 'expo-router';
import { IdCard, MapPin, Phone, ShieldCheck, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Badge, Button, ConfirmDialog, QueryState, Text } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import { cn } from '@/utils/helpers';

import {
  useDeactivateMemberMutation,
  useReactivateMemberMutation,
  useReadMemberQuery,
} from '../hooks/use_members';

interface MemberDetailSheetProps {
  memberId: string | null;
  onClose: () => void;
  // Called after a change, so the list behind the sheet can reload.
  onChanged?: () => void;
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

export function MemberDetailSheet({ memberId, onClose, onChanged }: MemberDetailSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-backdrop/60">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close member details"
          onPress={onClose}
          className="absolute inset-0"
        />
        <View
          className="rounded-t-2xl border border-b-0 border-border bg-card px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="h-1 w-10 rounded-full bg-muted-foreground" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close member details"
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-xl bg-muted"
            >
              <X size={20} color={theme.foreground} />
            </Pressable>
          </View>

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
                <View className="flex-1 gap-1">
                  <Text variant="heading" numberOfLines={2}>
                    {data.fullName}
                  </Text>
                  <Text variant="caption">{data.isExecutive ? 'Executive' : 'Member'}</Text>
                </View>
                <Badge
                  label={isActive ? 'Active' : 'Inactive'}
                  tone={isActive ? 'success' : 'neutral'}
                  variant="subtle"
                />
              </View>

              <View className="mt-5 border-t border-border">
                <DetailRow
                  icon={MapPin}
                  label="Unit"
                  value={data.unitName ?? 'No unit'}
                  color={theme.mutedForeground}
                />
                <DetailRow
                  icon={IdCard}
                  label="Party ID"
                  value={data.partyId ?? 'Not recorded'}
                  color={theme.mutedForeground}
                />
                <DetailRow
                  icon={Phone}
                  label="Phone"
                  value={data.phone ?? 'Not recorded'}
                  color={theme.mutedForeground}
                />
                <DetailRow
                  icon={ShieldCheck}
                  label="Broadcasts"
                  value={isActive ? 'Receives broadcasts' : 'Not sent: the member is inactive'}
                  color={theme.mutedForeground}
                  isLast
                />
              </View>

              {canManage ? (
                <View className="mt-4 gap-2">
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
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>
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
    </Modal>
  );
}
