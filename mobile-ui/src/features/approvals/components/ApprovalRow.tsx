import { CheckCheck, ChevronRight, CircleCheck, CircleX } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn, formatDateTime } from '@/utils/helpers';

import type { ApprovalBroadcastResponse } from '../types';

interface ApprovalRowProps {
  approval: ApprovalBroadcastResponse;
  isLast?: boolean;
  onPress: () => void;
}

export function ApprovalRow({ approval, isLast = false, onPress }: ApprovalRowProps) {
  const theme = useTheme();
  const title = approval.title ?? 'Untitled broadcast';
  const decision = approval.latestDecision?.decision;
  const Icon =
    decision === 'approved' ? CircleCheck : decision === 'rejected' ? CircleX : CheckCheck;
  const color =
    decision === 'approved'
      ? theme.success
      : decision === 'rejected'
        ? theme.destructive
        : theme.warning;
  const label =
    decision === 'approved' ? 'Approved' : decision === 'rejected' ? 'Rejected' : 'Review';
  const submittedAt = approval.submittedAt ?? approval.createdAt;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${title}, ${approval.recipientCount} recipients`}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 py-4 active:opacity-60',
        !isLast && 'border-b border-border',
      )}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-muted">
        <Icon size={20} color={color} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {approval.audienceSummary ?? 'Audience not set'} ·{' '}
          {approval.recipientCount.toLocaleString()} recipients
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {approval.createdBy ? `Submitted by ${approval.createdBy} · ` : ''}
          {formatDateTime(submittedAt)}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text className="font-sans-semibold text-xs" style={{ color }}>
          {label}
        </Text>
        <ChevronRight size={18} color={theme.mutedForeground} />
      </View>
    </Pressable>
  );
}
