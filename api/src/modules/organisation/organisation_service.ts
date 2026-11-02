import { organisationRepository } from './organisation_repository';
import type { AccessIncludes, ActiveAccess } from './organisation_types';

export const organisationService = {
  getActiveAccess(memberId: string, include: AccessIncludes = {}): Promise<ActiveAccess> {
    return organisationRepository.findActiveAccess(memberId, include);
  },
};
