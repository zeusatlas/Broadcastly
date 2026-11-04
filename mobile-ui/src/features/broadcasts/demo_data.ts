import type { BroadcastDetail, BroadcastSummary } from './types';

// TODO(broadcasts API): sample data until the broadcasts module is mounted.

export const DEMO_BROADCASTS: BroadcastSummary[] = [
  {
    id: '1',
    title: 'Executive meeting — Saturday 9am',
    audience: 'Constituency executives',
    sentAt: '08:14',
    status: 'completed',
    delivered: 142,
    recipients: 146,
  },
  {
    id: '2',
    title: 'Membership dues reminder',
    audience: 'All members',
    sentAt: 'Today',
    status: 'pending_approval',
    delivered: 0,
    recipients: 8412,
  },
  {
    id: '3',
    title: 'Youth rally — venue update',
    audience: '3 electoral areas',
    sentAt: 'Fri 10:00',
    status: 'scheduled',
    delivered: 0,
    recipients: 2310,
  },
  {
    id: '4',
    title: 'Polling station verification notice',
    audience: '4 branches',
    sentAt: 'Yesterday',
    status: 'partially_failed',
    delivered: 1890,
    recipients: 2014,
  },
  {
    id: '5',
    title: 'Condolence message',
    audience: 'Branch executives',
    sentAt: 'Mon',
    status: 'draft',
    delivered: 0,
    recipients: 64,
  },
];

export const getDemoBroadcast = (id: string): BroadcastDetail => {
  const summary = DEMO_BROADCASTS.find((broadcast) => broadcast.id === id) ?? DEMO_BROADCASTS[0];

  return {
    ...summary,
    message:
      'Please take note of the latest constituency communication and make the necessary preparations.',
    estimatedSegments: 2,
    estimatedCost: summary.recipients * 2,
    // Only a partly failed send has failures; the rest of an unfinished count is still unknown.
    failed:
      summary.status === 'partially_failed'
        ? Math.max(summary.recipients - summary.delivered - 6, 0)
        : 0,
  };
};
