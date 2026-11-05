import { QueryFailedError, type EntityManager } from 'typeorm';

import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors/app_error';
import { toPaginated, type Paginated } from '../../common/http/pagination';
import type { RequestContext } from '../../common/http/request_context';
import { dataSource } from '../../config/database';
import { AUDIT_ACTIONS, auditService, type AuditAction } from '../audit';
import { actorFrom, auditActor, type AccessContext } from '../auth';

import { toTemplateResponse } from './templates_mapper';
import { templatesRepository } from './templates_repository';
import type {
  CreateTemplateRequest,
  ListTemplatesRequest,
  TemplateResponse,
  UpdateTemplateRequest,
} from './templates_types';

const TEMPLATE_NOT_FOUND = 'Template not found.';
const NAME_TAKEN = 'A template with this name already exists.';
const UNIQUE_VIOLATION = '23505';

// Templates belong to the organisation, not a unit; platform admins have no organisation to act in.
function executiveOf(auth: AccessContext) {
  if (auth.kind !== 'executive' || !auth.organisationId) {
    throw new ForbiddenError('Only an organisation’s executives can do that.');
  }
  return { organisationId: auth.organisationId, executiveId: auth.accountId };
}

const nameTaken = () => new ConflictError(NAME_TAKEN, { errors: { name: [NAME_TAKEN] } });

// Two saves with the same name can race past the check; the partial unique index keeps one.
async function guardName<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
    ) {
      throw nameTaken();
    }
    throw error;
  }
}

function record(
  action: AuditAction,
  templateId: string,
  metadata: Record<string, unknown>,
  auth: AccessContext,
  context: RequestContext,
  manager: EntityManager,
) {
  return auditService.record(
    {
      action,
      targetType: 'message_template',
      targetId: templateId,
      metadata,
      ...auditActor(actorFrom(auth, context)),
    },
    manager,
  );
}

export const templatesService = {
  async list(
    auth: AccessContext,
    query: ListTemplatesRequest,
  ): Promise<Paginated<TemplateResponse>> {
    const { organisationId } = executiveOf(auth);
    const { rows, total } = await templatesRepository.list(organisationId, query);
    return toPaginated(rows.map(toTemplateResponse), total, query);
  },

  async get(auth: AccessContext, templateId: string): Promise<TemplateResponse> {
    const { organisationId } = executiveOf(auth);
    const row = await templatesRepository.find(organisationId, templateId);
    if (!row) throw new NotFoundError(TEMPLATE_NOT_FOUND);
    return toTemplateResponse(row);
  },

  async create(
    auth: AccessContext,
    input: CreateTemplateRequest,
    context: RequestContext,
  ): Promise<TemplateResponse> {
    const { organisationId, executiveId } = executiveOf(auth);
    const row = await guardName(() =>
      dataSource.transaction(async (manager) => {
        if (await templatesRepository.nameExists(organisationId, input.name, manager)) {
          throw nameTaken();
        }
        const created = await templatesRepository.insert(
          { organisationId, executiveId, ...input },
          manager,
        );
        await record(
          AUDIT_ACTIONS.templateCreated,
          created.id,
          { category: input.category },
          auth,
          context,
          manager,
        );
        return created;
      }),
    );
    return toTemplateResponse(row);
  },

  async update(
    auth: AccessContext,
    templateId: string,
    changes: UpdateTemplateRequest,
    context: RequestContext,
  ): Promise<TemplateResponse> {
    const { organisationId, executiveId } = executiveOf(auth);
    const row = await guardName(() =>
      dataSource.transaction(async (manager) => {
        if (!(await templatesRepository.lock(organisationId, templateId, manager))) {
          throw new NotFoundError(TEMPLATE_NOT_FOUND);
        }
        if (
          changes.name &&
          (await templatesRepository.nameExists(organisationId, changes.name, manager, templateId))
        ) {
          throw nameTaken();
        }
        const updated = await templatesRepository.update(templateId, changes, executiveId, manager);
        await record(
          AUDIT_ACTIONS.templateUpdated,
          templateId,
          { changes: Object.keys(changes) },
          auth,
          context,
          manager,
        );
        return updated;
      }),
    );
    return toTemplateResponse(row);
  },

  async archive(auth: AccessContext, templateId: string, context: RequestContext): Promise<void> {
    const { organisationId, executiveId } = executiveOf(auth);
    await dataSource.transaction(async (manager) => {
      if (!(await templatesRepository.lock(organisationId, templateId, manager))) {
        throw new NotFoundError(TEMPLATE_NOT_FOUND);
      }
      await templatesRepository.archive(templateId, executiveId, manager);
      await record(AUDIT_ACTIONS.templateArchived, templateId, {}, auth, context, manager);
    });
  },
};
