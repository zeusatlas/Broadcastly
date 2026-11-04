import { CheckCircle2, ChevronRight, TriangleAlert, Upload, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageScreen } from '@/components/shared';
import { Button, SearchField, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use_theme';
import { cn } from '@/utils/helpers';

import { DEMO_IMPORT_HISTORY, type ImportHistoryItem } from '../import_history_data';

function ImportRow({ item, isLast, onPress }: { item: ImportHistoryItem; isLast: boolean; onPress: () => void }) {
  const theme = useTheme();
  const hasIssues = item.status === 'completed_with_issues';
  const Icon = hasIssues ? TriangleAlert : CheckCircle2;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open import ${item.fileName}`} onPress={onPress} className={cn('flex-row items-center gap-3 py-4 active:opacity-60', !isLast && 'border-b border-border')}>
      <View className="h-11 w-11 items-center justify-center rounded-full bg-muted"><Icon size={20} color={hasIssues ? theme.warning : theme.success} /></View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-base text-foreground" numberOfLines={1}>{item.fileName}</Text>
        <Text variant="caption">{item.unit} · {item.date}</Text>
        <Text className={cn('font-sans-semibold text-xs', hasIssues ? 'text-warning' : 'text-success')}>{hasIssues ? 'Needs attention' : 'Completed'}</Text>
        <Text variant="caption">{item.imported.toLocaleString()} imported · {item.rejected} rejected · {item.duplicates} duplicates</Text>
      </View>
      <ChevronRight size={18} color={theme.mutedForeground} />
    </Pressable>
  );
}

export function ImportHistoryScreen() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ImportHistoryItem | null>(null);
  const query = search.trim().toLowerCase();
  const items = DEMO_IMPORT_HISTORY.filter((item) => item.fileName.toLowerCase().includes(query) || item.unit.toLowerCase().includes(query) || item.importedBy.toLowerCase().includes(query));

  return (
    <PageScreen title="Import activity" footer={<Button label="New import" icon={Upload} variant="accent" shape="pill" fullWidth onPress={() => router.push('/members/import')} />}>
      <View className="gap-5">
        <Text variant="bodyMuted">Review what was imported, who imported it, and whether any records need attention.</Text>
        <SearchField value={search} onChangeText={setSearch} placeholder="Search files or units" />
        <View>{items.map((item, index) => <ImportRow key={item.id} item={item} isLast={index === items.length - 1} onPress={() => setSelected(item)} />)}</View>
        {items.length === 0 ? <Text variant="bodyMuted" className="py-16 text-center">No import activity found.</Text> : null}
      </View>
      <ImportDetailSheet item={selected} onClose={() => setSelected(null)} />
    </PageScreen>
  );
}

function ImportDetailSheet({ item, onClose }: { item: ImportHistoryItem | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  if (!item) return null;
  const hasIssues = item.status === 'completed_with_issues';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-backdrop/60">
        <Pressable accessibilityRole="button" accessibilityLabel="Close import details" onPress={onClose} className="flex-1" />
        <View className="rounded-t-3xl bg-background px-5 pt-5" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-5 flex-row items-center justify-between">
            <View className="flex-1 gap-1"><Text variant="heading">Import summary</Text><Text variant="caption">{item.fileName}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close import details" onPress={onClose} className="h-11 w-11 items-center justify-center rounded-full bg-muted"><X size={20} color={theme.foreground} /></Pressable>
          </View>
          <Text variant="body">{item.unit}</Text>
          <Text variant="caption" className="mt-1">Imported by {item.importedBy} · {item.date}</Text>
          <Text className={cn('mt-4 font-sans-semibold text-sm', hasIssues ? 'text-warning' : 'text-success')}>{hasIssues ? 'Completed with issues' : 'Completed'}</Text>
          {([['Imported', item.imported], ['Rejected', item.rejected], ['Duplicates', item.duplicates]] as const).map(([label, value]) => <View key={label} className="flex-row items-center justify-between border-b border-border py-3"><Text variant="label">{label}</Text><Text variant="label">{value.toLocaleString()}</Text></View>)}
        </View>
      </View>
    </Modal>
  );
}
