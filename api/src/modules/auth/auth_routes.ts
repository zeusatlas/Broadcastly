import { Router } from 'express';

import {
  errorResponses,
  jsonBody,
  jsonResponse,
  messageEnvelope,
  successEnvelope,
} from '../../common/http/openapi_schemas';
import { authRateLimit } from '../../common/middleware/rate_limit';
import { validate } from '../../common/middleware/validate';
import { bearerAuth, openApiRegistry } from '../../config/openapi';

import { authController } from './auth_controller';
import { authenticate } from './auth_middleware';
import {
  authTokensResponseSchema,
  otpChallengeResponseSchema,
  refreshTokenSchema,
  resendOtpSchema,
  signInResponseSchema,
  signInSchema,
  signOutSchema,
  userResponseSchema,
  verifyOtpSchema,
} from './auth_schemas';

export const authRouter = Router();

// Public: rate limited per IP. Everything else requires a valid access token.
authRouter.post('/login', authRateLimit, validate({ body: signInSchema }), authController.signIn);
authRouter.post(
  '/verify-otp',
  authRateLimit,
  validate({ body: verifyOtpSchema }),
  authController.verifyOtp,
);
authRouter.post(
  '/resend-otp',
  authRateLimit,
  validate({ body: resendOtpSchema }),
  authController.resendOtp,
);
authRouter.post(
  '/refresh',
  authRateLimit,
  validate({ body: refreshTokenSchema }),
  authController.refresh,
);
authRouter.post('/logout', authenticate, validate({ body: signOutSchema }), authController.signOut);
authRouter.get('/me', authenticate, authController.me);

const tags = ['Auth'];
const secured = [{ [bearerAuth.name]: [] }];

const CHALLENGE_ID = '7c1e2d3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f';

openApiRegistry.registerPath({
  method: 'post',
  path: '/auth/login',
  operationId: 'signIn',
  tags,
  summary: 'Sign in (step 1): request a code',
  description: `
One sign-in for everyone: executives and platform admins. If email and phone match an account, a
6-digit code is sent to that phone by SMS. After step 2, route by \`user.role\` (\`platform_admin\` or an executive role).

- The web app sends \`"client": "web"\`: anyone who is not a platform admin gets \`403\` and no SMS is sent.

- A wrong email, a wrong phone or an unknown email all get \`401 Invalid email or phone number.\`
- Keep \`challengeId\` for \`/auth/verify-otp\`. The code expires in 3 minutes.
- Ghanaian numbers in any common form are accepted: \`0241234567\`, \`+233 24 123 4567\`.
`,
  request: {
    body: jsonBody(signInSchema, {
      email: 'ama.mensah@example.com',
      phone: '0241234567',
      client: 'mobile',
    }),
  },
  responses: {
    200: jsonResponse(
      'Code sent.',
      successEnvelope(otpChallengeResponseSchema, 'Code sent to +233 •• ••• 4567.'),
    ),
    ...errorResponses(
      [
        401,
        'The email and phone number do not match an account.',
        'Invalid email or phone number.',
      ],
      [
        403,
        'The account is suspended, or `client` is `web` and the account is not a platform admin.',
        'This account is not active. Contact your administrator.',
      ],
      [422, 'The email or phone number is not in a valid format.'],
      [
        429,
        'Executive locked, or too many codes or attempts.',
        'Too many failed attempts. Try again in 15 minutes.',
      ],
    ),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/auth/verify-otp',
  operationId: 'verifyOtp',
  tags,
  summary: 'Sign in (step 2): verify the code',
  description: `
Send the \`challengeId\` and the code from the SMS. Returns the user and tokens.

- Only the newest code works. Expired code: \`401 This code has expired. Request a new one.\`
- 5 wrong tries end a code; 5 wrong tries on an executive lock it for 15 minutes.
`,
  request: { body: jsonBody(verifyOtpSchema, { challengeId: CHALLENGE_ID, code: '482913' }) },
  responses: {
    200: jsonResponse(
      'Signed in.',
      successEnvelope(signInResponseSchema, 'Signed in successfully.'),
    ),
    ...errorResponses(
      [401, 'Wrong or expired code, or too many tries on this code.', 'Incorrect code.'],
      [
        404,
        'The sign-in is unknown, finished or over 15 minutes old. Start again from step 1.',
        'Your sign-in has expired. Please sign in again.',
      ],
      [
        403,
        'The account is suspended or deactivated.',
        'This account is not active. Contact your administrator.',
      ],
      [422, 'The code is not 6 digits, or `challengeId` is not valid.'],
      [
        429,
        'The account is locked after too many wrong codes.',
        'Too many failed attempts. Try again in 15 minutes.',
      ],
    ),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/auth/resend-otp',
  operationId: 'resendOtp',
  tags,
  summary: 'Send a new code',
  description: `
Send a new code for the same sign-in, also after the last one expired. The previous code stops working.

- Allowed \`resendIn\` (60) seconds after the last code, for up to 15 minutes after step 1.
`,
  request: { body: jsonBody(resendOtpSchema, { challengeId: CHALLENGE_ID }) },
  responses: {
    200: jsonResponse(
      'New code sent.',
      successEnvelope(otpChallengeResponseSchema, 'New code sent to +233 •• ••• 4567.'),
    ),
    ...errorResponses(
      [
        404,
        'The sign-in is unknown, finished or over 15 minutes old. Start again from step 1.',
        'Your sign-in has expired. Please sign in again.',
      ],
      [422, '`challengeId` is not valid.'],
      [
        429,
        'Asked too soon, or too many codes sent recently.',
        'Please wait 42 seconds before requesting a new code.',
      ],
    ),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/auth/refresh',
  operationId: 'refreshSession',
  tags,
  summary: 'Refresh the session',
  description: `
Get new tokens without signing in again.

- Send the latest \`refreshToken\`. You get a new \`accessToken\` and \`refreshToken\`; save both.
- Each refresh token works once. Reusing an old one ends the session.
`,
  request: {
    body: jsonBody(refreshTokenSchema, {
      refreshToken: '0b8a7c56-2f3e-4d1a-9c6b-1e2f3a4b5c6d.q3Vx…',
    }),
  },
  responses: {
    200: jsonResponse(
      'A new token pair.',
      successEnvelope(authTokensResponseSchema, 'Session refreshed.'),
    ),
    ...errorResponses(
      [
        401,
        'The refresh token is invalid, expired or already used, or the account is no longer active. Sign in again.',
        'Your session has ended. Please sign in again.',
      ],
      [422, '`refreshToken` is missing.'],
      429,
    ),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/auth/logout',
  operationId: 'signOut',
  tags,
  summary: 'Sign out',
  description: `
Sign out of this device.

- Send \`{ "allDevices": true }\` to sign out of every device.
`,
  security: secured,
  request: { body: { ...jsonBody(signOutSchema, { allDevices: false }), required: false } },
  responses: {
    200: jsonResponse('Signed out.', messageEnvelope('Signed out successfully.')),
    ...errorResponses([401, 'Already signed out, or the access token has expired.']),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/auth/me',
  operationId: 'getCurrentUser',
  tags,
  summary: 'Get the signed-in user',
  description: `
Get the signed-in user: role, organisation, permissions and active appointments.

- Route by \`role\`. Platform admins have no \`memberId\`, \`organisation\` or appointments.
- Use \`permissions\` to show or hide executive features.
`,
  security: secured,
  responses: {
    200: jsonResponse(
      'The signed-in user.',
      successEnvelope(userResponseSchema, 'Current user retrieved.'),
    ),
    ...errorResponses([
      401,
      'Not signed in, the session has ended, or the account is no longer active.',
    ]),
  },
});
