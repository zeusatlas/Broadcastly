// Public API of the auth feature. Code outside this folder imports from here only.
export { PermissionGate } from './components/PermissionGate';
export { SignInScreen } from './screens/SignInScreen';
export { VerifyOtpScreen } from './screens/VerifyOtpScreen';
export {
  useAccess,
  useCan,
  useHasAllPermissions,
  useHasAnyPermission,
  useHasPermission,
  useHasRole,
} from './hooks/use_permissions';
export {
  useAuthError,
  useCurrentUser,
  useIsAuthSubmitting,
  useIsSignedIn,
  usePendingChallenge,
  useSessionStatus,
} from './hooks/use_session';
export { useSessionExpiry } from './hooks/use_session_expiry';
export { useAuthStore } from './store/auth_store';
export type {
  AuthTokensResponse,
  OtpChallengeResponse,
  PendingChallenge,
  SessionStatus,
  SignInRequest,
  SignInResponse,
  VerifyOtpRequest,
} from './types';
export { checkAccess, type AccessRule } from './utils/access_policy';
