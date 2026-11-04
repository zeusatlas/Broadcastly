import { IsNull, type EntityManager } from 'typeorm';

import { dataSource } from '../../config/database';

import { Appointment } from './entities/appointment_entity';
import { Organisation } from './entities/organisation_entity';
import { OrganisationUnit } from './entities/organisation_unit_entity';
import { PermissionGrant } from './entities/permission_grant_entity';
import { Position } from './entities/position_entity';
import {
  CHAIRMAN_POSITION_ID,
  type ActiveAccess,
  type AccessIncludes,
  type AppointmentSummaryResponse,
  type AppointmentRecord,
  type CreateAppointmentInput,
  type PositionRecord,
  type UnitRecord,
} from './organisation_types';

interface AccessRow {
  hasActiveAppointment: boolean;
  holdsChairman: boolean;
  organisationWide: boolean;
  grantedPermissions: string[];
  scopeUnitIds: string[] | null;
  appointments: AppointmentSummaryResponse[] | null;
}

const ISO = 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"';

// Everything a member's active appointments give them, in one statement and one round trip.
// Scope: an organisation-wide appointment covers every unit of that organisation; a unit
// appointment covers that unit and its descendants. Scope and appointments are opt-in.
export const organisationRepository = {
  async findActiveAccess(memberId: string, include: AccessIncludes): Promise<ActiveAccess> {
    const [row] = (await dataSource.query(
      `WITH RECURSIVE active AS (
         SELECT a.id, a.organisation_id, a.unit_id, a.position_id, a.effective_from, a.effective_to
           FROM appointments a
          WHERE a.member_id = $1
            AND a.status = 'active'
            AND a.effective_from <= now()
            AND (a.effective_to IS NULL OR a.effective_to > now())
       ),
       scope AS (
         SELECT u.id FROM organisation_units u
           JOIN active ON active.unit_id IS NULL AND u.organisation_id = active.organisation_id
          WHERE $2
         UNION
         SELECT unit_id FROM active WHERE $2 AND unit_id IS NOT NULL
         UNION
         SELECT u.id FROM organisation_units u JOIN scope s ON u.parent_id = s.id
       )
       SELECT
         EXISTS (SELECT 1 FROM active) AS "hasActiveAppointment",
         EXISTS (SELECT 1 FROM active WHERE position_id = $4) AS "holdsChairman",
         EXISTS (SELECT 1 FROM active WHERE unit_id IS NULL) AS "organisationWide",
         COALESCE((SELECT array_agg(DISTINCT g.permission)
                     FROM permission_grants g JOIN active ON active.id = g.appointment_id
                    WHERE g.revoked_at IS NULL), '{}') AS "grantedPermissions",
         CASE WHEN $2 THEN COALESCE((SELECT array_agg(id) FROM scope), '{}') END AS "scopeUnitIds",
         CASE WHEN $3 THEN COALESCE((
           SELECT json_agg(json_build_object(
                    'id', active.id, 'positionTitle', p.title,
                    'organisationId', o.id, 'organisationName', o.name,
                    'unitId', u.id, 'unitName', u.name, 'unitType', u.type,
                    'effectiveFrom', to_char(active.effective_from AT TIME ZONE 'UTC', '${ISO}'),
                    'effectiveTo', to_char(active.effective_to AT TIME ZONE 'UTC', '${ISO}'))
                  ORDER BY active.effective_from)
             FROM active
             JOIN positions p ON p.id = active.position_id
             JOIN organisations o ON o.id = active.organisation_id
             LEFT JOIN organisation_units u ON u.id = active.unit_id), '[]') END AS "appointments"`,
      [memberId, include.scope === true, include.appointments === true, CHAIRMAN_POSITION_ID],
    )) as AccessRow[];

    return {
      hasActiveAppointment: row?.hasActiveAppointment ?? false,
      holdsChairman: row?.holdsChairman ?? false,
      organisationWide: row?.organisationWide ?? false,
      grantedPermissions: row?.grantedPermissions ?? [],
      scopeUnitIds: row?.scopeUnitIds ?? [],
      appointments: row?.appointments ?? [],
    };
  },

  async organisationNameExists(name: string, manager: EntityManager): Promise<boolean> {
    const rows = (await manager.query(
      `SELECT 1 FROM organisations WHERE lower(name) = lower($1) LIMIT 1`,
      [name],
    )) as unknown[];
    return rows.length > 0;
  },

  insertOrganisation(input: { name: string; type: string }, manager: EntityManager) {
    const organisations = manager.getRepository(Organisation);
    return organisations.save(organisations.create(input));
  },

  // Row lock: concurrent appointments to the same organisation wait for each other.
  lockOrganisation(organisationId: string, manager: EntityManager) {
    return manager.getRepository(Organisation).findOne({
      select: { id: true, status: true, logoPath: true },
      where: { id: organisationId },
      lock: { mode: 'pessimistic_write' },
    });
  },

  hasActiveChairman(organisationId: string, manager: EntityManager): Promise<boolean> {
    return manager.getRepository(Appointment).existsBy({
      organisationId,
      positionId: CHAIRMAN_POSITION_ID,
      status: 'active',
    });
  },

  insertAppointment(input: CreateAppointmentInput, manager: EntityManager) {
    const appointments = manager.getRepository(Appointment);
    return appointments.save(
      appointments.create({ ...input, status: 'active', effectiveFrom: new Date() }),
    );
  },

  // A position usable in this organisation: one of its own, or a built-in one.
  findPosition(organisationId: string, positionId: string, manager: EntityManager) {
    return manager.getRepository(Position).findOne({
      select: { id: true, organisationId: true, title: true, unitType: true, isActive: true },
      where: [
        { id: positionId, organisationId },
        { id: positionId, organisationId: IsNull() },
      ],
    }) as Promise<PositionRecord | null>;
  },

  async positionTitleExists(
    organisationId: string,
    title: string,
    manager: EntityManager,
    exceptId?: string,
  ) {
    const rows = (await manager.query(
      `SELECT 1 FROM positions
        WHERE (organisation_id = $1 OR organisation_id IS NULL) AND lower(title) = lower($2)
          AND ($3::uuid IS NULL OR id <> $3) LIMIT 1`,
      [organisationId, title, exceptId ?? null],
    )) as unknown[];
    return rows.length > 0;
  },

  insertPosition(input: Omit<PositionRecord, 'id' | 'isActive'>, manager: EntityManager) {
    const positions = manager.getRepository(Position);
    return positions.save(positions.create({ ...input, isActive: true }));
  },

  updatePosition(
    id: string,
    changes: { title?: string; isActive?: boolean },
    manager: EntityManager,
  ) {
    return manager.getRepository(Position).update({ id }, changes);
  },

  findUnit(organisationId: string, unitId: string, manager: EntityManager) {
    return manager.getRepository(OrganisationUnit).findOne({
      select: {
        id: true,
        organisationId: true,
        parentId: true,
        type: true,
        name: true,
        status: true,
      },
      where: { id: unitId, organisationId },
    }) as Promise<UnitRecord | null>;
  },

  async unitNameExists(
    organisationId: string,
    parentId: string | null,
    name: string,
    manager: EntityManager,
  ) {
    const rows = (await manager.query(
      `SELECT 1 FROM organisation_units
        WHERE organisation_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND lower(name) = lower($3)
        LIMIT 1`,
      [organisationId, parentId, name],
    )) as unknown[];
    return rows.length > 0;
  },

  insertUnit(input: Omit<UnitRecord, 'id' | 'status'>, manager: EntityManager) {
    const units = manager.getRepository(OrganisationUnit);
    return units.save(units.create({ ...input, status: 'active' }));
  },

  insertGrants(
    appointmentId: string,
    permissions: readonly string[],
    grantedByExecutiveId: string | null,
    manager: EntityManager,
  ) {
    if (permissions.length === 0) return Promise.resolve();
    const grants = manager.getRepository(PermissionGrant);
    return grants
      .insert(
        permissions.map((permission) => ({ appointmentId, permission, grantedByExecutiveId })),
      )
      .then(() => undefined);
  },

  // Row lock, so two managers ending the same appointment cannot interleave.
  lockAppointment(organisationId: string, appointmentId: string, manager: EntityManager) {
    return manager.getRepository(Appointment).findOne({
      select: {
        id: true,
        memberId: true,
        organisationId: true,
        positionId: true,
        unitId: true,
        status: true,
      },
      where: { id: appointmentId, organisationId },
      lock: { mode: 'pessimistic_write' },
    }) as Promise<AppointmentRecord | null>;
  },

  async endAppointment(
    appointmentId: string,
    endedByExecutiveId: string | null,
    endReason: string | null,
    manager: EntityManager,
  ) {
    await manager
      .getRepository(Appointment)
      .update(
        { id: appointmentId },
        { status: 'ended', effectiveTo: new Date(), endedByExecutiveId, endReason },
      );
    await manager
      .getRepository(PermissionGrant)
      .update(
        { appointmentId, revokedAt: IsNull() },
        { revokedAt: new Date(), revokedByExecutiveId: endedByExecutiveId },
      );
  },
};
