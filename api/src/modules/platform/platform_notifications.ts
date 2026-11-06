import { NotFoundError } from '../../common/errors/app_error';
import { toPaginated, toSkipTake, type Paginated } from '../../common/http/pagination';
import { dataSource } from '../../config/database';
import { AUDIT_ACTIONS } from '../audit';
import type { AccessPermission } from '../auth';
import { CHAIRMAN_POSITION_ID } from '../organisation';

import type {
  ListPlatformNotificationsRequest,
  PlatformNotificationResponse,
  PlatformNotificationType,
} from './platform_types';

const A = AUDIT_ACTIONS;

// Which audit actions become a notification, and the permission (if any) needed to see them.
const SOURCES: { action: string; permission?: AccessPermission; setting?: string }[] = [
  { action: A.organisationCreated },
  { action: A.organisationSuspended },
  { action: A.organisationReactivated },
  { action: A.headReplaced },
  { action: A.appointmentCreated },
  { action: A.creditPurchaseCompleted, permission: 'platform.finance.view', setting: 'payments' },
  { action: A.creditPurchaseFailed, permission: 'platform.finance.view', setting: 'payments' },
  { action: A.creditAdjusted, permission: 'platform.credit.manage' },
  { action: A.platformAdminCreated, permission: 'platform.admin.manage' },
  { action: A.platformAdminSuspended, permission: 'platform.admin.manage' },
  { action: A.platformAdminReactivated, permission: 'platform.admin.manage' },
  { action: A.platformAdminPermissionsChanged, permission: 'platform.admin.manage' },
  { action: A.accountLocked, permission: 'platform.audit.view', setting: 'security' },
  { action: A.refreshTokenReused, permission: 'platform.audit.view', setting: 'security' },
];

interface Row {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  actor: string | null;
  organisationId: string | null;
  organisationName: string | null;
  targetAdmin: string | null;
  isRead: boolean;
}

interface Viewer {
  adminId: string;
  permissions: ReadonlySet<AccessPermission>;
}

async function visibleActions({ permissions }: Viewer) {
  const [settings] = (await dataSource.query(
    `SELECT notification_preferences AS prefs FROM platform_settings LIMIT 1`,
  )) as { prefs: Record<string, boolean> }[];
  const prefs = settings?.prefs ?? {};
  return SOURCES.filter(
    (source) =>
      (!source.permission || permissions.has(source.permission)) &&
      (!source.setting || prefs[source.setting] !== false),
  ).map((source) => source.action);
}

// $1 admin id, $2 actions, $3 head position id. Head appointments only, never every executive.
const FROM = `
    FROM audit_events ae
    JOIN platform_admins me ON me.id = $1
    LEFT JOIN platform_admins pa ON pa.id = ae.actor_platform_admin_id
    LEFT JOIN organisation_executives e ON e.id = ae.actor_executive_id
    LEFT JOIN members m ON m.id = e.member_id
    LEFT JOIN organisations o ON o.id::text = COALESCE(ae.metadata ->> 'organisationId',
      CASE WHEN ae.target_type = 'organisation' THEN ae.target_id::text END)
    LEFT JOIN platform_admins tpa ON ae.target_type = 'platform_admin' AND tpa.id = ae.target_id
    LEFT JOIN platform_notification_reads r ON r.audit_event_id = ae.id AND r.platform_admin_id = me.id
   WHERE ae.created_at >= me.created_at
     AND ae.actor_platform_admin_id IS DISTINCT FROM me.id
     AND ae.action = ANY($2)
     AND (ae.action <> '${A.appointmentCreated}' OR ae.metadata ->> 'positionId' = $3)`;

const ACTOR = `COALESCE(pa.first_name || ' ' || pa.last_name, m.first_name || ' ' || m.last_name)`;
const IS_READ = `(ae.created_at <= COALESCE(me.notifications_read_at, '-infinity') OR r.audit_event_id IS NOT NULL)`;

const n = (value: unknown) => Number(value ?? 0).toLocaleString('en-GB');

function describe(row: Row): { type: PlatformNotificationType; title: string; body: string } {
  const org = row.organisationName ?? 'An organisation';
  const who = row.actor ?? 'Someone';
  const target = row.targetAdmin ?? 'an admin';
  switch (row.action) {
    case A.creditPurchaseCompleted:
      return {
        type: 'purchase',
        title: 'Credits bought',
        body: `${org} bought ${n(row.metadata.credits)} credits.`,
      };
    case A.creditPurchaseFailed:
      return {
        type: 'purchase_failed',
        title: 'Payment failed',
        body: `A payment from ${org} for ${n(row.metadata.credits)} credits did not go through.`,
      };
    case A.creditAdjusted: {
      const amount = Number(row.metadata.amount ?? 0);
      const verb =
        amount >= 0 ? `added ${n(amount)} credits to` : `removed ${n(-amount)} credits from`;
      return { type: 'credits', title: 'Credits adjusted', body: `${who} ${verb} ${org}.` };
    }
    case A.organisationCreated:
      return {
        type: 'organisation',
        title: 'New organisation',
        body: row.actor ? `${row.actor} added ${org}.` : `${org} was added.`,
      };
    case A.organisationSuspended:
      return {
        type: 'organisation_suspended',
        title: 'Organisation suspended',
        body: row.actor ? `${row.actor} suspended ${org}.` : `${org} was suspended.`,
      };
    case A.organisationReactivated:
      return {
        type: 'organisation',
        title: 'Organisation reactivated',
        body: row.actor ? `${row.actor} reactivated ${org}.` : `${org} was reactivated.`,
      };
    case A.appointmentCreated:
      return {
        type: 'head',
        title: 'Head appointed',
        body: `${org} has its head and can start sending.`,
      };
    case A.headReplaced:
      return { type: 'head', title: 'Head replaced', body: `${org} has a new head.` };
    case A.platformAdminCreated:
      return { type: 'admin', title: 'New admin', body: `${who} added ${target} as an admin.` };
    case A.platformAdminSuspended:
      return { type: 'admin', title: 'Admin suspended', body: `${who} suspended ${target}.` };
    case A.platformAdminReactivated:
      return { type: 'admin', title: 'Admin reactivated', body: `${who} reactivated ${target}.` };
    case A.platformAdminPermissionsChanged:
      return {
        type: 'admin',
        title: 'Admin permissions changed',
        body: `${who} changed what ${target} can do.`,
      };
    case A.accountLocked:
      return {
        type: 'security',
        title: 'Account locked',
        body: `${who} was locked out after too many wrong sign-in attempts.`,
      };
    default:
      return {
        type: 'security',
        title: 'Session ended',
        body: `A sign-in for ${who} was reused, so that session was ended.`,
      };
  }
}

// An admin's notifications are what other people did that this admin may see (by permission),
// since the admin joined. Nothing new is recorded: they come straight from the audit log.
export const platformNotifications = {
  async list(
    viewer: Viewer,
    { status, search, ...page }: ListPlatformNotificationsRequest,
  ): Promise<Paginated<PlatformNotificationResponse>> {
    const params: unknown[] = [viewer.adminId, await visibleActions(viewer), CHAIRMAN_POSITION_ID];
    const clauses: string[] = [];
    if (status) clauses.push(status === 'read' ? IS_READ : `NOT ${IS_READ}`);
    if (search) {
      params.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`);
      clauses.push(`(o.name ILIKE $${params.length} OR ${ACTOR} ILIKE $${params.length})`);
    }
    const where = `${FROM} ${clauses.map((clause) => `AND ${clause}`).join(' ')}`;
    const { skip, take } = toSkipTake(page);
    const [rows, [counted]] = await Promise.all([
      dataSource.query(
        `SELECT ae.id, ae.action, ae.metadata, ae.created_at AS "createdAt", ${ACTOR} AS actor,
                o.id AS "organisationId", o.name AS "organisationName",
                tpa.first_name || ' ' || tpa.last_name AS "targetAdmin", ${IS_READ} AS "isRead"
         ${where} ORDER BY ae.created_at DESC, ae.id
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, take, skip],
      ) as Promise<Row[]>,
      dataSource.query(`SELECT count(*)::int AS total ${where}`, params) as Promise<
        { total: number }[]
      >,
    ]);
    const items = rows.map((row) => ({
      id: row.id,
      ...describe(row),
      organisationId: row.organisationId,
      isRead: row.isRead,
      createdAt: row.createdAt,
    }));
    return toPaginated(items, counted?.total ?? 0, page);
  },

  async unreadCount(viewer: Viewer): Promise<{ unread: number }> {
    const [row] = (await dataSource.query(
      `SELECT count(*)::int AS unread ${FROM} AND NOT ${IS_READ}`,
      [viewer.adminId, await visibleActions(viewer), CHAIRMAN_POSITION_ID],
    )) as { unread: number }[];
    return { unread: row?.unread ?? 0 };
  },

  async markRead(viewer: Viewer, notificationId: string) {
    const inserted = (await dataSource.query(
      `INSERT INTO platform_notification_reads (platform_admin_id, audit_event_id)
       SELECT $1, id FROM audit_events WHERE id = $2
       ON CONFLICT DO NOTHING RETURNING audit_event_id`,
      [viewer.adminId, notificationId],
    )) as unknown[];
    if (inserted.length === 0) {
      const [exists] = (await dataSource.query(`SELECT 1 FROM audit_events WHERE id = $1`, [
        notificationId,
      ])) as unknown[];
      if (!exists) throw new NotFoundError('Notification not found.');
    }
    return platformNotifications.unreadCount(viewer);
  },

  async markAllRead(viewer: Viewer) {
    await dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE platform_admins SET notifications_read_at = now() WHERE id = $1`,
        [viewer.adminId],
      );
      await manager.query(`DELETE FROM platform_notification_reads WHERE platform_admin_id = $1`, [
        viewer.adminId,
      ]);
    });
    return { unread: 0 };
  },
};
