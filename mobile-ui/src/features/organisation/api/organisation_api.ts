import { http, type RequestOptions } from '@/lib/api';

import type { OrganisationOverviewResponse, PositionResponse } from '../types';

// The chairman's tools (api/src/modules/chairman). The API limits every read to the caller's units.
export const organisationEndpoints = {
  readOverview: (options?: RequestOptions) =>
    http.get<OrganisationOverviewResponse>('/organisation/overview', options),

  readPositions: (options?: RequestOptions) =>
    http.get<PositionResponse[]>('/organisation/positions', options),
};
