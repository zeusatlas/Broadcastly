import { Pencil, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, Text } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';

import type { TemplateResponse } from '../types';
import { categoryLabel, fieldLabel } from '../utils/templates';

interface TemplatePreviewSheetProps {
  template: TemplateResponse | null;
  onClose: () => void;
}

export function TemplatePreviewSheet({ template, onClose }: TemplatePreviewSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const canDraft = useHasPermission('broadcast.draft');

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
              <Text variant="caption">{categoryLabel(template.category)}</Text>
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

          <ScrollView className="shrink" showsVerticalScrollIndicator={false}>
            <View className="gap-2">
              <Text variant="overline">Message</Text>
              <Text variant="body" className="leading-6">
                {template.body}
              </Text>
            </View>

            {template.fields.length > 0 ? (
              <View className="mt-6 gap-2">
                <Text variant="overline">Personalisation fields</Text>
                <View className="flex-row flex-wrap gap-2">
                  {template.fields.map((field) => (
                    <Chip key={field} label={fieldLabel(field)} />
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          {canDraft ? (
            <View className="mt-7 flex-row gap-3">
              <Button
                label="Use template"
                variant="accent"
                size="lg"
                className="flex-1"
                onPress={() => {
                  onClose();
                  router.push({
                    pathname: '/broadcasts/new',
                    params: { templateBody: template.body },
                  });
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
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
