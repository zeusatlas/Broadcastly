import { router } from 'expo-router';
import { CircleCheck, Download, FileSpreadsheet, Info, MapPinned } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { Button, FigureRow, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { notify } from '@/lib/notify';
import { cn } from '@/utils/helpers';

import {
  ImportPreview,
  type DuplicateDecision,
  type ImportDuplicate,
  type ImportIssue,
} from '../components/ImportPreview';

type Stage = 'setup' | 'review' | 'done';

// TODO(member import API + expo-document-picker): sample results until upload and preview are wired.
const DEMO_FILE = 'central-branch-members.xlsx';
const DEMO_UNIT = 'Central Branch';
const DEMO_READY = 1204;
const DEMO_ISSUES: ImportIssue[] = [
  { row: 14, name: 'Yaw Darko', problem: 'Phone number is not a valid Ghana number' },
  { row: 52, name: 'Efua', problem: 'Last name is missing' },
  { row: 210, name: 'Kojo Annan', problem: 'Phone number is too short; check the digits' },
];
const DEMO_DUPLICATES: ImportDuplicate[] = [
  { row: 31, name: 'Ama Mensah', matches: 'Ama Mensah · Central Branch, same phone' },
  { row: 88, name: 'Kwame Owusu', matches: 'Kwame Owusu · North Electoral Area, same party ID' },
];

interface StepRowProps {
  step: number;
  title: string;
  detail: string;
  icon: typeof Download;
  actionLabel?: string;
  isDone?: boolean;
  onPress?: () => void;
  isLast?: boolean;
}

function StepRow({
  step,
  title,
  detail,
  icon: Icon,
  actionLabel,
  isDone,
  onPress,
  isLast,
}: StepRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Step ${step}: ${title}. ${detail}`}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-4 py-4 active:opacity-60',
        !isLast && 'border-b border-border',
      )}
    >
      <View
        className={cn(
          'h-9 w-9 items-center justify-center rounded-full',
          isDone ? 'bg-success/15' : 'bg-accent/15',
        )}
      >
        {isDone ? (
          <CircleCheck size={18} color={theme.success} />
        ) : (
          <Icon size={18} color={theme.accentEmphasis} />
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground">{title}</Text>
        <Text variant="caption" numberOfLines={2}>
          {detail}
        </Text>
      </View>
      {actionLabel ? (
        <Text className="font-sans-semibold text-sm text-accent-emphasis">{actionLabel}</Text>
      ) : null}
    </Pressable>
  );
}

// Spreadsheet import (FR-MEM-02..10): set up, review before saving, then the summary.
export function MemberImportScreen() {
  const theme = useTheme();
  const [stage, setStage] = useState<Stage>('setup');
  const [unit, setUnit] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<number, DuplicateDecision>>({});

  const importedDuplicates = Object.values(decisions).filter((d) => d === 'import').length;
  const importCount = DEMO_READY + importedDuplicates;

  if (stage === 'done') {
    return (
      <PageScreen
        title="Import complete"
        actions={
          <>
            <Button
              label="Done"
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.back()}
            />
          </>
        }
      >
        <View className="items-center gap-3 pb-6">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-success/15">
            <CircleCheck size={30} color={theme.success} />
          </View>
          <Text variant="bodyMuted" className="text-center">
            {importCount.toLocaleString()} members were added to {unit}.
          </Text>
        </View>
        <FigureRow
          figures={[
            { label: 'Imported', value: importCount },
            { label: 'Rejected', value: DEMO_ISSUES.length },
            { label: 'Skipped', value: DEMO_DUPLICATES.length - importedDuplicates },
          ]}
        />
      </PageScreen>
    );
  }

  if (stage === 'review') {
    return (
      <PageScreen
        title="Review import"
        actions={
          <>
            <Button
              label={`Import ${importCount.toLocaleString()} members`}
              variant="accent"
              size="lg"
              fullWidth
              onPress={() => setStage('done')}
            />
            <Button
              label="Choose another file"
              variant="ghost"
              fullWidth
              onPress={() => {
                setFileName(null);
                setStage('setup');
              }}
            />
          </>
        }
      >
        <Text variant="bodyMuted" className="mb-6">
          {fileName} · {unit}. Nothing is saved until you confirm.
        </Text>
        <ImportPreview
          readyCount={DEMO_READY}
          issues={DEMO_ISSUES}
          duplicates={DEMO_DUPLICATES}
          decisions={decisions}
          onDecide={(row, decision) => setDecisions((current) => ({ ...current, [row]: decision }))}
        />
      </PageScreen>
    );
  }

  return (
    <PageScreen
      title="Import members"
      actions={
        <>
          <Button
            label="Review import"
            variant="accent"
            size="lg"
            fullWidth
            disabled={!unit || !fileName}
            onPress={() => setStage('review')}
          />
        </>
      }
    >
      <Text variant="bodyMuted">
        Add members from an Excel or CSV file. You’ll see every problem before anything is saved.
      </Text>

      <View className="mt-6">
        <StepRow
          step={1}
          icon={Download}
          title="Get the template"
          detail="Shows the required and optional columns"
          actionLabel="Download"
          onPress={() => notify.info('Template download is coming soon')}
        />
        <StepRow
          step={2}
          icon={MapPinned}
          title="Choose the unit"
          detail={unit ?? 'The branch or area these members belong to'}
          actionLabel={unit ? 'Change' : 'Choose'}
          isDone={!!unit}
          onPress={() => setUnit(DEMO_UNIT)}
        />
        <StepRow
          step={3}
          icon={FileSpreadsheet}
          title="Upload the file"
          detail={fileName ?? '.xlsx or .csv'}
          actionLabel={fileName ? 'Change' : 'Choose'}
          isDone={!!fileName}
          onPress={() => setFileName(DEMO_FILE)}
          isLast
        />
      </View>

      <View className="mt-6 flex-row gap-3 rounded-2xl bg-muted/60 p-4">
        <Info size={18} color={theme.mutedForeground} style={{ marginTop: 1 }} />
        <Text variant="caption" className="flex-1 text-sm leading-5">
          Importing adds people as members only. It doesn’t give them an app account or let them
          send messages.
        </Text>
      </View>
    </PageScreen>
  );
}
