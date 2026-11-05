import { toPaginated, toSkipTake, type Paginated } from '../../common/http/pagination';
import { dataSource } from '../../config/database';

import type { DeliveryRow, ListDeliveriesRequest } from './reports_types';

const SELECT = `
  SELECT r.id, NULLIF(TRIM(CONCAT(m.first_name, ' ', m.last_name)), '') AS "memberName", r.phone, r.status,
         r.error, r.submitted_at AS "submittedAt", r.status_at AS "statusAt"
    FROM broadcast_recipients r LEFT JOIN members m ON m.id = r.member_id`;

export const reportsRepository = {
  async deliveries(
    broadcastId: string,
    request: ListDeliveriesRequest,
  ): Promise<Paginated<DeliveryRow>> {
    const params: unknown[] = [broadcastId];
    // 'sending' is an internal hand-over state; reports show it as pending.
    const status =
      request.status === 'pending'
        ? `AND r.status IN ('pending', 'sending')`
        : request.status
          ? `AND r.status = $${params.push(request.status)}`
          : '';
    const where = `WHERE r.broadcast_id = $1 ${status}`;
    const { skip, take } = toSkipTake(request);
    const n = params.length;
    const [items, [count]] = await Promise.all([
      dataSource.query(
        `${SELECT} ${where} ORDER BY r.status, m.last_name, r.id LIMIT $${n + 1} OFFSET $${n + 2}`,
        [...params, take, skip],
      ) as Promise<DeliveryRow[]>,
      dataSource.query(
        `SELECT count(*)::int AS total FROM broadcast_recipients r ${where}`,
        params,
      ) as Promise<{ total: number }[]>,
    ]);
    return toPaginated(items, count?.total ?? 0, request);
  },

  // Batches of rows for the export, so a large broadcast never sits in memory at once.
  async *allDeliveries(broadcastId: string, batchSize = 1_000): AsyncGenerator<DeliveryRow[]> {
    let lastId = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows = (await dataSource.query(
        `${SELECT} WHERE r.broadcast_id = $1 AND r.id > $2 ORDER BY r.id LIMIT $3`,
        [broadcastId, lastId, batchSize],
      )) as DeliveryRow[];
      if (rows.length === 0) return;
      yield rows;
      lastId = rows[rows.length - 1]!.id;
    }
  },
};
