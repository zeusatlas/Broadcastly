import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, FileSpreadsheet, Info, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { PageScreen, type HeaderButtonProps } from '@/components/shared';
import { Button, FigureRow, PageSection, QueryState, Text } from '@/components/ui';
import { useHasPermission } from '@/features/auth';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import { cn } from '@/utils/helpers';

import { ImportPreview } from '../components/ImportPreview';
import { UnitPicker, type UnitChoice } from '../components/UnitPicker';
import {
  useCancelImportMutation,
  useConfirmImportMutation,
  useImportStatus,
  useStartImportMutation,
} from '../hooks/use_member_import';
import type { MemberImportStatus, SpreadsheetFile } from '../types';

// Mirrors IMPORT_COLUMNS in api/src/modules/members/member_import_types.ts (the template's header row).
const TEMPLATE_COLUMNS = [
  { header: 'First name', isRequired: true },
  { header: 'Middle name', isRequired: false },
  { header: 'Last name', isRequired: true },
  { header: 'Party ID', isRequired: false },
  { header: 'Phone', isRequired: false },
  { header: 'Date of birth', isRequired: false },
  { header: 'Unit', isRequired: false },
];

const SPREADSHEET_TYPES = [
  'text/csv',
  'text/comma-separated-values',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const TITLES: Record<MemberImportStatus, string> = {
  processing: 'Checking file',
  ready: 'Review import',
  confirming: 'Saving members',
  completed: 'Import complete',
  failed: 'Import failed',
  cancelled: 'Import cancelled',
};

type HeaderAction = HeaderButtonProps | undefined;

function ImportSetup({
  headerRight,
  onStarted,
}: {
  headerRight: HeaderAction;
  onStarted: (importId: string) => void;
}) {
  const theme = useTheme();
  const [unit, setUnit] = useState<UnitChoice | null>(null);
  const [file, setFile] = useState<SpreadsheetFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const start = useStartImportMutation();

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: SPREADSHEET_TYPES,
      copyToCacheDirectory: true,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    if (!/\.(csv|xlsx)$/i.test(asset.name)) {
      setFile(null);
      setFileError('Choose a .csv or .xlsx file.');
      return;
    }
    setFileError(null);
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, file: asset.file });
  };

  const upload = async () => {
    if (!file) return;
    const response = await start.mutate({ file, defaultUnitId: unit?.id });
    if (response) onStarted(response.data.id);
  };

  return (
    <PageScreen
      title="Import members"
      headerRight={headerRight}
      actions={
        <>
          <Button
            label="Upload and check"
            variant="accent"
            size="lg"
            fullWidth
            disabled={!file}
            isLoading={start.isPending}
            loadingLabel="Uploading…"
            onPress={upload}
          />
          {start.error ? (
            <Text className="text-center font-sans text-sm text-destructive">
              {start.error.message}
            </Text>
          ) : null}
        </>
      }
    >
      <Text variant="bodyMuted">
        Add members from an Excel or CSV file. You’ll see every problem before anything is saved.
      </Text>

      <View className="mt-6 gap-5">
        <UnitPicker
          label="Default unit"
          value={unit}
          placeholder="Choose a unit"
          noneLabel="No default: use the Unit column"
          error={start.error?.fieldError('defaultUnitId')}
          onChange={setUnit}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={file ? `File ${file.name}. Choose another` : 'Choose a file'}
          onPress={pickFile}
          className={cn(
            'min-h-14 flex-row items-center gap-3 rounded-lg border bg-muted/40 px-4 active:opacity-70',
            fileError ? 'border-destructive' : 'border-input',
          )}
        >
          <FileSpreadsheet size={20} color={theme.accentEmphasis} />
          <Text
            className={cn(
              'flex-1 font-sans-medium text-base',
              file ? 'text-foreground' : 'text-muted-foreground',
            )}
            numberOfLines={1}
          >
            {file?.name ?? 'Choose a .xlsx or .csv file'}
          </Text>
          <Text className="font-sans-semibold text-sm text-accent-emphasis">
            {file ? 'Change' : 'Choose'}
          </Text>
        </Pressable>
        {fileError ? (
          <Text className="-mt-3 font-sans text-sm text-destructive">{fileError}</Text>
        ) : null}
      </View>

      <PageSection title="Columns in the file">
        <Text variant="caption">
          The first row holds these headings, in any order. A row without a unit uses the default
          unit.
        </Text>
        <View>
          {TEMPLATE_COLUMNS.map((column, index) => (
            <View
              key={column.header}
              className={cn(
                'flex-row items-center justify-between py-3',
                index < TEMPLATE_COLUMNS.length - 1 && 'border-b border-border',
              )}
            >
              <Text variant="label">{column.header}</Text>
              <Text variant="caption">{column.isRequired ? 'Required' : 'Optional'}</Text>
            </View>
          ))}
        </View>
      </PageSection>

      <View className="mt-6 flex-row gap-3 rounded-lg bg-muted/60 p-4">
        <Info size={18} color={theme.mutedForeground} style={{ marginTop: 1 }} />
        <Text variant="caption" className="flex-1 text-sm leading-5">
          Importing adds people as members only. It doesn’t give them an app account or let them
          send messages.
        </Text>
      </View>
    </PageScreen>
  );
}

function ImportProgress({ importId, onRestart }: { importId: string; onRestart: () => void }) {
  const theme = useTheme();
  const status = useImportStatus(importId);
  const confirm = useConfirmImportMutation();
  const cancel = useCancelImportMutation();
  const item = status.data;

  if (!item) {
    return (
      <PageScreen title="Import">
        <QueryState
          isLoading={status.isLoading}
          error={status.error}
          isEmpty
          emptyText="This import could not be found."
          onRetry={status.refetch}
        />
      </PageScreen>
    );
  }

  const cancelImport = async () => {
    const response = await cancel.mutate({ importId });
    if (!response) return;
    router.back();
    notify.success('Import cancelled.');
  };

  const confirmImport = async () => {
    const response = await confirm.mutate({ importId });
    if (response) status.refetch();
  };

  const error = confirm.error ?? cancel.error;
  const errorText = error ? (
    <Text className="text-center font-sans text-sm text-destructive">{error.message}</Text>
  ) : null;

  const actions =
    item.status === 'ready' ? (
      <>
        <Button
          label={`Import ${item.counts.accepted.toLocaleString()} members`}
          variant="accent"
          size="lg"
          fullWidth
          disabled={item.counts.accepted === 0 || cancel.isPending}
          isLoading={confirm.isPending}
          loadingLabel="Confirming…"
          onPress={confirmImport}
        />
        <Button
          label="Cancel import"
          variant="ghost"
          fullWidth
          disabled={confirm.isPending}
          isLoading={cancel.isPending}
          loadingLabel="Cancelling…"
          onPress={cancelImport}
        />
        {errorText}
      </>
    ) : item.status === 'processing' ? (
      <>
        <Button
          label="Cancel import"
          variant="ghost"
          fullWidth
          isLoading={cancel.isPending}
          loadingLabel="Cancelling…"
          onPress={cancelImport}
        />
        {errorText}
      </>
    ) : item.status === 'failed' ? (
      <Button
        label="Choose another file"
        variant="accent"
        size="lg"
        fullWidth
        onPress={onRestart}
      />
    ) : item.status === 'confirming' ? undefined : (
      <Button label="Done" variant="primary" size="lg" fullWidth onPress={() => router.back()} />
    );

  return (
    <PageScreen title={TITLES[item.status]} actions={actions}>
      <Text variant="bodyMuted">
        {item.fileName}
        {item.defaultUnitName ? ` · ${item.defaultUnitName}` : ''}
        {item.status === 'ready' ? '. Nothing is saved until you confirm.' : ''}
      </Text>

      {status.isWorking ? (
        <View className="items-center gap-3 py-12">
          <ActivityIndicator color={theme.mutedForeground} />
          <Text variant="bodyMuted" className="text-center">
            {item.status === 'processing'
              ? 'Checking every row. This can take a minute for a large file.'
              : 'Saving members. You can leave this screen; the import carries on.'}
          </Text>
        </View>
      ) : null}

      {item.status === 'ready' ? (
        <View className="mt-6">
          <ImportPreview
            importId={importId}
            counts={item.counts}
            canResolve
            onResolved={status.refetch}
          />
        </View>
      ) : null}

      {item.status === 'completed' ? (
        <View className="mt-6 gap-6">
          <View className="items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-success/15">
              <CircleCheck size={30} color={theme.success} />
            </View>
          </View>
          <FigureRow
            figures={[
              { label: 'Created', value: item.counts.created },
              { label: 'Updated', value: item.counts.updated },
              { label: 'Skipped', value: item.counts.skipped },
              { label: 'Rejected', value: item.counts.rejected },
            ]}
          />
        </View>
      ) : null}

      {item.status === 'failed' ? (
        <Text variant="body" className="mt-6">
          {item.failureReason ?? 'The file could not be read.'}
        </Text>
      ) : null}

      {item.status === 'cancelled' ? (
        <Text variant="bodyMuted" className="mt-6">
          This import was cancelled. Nothing from it was saved.
        </Text>
      ) : null}
    </PageScreen>
  );
}

// Spreadsheet import (FR-MEM-02..10): set up, review before saving, then the summary.
// Opened with ?id= from the import history to follow or finish an earlier import.
export function MemberImportScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const canImport = useHasPermission('member.import');
  const canAddOne = useHasPermission('member.manage');
  const [importId, setImportId] = useState(typeof params.id === 'string' ? params.id : '');
  const headerRight: HeaderAction = canAddOne
    ? { icon: Plus, label: 'Add one member', onPress: () => router.push('/members/new') }
    : undefined;

  if (!canImport) {
    return (
      <PageScreen title="Add members" headerRight={headerRight}>
        <Text variant="bodyMuted">
          Importing a spreadsheet needs the import permission. Use + to add one member.
        </Text>
      </PageScreen>
    );
  }

  if (!importId) return <ImportSetup headerRight={headerRight} onStarted={setImportId} />;
  return <ImportProgress importId={importId} onRestart={() => setImportId('')} />;
}
