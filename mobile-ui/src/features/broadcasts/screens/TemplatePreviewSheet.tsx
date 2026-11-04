import { Pencil, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';

import type { TemplateItem } from '../templates_data';

interface TemplatePreviewSheetProps {
  template: TemplateItem | null;
  onClose: () => void;
}

export function TemplatePreviewSheet({ template, onClose }: TemplatePreviewSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  if (!template) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-backdrop/60">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close template preview"
          onPress={onClose}
          className="flex-1"
        />
        <View
          className="rounded-t-3xl bg-background px-5 pt-5"
          style={{ maxHeight: '82%', paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-5 flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-0.5">
              <Text variant="heading">{template.name}</Text>
              <Text variant="caption">{template.category} template</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close template preview"
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full bg-muted"
            >
              <X size={20} color={theme.foreground} />
            </Pressable>
          </View>

          <View className="gap-2">
            <Text variant="overline">Message</Text>
            <Text variant="body" className="leading-6">
              {template.message}
            </Text>
          </View>

          <View className="mt-6 gap-2">
            <Text variant="overline">Personalisation fields</Text>
            <View className="flex-row flex-wrap gap-2">
              {template.variables.map((variable) => (
                <Chip key={variable} label={variable} />
              ))}
            </View>
          </View>

          <View className="mt-7 flex-row gap-3">
            <Button
              label="Use template"
              variant="accent"
              size="lg"
              className="flex-1"
              onPress={() => {
                notify.info('Using templates is ready for API wiring');
                onClose();
              }}
            />
            <Button
              label="Edit"
              icon={Pencil}
              variant="outline"
              size="lg"
              className="flex-1"
              onPress={() => {
                onClose();
                router.push({ pathname: '/templates/[id]/edit', params: { id: template.id } });
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
