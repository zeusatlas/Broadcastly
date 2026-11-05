import { useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';

import { PageScreen } from '@/components/shared';
import { QueryState } from '@/components/ui';

import { useReadTemplateQuery } from '../hooks/use_templates';
import { NewTemplateScreen } from './NewTemplateScreen';

export function EditTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const template = useReadTemplateQuery(id ?? '');

  if (template.data) return <NewTemplateScreen key={template.data.id} template={template.data} />;

  return (
    <PageScreen title="Edit template" backIcon={X} backLabel="Close edit template">
      <QueryState
        isLoading={template.isLoading || (!template.error && !template.data)}
        error={template.error}
        isEmpty={false}
        emptyText=""
        onRetry={template.refetch}
      />
    </PageScreen>
  );
}
