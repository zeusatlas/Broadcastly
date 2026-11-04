import { CircleAlert } from 'lucide-react-native';
import { View } from 'react-native';

import { Chip, FigureRow, PageSection, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

export interface ImportIssue {
  row: number;
  name: string;
  problem: string;
}

export interface ImportDuplicate {
  row: number;
  name: string;
  matches: string;
}

export type DuplicateDecision = 'skip' | 'import';

interface ImportPreviewProps {
  readyCount: number;
  issues: ImportIssue[];
  duplicates: ImportDuplicate[];
  decisions: Record<number, DuplicateDecision>;
  onDecide: (row: number, decision: DuplicateDecision) => void;
}

// Validation before anything is saved (FR-MEM-04..06): counts, rows to fix, duplicates to decide.
export function ImportPreview({
  readyCount,
  issues,
  duplicates,
  decisions,
  onDecide,
}: ImportPreviewProps) {
  const theme = useTheme();

  return (
    <View>
      <FigureRow
        figures={[
          { label: 'Ready', value: readyCount },
          { label: 'To fix', value: issues.length },
          { label: 'Duplicates', value: duplicates.length },
        ]}
      />

      {issues.length > 0 ? (
        <PageSection title="Needs fixing">
          <View>
            {issues.map((issue, index) => (
              <View
                key={issue.row}
                className={cn(
                  'flex-row items-start gap-3 py-3',
                  index < issues.length - 1 && 'border-b border-border',
                )}
              >
                <CircleAlert size={18} color={theme.destructive} style={{ marginTop: 2 }} />
                <View className="flex-1 gap-0.5">
                  <Text className="font-sans-semibold text-base text-foreground">
                    Row {issue.row} · {issue.name}
                  </Text>
                  <Text variant="caption">{issue.problem}</Text>
                </View>
              </View>
            ))}
          </View>
          <Text variant="caption">
            These rows are left out. Fix them in the file and import it again.
          </Text>
        </PageSection>
      ) : null}

      {duplicates.length > 0 ? (
        <PageSection title="Possible duplicates">
          {duplicates.map((duplicate, index) => {
            const decision = decisions[duplicate.row] ?? 'skip';
            return (
              <View
                key={duplicate.row}
                className={cn(
                  'gap-3 py-3',
                  index < duplicates.length - 1 && 'border-b border-border',
                )}
              >
                <View className="gap-0.5">
                  <Text className="font-sans-semibold text-base text-foreground">
                    Row {duplicate.row} · {duplicate.name}
                  </Text>
                  <Text variant="caption">Looks like {duplicate.matches}</Text>
                </View>
                <View className="flex-row gap-2">
                  <Chip
                    label="Skip"
                    isSelected={decision === 'skip'}
                    onPress={() => onDecide(duplicate.row, 'skip')}
                  />
                  <Chip
                    label="Import anyway"
                    isSelected={decision === 'import'}
                    onPress={() => onDecide(duplicate.row, 'import')}
                  />
                </View>
              </View>
            );
          })}
        </PageSection>
      ) : null}
    </View>
  );
}
