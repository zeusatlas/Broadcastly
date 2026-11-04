import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { SearchField, Text } from '@/components/ui';

import { ReportDetailSheet } from '../components/ReportDetailSheet';
import { ReportRow } from '../components/ReportRow';
import { DEMO_REPORTS, type ReportItem } from '../reports_data';

export function ReportsSearchScreen() {
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const query = search.trim().toLowerCase();
  const reports = useMemo(() => DEMO_REPORTS.filter((report) => report.title.toLowerCase().includes(query) || report.audience.toLowerCase().includes(query)), [query]);

  return (
    <PageScreen backIcon={X} backLabel="Close search">
      <View className="gap-4">
        <SearchField autoFocus value={search} onChangeText={setSearch} placeholder="Search reports" className="h-14" />
        <Text variant="caption">{reports.length} {reports.length === 1 ? 'report' : 'reports'} found</Text>
        <View>{reports.map((report, index) => <ReportRow key={report.id} report={report} isLast={index === reports.length - 1} onPress={() => setSelectedReport(report)} />)}</View>
        {reports.length === 0 ? <Text variant="bodyMuted" className="py-16 text-center">No reports match your search.</Text> : null}
      </View>
      <ReportDetailSheet report={selectedReport} onClose={() => setSelectedReport(null)} />
    </PageScreen>
  );
}
