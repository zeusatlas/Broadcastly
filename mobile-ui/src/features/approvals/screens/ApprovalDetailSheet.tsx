import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet, Button, ConfirmDialog, QueryState, Text, TextField } from '@/components/ui';
import { notify } from '@/lib/notify';
import { cn, formatDateTime } from '@/utils/helpers';

import { ApprovalCard } from '../components/ApprovalCard';
import {
  useApproveBroadcastMutation,
  useReadApprovalQuery,
  useRejectBroadcastMutation,
} from '../hooks/use_approvals';
import type { ApprovalDetailResponse } from '../types';

interface ApprovalDetailSheetProps {
  broadcastId: string | null;
  onClose: () => void;
  // Called after an approve or reject succeeds, so the list behind the sheet can reload.
  onDecided: () => void;
}

export function ApprovalDetailSheet({ broadcastId, onClose, onDecided }: ApprovalDetailSheetProps) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const detail = useReadApprovalQuery(broadcastId);
  const approve = useApproveBroadcastMutation();
  const reject = useRejectBroadcastMutation();

  const close = () => {
    setIsRejecting(false);
    setIsConfirming(false);
    setReason('');
    approve.reset();
    reject.reset();
    onClose();
  };

  const confirmApprove = async () => {
    if (!broadcastId) return;
    const response = await approve.mutate({ broadcastId, credentials: {} });
    setIsConfirming(false);
    if (!response) return;
    close();
    onDecided();
    notify.success(
      'Broadcast approved',
      response.data.status === 'scheduled'
        ? 'It will be sent at the scheduled time.'
        : 'It is being sent now.',
    );
  };

  const submitReject = async () => {
    if (!broadcastId) return;
    const response = await reject.mutate({ broadcastId, credentials: { reason: reason.trim() } });
    if (!response) return;
    close();
    onDecided();
    notify.success('Broadcast rejected', 'It has gone back to the sender as a draft.');
  };

  if (!broadcastId) return null;

  const data = detail.data;
  const title = data ? (data.broadcast.title ?? 'Untitled broadcast') : 'Approval request';
  const reasonError = reject.error
    ? (reject.error.fieldError('reason') ?? reject.error.message)
    : undefined;

  const canDecide = Boolean(data?.canDecide);

  return (
    <BottomSheet
      isVisible
      onClose={close}
      title={isRejecting ? 'Reject broadcast' : title}
      description={isRejecting ? 'Tell the sender what needs to change.' : 'Approval request'}
      closeLabel="Close approval details"
      footer={
        !data ? undefined : isRejecting ? (
          <>
            <Button
              label="Reject broadcast"
              variant="destructive"
              size="lg"
              fullWidth
              disabled={!reason.trim()}
              isLoading={reject.isPending}
              loadingLabel="Rejecting…"
              onPress={submitReject}
            />
            <Button
              label="Cancel"
              variant="ghost"
              size="lg"
              fullWidth
              disabled={reject.isPending}
              onPress={() => {
                reject.reset();
                setIsRejecting(false);
              }}
            />
          </>
        ) : canDecide ? (
          <>
            <View className="flex-row gap-3">
              <Button
                label="Reject"
                variant="outline"
                size="lg"
                className="flex-1"
                onPress={() => setIsRejecting(true)}
              />
              <Button
                label="Approve"
                variant="accent"
                size="lg"
                className="flex-1"
                onPress={() => setIsConfirming(true)}
              />
            </View>
            {approve.error ? (
              <Text className="text-center font-sans-medium text-sm text-destructive">
                {approve.error.message}
              </Text>
            ) : null}
          </>
        ) : undefined
      }
    >
      {!data ? (
        <QueryState
          isLoading={detail.isLoading}
          error={detail.error}
          isEmpty={false}
          emptyText=""
          onRetry={detail.refetch}
        />
      ) : isRejecting ? (
        <TextField
          label="Reason"
          value={reason}
          onChangeText={setReason}
          placeholder="Explain what should be changed"
          multiline
          numberOfLines={4}
          error={reasonError}
        />
      ) : (
        <ApprovalDetail detail={data} />
      )}

      {data ? (
        <ConfirmDialog
          isVisible={isConfirming}
          title="Approve this broadcast?"
          message={`${data.broadcast.recipientCount.toLocaleString()} recipients will receive it and ${data.broadcast.estimatedCredits.toLocaleString()} credits will be used.`}
          confirmLabel="Approve and send"
          confirmingLabel="Approving…"
          confirmVariant="accent"
          isConfirming={approve.isPending}
          onConfirm={confirmApprove}
          onCancel={() => setIsConfirming(false)}
        />
      ) : null}
    </BottomSheet>
  );
}

interface ApprovalDetailProps {
  detail: ApprovalDetailResponse;
}

function ApprovalDetail({ detail }: ApprovalDetailProps) {
  const { broadcast, decisions, walletAvailable } = detail;
  const submittedAt = broadcast.submittedAt ?? broadcast.createdAt;

  return (
    <View className="gap-6 pb-2">
      <ApprovalCard
        recipients={broadcast.recipientCount}
        segments={broadcast.segmentCount}
        credits={broadcast.estimatedCredits}
        walletAvailable={walletAvailable}
      />

      <View className="gap-1">
        <Text variant="overline">Audience</Text>
        <Text variant="body">{broadcast.audienceSummary ?? 'Audience not set'}</Text>
      </View>

      <View className="gap-2">
        <Text variant="overline">Message</Text>
        <Text variant="body" className="leading-6">
          {broadcast.message}
        </Text>
      </View>

      {decisions.length > 0 ? (
        <View className="gap-1">
          <Text variant="overline">Decisions</Text>
          {decisions.map((item, index) => (
            <View
              key={`${item.decidedAt}-${index}`}
              className={cn(
                'gap-0.5 py-2',
                index < decisions.length - 1 && 'border-b border-border',
              )}
            >
              <Text className="font-sans-semibold text-sm text-foreground">
                {item.decision === 'approved' ? 'Approved' : 'Rejected'} by {item.decidedBy}
              </Text>
              {item.reason ? <Text variant="caption">{item.reason}</Text> : null}
              <Text variant="caption">{formatDateTime(item.decidedAt)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text variant="caption">
        {broadcast.createdBy ? `Submitted by ${broadcast.createdBy} · ` : ''}
        {formatDateTime(submittedAt)}
      </Text>
    </View>
  );
}
