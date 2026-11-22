# Security and privacy fixes

Review of the previous version (commit `61f2343`) and what changed. Each item below has a test in
`backend/backend/test/api.test.js` unless noted.

## Critical

| Issue | Fix |
|---|---|
| `POST /auth/otp/request` returned the code when the client sent `isPhone: true`, and `/auth/otp/verify` with `purpose: "login"` replaced the account password, so any account could be taken over. | Codes are never returned or logged. Codes are scoped by purpose and account, stored as HMAC hashes, expire in 10 minutes and lock after 5 wrong attempts. Signing in with a code never changes a password. |
| Phone numbers were turned into `digits@sambandhsetu.local` and "verified" with the code shown on screen. | Phone numbers are stored as unverified and cannot be used to sign in until an SMS provider is configured. |
| `seedUsers.js` created ten members with the password `Password123!` on every build and on an empty database. | Removed. `npm run seed:demo` creates demo data only against the local SQLite file and refuses to run in production or against Postgres. |

## High

| Issue | Fix |
|---|---|
| Profiles returned every field (family, religion, preferences, builder answers) to any signed-in user. | One response builder (`services/views.js`) applies the member's "Profile information sharing" switches. Family and contact details are off by default; contact details are only ever shown to connected people. |
| No blocking; paused or deactivated profiles still appeared in Discover. | Blocking hides both people from each other everywhere (Discover, profiles, requests, chats, notifications) and pauses an active connection. Discover also honours hidden, paused and deactivated profiles and every Discovery setting. |
| The AI service was public with `CORS *` and no key; a match's data was sent without consent. | The API calls it server-to-server with `X-Guide-Key`; the service rejects calls without the key and closes CORS. Only fields the member switched on are sent; about the other person only their first name and interests already visible on their profile. A built-in responder is used when the service is not configured. |
| No age gate; age ignored month and day. | Date of birth is required, under-18s are refused, and age is calculated with month and day. |
| "Delete account" only logged out. Blocked users list was sample data; no report endpoints. | Real deletion (database cascade removes profile, photos, chats, reflections, family invitations, verification documents and Guide history) after password or emailed-code confirmation. Real block list, reports (with optional screenshots) and support tickets. Data export as JSON. |

## Medium

| Issue | Fix |
|---|---|
| Chat history order was random after the SQL migration. | Ordered by time with a cursor (`before=`). |
| Either person could advance the shared journey alone to "Decision". | A stage completes only when both people complete it; Reflect also needs every question answered. A partner's Reflect answers are visible only when they finished the stage and chose to share them. |
| The chat profile invented data (always online, fixed city, age 28). | Only real data. Online status is shown only when the member allows it. |
| Photos were stored as local `file://` paths. | Photos are uploaded (checked type and size, max 1.5 MB) and served through short-lived signed URLs. Verification documents are never served to members. |
| Postgres TLS used `rejectUnauthorized: false`. | Certificates are verified by default (`PGSSL_REJECT_UNAUTHORIZED=false` only for private CAs). |
| `/auth` was limited to 5 requests per hour per IP. | 30 per 15 minutes per IP for sign-in and sign-up; separate per-email and per-IP limits for code requests. |
| Unknown query keys mapped straight to SQL column names. | The query builder was removed; every query is parameterised SQL with fixed column lists. |
| Without `DATABASE_URL` the API used SQLite on an ephemeral disk in production. | On Vercel the API refuses to start a throwaway database unless `ALLOW_EPHEMERAL_DB=true` is set explicitly. |

## Other

- Sessions carry a version number: changing or resetting the password and "log out of all devices" revoke older sessions.
- The crisis reply includes Indian helplines (112, Tele-MANAS 14416, Women Helpline 181) and detects some Hindi phrases.
- Team review endpoints (`/api/admin/*`) are disabled unless `ADMIN_API_KEY` is set, compare the key in constant time and write every decision to an audit table.
- The landing page no longer shows invented statistics or a testimonial.
- `frontend/.env` (committed) and the Expo cache folder were removed from the repository.
