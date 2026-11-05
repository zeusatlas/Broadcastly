import type { EntityManager } from 'typeorm';

import { Organisation } from './entities/organisation_entity';
import { organisationRepository } from './organisation_repository';
import type {
  AccessIncludes,
  ActiveAccess,
  CreateAppointmentInput,
  PositionRecord,
  UnitRecord,
} from './organisation_types';

// Write methods take the caller's transaction manager, so a cross-module action
// (e.g. platform appointing a chairman) commits or rolls back as one unit.
export const organisationService = {
  getActiveAccess(memberId: string, include: AccessIncludes = {}): Promise<ActiveAccess> {
    return organisationRepository.findActiveAccess(memberId, include);
  },

  organisationNameExists(name: string, manager: EntityManager) {
    return organisationRepository.organisationNameExists(name, manager);
  },

  async createOrganisation(input: { name: string; type: string }, manager: EntityManager) {
    const organisation = await organisationRepository.insertOrganisation(input, manager);
    return { id: organisation.id };
  },

  lockOrganisation(organisationId: string, manager: EntityManager) {
    return organisationRepository.lockOrganisation(organisationId, manager);
  },

  async setOrganisationStatus(
    organisationId: string,
    status: 'active' | 'suspended',
    manager: EntityManager,
  ) {
    await manager.getRepository(Organisation).update({ id: organisationId }, { status });
  },

  async setOrganisationLogo(organisationId: string, logoPath: string | null, manager: EntityManager) {
    await manager.getRepository(Organisation).update({ id: organisationId }, { logoPath });
  },

  async setHeadTitle(organisationId: string, headTitle: string, manager: EntityManager) {
    await manager.getRepository(Organisation).update({ id: organisationId }, { headTitle });
  },

  hasActiveChairman(organisationId: string, manager: EntityManager) {
    return organisationRepository.hasActiveChairman(organisationId, manager);
  },

  async createAppointment(input: CreateAppointmentInput, manager: EntityManager) {
    const appointment = await organisationRepository.insertAppointment(input, manager);
    return { id: appointment.id };
  },

  findPosition: organisationRepository.findPosition,
  positionTitleExists: organisationRepository.positionTitleExists,
  findUnit: organisationRepository.findUnit,
  unitNameExists: organisationRepository.unitNameExists,
  lockAppointment: organisationRepository.lockAppointment,
  endAppointment: organisationRepository.endAppointment,
  grantPermissions: organisationRepository.insertGrants,

  async createPosition(input: Omit<PositionRecord, 'id' | 'isActive'>, manager: EntityManager) {
    const position = await organisationRepository.insertPosition(input, manager);
    return { id: position.id };
  },

  updatePosition: organisationRepository.updatePosition,

  async createUnit(input: Omit<UnitRecord, 'id' | 'status'>, manager: EntityManager) {
    const unit = await organisationRepository.insertUnit(input, manager);
    return { id: unit.id };
  },
};
