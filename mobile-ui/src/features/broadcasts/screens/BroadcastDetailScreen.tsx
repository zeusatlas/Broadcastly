import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, ConfirmDialog, FigureRow, PageSection, Skeleton, Text } from '@/components/ui';
import { useCurrentUser, useHasAnyPermission } from '@/features/auth';
import { notify } from '@/lib/notify';

import { BroadcastStatusBadge } from '../components/BroadcastStatusBadge';
import { DeliveryBar } from '../components/DeliveryBar';
import { useCancelBroadcastMutation, useReadBroadcastQuery } from '../hooks/use_broadcasts';
import { useSendBroadcast } from '../hooks/use_send_broadcast';
import { describeSchedule } from '../utils/schedule_presets';
import { toBroadcastDetail } from '../utils/broadcast_mapper';

// Status, message and delivery summary for one broadcast (FR-SMS-12, FR-REP-04).
export function BroadcastDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useReadBroadcastQuery(id ?? '');
  const broadcast = query.data ? toBroadcastDetail(query.data) : null;
  const user = useCurrentUser();
  const canManageOthers = useHasAnyPermission('broadcast.send', 'broadcast.approve');
  const dispatch = useSendBroadcast();
  const cancel = useCancelBroadcastMutation();
  const [isCancelling, setIsCancelling] = useState(false);

  if (query.isLoading) {
    return (
      <PageScreen title="Broadcast">
        <View className="gap-6">
          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </View>
            <Skeleton className="h-5 w-56 rounded-md" />
          </View>
          <PageSection title="Message">
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-4 w-48 rounded-md" />
          </PageSection>
          <PageSection title="Delivery">
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
          </PageSection>
        </View>
      </PageScreen>
    );
  }

  if (query.error || !broadcast) {
    return (
      <PageScreen title="Broadcast">
        <View className="items-center gap-4 py-12">
          <Text variant="bodyMuted" className="text-center">
            {query.error?.message ?? 'Broadcast not found.'}
          </Text>
          {query.error?.isRetryable ? <Button label="Try again" onPress={query.refetch} /> : null}
        </View>
      </PageScreen>
    );
  }

  const raw = query.data!;
  const { recipients, delivered, failed, status } = broadcast;
  const unknown = Math.max(raw.submittedCount - delivered - failed, 0);
  const isMine = raw.createdById === user?.id;
  const isDraft = status === 'draft';
  // The server re-checks all of this; these only decide which buttons to show.
  const canCancel =
    (status === 'draft' || status === 'pending_approval' || status === 'scheduled') &&
    (isMine || canManageOthers);
  const rejection =
    isDraft && raw.latestDecision?.decision === 'rejected' ? raw.latestDecision : null;

  const confirmCancel = async () => {
    const response = await cancel.mutate({ broadcastId: raw.id });
    setIsCancelling(false);
    if (!response) return;
    router.back();
    notify.success(
      'Broadcast cancelled',
      status === 'scheduled' ? 'Its held credits were released.' : undefined,
    );
  };

  const confirmDispatch = async () => {
    const scheduledAt = dispatch.scheduledAt;
    const title = await dispatch.confirm();
    if (!title) return;
    router.back();
    notify.success(title, describeSchedule(scheduledAt));
  };

  const actionError = cancel.error ?? dispatch.error;
  const actions =
    (isDraft && isMine) || canCancel ? (
      <>
        {isDraft && isMine ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label="Edit"
                variant="outline"
                size="lg"
                fullWidth
                onPress={() =>
                  router.push({ pathname: '/broadcasts/new', params: { broadcastId: raw.id } })
                }
              />
            </View>
            {dispatch.canDispatch ? (
              <View className="flex-1">
                <Button
                  label={dispatch.canSend ? 'Send' : 'Submit'}
                  variant="accent"
                  size="lg"
                  fullWidth
                  onPress={() => dispatch.open(raw)}
                />
              </View>
            ) : null}
          </View>
        ) : null}
        {canCancel ? (
          <Button
            label={isDraft ? 'Discard draft' : 'Cancel broadcast'}
            variant="ghost"
            fullWidth
            onPress={() => setIsCancelling(true)}
          />
        ) : null}
        {actionError ? (
          <Text variant="bodyMuted" className="text-center text-destructive">
            {actionError.message}
          </Text>
        ) : null}
      </>
    ) : undefined;
  const hasOutcome = delivered + failed > 0;

  return (
    <PageScreen title={broadcast.title} actions={actions}>
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <BroadcastStatusBadge status={status} />
          <Text variant="caption">{broadcast.sentAt}</Text>
        </View>
        <Text variant="bodyMuted">
          {broadcast.audience} · {recipients.toLocaleString()} recipients
        </Text>
      </View>

      {rejection ? (
        <View className="mt-4 gap-1 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <Text className="font-sans-bold text-foreground">Returned by {rejection.decidedBy}</Text>
          <Text>{rejection.reason ?? 'No reason given.'}</Text>
          <Text variant="caption">Edit the draft, then send it again.</Text>
        </View>
      ) : null}

      <PageSection title="Message">
        <View className="rounded-lg bg-muted/60 p-4">
          <Text className="leading-6">{broadcast.message}</Text>
        </View>
        <Text variant="caption">
          {broadcast.estimatedSegments} SMS segments each ·{' '}
          {broadcast.estimatedCost.toLocaleString()} credits
        </Text>
      </PageSection>

      {hasOutcome ? (
        <PageSection title="Delivery">
          <FigureRow
            figures={[
              { label: 'Delivered', value: delivered },
              { label: 'Failed', value: failed },
              { label: 'Unknown', value: unknown },
            ]}
          />
          <DeliveryBar delivered={delivered} total={recipients} status={status} />
          <Text variant="caption">
            Delivered means the network reached the phone, not that the message was read.
          </Text>
        </PageSection>
      ) : null}

      <ConfirmDialog
        {...dispatch.dialog}
        confirmVariant="accent"
        onConfirm={confirmDispatch}
        onCancel={dispatch.close}
      />
      <ConfirmDialog
        isVisible={isCancelling}
        title={isDraft ? 'Discard this draft?' : 'Cancel this broadcast?'}
        message={
          status === 'scheduled'
            ? 'It will not be sent, and the credits held for it go back to the wallet.'
            : 'It will not be sent. It stays in your history as cancelled.'
        }
        confirmLabel={isDraft ? 'Discard' : 'Cancel broadcast'}
        confirmingLabel="Cancelling…"
        isConfirming={cancel.isPending}
        onConfirm={confirmCancel}
        onCancel={() => setIsCancelling(false)}
      />
    </PageScreen>
  );
}
