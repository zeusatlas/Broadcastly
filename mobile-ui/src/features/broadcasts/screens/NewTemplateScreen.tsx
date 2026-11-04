import { Plus, X } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import { Keyboard, Modal, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { PageScreen } from '@/components/shared';
import { Button, Chip, Text, TextField } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';

import type { TemplateItem } from '../templates_data';

type TemplateFieldType = 'text' | 'number' | 'date' | 'time';

interface TemplateField {
  id: string;
  label: string;
  type: TemplateFieldType;
  token: string;
}

const CATEGORIES = ['Notice', 'Meeting', 'Reminder'];
const FIELD_TYPES: { key: TemplateFieldType; label: string }[] = [
  { key: 'text', label: 'Text' },
  { key: 'number', label: 'Number' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
];

const INITIAL_FIELDS: TemplateField[] = [
  { id: 'first-name', label: 'First name', type: 'text', token: '{first_name}' },
  { id: 'meeting-date', label: 'Meeting date', type: 'date', token: '{meeting_date}' },
  { id: 'meeting-time', label: 'Meeting time', type: 'time', token: '{meeting_time}' },
  { id: 'meeting-location', label: 'Meeting location', type: 'text', token: '{meeting_location}' },
];

const fieldsFromTemplate = (template?: TemplateItem): TemplateField[] => {
  if (!template) return INITIAL_FIELDS;

  return template.variables.map((label) => {
    const tokenName = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const lowerLabel = label.toLowerCase();
    const type: TemplateFieldType = lowerLabel.includes('date')
      ? 'date'
      : lowerLabel.includes('time')
        ? 'time'
        : 'text';
    return { id: tokenName, label, type, token: `{${tokenName}}` };
  });
};

interface NewTemplateScreenProps {
  template?: TemplateItem;
}

export function NewTemplateScreen({ template }: NewTemplateScreenProps) {
  const theme = useTheme();
  const canDraft = useHasPermission('broadcast.draft');
  const isEditing = Boolean(template);
  const [name, setName] = useState(template?.name ?? '');
  const [category, setCategory] = useState(template?.category ?? '');
  const [message, setMessage] = useState(template?.message ?? '');
  const [fields, setFields] = useState<TemplateField[]>(() => fieldsFromTemplate(template));
  const [isFieldOpen, setIsFieldOpen] = useState(false);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<TemplateFieldType>('text');

  const addField = () => {
    const label = fieldName.trim();
    if (!label) return;
    const tokenName = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const field: TemplateField = {
      id: `${tokenName}-${Date.now()}`,
      label,
      type: fieldType,
      token: `{${tokenName}}`,
    };
    setFields((current) => [...current, field]);
    setFieldName('');
    setFieldType('text');
    setIsFieldOpen(false);
  };

  const insertField = (field: TemplateField) => {
    setMessage((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}${field.token}`);
  };

  return (
    <PageScreen
      title={isEditing ? 'Edit template' : 'New template'}
      backIcon={X}
      backLabel={isEditing ? 'Close edit template' : 'Close new template'}
      actions={
        <Button
          label={isEditing ? 'Save changes' : 'Save template'}
          variant="accent"
          size="lg"
          fullWidth
          disabled={!canDraft || !name.trim() || !category || !message.trim()}
          onPress={() =>
            notify.info(isEditing ? 'Template update is ready for API wiring' : 'Template save is ready for API wiring')
          }
        />
      }
    >
      <Text variant="bodyMuted" className="mt-0">
        {isEditing
          ? 'Update this reusable message and customise its personalisation fields.'
          : 'Create a reusable message and customise the fields your organisation needs.'}
      </Text>

      <TextField
        label="Template name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Service update"
        autoCapitalize="sentences"
        className="mt-6"
      />

      <View className="mt-7 gap-3">
        <Text variant="overline">Category</Text>
        <View className="overflow-hidden rounded-2xl border-2 border-input bg-muted/40">
          <Picker
            accessibilityLabel="Select template category"
            selectedValue={category}
            onValueChange={(value: string) => setCategory(value)}
            dropdownIconColor={theme.mutedForeground}
            style={{ color: category ? theme.foreground : theme.mutedForeground }}
          >
            <Picker.Item label="Select a category" value="" color={theme.mutedForeground} />
            {CATEGORIES.map((option) => (
              <Picker.Item key={option} label={option} value={option} />
            ))}
          </Picker>
        </View>
      </View>

      <TextField
        label="Message"
        value={message}
        onChangeText={setMessage}
        placeholder="Write the reusable message"
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        className="mt-7"
      />

      <View className="mt-7 gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text variant="overline">Personalisation fields</Text>
            <Text variant="caption">Tap a field to add it to the message.</Text>
          </View>
          <Button
            label="Add field"
            icon={Plus}
            variant="outline"
            size="sm"
            onPress={() => {
              Keyboard.dismiss();
              setIsFieldOpen(true);
            }}
          />
        </View>
        <View className="flex-row flex-wrap gap-2">
          {fields.map((field) => (
            <Chip key={field.id} label={field.label} icon={Plus} onPress={() => insertField(field)} />
          ))}
        </View>
      </View>

      <Modal visible={isFieldOpen} transparent animationType="slide" onRequestClose={() => setIsFieldOpen(false)}>
        <View className="flex-1 bg-backdrop/60">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close add field"
            onPress={() => setIsFieldOpen(false)}
            className="absolute inset-0"
          />
          <KeyboardAwareScrollView
            bottomOffset={24}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
          >
            <View className="w-full max-w-sm self-center gap-5 rounded-2xl border-2 border-b-4 border-border bg-card p-6">
              <View className="flex-row items-center justify-between gap-4">
                <View className="flex-1 gap-0.5">
                  <Text variant="heading">Add personalisation field</Text>
                  <Text variant="caption">
                    Create a field that matches your organisation’s needs.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close add field"
                  onPress={() => setIsFieldOpen(false)}
                  className="h-11 w-11 items-center justify-center rounded-full bg-muted"
                >
                  <X size={20} color={theme.foreground} />
                </Pressable>
              </View>
              <TextField
                label="Field name"
                value={fieldName}
                onChangeText={setFieldName}
                placeholder="e.g. Account number or appointment time"
                autoCapitalize="words"
              />
              <View className="gap-3">
                <Text variant="overline">Field type</Text>
                <View className="flex-row flex-wrap gap-2">
                  {FIELD_TYPES.map((type) => (
                    <Chip
                      key={type.key}
                      label={type.label}
                      isSelected={fieldType === type.key}
                      onPress={() => setFieldType(type.key)}
                    />
                  ))}
                </View>
              </View>
              <Button
                label="Add field"
                variant="accent"
                size="lg"
                fullWidth
                disabled={!fieldName.trim()}
                onPress={addField}
              />
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </PageScreen>
  );
}
