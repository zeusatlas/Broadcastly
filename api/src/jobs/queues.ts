import { Queue, type JobsOptions } from 'bullmq';

import { redis } from '../config/redis';

// Every background queue (FR-NOT-03). Names are stable identifiers stored in Redis: never rename one
// that has jobs in flight.
export const QUEUE_NAMES = {
  smsDispatch: 'sms-dispatch',
  deliveryReports: 'delivery-reports',
  memberImports: 'member-imports',
  email: 'email',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Controlled retries with backoff and failures kept for review (NFR-REL-02, FR-NOT-04).
// A job must be idempotent: a retry may run after a partial success (BR-13).
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1_000 },
  removeOnFail: false,
};

const queues = new Map<QueueName, Queue>();

// Created on first use so the API process opens no queue connections it does not need.
export function getQueue(name: QueueName): Queue {
  let queue = queues.get(name);

  if (!queue) {
    queue = new Queue(name, { connection: redis, defaultJobOptions: DEFAULT_JOB_OPTIONS });
    queues.set(name, queue);
  }

  return queue;
}

export async function closeQueues(): Promise<void> {
  await Promise.allSettled([...queues.values()].map((queue) => queue.close()));
  queues.clear();
}
