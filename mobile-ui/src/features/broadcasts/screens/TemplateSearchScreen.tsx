import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { SearchField, Text } from '@/components/ui';

import { TemplateRow } from '../components/TemplateRow';
import { DEMO_TEMPLATES, type TemplateItem } from '../templates_data';
import { TemplatePreviewSheet } from './TemplatePreviewSheet';

export function TemplateSearchScreen() {
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const query = search.trim().toLowerCase();
  const templates = useMemo(
    () =>
      DEMO_TEMPLATES.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.category.toLowerCase().includes(query) ||
          template.message.toLowerCase().includes(query),
      ),
    [query],
  );

  return (
    <PageScreen backIcon={X} backLabel="Close search">
      <View className="gap-4">
        <SearchField
          autoFocus
          value={search}
          onChangeText={setSearch}
          placeholder="Search templates"
          className="h-14"
        />
        <Text variant="caption">
          {templates.length} {templates.length === 1 ? 'template' : 'templates'} found
        </Text>
        <View>
          {templates.map((template, index) => (
            <TemplateRow
              key={template.id}
              template={template}
              isLast={index === templates.length - 1}
              onPress={() => setSelectedTemplate(template)}
            />
          ))}
        </View>
        {templates.length === 0 ? (
          <Text variant="bodyMuted" className="py-16 text-center">
            No templates match your search.
          </Text>
        ) : null}
      </View>
      <TemplatePreviewSheet
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
      />
    </PageScreen>
  );
}
