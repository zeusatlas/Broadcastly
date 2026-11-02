import type { EntityManager } from 'typeorm';

import { organisationRepository } from './organisation_repository';
import type {
  AccessIncludes,
  ActiveAccess,
  CreateAppointmentInput,
  UnitSummary,
} from './organisation_types';

// Write methods take the caller's transaction manager, so a cross-module action
// (e.g. platform appointing a chairman) commits or rolls back as one unit.
export const organisationService = {
  getActiveAccess(memberId: string, include: AccessIncludes = {}): Promise<ActiveAccess> {
    return organisationRepository.findActiveAccess(memberId, include);
  },

  constituencyNameExists(name: string, manager: EntityManager) {
    return organisationRepository.constituencyNameExists(name, manager);
  },

  async createConstituency(name: string, manager: EntityManager): Promise<{ id: string }> {
    const unit = await organisationRepository.insertConstituency(name, manager);
    return { id: unit.id };
  },

  lockUnit(unitId: string, manager: EntityManager): Promise<UnitSummary | null> {
    return organisationRepository.lockUnit(unitId, manager);
  },

  hasActiveChairman(unitId: string, manager: EntityManager) {
    return organisationRepository.hasActiveChairman(unitId, manager);
  },

  async createAppointment(input: CreateAppointmentInput, manager: EntityManager) {
    const appointment = await organisationRepository.insertAppointment(input, manager);
    return { id: appointment.id };
  },
};
