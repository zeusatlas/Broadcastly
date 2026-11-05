import { http, type RequestOptions } from '@/lib/api';

import type {
  OrganisationLogoResponse,
  AppointmentRequest,
  CreateExecutiveRequest,
  CreatePositionRequest,
  CreateUnitRequest,
  EndAppointmentRequest,
  ExecutiveResponse,
  ListExecutivesParams,
  ListUnitsParams,
  OrganisationExecutivesResponse,
  OrganisationOverviewResponse,
  OrganisationUnitsResponse,
  PositionResponse,
  UnitResponse,
  UpdatePositionRequest,
} from '../types';

// The chairman's tools (api/src/modules/chairman). The API limits every read to the caller's units.
export const organisationEndpoints = {
  readOverview: (options?: RequestOptions) =>
    http.get<OrganisationOverviewResponse>('/organisation/overview', options),

  readPositions: (options?: RequestOptions) =>
    http.get<PositionResponse[]>('/organisation/positions', options),

  createPosition: (credentials: CreatePositionRequest) =>
    http.post<PositionResponse, CreatePositionRequest>('/organisation/positions', credentials),

  updatePosition: ({
    positionId,
    credentials,
  }: {
    positionId: string;
    credentials: UpdatePositionRequest;
  }) =>
    http.patch<PositionResponse, UpdatePositionRequest>(
      `/organisation/positions/${positionId}`,
      credentials,
    ),

  readUnits: (params: ListUnitsParams, options?: RequestOptions) =>
    http.get<OrganisationUnitsResponse>('/organisation/units', { ...options, params }),

  createUnit: (credentials: CreateUnitRequest) =>
    http.post<UnitResponse, CreateUnitRequest>('/organisation/units', credentials),

  readExecutives: (params: ListExecutivesParams, options?: RequestOptions) =>
    http.get<OrganisationExecutivesResponse>('/organisation/executives', { ...options, params }),

  readExecutive: ({ executiveId }: { executiveId: string }, options?: RequestOptions) =>
    http.get<ExecutiveResponse>(`/organisation/executives/${executiveId}`, options),

  createExecutive: (credentials: CreateExecutiveRequest) =>
    http.post<ExecutiveResponse, CreateExecutiveRequest>('/organisation/executives', credentials),

  addAppointment: ({
    executiveId,
    credentials,
  }: {
    executiveId: string;
    credentials: AppointmentRequest;
  }) =>
    http.post<ExecutiveResponse, AppointmentRequest>(
      `/organisation/executives/${executiveId}/appointments`,
      credentials,
    ),

  endAppointment: ({
    appointmentId,
    credentials,
  }: {
    appointmentId: string;
    credentials?: EndAppointmentRequest;
  }) =>
    http.post<undefined, EndAppointmentRequest>(
      `/organisation/appointments/${appointmentId}/end`,
      credentials ?? {},
    ),

  suspendExecutive: ({ executiveId }: { executiveId: string }) =>
    http.post<ExecutiveResponse>(`/organisation/executives/${executiveId}/suspend`),

  reactivateExecutive: ({ executiveId }: { executiveId: string }) =>
    http.post<ExecutiveResponse>(`/organisation/executives/${executiveId}/reactivate`),

  // Multipart, field "logo"; PNG, JPEG or WebP up to 2 MB, checked by content on the server.
  uploadOrganisationLogo: (form: FormData) =>
    http.upload<OrganisationLogoResponse>('/organisation/logo', form),

  removeOrganisationLogo: () => http.delete<OrganisationLogoResponse>('/organisation/logo'),
};
