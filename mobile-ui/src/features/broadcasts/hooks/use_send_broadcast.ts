import { useState } from 'react';

import { useHasPermission } from '@/features/auth';
import { createIdempotencyKey } from '@/utils/crypto';

import type { BroadcastApiResponse } from '../types';
import { describeSchedule } from '../utils/schedule_presets';

import { useSendBroadcastMutation, useSubmitBroadcastMutation } from './use_broadcasts';

interface PendingDispatch {
  broadcast: BroadcastApiResponse;
  // Made once when the confirmation opens, so a retried send is the same request (FR-SMS-14).
  idempotencyKey: string;
  scheduledAt: Date | null;
}

// The one confirm-then-dispatch step (NFR-USE-02): senders send or schedule, others submit for approval.
export function useSendBroadcast() {
  const canSend = useHasPermission('broadcast.send');
  const canSubmit = useHasPermission('broadcast.submit');
  const send = useSendBroadcastMutation();
  const submit = useSubmitBroadcastMutation();
  const [pending, setPending] = useState<PendingDispatch | null>(null);

  const open = (broadcast: BroadcastApiResponse, scheduledAt: Date | null = null) =>
    setPending({ broadcast, idempotencyKey: createIdempotencyKey(), scheduledAt });

  // Resolves to the success toast's title, or null when nothing was sent.
  const confirm = async (): Promise<string | null> => {
    if (!pending) return null;
    const args = {
      broadcastId: pending.broadcast.id,
      credentials: { scheduledAt: pending.scheduledAt?.toISOString() ?? null },
    };
    const response = canSend
      ? await send.mutate({ ...args, idempotencyKey: pending.idempotencyKey })
      : await submit.mutate(args);
    if (!response) return null;
    setPending(null);
    if (!canSend) return 'Sent for approval';
    return pending.scheduledAt ? 'Broadcast scheduled' : 'Broadcast is sending';
  };

  const broadcast = pending?.broadcast;
  const dialog = {
    isVisible: pending !== null,
    title: canSend
      ? pending?.scheduledAt
        ? 'Schedule this broadcast?'
        : 'Send this broadcast now?'
      : 'Submit for approval?',
    message: broadcast
      ? [
          broadcast.audienceSummary ?? 'Selected audience',
          `${broadcast.recipientCount.toLocaleString()} recipients`,
          `${broadcast.segmentCount} SMS each`,
          `${broadcast.estimatedCredits.toLocaleString()} credits`,
        ].join(' · ') +
        `\n${describeSchedule(pending?.scheduledAt ?? null)}\n\n“${broadcast.message}”`
      : '',
    confirmLabel: canSend ? (pending?.scheduledAt ? 'Schedule' : 'Send now') : 'Submit',
    confirmingLabel: canSend ? 'Sending…' : 'Submitting…',
    isConfirming: send.isPending || submit.isPending,
  };

  return {
    canDispatch: canSend || canSubmit,
    canSend,
    open,
    confirm,
    close: () => setPending(null),
    scheduledAt: pending?.scheduledAt ?? null,
    error: send.error ?? submit.error,
    dialog,
  };
}
