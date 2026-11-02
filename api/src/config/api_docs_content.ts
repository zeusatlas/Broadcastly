// Text shown in Swagger UI. Markdown; rendered by Swagger, not by our code.
// Keep it accurate: every statement here must match how the API behaves today.

export const API_TITLE = 'Broadcastly API';
export const API_VERSION = '1.0.0';

export const OVERVIEW_DESCRIPTION = `
The backend for the Broadcastly executive app. It manages the party's organisational structure
and executive appointments, the member directory, and official bulk SMS with approvals, credits
and delivery reports.

> **Looking for the endpoints?** Choose **v1** in *Select a definition* at the top right.

---

## Who can use it

Only executives can sign in. There is no public sign-up: executive accounts are created by the
chairman. What each executive may see and do depends on their **active appointment**,
their **permissions** and their **organisational scope** — never on job title alone.

## Getting started

1. **Sign in** — \`POST /api/v1/auth/login\` with your email and phone number. A 6-digit code
   is sent to that phone by SMS. Send it with the \`challengeId\` to \`POST /api/v1/auth/verify-otp\`
   to receive \`tokens.accessToken\` and \`tokens.refreshToken\`.
2. **Authorise** — in *v1*, click **Authorize** and paste the \`accessToken\` (without "Bearer").
3. **Call endpoints** — every protected request sends \`Authorization: Bearer <accessToken>\`.
4. **Stay signed in** — access tokens last **15 minutes**. Before they expire, call
   \`POST /api/v1/auth/refresh\` with the refresh token to get a new pair.
   **Each refresh token works once**; reusing an old one ends the session on every device it reached.
   A session lasts **24 hours from sign-in** (\`tokens.sessionExpiresAt\`); refreshing does not extend it.

## Request and response format

- Base URL: \`/api/v1\`. JSON in, JSON out.
- Field names are **camelCase** (\`firstName\`, \`partyId\`, \`createdAt\`).
- IDs are **UUIDs**. Timestamps are **ISO 8601 in UTC**, e.g. \`2026-11-01T09:30:00.000Z\`.
- Every response uses the same envelope:

\`\`\`json
{
  "status": "success",
  "status_code": 200,
  "message": "Signed in successfully.",
  "data": { }
}
\`\`\`

\`\`\`json
{
  "status": "error",
  "status_code": 422,
  "message": "Some details need fixing.",
  "errors": { "email": ["Enter a valid email address."] }
}
\`\`\`

\`message\` is written for people and is safe to show in the app as-is.
For validation errors, \`errors\` lists the problems for each field.

## Status codes

| Code | Meaning | What to do |
| ---- | ------- | ---------- |
| 200 / 201 | Success | Read \`data\` |
| 400 | Malformed request (e.g. invalid JSON) | Fix the request |
| 401 | Not signed in, or the session has ended | Refresh the token, or sign in again |
| 403 | Signed in, but not allowed | Do not retry; the user lacks permission |
| 404 | Not found | Check the path or id |
| 409 | Conflicts with existing data | Show the message |
| 422 | Some fields are invalid | Show \`errors\` next to each field |
| 429 | Too many requests | Wait, then retry |
| 500 / 503 | Server or dependency problem | Retry later; quote the \`x-request-id\` header to support |

## Limits

- **300 requests per 15 minutes** per client for the whole API.
- **10 attempts per 15 minutes** for sign-in, codes and refresh.
- **5 wrong codes** lock an executive's account for **15 minutes**. Codes expire after **3 minutes**; a new one can be requested after **60 seconds**.
- Request bodies up to **100 kB**.

## Privacy

This API handles member data that can reveal political affiliation — sensitive personal data
under Ghana's Data Protection Act, 2012 (Act 843). Use test data when trying requests here,
and never share tokens or screenshots containing real member details.
`;

export const V1_DESCRIPTION = `
To try a protected endpoint: call **Auth → Sign in**, copy \`data.tokens.accessToken\`, click **Authorize**, paste it and confirm. The token lasts 15 minutes.

Response format, status codes and limits are explained in **API overview** (*Select a definition*, top right).
`;

export const TAG_DESCRIPTIONS = [
  {
    name: 'Auth',
    description:
      'Sign in, keep the session alive with refresh tokens, sign out, and read the signed-in user.',
  },
  {
    name: 'Platform',
    description:
      'Platform admins only: dashboard totals, constituencies and their chairmen, platform admins, suspending accounts.',
  },
  {
    name: 'Health',
    description: 'Whether the API is running and can reach its database and Redis.',
  },
];
