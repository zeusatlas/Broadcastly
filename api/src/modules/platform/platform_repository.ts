import { toSkipTake, type PageParams } from '../../common/http/pagination';
import { dataSource } from '../../config/database';
import type { ExecutiveStatus, UserRole } from '../auth';
import {
  CONSTITUENCY_CHAIRMAN_POSITION_ID,
  CONSTITUENCY_UNIT_TYPE,
  type UnitStatus,
} from '../organisation';

import type { PlatformOverviewResponse } from './platform_types';

// Read models for the admin screens. Lean raw SQL across modules' tables: one round trip each,
// only the columns the responses return (AGENTS.md §8). Writes go through the owning services.

export interface ExecutiveRow {
  id: string;
  memberId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: ExecutiveStatus;
  lastSignInAt: Date | null;
  createdAt: Date;
}

export interface ConstituencyRow {
  id: string;
  name: string;
  status: UnitStatus;
  createdAt: Date;
  updatedAt: Date;
  // Null when the constituency has no active chairman.
  chairman: (ExecutiveRow & { appointmentId: string; appointedAt: Date }) | null;
}

const EXECUTIVE_COLUMNS = `
  e.id, m.id AS "memberId", m.first_name AS "firstName", m.middle_name AS "middleName",
  m.last_name AS "lastName", e.email, m.phone, e.role, e.status,
  e.last_sign_in_at AS "lastSignInAt", e.created_at AS "createdAt"`;

// $1 = chairman position id, $2 = constituency unit type. Callers append WHERE / ORDER / LIMIT.
const CONSTITUENCY_SELECT = `
  SELECT u.id, u.name, u.status, u.created_at AS "createdAt", u.updated_at AS "updatedAt",
         CASE WHEN c.id IS NULL THEN NULL ELSE to_jsonb(c) END AS chairman
    FROM organisational_units u
    LEFT JOIN LATERAL (
      SELECT ${EXECUTIVE_COLUMNS}, a.id AS "appointmentId", a.effective_from AS "appointedAt"
        FROM appointments a
        JOIN members m ON m.id = a.member_id
        JOIN executives e ON e.member_id = a.member_id
       WHERE a.unit_id = u.id AND a.position_id = $1 AND a.status = 'active'
       LIMIT 1
    ) c ON true
   WHERE u.type = $2 AND u.parent_id IS NULL`;

// Escapes LIKE wildcards so a search for "50%" matches the text, not everything.
const likePattern = (search: string) => `%${search.replace(/[\\%_]/g, '\\$&')}%`;

export const platformRepository = {
  async getOverview(): Promise<PlatformOverviewResponse> {
    const [row] = (await dataSource.query(
      `SELECT
         (SELECT count(*) FROM organisational_units WHERE type = $2 AND parent_id IS NULL)::int
           AS "constituencies",
         (SELECT count(*) FROM organisational_units u
           WHERE u.type = $2 AND u.parent_id IS NULL
             AND NOT EXISTS (SELECT 1 FROM appointments a
                              WHERE a.unit_id = u.id AND a.position_id = $1 AND a.status = 'active'))::int
           AS "constituenciesWithoutChairman",
         (SELECT count(*) FROM executives WHERE role = 'constituency_chairman' AND status = 'active')::int
           AS "activeChairmen",
         (SELECT count(*) FROM executives WHERE role <> 'platform_admin' AND status = 'active')::int
           AS "activeExecutives",
         (SELECT count(*) FROM executives WHERE role = 'platform_admin' AND status = 'active')::int
           AS "platformAdmins"`,
      [CONSTITUENCY_CHAIRMAN_POSITION_ID, CONSTITUENCY_UNIT_TYPE],
    )) as PlatformOverviewResponse[];

    return row!;
  },

  async listConstituencies(search: string | undefined, page: PageParams) {
    const { skip, take } = toSkipTake(page);
    const pattern = search ? [likePattern(search)] : [];

    const [rows, [count]] = await Promise.all([
      dataSource.query(
        `${CONSTITUENCY_SELECT} ${search ? 'AND u.name ILIKE $5' : ''}
         ORDER BY u.name, u.id LIMIT $3 OFFSET $4`,
        [CONSTITUENCY_CHAIRMAN_POSITION_ID, CONSTITUENCY_UNIT_TYPE, take, skip, ...pattern],
      ) as Promise<ConstituencyRow[]>,
      dataSource.query(
        `SELECT count(*)::int AS total FROM organisational_units u
          WHERE u.type = $1 AND u.parent_id IS NULL ${search ? 'AND u.name ILIKE $2' : ''}`,
        [CONSTITUENCY_UNIT_TYPE, ...pattern],
      ) as Promise<{ total: number }[]>,
    ]);

    return { rows, total: count?.total ?? 0 };
  },

  async findConstituency(id: string): Promise<ConstituencyRow | null> {
    const [row] = (await dataSource.query(`${CONSTITUENCY_SELECT} AND u.id = $3`, [
      CONSTITUENCY_CHAIRMAN_POSITION_ID,
      CONSTITUENCY_UNIT_TYPE,
      id,
    ])) as ConstituencyRow[];
    return row ?? null;
  },

  async findExecutive(id: string): Promise<ExecutiveRow | null> {
    const [row] = (await dataSource.query(
      `SELECT ${EXECUTIVE_COLUMNS} FROM executives e JOIN members m ON m.id = e.member_id
        WHERE e.id = $1`,
      [id],
    )) as ExecutiveRow[];
    return row ?? null;
  },

  async listExecutivesByRole(role: UserRole, page: PageParams) {
    const { skip, take } = toSkipTake(page);
    const [rows, [count]] = await Promise.all([
      dataSource.query(
        `SELECT ${EXECUTIVE_COLUMNS} FROM executives e JOIN members m ON m.id = e.member_id
          WHERE e.role = $1 ORDER BY m.first_name, m.last_name, e.id LIMIT $2 OFFSET $3`,
        [role, take, skip],
      ) as Promise<ExecutiveRow[]>,
      dataSource.query(`SELECT count(*)::int AS total FROM executives WHERE role = $1`, [
        role,
      ]) as Promise<{ total: number }[]>,
    ]);

    return { rows, total: count?.total ?? 0 };
  },
};
