import { Pencil } from 'lucide-react-native';
import { router } from 'expo-router';
import { View } from 'react-native';

import { BottomSheet, Button, Chip, Text } from '@/components/ui';
import { useHasPermission } from '@/features/auth';

import type { TemplateResponse } from '../types';
import { categoryLabel, fieldLabel } from '../utils/templates';

interface TemplatePreviewSheetProps {
  template: TemplateResponse | null;
  onClose: () => void;
}

export function TemplatePreviewSheet({ template, onClose }: TemplatePreviewSheetProps) {
  const canDraft = useHasPermission('broadcast.draft');

  if (!template) return null;

  return (
    <BottomSheet
      isVisible
      onClose={onClose}
      title={template.name}
      description={categoryLabel(template.category)}
      closeLabel="Close template preview"
      footer={
        canDraft ? (
          <View className="flex-row gap-3">
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
        ) : undefined
      }
    >
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
    </BottomSheet>
  );
}
