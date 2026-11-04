export type ImportHistoryStatus = 'completed' | 'completed_with_issues';

export interface ImportHistoryItem {
  id: string;
  fileName: string;
  unit: string;
  importedBy: string;
  date: string;
  status: ImportHistoryStatus;
  imported: number;
  rejected: number;
  duplicates: number;
}

// Temporary presentation data until import history endpoints are wired.
export const DEMO_IMPORT_HISTORY: ImportHistoryItem[] = [
  { id: 'import-1', fileName: 'customer-support-members.xlsx', unit: 'Customer Support', importedBy: 'Ama Mensah', date: 'Today, 10:42', status: 'completed_with_issues', imported: 1204, rejected: 12, duplicates: 4 },
  { id: 'import-2', fileName: 'operations-directory.csv', unit: 'Operations', importedBy: 'Kwame Owusu', date: 'Yesterday, 15:20', status: 'completed', imported: 386, rejected: 0, duplicates: 2 },
];
