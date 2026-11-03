import { Modal, Pressable, View } from 'react-native';

import { Button, type ButtonVariant } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

export interface ConfirmDialogProps {
  isVisible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  // Shown beside the spinner while `isConfirming`, e.g. 'Logging out…'.
  confirmingLabel?: string;
  confirmVariant?: ButtonVariant;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Explicit confirmation before destructive actions (NFR-USE-02). Tapping outside or the back
// button cancels, except while the action is running.
export function ConfirmDialog({
  isVisible,
  title,
  message,
  confirmLabel,
  confirmingLabel,
  confirmVariant = 'destructive',
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancel = () => {
    if (!isConfirming) onCancel();
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={cancel}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close dialog"
        onPress={cancel}
        className="flex-1 items-center justify-center bg-backdrop/50 px-6"
      >
        <Pressable
          // Swallows taps so pressing the card itself does not close the dialog.
          accessibilityViewIsModal
          onPress={() => {}}
          className="w-full max-w-sm gap-5 rounded-2xl border-2 border-b-4 border-border bg-card p-6"
        >
          <View className="gap-2">
            <Text
              accessibilityRole="header"
              className="font-sans-extrabold text-xl text-foreground"
            >
              {title}
            </Text>
            <Text variant="bodyMuted" className="leading-6">
              {message}
            </Text>
          </View>

          <View className="gap-3">
            <Button
              label={confirmLabel}
              variant={confirmVariant}
              size="lg"
              fullWidth
              isLoading={isConfirming}
              loadingLabel={confirmingLabel}
              onPress={onConfirm}
            />
            <Button
              label="Cancel"
              variant="outline"
              size="lg"
              fullWidth
              disabled={isConfirming}
              onPress={cancel}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
