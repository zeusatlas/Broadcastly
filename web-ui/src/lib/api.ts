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
  } = {},
): Promise<ApiEnvelope<T>> {
  try {
    const response = await axios.request<ApiEnvelope<T>>({
      baseURL: getApiBaseUrl(),
      url: path,
      method: options.method ?? "GET",
      data: options.body,
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      },
    });

    if (response.data.status === "error") {
      throw new ApiError(response.data.message || "The request could not be completed.", response.status, response.data.errors);
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
      throw new ApiError("Unable to reach the API. Check the API URL and CORS configuration.", 0);
    }
    throw error;
  }
}

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
