import { X } from 'lucide-react-native';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';

import type { ReportItem } from '../reports_data';

interface ReportDetailSheetProps {
  report: ReportItem | null;
  onClose: () => void;
}

export function ReportDetailSheet({ report, onClose }: ReportDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  if (!report) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-backdrop/60">
        <Pressable accessibilityRole="button" accessibilityLabel="Close report" onPress={onClose} className="flex-1" />
        <View className="rounded-t-3xl bg-background px-5 pt-5" style={{ maxHeight: '86%', paddingBottom: insets.bottom + 16 }}>
          <View className="mb-5 flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-0.5">
              <Text variant="heading">{report.title}</Text>
              <Text variant="caption">{report.audience} · {report.updatedAt}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close report" onPress={onClose} className="h-11 w-11 items-center justify-center rounded-full bg-muted">
              <X size={20} color={theme.foreground} />
            </Pressable>
          </View>
          <View className="gap-1">
            <Text variant="overline">Delivery summary</Text>
            {[
              ['Submitted', report.submitted],
              ['Delivered', report.delivered],
              ['Failed', report.failed],
              ['Unknown', report.unknown],
            ].map(([label, value], index) => (
              <View key={label as string} className="flex-row items-center justify-between border-b border-border py-3">
                <Text variant="label">{label}</Text>
                <Text className="font-sans-semibold text-base text-foreground">{(value as number).toLocaleString()}</Text>
              </View>
            ))}
          </View>
          <Text variant="caption" className="mt-5">
            Delivered means the provider reported delivery. It does not confirm that the recipient read the message.
          </Text>
          <Button label="Export report" variant="outline" size="lg" fullWidth className="mt-6" onPress={() => notify.info('Report export is ready for API wiring')} />
        </View>
      </View>
    </Modal>
  );
}
