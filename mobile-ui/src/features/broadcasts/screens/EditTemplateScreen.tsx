import { useLocalSearchParams } from 'expo-router';

import { Text } from '@/components/ui';

import { DEMO_TEMPLATES } from '../templates_data';
import { NewTemplateScreen } from './NewTemplateScreen';

export function EditTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const template = DEMO_TEMPLATES.find((item) => item.id === id);

  if (!template) return <Text variant="bodyMuted">This template could not be found.</Text>;

  return <NewTemplateScreen template={template} />;
}
