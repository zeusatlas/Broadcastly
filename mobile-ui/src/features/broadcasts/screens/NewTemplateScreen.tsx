import { router } from 'expo-router';
import { Check, ChevronDown, Plus, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Keyboard, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageScreen } from '@/components/shared';
import { Button, Chip, ConfirmDialog, Text, TextField } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import type { ApiError } from '@/lib/api';
import { notify } from '@/lib/notify';

import {
  useArchiveTemplateMutation,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
} from '../hooks/use_templates';
import type { TemplateCategory, TemplateResponse, UpdateTemplateRequest } from '../types';
import {
  appendToken,
  categoryLabel,
  TEMPLATE_CATEGORIES,
  TEMPLATE_FIELDS,
} from '../utils/templates';

const FORM_FIELDS = ['name', 'category', 'body'];

interface CategorySheetProps {
  visible: boolean;
  selected: TemplateCategory | null;
  onSelect: (category: TemplateCategory) => void;
  onClose: () => void;
}

function CategorySheet({ visible, selected, onSelect, onClose }: CategorySheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-backdrop/60">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close category selection"
          onPress={onClose}
          className="flex-1"
        />
        <View
          className="rounded-t-3xl bg-background px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="gap-0.5">
              <Text variant="heading">Select category</Text>
              <Text variant="caption">Choose the category that best describes the message.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close category selection"
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full bg-muted"
            >
              <X size={20} color={theme.foreground} />
            </Pressable>
          </View>
          {TEMPLATE_CATEGORIES.map((item) => {
            const isSelected = item.key === selected;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="radio"
                accessibilityLabel={item.label}
                accessibilityState={{ checked: isSelected }}
                onPress={() => onSelect(item.key)}
                className="flex-row items-center justify-between border-b border-border py-4 active:opacity-60"
              >
                <Text className="font-sans-semibold text-base text-foreground">{item.label}</Text>
                {isSelected ? <Check size={20} color={theme.accentEmphasis} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const hasFormFieldError = (error: ApiError) =>
  FORM_FIELDS.some((field) => error.fieldError(field) !== undefined);

interface NewTemplateScreenProps {
  template?: TemplateResponse;
}

export function NewTemplateScreen({ template }: NewTemplateScreenProps) {
  const theme = useTheme();
  const canDraft = useHasPermission('broadcast.draft');
  const create = useCreateTemplateMutation();
  const update = useUpdateTemplateMutation();
  const archive = useArchiveTemplateMutation();
  const save = template ? update : create;
  const [name, setName] = useState(template?.name ?? '');
  const [category, setCategory] = useState<TemplateCategory | null>(template?.category ?? null);
  const [body, setBody] = useState(template?.body ?? '');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const changes: UpdateTemplateRequest = {
    name: name.trim() !== template?.name ? name.trim() : undefined,
    category: category !== template?.category ? (category ?? undefined) : undefined,
    body: body.trim() !== template?.body ? body.trim() : undefined,
  };
  const isChanged = Object.values(changes).some((value) => value !== undefined);
  const canSave = canDraft && name.trim() !== '' && category !== null && body.trim() !== '';

  // Field problems show under their inputs; anything else (network, permission) is a toast.
  useEffect(() => {
    if (save.error && !hasFormFieldError(save.error)) notify.apiError(save.error);
  }, [save.error]);
  useEffect(() => {
    if (archive.error) notify.apiError(archive.error);
  }, [archive.error]);

  const submit = async () => {
    if (!canSave || !category) return;
    const response = template
      ? await update.mutate({ templateId: template.id, credentials: changes })
      : await create.mutate({ name: name.trim(), category, body: body.trim() });
    if (!response) return;
    notify.success(template ? 'Template updated' : 'Template saved');
    router.back();
  };

  const confirmArchive = async () => {
    if (!template) return;
    const response = await archive.mutate({ templateId: template.id });
    setIsArchiveOpen(false);
    if (!response) return;
    notify.success('Template archived');
    router.back();
  };

  return (
    <PageScreen
      title={template ? 'Edit template' : 'New template'}
      backIcon={X}
      backLabel={template ? 'Close edit template' : 'Close new template'}
      headerRight={
        template && canDraft
          ? { icon: Trash2, label: 'Archive template', onPress: () => setIsArchiveOpen(true) }
          : undefined
      }
      actions={
        <Button
          label={template ? 'Save changes' : 'Save template'}
          variant="accent"
          size="lg"
          fullWidth
          disabled={!canSave || (template !== undefined && !isChanged)}
          isLoading={save.isPending}
          loadingLabel="Saving…"
          onPress={submit}
        />
      }
    >
      <Text variant="bodyMuted" className="mt-0">
        {template
          ? 'Update this reusable message and its personalisation fields.'
          : 'Create a reusable message for your organisation’s broadcasts.'}
      </Text>

      <TextField
        label="Template name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Monthly meeting"
        autoCapitalize="sentences"
        maxLength={120}
        error={save.error?.fieldError('name')}
        className="mt-6"
      />

      <View className="mt-7 gap-3">
        <Text variant="overline">Category</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={category ? `Category: ${categoryLabel(category)}` : 'Select category'}
          onPress={() => {
            Keyboard.dismiss();
            setIsCategoryOpen(true);
          }}
          className="min-h-14 flex-row items-center justify-between rounded-lg border border-input bg-muted/40 px-4 active:opacity-70"
        >
          <Text
            className={
              category
                ? 'font-sans-medium text-base text-foreground'
                : 'font-sans-medium text-base text-muted-foreground'
            }
          >
            {category ? categoryLabel(category) : 'Select a category'}
          </Text>
          <ChevronDown size={20} color={theme.mutedForeground} />
        </Pressable>
        {save.error?.fieldError('category') ? (
          <Text variant="caption" className="text-destructive">
            {save.error.fieldError('category')}
          </Text>
        ) : null}
        <CategorySheet
          visible={isCategoryOpen}
          selected={category}
          onSelect={(value) => {
            setCategory(value);
            setIsCategoryOpen(false);
          }}
          onClose={() => setIsCategoryOpen(false)}
        />
      </View>

      <TextField
        label="Message"
        value={body}
        onChangeText={setBody}
        placeholder="Write the reusable message"
        multiline
        numberOfLines={6}
        maxLength={1600}
        textAlignVertical="top"
        error={save.error?.fieldError('body')}
        className="mt-7"
      />

      <View className="mt-7 gap-3">
        <View className="gap-1">
          <Text variant="overline">Personalisation fields</Text>
          <Text variant="caption">Tap a field to add it to the message.</Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {TEMPLATE_FIELDS.map((field) => (
            <Chip
              key={field.key}
              label={field.label}
              icon={Plus}
              onPress={() => setBody((current) => appendToken(current, field.token))}
            />
          ))}
        </View>
      </View>

      <ConfirmDialog
        isVisible={isArchiveOpen}
        title="Archive this template?"
        message="It will no longer be listed or available to use. Broadcasts already sent are not affected."
        confirmLabel="Archive template"
        confirmingLabel="Archiving…"
        isConfirming={archive.isPending}
        onConfirm={confirmArchive}
        onCancel={() => setIsArchiveOpen(false)}
      />
    </PageScreen>
  );
}
