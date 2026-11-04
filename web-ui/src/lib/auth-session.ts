import { ApiError, authApi, type AuthTokens, type OtpChallenge } from "@/lib/api";

const CHALLENGE_KEY = "broadcastly.auth.challenge";
const PHONE_KEY = "broadcastly.auth.maskedPhone";
const ACCESS_KEY = "broadcastly.auth.accessToken";
const REFRESH_KEY = "broadcastly.auth.refreshToken";

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
  sessionStorage.setItem(ACCESS_KEY, tokens.accessToken);
  sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function readTokens() {
  return {
    accessToken: sessionStorage.getItem(ACCESS_KEY),
    refreshToken: sessionStorage.getItem(REFRESH_KEY),
  };
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken(refreshToken: string) {
  const response = await authApi.refresh(refreshToken);
  saveTokens(response.data);
  return response.data.accessToken;
}

export async function restorePlatformAdminSession() {
  const tokens = readTokens();
  if (!tokens.accessToken && !tokens.refreshToken) return false;

  try {
    let accessToken = tokens.accessToken;
    if (!accessToken && tokens.refreshToken) {
      accessToken = await refreshAccessToken(tokens.refreshToken);
    }
    if (!accessToken) throw new Error("No access token is available.");

    let user;
    try {
      user = (await authApi.currentUser(accessToken)).data;
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || !tokens.refreshToken) throw error;
      accessToken = await refreshAccessToken(tokens.refreshToken);
      user = (await authApi.currentUser(accessToken)).data;
    }

    if (user.role === "platform_admin") return true;
  } catch {
    // Invalid, expired, or unreachable sessions are cleared below.
  }

  clearTokens();
  return false;
}
