import type { Paginated } from '../../common/http/pagination';
import type { RequestContext } from '../../common/http/request_context';
import { AUDIT_ACTIONS, auditService } from '../audit';
import { actorFrom, auditActor, type AccessContext } from '../auth';
import { broadcastsService } from '../broadcasts';
import { maskPhone } from '../members';

import { reportsRepository } from './reports_repository';
import type { DeliveryResponse, DeliveryRow, ListDeliveriesRequest } from './reports_types';

const HEADER = ['Member', 'Phone', 'Status', 'Error', 'Submitted at', 'Status at'];

const toResponse = (row: DeliveryRow): DeliveryResponse => ({
  ...row,
  phone: maskPhone(row.phone),
  status: row.status === 'sending' ? 'pending' : row.status,
});

// Quotes every cell and defuses spreadsheet formulas, so a member name cannot run as code (CSV injection).
function csvCell(value: unknown): string {
  const text = value instanceof Date ? value.toISOString() : String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export const reportsService = {
  async deliveries(
    auth: AccessContext,
    broadcastId: string,
    request: ListDeliveriesRequest,
  ): Promise<Paginated<DeliveryResponse>> {
    await broadcastsService.get(auth, broadcastId);
    const page = await reportsRepository.deliveries(broadcastId, request);
    return { ...page, items: page.items.map(toResponse) };
  },

  // FR-REP-07. Checks access and records the export before the first byte is streamed.
  async exportDeliveries(auth: AccessContext, broadcastId: string, context: RequestContext) {
    const broadcast = await broadcastsService.get(auth, broadcastId);
    await auditService.record({
      action: AUDIT_ACTIONS.reportExported,
      targetType: 'broadcast',
      targetId: broadcastId,
      metadata: { format: 'csv' },
      ...auditActor(actorFrom(auth, context)),
    });
    async function* lines() {
      yield `\uFEFF${HEADER.map(csvCell).join(',')}\r\n`;
      for await (const rows of reportsRepository.allDeliveries(broadcastId)) {
        yield rows
          .map(toResponse)
          .map((row) =>
            [row.memberName, row.phone, row.status, row.error, row.submittedAt, row.statusAt]
              .map(csvCell)
              .join(','),
          )
          .join('\r\n') + '\r\n';
      }
    }
    const slug =
      (broadcast.title ?? 'broadcast').replace(/[^A-Za-z0-9]+/g, '-').slice(0, 40) || 'broadcast';
    return { fileName: `${slug}-delivery-report.csv`, lines: lines() };
  },
};
