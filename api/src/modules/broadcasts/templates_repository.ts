import type { EntityManager } from 'typeorm';

import { toSkipTake } from '../../common/http/pagination';
import { dataSource } from '../../config/database';

import type {
  ListTemplatesRequest,
  TemplateCategory,
  UpdateTemplateRequest,
} from './templates_types';

export interface TemplateRow {
  id: string;
  name: string;
  category: TemplateCategory;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

interface NewTemplate {
  organisationId: string;
  name: string;
  category: TemplateCategory;
  body: string;
  executiveId: string;
}

const TEMPLATE_COLUMNS = `t.id, t.name, t.category, t.body,
  t.created_at AS "createdAt", t.updated_at AS "updatedAt"`;

const likePattern = (search: string) => `%${search.replace(/[\\%_]/g, '\\$&')}%`;

const run = (manager?: EntityManager) => manager ?? dataSource.manager;

export const templatesRepository = {
  async list(organisationId: string, { search, category, ...page }: ListTemplatesRequest) {
    const params: unknown[] = [organisationId];
    const param = (value: unknown) => `$${params.push(value)}`;
    const clauses = ['t.organisation_id = $1', 't.archived_at IS NULL'];
    if (category) clauses.push(`t.category = ${param(category)}`);
    if (search) {
      const p = param(likePattern(search));
      clauses.push(`(t.name ILIKE ${p} OR t.body ILIKE ${p})`);
    }
    const where = `WHERE ${clauses.join(' AND ')}`;
    const { skip, take } = toSkipTake(page);
    const n = params.length;

    const [rows, [counted]] = await Promise.all([
      dataSource.query(
        `SELECT ${TEMPLATE_COLUMNS} FROM message_templates t ${where}
          ORDER BY t.updated_at DESC, t.id DESC LIMIT $${n + 1} OFFSET $${n + 2}`,
        [...params, take, skip],
      ) as Promise<TemplateRow[]>,
      dataSource.query(
        `SELECT count(*)::int AS total FROM message_templates t ${where}`,
        params,
      ) as Promise<{ total: number }[]>,
    ]);
    return { rows, total: counted?.total ?? 0 };
  },

  async find(organisationId: string, templateId: string, manager?: EntityManager) {
    const rows = (await run(manager).query(
      `SELECT ${TEMPLATE_COLUMNS} FROM message_templates t
        WHERE t.id = $1 AND t.organisation_id = $2 AND t.archived_at IS NULL`,
      [templateId, organisationId],
    )) as TemplateRow[];
    return rows[0] ?? null;
  },

  // Locks the row so a concurrent edit or archive waits for this transaction.
  async lock(organisationId: string, templateId: string, manager: EntityManager) {
    const rows = (await manager.query(
      `SELECT t.id, t.name FROM message_templates t
        WHERE t.id = $1 AND t.organisation_id = $2 AND t.archived_at IS NULL FOR UPDATE`,
      [templateId, organisationId],
    )) as { id: string; name: string }[];
    return rows[0] ?? null;
  },

  async nameExists(
    organisationId: string,
    name: string,
    manager: EntityManager,
    exceptId?: string,
  ) {
    const rows = (await manager.query(
      `SELECT 1 FROM message_templates
        WHERE organisation_id = $1 AND lower(name) = lower($2) AND archived_at IS NULL
          AND ($3::uuid IS NULL OR id <> $3) LIMIT 1`,
      [organisationId, name, exceptId ?? null],
    )) as unknown[];
    return rows.length > 0;
  },

  async insert(input: NewTemplate, manager: EntityManager) {
    const rows = (await manager.query(
      `INSERT INTO message_templates
         (organisation_id, name, category, body, created_by_executive_id, updated_by_executive_id)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING id, name, category, body, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [input.organisationId, input.name, input.category, input.body, input.executiveId],
    )) as TemplateRow[];
    return rows[0]!;
  },

  async update(
    templateId: string,
    changes: UpdateTemplateRequest,
    executiveId: string,
    manager: EntityManager,
  ) {
    const rows = (await manager.query(
      `UPDATE message_templates
          SET name = COALESCE($2, name), category = COALESCE($3, category),
              body = COALESCE($4, body), updated_by_executive_id = $5, updated_at = now()
        WHERE id = $1
        RETURNING id, name, category, body, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        templateId,
        changes.name ?? null,
        changes.category ?? null,
        changes.body ?? null,
        executiveId,
      ],
    )) as [TemplateRow[], number];
    return rows[0][0]!;
  },

  async archive(templateId: string, executiveId: string, manager: EntityManager) {
    await manager.query(
      `UPDATE message_templates
          SET archived_at = now(), updated_by_executive_id = $2, updated_at = now()
        WHERE id = $1`,
      [templateId, executiveId],
    );
  },
};
