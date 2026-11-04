export type ReportStatus = 'completed' | 'partially_failed' | 'pending';

export interface ReportItem {
  id: string;
  title: string;
  audience: string;
  status: ReportStatus;
  submitted: number;
  delivered: number;
  failed: number;
  unknown: number;
  updatedAt: string;
}

// Temporary presentation data until delivery report endpoints are wired.
export const DEMO_REPORTS: ReportItem[] = [
  {
    id: 'report-1',
    title: 'Service update notice',
    audience: 'Customer support teams',
    status: 'completed',
    submitted: 146,
    delivered: 142,
    failed: 4,
    unknown: 0,
    updatedAt: 'Today, 08:20',
  },
  {
    id: 'report-2',
    title: 'Team meeting reminder',
    audience: 'Operations teams',
    status: 'partially_failed',
    submitted: 2014,
    delivered: 1890,
    failed: 98,
    unknown: 26,
    updatedAt: 'Yesterday, 15:40',
  },
  {
    id: 'report-3',
    title: 'Information update',
    audience: 'All departments',
    status: 'pending',
    submitted: 0,
    delivered: 0,
    failed: 0,
    unknown: 8412,
    updatedAt: 'Processing',
  },
];
