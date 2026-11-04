import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';

import type { ApprovalItem } from '../demo_data';

interface ApprovalDetailSheetProps {
  approval: ApprovalItem | null;
  onClose: () => void;
}

export function ApprovalDetailSheet({ approval, onClose }: ApprovalDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const close = () => {
    setIsRejecting(false);
    setReason('');
    onClose();
  };

  if (!approval) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View className="flex-1 justify-end bg-backdrop/60">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close approval details"
          onPress={close}
          className="flex-1"
        />
        <View
          className="rounded-t-3xl bg-background px-5 pt-5"
          style={{ maxHeight: '88%', paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-5 flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-0.5">
              <Text variant="heading">{isRejecting ? 'Reject broadcast' : approval.title}</Text>
              <Text variant="caption">
                {isRejecting ? 'Tell the sender what needs to change.' : 'Approval request'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close approval details"
              onPress={close}
              className="h-11 w-11 items-center justify-center rounded-full bg-muted"
            >
              <X size={20} color={theme.foreground} />
            </Pressable>
          </View>

          {isRejecting ? (
            <View className="gap-4">
              <TextField
                label="Reason"
                value={reason}
                onChangeText={setReason}
                placeholder="Explain what should be changed"
                multiline
                numberOfLines={4}
              />
              <Button
                label="Reject broadcast"
                variant="destructive"
                size="lg"
                fullWidth
                disabled={!reason.trim()}
                onPress={() => {
                  notify.info('Rejection action is ready for API wiring');
                  close();
                }}
              />
              <Button
                label="Cancel"
                variant="ghost"
                size="lg"
                fullWidth
                onPress={() => setIsRejecting(false)}
              />
            </View>
          ) : (
            <View className="gap-6">
              <View className="gap-1">
                <Text variant="overline">Audience</Text>
                <Text variant="body">{approval.audience}</Text>
                <Text variant="caption">
                  {approval.recipients.toLocaleString()} recipients · {approval.segments} SMS
                  segment{approval.segments === 1 ? '' : 's'} ·{' '}
                  {approval.estimatedCost.toLocaleString()} credits
                </Text>
              </View>

              <View className="gap-2">
                <Text variant="overline">Message</Text>
                <Text variant="body" className="leading-6">
                  {approval.message}
                </Text>
              </View>

              <Text variant="caption">
                Submitted by {approval.creator} · {approval.submittedAt}
              </Text>

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
                  onPress={() => {
                    notify.info('Approval action is ready for API wiring');
                    close();
                  }}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
