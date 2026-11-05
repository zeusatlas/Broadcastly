import { CircleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, FigureRow, QueryState, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import { useImportRowPages, useResolveImportRowMutation } from '../hooks/use_member_import';
import type {
  ImportResolution,
  ImportRowResponse,
  ImportRowStatus,
  MemberImportCounts,
} from '../types';

interface ImportPreviewProps {
  importId: string;
  counts: MemberImportCounts;
  // Read-only once the import is confirmed, cancelled or opened from history.
  canResolve: boolean;
  onResolved: () => void;
}

const TABS: { key: ImportRowStatus; label: string }[] = [
  { key: 'valid', label: 'Valid' },
  { key: 'invalid', label: 'Problems' },
  { key: 'duplicate', label: 'Duplicates' },
];

const RESOLUTIONS: { key: ImportResolution; label: string }[] = [
  { key: 'skip', label: 'Skip' },
  { key: 'update_existing', label: 'Update existing' },
  { key: 'create_new', label: 'Add as new' },
];

function rowName(row: ImportRowResponse) {
  const name = [row.values.firstName, row.values.lastName].filter(Boolean).join(' ');
  return name || 'No name';
}

function rowDetail(row: ImportRowResponse) {
  return [row.values.phone, row.values.partyId, row.values.unit].filter(Boolean).join(' · ');
}

// The API refuses these choices, so they are not offered.
function isAllowed(row: ImportRowResponse, resolution: ImportResolution) {
  if (resolution === 'update_existing') return Boolean(row.duplicate?.memberId);
  if (resolution === 'create_new') {
    return !(row.duplicate?.matchedOn === 'party_id' && row.duplicate.memberId);
  }
  return true;
}

// Validation before anything is saved (FR-MEM-04..06): counts, rows to fix, duplicates to decide.
export function ImportPreview({ importId, counts, canResolve, onResolved }: ImportPreviewProps) {
  const theme = useTheme();
  const [tab, setTab] = useState<ImportRowStatus>('valid');
  const [decisions, setDecisions] = useState<Record<string, ImportResolution>>({});
  const rows = useImportRowPages(importId, tab);
  const resolve = useResolveImportRowMutation();

  const decide = async (row: ImportRowResponse, resolution: ImportResolution) => {
    const response = await resolve.mutate({ importId, rowId: row.id, credentials: { resolution } });
    if (!response) return;
    setDecisions((current) => ({ ...current, [row.id]: resolution }));
    onResolved();
  };

  return (
    <View>
      <FigureRow
        figures={[
          { label: 'Valid', value: counts.valid },
          { label: 'Problems', value: counts.invalid },
          { label: 'Duplicates', value: counts.duplicates },
        ]}
      />

      <View className="mt-6 flex-row flex-wrap gap-2">
        {TABS.map((item) => (
          <Chip
            key={item.key}
            label={item.label}
            isSelected={item.key === tab}
            onPress={() => setTab(item.key)}
          />
        ))}
      </View>

      {tab === 'invalid' && counts.invalid > 0 ? (
        <Text variant="caption" className="mt-3">
          These rows are left out. Fix them in the file and import it again.
        </Text>
      ) : null}
      {tab === 'duplicate' && canResolve && counts.duplicates > 0 ? (
        <Text variant="caption" className="mt-3">
          Duplicates are skipped unless you choose otherwise.
        </Text>
      ) : null}

      <View className="mt-2">
        {rows.items.map((row, index) => {
          const decision = decisions[row.id] ?? row.resolution ?? 'skip';
          const errors = Object.values(row.errors).flat();
          return (
            <View
              key={row.id}
              className={cn(
                'gap-2 py-3',
                index < rows.items.length - 1 && 'border-b border-border',
              )}
            >
              <View className="flex-row items-start gap-3">
                {row.status === 'invalid' ? (
                  <CircleAlert size={18} color={theme.destructive} style={{ marginTop: 2 }} />
                ) : null}
                <View className="flex-1 gap-0.5">
                  <Text className="font-sans-semibold text-base text-foreground">
                    Row {row.rowNumber} · {rowName(row)}
                  </Text>
                  {rowDetail(row) ? <Text variant="caption">{rowDetail(row)}</Text> : null}
                  {errors.map((error) => (
                    <Text key={error} className="font-sans text-sm text-destructive">
                      {error}
                    </Text>
                  ))}
                  {row.duplicate ? (
                    <Text variant="caption">
                      Same {row.duplicate.matchedOn === 'phone' ? 'phone' : 'party ID'} as{' '}
                      {row.duplicate.memberName
                        ? `${row.duplicate.memberName}${row.duplicate.unitName ? ` · ${row.duplicate.unitName}` : ''}`
                        : `row ${row.duplicate.rowNumber ?? '?'} of this file`}
                    </Text>
                  ) : null}
                  {row.outcome ? (
                    <Text variant="caption" className="capitalize">
                      {row.outcome}
                    </Text>
                  ) : null}
                </View>
              </View>
              {row.status === 'duplicate' && canResolve ? (
                <View className="flex-row flex-wrap gap-2">
                  {RESOLUTIONS.filter((item) => isAllowed(row, item.key)).map((item) => (
                    <Chip
                      key={item.key}
                      label={item.label}
                      isSelected={decision === item.key}
                      onPress={() => decide(row, item.key)}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {resolve.error ? (
        <Text className="mt-2 font-sans text-sm text-destructive">{resolve.error.message}</Text>
      ) : null}

      {rows.items.length === 0 ? (
        <QueryState
          isLoading={rows.isLoading}
          error={rows.error}
          isEmpty
          emptyText="No rows here."
          onRetry={rows.reload}
        />
      ) : null}

      {rows.hasNextPage ? (
        <Button
          label="Show more rows"
          variant="ghost"
          fullWidth
          isLoading={rows.isFetching}
          loadingLabel="Loading…"
          onPress={rows.loadMore}
        />
      ) : null}
    </View>
  );
}
