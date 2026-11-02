import type { EntityManager } from 'typeorm';

import { dataSource } from '../../config/database';

import { Appointment } from './entities/appointment_entity';
import { OrganisationalUnit } from './entities/organisational_unit_entity';
import {
  CONSTITUENCY_CHAIRMAN_POSITION_ID,
  CONSTITUENCY_UNIT_TYPE,
  type ActiveAccess,
  type AccessIncludes,
  type AppointmentSummaryResponse,
  type CreateAppointmentInput,
  type UnitSummary,
} from './organisation_types';

interface AccessRow {
  hasActiveAppointment: boolean;
  grantedPermissions: string[];
  scopeUnitIds: string[] | null;
  appointments: AppointmentSummaryResponse[] | null;
}

// Same ISO 8601 UTC format as every other timestamp the API returns.
const ISO = 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"';

// Everything a member's active appointments give them, in one statement and one round trip.
// "Active" = status active and today inside the effective dates. Scope and appointments are only
// computed when asked for: authorising a request needs scope, a profile needs appointments.
export const organisationRepository = {
  async findActiveAccess(memberId: string, include: AccessIncludes): Promise<ActiveAccess> {
    const [row] = (await dataSource.query(
      `WITH RECURSIVE active AS (
         SELECT a.id, a.unit_id, a.position_id, a.effective_from, a.effective_to
           FROM appointments a
          WHERE a.member_id = $1
            AND a.status = 'active'
            AND a.effective_from <= now()
            AND (a.effective_to IS NULL OR a.effective_to > now())
       ),
       scope AS (
         SELECT unit_id AS id FROM active WHERE $2
         UNION
         SELECT u.id FROM organisational_units u JOIN scope s ON u.parent_id = s.id
       )
       SELECT
         EXISTS (SELECT 1 FROM active) AS "hasActiveAppointment",
         COALESCE((SELECT array_agg(DISTINCT g.permission)
                     FROM permission_grants g JOIN active ON active.id = g.appointment_id
                    WHERE g.revoked_at IS NULL), '{}') AS "grantedPermissions",
         CASE WHEN $2 THEN COALESCE((SELECT array_agg(id) FROM scope), '{}') END AS "scopeUnitIds",
         CASE WHEN $3 THEN COALESCE((
           SELECT json_agg(json_build_object(
                    'id', active.id, 'positionTitle', p.title, 'unitId', u.id, 'unitName', u.name,
                    'unitType', u.type,
                    'effectiveFrom', to_char(active.effective_from AT TIME ZONE 'UTC', '${ISO}'),
                    'effectiveTo', to_char(active.effective_to AT TIME ZONE 'UTC', '${ISO}'))
                  ORDER BY active.effective_from)
             FROM active
             JOIN positions p ON p.id = active.position_id
             JOIN organisational_units u ON u.id = active.unit_id), '[]') END AS "appointments"`,
      [memberId, include.scope === true, include.appointments === true],
    )) as AccessRow[];

    return {
      hasActiveAppointment: row?.hasActiveAppointment ?? false,
      grantedPermissions: row?.grantedPermissions ?? [],
      scopeUnitIds: row?.scopeUnitIds ?? [],
      appointments: row?.appointments ?? [],
    };
  },

  async constituencyNameExists(name: string, manager: EntityManager): Promise<boolean> {
    const rows = (await manager.query(
      `SELECT 1 FROM organisational_units WHERE type = $1 AND lower(name) = lower($2) LIMIT 1`,
      [CONSTITUENCY_UNIT_TYPE, name],
    )) as unknown[];
    return rows.length > 0;
  },

  insertConstituency(name: string, manager: EntityManager) {
    const units = manager.getRepository(OrganisationalUnit);
    return units.save(units.create({ type: CONSTITUENCY_UNIT_TYPE, name, parentId: null }));
  },

  // Row lock: concurrent appointments to the same unit wait for each other.
  lockUnit(unitId: string, manager: EntityManager): Promise<UnitSummary | null> {
    return manager.getRepository(OrganisationalUnit).findOne({
      select: { id: true, type: true, status: true },
      where: { id: unitId },
      lock: { mode: 'pessimistic_write' },
    });
  },

  hasActiveChairman(unitId: string, manager: EntityManager): Promise<boolean> {
    return manager.getRepository(Appointment).existsBy({
      unitId,
      positionId: CONSTITUENCY_CHAIRMAN_POSITION_ID,
      status: 'active',
    });
  },

  insertAppointment(input: CreateAppointmentInput, manager: EntityManager) {
    const appointments = manager.getRepository(Appointment);
    return appointments.save(
      appointments.create({ ...input, status: 'active', effectiveFrom: new Date() }),
    );
  },
};
