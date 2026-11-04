import { ApiError, authApi, type AuthTokens, type OtpChallenge } from "@/lib/api";

const CHALLENGE_KEY = "broadcastly.auth.challenge";
const PHONE_KEY = "broadcastly.auth.maskedPhone";
const ACCESS_KEY = "broadcastly.auth.accessToken";
const REFRESH_KEY = "broadcastly.auth.refreshToken";
const ACCESS_EXPIRY_KEY = "broadcastly.auth.accessExpiresAt";
const REFRESH_EXPIRY_SKEW_MS = 60_000;

let refreshInFlight: Promise<string> | null = null;

export function saveChallenge(challenge: OtpChallenge) {
  sessionStorage.setItem(CHALLENGE_KEY, challenge.challengeId);
  sessionStorage.setItem(PHONE_KEY, challenge.maskedPhone);
}

export function readChallenge() {
  return {
    challengeId: sessionStorage.getItem(CHALLENGE_KEY),
    maskedPhone: sessionStorage.getItem(PHONE_KEY),
  };
}

export function clearChallenge() {
  sessionStorage.removeItem(CHALLENGE_KEY);
  sessionStorage.removeItem(PHONE_KEY);
}

export function saveTokens(tokens: AuthTokens) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(
    ACCESS_EXPIRY_KEY,
    String(Date.now() + Math.max(0, tokens.expiresIn) * 1000),
  );
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

export function readTokens() {
  let accessToken = localStorage.getItem(ACCESS_KEY);
  let refreshToken = localStorage.getItem(REFRESH_KEY);

  // Move sessions created before persistent storage was enabled into localStorage.
  if (!accessToken && !refreshToken) {
    accessToken = sessionStorage.getItem(ACCESS_KEY);
    refreshToken = sessionStorage.getItem(REFRESH_KEY);
    if (accessToken || refreshToken) {
      localStorage.setItem(ACCESS_KEY, accessToken ?? "");
      localStorage.setItem(REFRESH_KEY, refreshToken ?? "");
      localStorage.setItem(ACCESS_EXPIRY_KEY, "0");
      sessionStorage.removeItem(ACCESS_KEY);
      sessionStorage.removeItem(REFRESH_KEY);
    }
  }

  const expiryValue = Number(localStorage.getItem(ACCESS_EXPIRY_KEY));
  return {
    accessToken: accessToken || null,
    refreshToken: refreshToken || null,
    accessExpiresAt: Number.isFinite(expiryValue) ? expiryValue : 0,
  };
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ACCESS_EXPIRY_KEY);
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken(expectedRefreshToken?: string) {
  const currentTokens = readTokens();
  if (
    expectedRefreshToken &&
    currentTokens.refreshToken &&
    currentTokens.refreshToken !== expectedRefreshToken &&
    currentTokens.accessToken &&
    currentTokens.accessExpiresAt > Date.now() + REFRESH_EXPIRY_SKEW_MS
  ) {
    return currentTokens.accessToken;
  }

  if (refreshInFlight) return refreshInFlight;
  if (!currentTokens.refreshToken) {
    throw new ApiError("Please sign in to continue.", 401);
  }

  refreshInFlight = authApi
    .refresh(currentTokens.refreshToken)
    .then((response) => {
      saveTokens(response.data);
      return response.data.accessToken;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

export async function withAuthenticatedSession<T>(
  request: (accessToken: string) => Promise<T>,
) {
  let tokens = readTokens();
  if (!tokens.accessToken && !tokens.refreshToken) {
    throw new ApiError("Please sign in to continue.", 401);
  }

  let accessToken = tokens.accessToken;
  if (
    !accessToken ||
    tokens.accessExpiresAt <= Date.now() + REFRESH_EXPIRY_SKEW_MS
  ) {
    accessToken = await refreshAccessToken(tokens.refreshToken ?? undefined);
  }
  if (!accessToken) throw new ApiError("Please sign in to continue.", 401);

  try {
    return await request(accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;

    tokens = readTokens();
    if (
      tokens.accessToken &&
      tokens.accessToken !== accessToken &&
      tokens.accessExpiresAt > Date.now() + REFRESH_EXPIRY_SKEW_MS
    ) {
      return request(tokens.accessToken);
    }

    accessToken = await refreshAccessToken(tokens.refreshToken ?? undefined);
    return request(accessToken);
  }
}

export async function restorePlatformAdminSession() {
  try {
    const user = await withAuthenticatedSession(async (accessToken) =>
      (await authApi.currentUser(accessToken)).data,
    );
    if (user.role === "platform_admin") return true;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status === 0 || error.status >= 500) {
      throw error;
    }
  }

  clearTokens();
  return false;
}
