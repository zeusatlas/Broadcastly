import axios from "axios";

export interface ApiEnvelope<T> {
  status: "success" | "error";
  status_code: number;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface ApiUser {
  id: string;
  role: "platform_admin" | "chairman" | "executive";
  fullName: string;
  email: string;
}

export interface OtpChallenge {
  challengeId: string;
  maskedPhone: string;
  expiresIn: number;
  resendIn: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  sessionExpiresAt: string;
}

export interface PlatformOverview {
  organisations: number;
  suspendedOrganisations: number;
  organisationsWithoutChairman: number;
  members: number;
  activeChairmen: number;
  activeExecutives: number;
  suspendedExecutives: number;
  platformAdmins: number;
  creditsPurchased: number;
  amountPaidPesewas: number;
  pendingPurchases: number;
  failedPurchases: number;
}
export interface PlatformOrganisation {
  id: string;
  name: string;
  type: string;
  status: "active" | "inactive" | "suspended";
  logoUrl: string | null;
  credits: { balance: number; reserved: number; available: number } | null;
  chairman: { fullName: string; email: string } | null;
  memberCount: number;
  executiveCount: number;
  createdAt: string;
  updatedAt: string;
}

export type PlatformExecutiveStatus =
  | "invited"
  | "active"
  | "suspended"
  | "deactivated";

export interface PlatformExecutive {
  id: string;
  memberId: string;
  partyId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  status: PlatformExecutiveStatus;
  lastSignInAt: string | null;
  createdAt: string;
  positions: string[];
  creditBalance: number;
}

export type PlatformBroadcastStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "processing"
  | "submitted"
  | "completed"
  | "partially_failed"
  | "failed"
  | "cancelled";

export interface PlatformBroadcast {
  id: string;
  organisationId: string;
  organisationName: string;
  title: string | null;
  message: string;
  status: PlatformBroadcastStatus;
  audienceSummary: string | null;
  recipientCount: number;
  segmentCount: number;
  estimatedCredits: number;
  deliveredCount: number;
  failedCount: number;
  createdBy: string | null;
  scheduledAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export type PlatformCreditTransactionType =
  | "purchase"
  | "allocation_in"
  | "allocation_out"
  | "reservation"
  | "release"
  | "consumption"
  | "refund"
  | "reversal"
  | "adjustment";

export interface PlatformCreditTransaction {
  id: string;
  type: PlatformCreditTransactionType;
  amount: number;
  balanceAfter: number;
  reason: string | null;
  initiatedBy: string | null;
  purchaseId: string | null;
  broadcastId: string | null;
  createdAt: string;
}

export type PlatformPurchaseStatus = "pending" | "completed" | "failed";

export interface PlatformPurchase {
  id: string;
  organisationId: string;
  organisationName: string;
  reference: string;
  credits: number;
  amountPesewas: number;
  currency: "GHS";
  status: PlatformPurchaseStatus;
  provider: string;
  checkoutUrl: string | null;
  failureReason: string | null;
  initiatedBy: string | null;
  completedAt: string | null;
  failedAt: string | null;
  createdAt: string;
}

export interface PlatformPurchaseSummary {
  creditsPurchased: number;
  amountPaidPesewas: number;
  pendingPurchases: number;
  failedPurchases: number;
}

export type PlatformAdminStatus = "active" | "suspended";

export interface PlatformAdmin {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  status: PlatformAdminStatus;
  lastSignInAt: string | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export interface SignInResponse {
  user: ApiUser;
  tokens: AuthTokens;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }
  return baseUrl.replace(/\/$/, "");
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    accessToken?: string;
    params?: Record<string, string | number | boolean | undefined>;
  } = {},
): Promise<ApiEnvelope<T>> {
  try {
    const response = await axios.request<ApiEnvelope<T>>({
      baseURL: getApiBaseUrl(),
      url: path,
      method: options.method ?? "GET",
      data: options.body,
      params: options.params,
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.accessToken
          ? { Authorization: `Bearer ${options.accessToken}` }
          : {}),
      },
    });

    if (response.data.status === "error") {
      throw new ApiError(
        response.data.message || "The request could not be completed.",
        response.status,
        response.data.errors,
      );
    }
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (axios.isAxiosError<ApiEnvelope<unknown>>(error)) {
      const response = error.response;
      if (response) {
        throw new ApiError(
          response.data?.message || "The request could not be completed.",
          response.status,
          response.data?.errors,
        );
      }
      throw new ApiError(
        "Unable to reach the API. Check the API URL and CORS configuration.",
        0,
      );
    }
    throw error;
  }
}

// Platform API
export const platformApi = {
  getOverview(accessToken: string) {
    return apiRequest<PlatformOverview>("/platform/overview", { accessToken });
  },
  getPurchaseSummary(accessToken: string, period: "today") {
    return apiRequest<PlatformPurchaseSummary>("/platform/purchases/summary", {
      accessToken,
      params: { period },
    });
  },
  listPurchases(
    accessToken: string,
    params: {
      page: number;
      pageSize: number;
      period: "today";
      status?: PlatformPurchaseStatus;
      organisationId?: string;
    },
  ) {
    return apiRequest<PaginatedResult<PlatformPurchase>>("/platform/purchases", {
      accessToken,
      params,
    });
  },
  listPlatformAdmins(
    accessToken: string,
    params: { page: number; pageSize: number },
  ) {
    return apiRequest<PaginatedResult<PlatformAdmin>>("/platform/admins", {
      accessToken,
      params,
    });
  },
  listOrganisations(
    accessToken: string,
    params: {
      page: number;
      pageSize: number;
      search?: string;
      status?: PlatformOrganisation["status"];
      hasChairman?: boolean;
    },
  ) {
    return apiRequest<PaginatedResult<PlatformOrganisation>>(
      "/platform/organisations",
      {
        accessToken,
        params,
      },
    );
  },
  getOrganisation(accessToken: string, organisationId: string) {
    return apiRequest<PlatformOrganisation>(
      `/platform/organisations/${encodeURIComponent(organisationId)}`,
      { accessToken },
    );
  },
  suspendOrganisation(accessToken: string, organisationId: string) {
    return apiRequest<PlatformOrganisation>(
      `/platform/organisations/${encodeURIComponent(organisationId)}/suspend`,
      { method: "POST", accessToken },
    );
  },
  reactivateOrganisation(accessToken: string, organisationId: string) {
    return apiRequest<PlatformOrganisation>(
      `/platform/organisations/${encodeURIComponent(organisationId)}/reactivate`,
      { method: "POST", accessToken },
    );
  },
  listExecutives(
    accessToken: string,
    organisationId: string,
    params: {
      page: number;
      pageSize: number;
      search?: string;
      status?: PlatformExecutiveStatus;
    },
  ) {
    return apiRequest<PaginatedResult<PlatformExecutive>>(
      `/platform/organisations/${encodeURIComponent(organisationId)}/executives`,
      { accessToken, params },
    );
  },
  listOrganisationBroadcasts(
    accessToken: string,
    organisationId: string,
    params: {
      page: number;
      pageSize: number;
      search?: string;
      status?: PlatformBroadcastStatus;
    },
  ) {
    return apiRequest<PaginatedResult<PlatformBroadcast>>(
      `/platform/organisations/${encodeURIComponent(organisationId)}/broadcasts`,
      { accessToken, params },
    );
  },
  listOrganisationCreditTransactions(
    accessToken: string,
    organisationId: string,
    params: { page: number; pageSize: number },
  ) {
    return apiRequest<PaginatedResult<PlatformCreditTransaction>>(
      `/platform/organisations/${encodeURIComponent(organisationId)}/credit-transactions`,
      { accessToken, params },
    );
  },
  getExecutive(
    accessToken: string,
    organisationId: string,
    executiveId: string,
  ) {
    return apiRequest<PlatformExecutive>(
      `/platform/organisations/${encodeURIComponent(organisationId)}/executives/${encodeURIComponent(executiveId)}`,
      { accessToken },
    );
  },
  suspendExecutive(
    accessToken: string,
    organisationId: string,
    executiveId: string,
  ) {
    return apiRequest<PlatformExecutive>(
      `/platform/organisations/${encodeURIComponent(organisationId)}/executives/${encodeURIComponent(executiveId)}/suspend`,
      { method: "POST", accessToken },
    );
  },
  reactivateExecutive(
    accessToken: string,
    organisationId: string,
    executiveId: string,
  ) {
    return apiRequest<PlatformExecutive>(
      `/platform/organisations/${encodeURIComponent(organisationId)}/executives/${encodeURIComponent(executiveId)}/reactivate`,
      { method: "POST", accessToken },
    );
  },
};

export const authApi = {
  requestCode(email: string, phone: string) {
    return apiRequest<OtpChallenge>("/auth/login", {
      method: "POST",
      body: { email, phone, client: "web" },
    });
  },
  verifyCode(challengeId: string, code: string) {
    return apiRequest<SignInResponse>("/auth/verify-otp", {
      method: "POST",
      body: { challengeId, code },
    });
  },
  resendCode(challengeId: string) {
    return apiRequest<OtpChallenge>("/auth/resend-otp", {
      method: "POST",
      body: { challengeId },
    });
  },
  refresh(refreshToken: string) {
    return apiRequest<AuthTokens>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
  },
  currentUser(accessToken: string) {
    return apiRequest<ApiUser>("/auth/me", { accessToken });
  },
  signOut(accessToken: string) {
    return apiRequest<undefined>("/auth/logout", {
      method: "POST",
      body: {},
      accessToken,
    });
  },
};
