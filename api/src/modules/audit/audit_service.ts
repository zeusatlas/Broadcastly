import type { EntityManager } from 'typeorm';

import { dataSource } from '../../config/database';

import type { AuditEventInput } from './audit_types';
import { AuditEvent } from './entities/audit_event_entity';
import { auditRepository } from './audit_repository';
import { resolvePeriod } from '../../common/http/period';
import { toPaginated } from '../../common/http/pagination';
import type { ListAuditEventsRequest } from './audit_types';

export const auditService = {
  // Pass the caller's transaction manager so the event commits or rolls back with the action.
  async record(event: AuditEventInput, manager: EntityManager = dataSource.manager): Promise<void> {
    await manager.getRepository(AuditEvent).save({
      action: event.action,
      outcome: event.outcome ?? 'success',
      actorExecutiveId: event.actorExecutiveId ?? null,
      actorPlatformAdminId: event.actorPlatformAdminId ?? null,
      targetType: event.targetType ?? null,
      targetId: event.targetId ?? null,
      requestId: event.requestId ?? null,
      ipAddress: event.ipAddress ?? null,
      metadata: event.metadata ?? {},
    });
  },

  async list(input: ListAuditEventsRequest) {
    const { page, pageSize, period, from, to, ...filters } = input;
    const { rows, total } = await auditRepository.list(
      { ...filters, range: resolvePeriod({ period, from, to }) },
      { page, pageSize },
    );
    return toPaginated(rows, total, { page, pageSize });
  },
};
