export interface ApprovalItem {
  id: string;
  title: string;
  audience: string;
  creator: string;
  submittedAt: string;
  recipients: number;
  segments: number;
  estimatedCost: number;
  message: string;
  submittedPeriod: 'today' | 'earlier';
}

// Temporary presentation data until the approval queue endpoint is wired.
export const DEMO_APPROVALS: ApprovalItem[] = [
  {
    id: 'approval-1',
    title: 'Membership dues reminder',
    audience: 'All members',
    creator: 'Ama Mensah',
    submittedAt: 'Today, 09:12',
    recipients: 8412,
    segments: 2,
    estimatedCost: 16824,
    message: 'Please take note of the membership dues reminder and the payment deadline.',
    submittedPeriod: 'today',
  },
  {
    id: 'approval-2',
    title: 'Service update notice',
    audience: 'Customer support teams',
    creator: 'Kwame Owusu',
    submittedAt: 'Yesterday, 16:40',
    recipients: 146,
    segments: 1,
    estimatedCost: 146,
    message: 'Please review the latest service update before your next team briefing.',
    submittedPeriod: 'earlier',
  },
];
