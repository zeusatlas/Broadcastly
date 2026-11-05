import type { EntityManager } from 'typeorm';

import { toPaginated, toSkipTake, type Paginated } from '../../common/http/pagination';
import { dataSource } from '../../config/database';

import type {
  ListNotificationsRequest,
  NewNotification,
  NotificationResponse,
  NotificationType,
} from './notifications_types';

// Which organisation preference switches each kind of notification on or off.
const PREFERENCE_OF: Record<NotificationType, 'approvals' | 'broadcasts' | 'imports'> = {
  approval_request: 'approvals',
  approval_decision: 'approvals',
  import_completed: 'imports',
  broadcast_delivered: 'broadcasts',
  broadcast_partially_failed: 'broadcasts',
  broadcast_failed: 'broadcasts',
};

const SELECT = `SELECT id, type, title, body, broadcast_id AS "broadcastId", read_at IS NOT NULL AS "isRead",
                       created_at AS "createdAt" FROM notifications`;

export const notificationsRepository = {
  async insert(notification: NewNotification, manager: EntityManager): Promise<void> {
    if (notification.executiveIds.length === 0) return;
    // Skipped when the organisation turned this category off (no preferences row = everything on).
    await manager.query(
      `INSERT INTO notifications (organisation_id, executive_id, type, title, body, broadcast_id)
       SELECT $1, executive_id, $3, $4, $5, $6 FROM unnest($2::uuid[]) AS executive_id
        WHERE COALESCE((SELECT (p.preferences ->> $7)::boolean FROM organisation_notification_preferences p
                         WHERE p.organisation_id = $1), TRUE)`,
      [
        notification.organisationId,
        [...new Set(notification.executiveIds)],
        notification.type,
        notification.title.slice(0, 150),
        notification.body.slice(0, 500),
        notification.broadcastId ?? null,
        PREFERENCE_OF[notification.type],
      ],
    );
  },

  async list(
    executiveId: string,
    request: ListNotificationsRequest,
  ): Promise<Paginated<NotificationResponse>> {
    const params: unknown[] = [executiveId];
    const clauses = ['executive_id = $1'];
    if (request.status === 'unread') clauses.push('read_at IS NULL');
    if (request.status === 'read') clauses.push('read_at IS NOT NULL');
    if (request.search) {
      params.push(`%${request.search.replace(/[\\%_]/g, '\\$&')}%`);
      clauses.push(`(title ILIKE $${params.length} OR body ILIKE $${params.length})`);
    }
    const where = `WHERE ${clauses.join(' AND ')}`;
    const { skip, take } = toSkipTake(request);
    const n = params.length;
    const [items, [count]] = await Promise.all([
      dataSource.query(
        `${SELECT} ${where} ORDER BY created_at DESC, id DESC LIMIT $${n + 1} OFFSET $${n + 2}`,
        [...params, take, skip],
      ) as Promise<NotificationResponse[]>,
      dataSource.query(
        `SELECT count(*)::int AS total FROM notifications ${where}`,
        params,
      ) as Promise<{ total: number }[]>,
    ]);
    return toPaginated(items, count?.total ?? 0, request);
  },

  async unreadCount(executiveId: string): Promise<number> {
    const [row] = (await dataSource.query(
      `SELECT count(*)::int AS unread FROM notifications WHERE executive_id = $1 AND read_at IS NULL`,
      [executiveId],
    )) as { unread: number }[];
    return row?.unread ?? 0;
  },

  async markRead(
    executiveId: string,
    notificationId: string,
  ): Promise<NotificationResponse | null> {
    const [rows] = (await dataSource.query(
      `UPDATE notifications SET read_at = COALESCE(read_at, now()), updated_at = now()
        WHERE id = $1 AND executive_id = $2
        RETURNING id, type, title, body, broadcast_id AS "broadcastId", TRUE AS "isRead", created_at AS "createdAt"`,
      [notificationId, executiveId],
    )) as [NotificationResponse[], number];
    return rows[0] ?? null;
  },

  async markAllRead(executiveId: string): Promise<number> {
    const [, affected] = (await dataSource.query(
      `UPDATE notifications SET read_at = now(), updated_at = now() WHERE executive_id = $1 AND read_at IS NULL`,
      [executiveId],
    )) as [unknown, number];
    return affected;
  },
};
