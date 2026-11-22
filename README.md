# Sambandh Setu

Find with purpose. Connect with trust.

A relationship platform for people who are ready for meaningful, value-aligned connections:
discover people who share your values, connect only when both of you agree, and move through an
eight-stage Setu journey together (Connect, Understand, Reflect, Discuss, Agree, Family,
Reflect Again, Decision) with private reflection, optional family access and a guide that suggests
but never decides.

## What is in this repository

| Folder | What it is |
|---|---|
| `frontend/` | The app: Expo + React Native + TypeScript. One codebase for the website (react-native-web) and Android/iOS. Phones get the App designs (floating 5-tab bar); desktop browsers get the Web designs (top bar, left navigation, right rails, two-pane Settings). |
| `backend/backend/` | The API: Node.js + Express. PostgreSQL in production, SQLite for local development and tests. |
| `api/[...path].js` | Vercel Function that serves the Express API at `/api/*`. |
| `setu_ai/` | The optional Python (FastAPI) Setu Guide service. When it is not configured, the API answers with its built-in, knowledge-base responder. |
| `vercel.json` | One Vercel project serves the web app and the API on the same domain. |

## Run it locally

Requirements: Node 22.13+ (Node 24 recommended).

```bash
# API (SQLite file at backend/backend/data/, created automatically)
cd backend/backend
npm ci
cp .env.example .env          # set JWT_SECRET and OTP_HMAC_SECRET (32+ random characters)
npm run seed:demo             # optional: fictional demo members, prints the sign-in password
npm run dev                   # http://localhost:5000/api/health

# App (in another terminal)
cd frontend
npm ci
echo "EXPO_PUBLIC_API_URL=http://localhost:5000/api" > .env
npm run web                   # or: npm run android / npm run ios
```

Tests: `cd backend/backend && npm test` (node:test, in-memory SQLite, 30 tests including the
security fixes below). Type check: `cd frontend && npm run typecheck`.

## Deploy (Vercel)

The Vercel project builds `frontend/` into static files and runs the API as a function.

Environment variables (Project Settings > Environment Variables):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres URL. Storage > Create Database > Neon (free) adds it automatically. The schema is created on first request. |
| `JWT_SECRET` | yes | 32+ random characters. |
| `OTP_HMAC_SECRET` | yes | 32+ random characters. |
| `APP_URL` | yes | Public site URL, used in family invitation links. |
| `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` | optional | `brevo`. Turns on email verification, sign-in by code, password reset and email change. Without it, sign-up works with a password and those features say they are unavailable. |
| `GUIDE_SERVICE_URL`, `GUIDE_SERVICE_KEY` | optional | The Python Setu Guide service and its shared key. |
| `ADMIN_API_KEY` | optional | 24+ characters. Enables `/api/admin/*` for reviewing verifications, reports and support tickets. |

Pushes to `main` deploy automatically once the repository is connected to the Vercel project
(Project Settings > Git), or through `.github/workflows/vercel.yml` when the `VERCEL_TOKEN`,
`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` repository secrets are set.

## Design

Implements the shared Figma export (Design System v2.0): Trust Blue `#2C67C5` as the only primary
colour, Inter type, 8px grid, the 5-slot footer (Home, Connections, Setu Guide, Chat, Profile), the
relationship and journey state pills, and every App and Web screen group: onboarding, Discover /
Requests / Active, profile tabs, the journey and Reflect (10 questions with per-answer sharing),
Setu Guide chat, chat, all Settings pages (Account, Password & Security, Privacy & Visibility,
Family Access, Report & Safety, Verification, Setu Guide, AI & Privacy, Notifications, Chat,
Discovery, Help & Support, About). Tokens live in `frontend/src/theme.ts`.

Deliberate differences from the mock-ups: no invented statistics or testimonials on the landing
page; people without a photo show initials (no stock faces); lifestyle tiles use icons instead of
stock photos; mobile-number sign-in and SMS invitations are not offered until an SMS provider is
connected (numbers are saved as unverified, and family invitations can be shared as a link).

## Security and privacy

See [docs/SECURITY.md](docs/SECURITY.md) for the fixes made to the earlier version (account
takeover through the OTP endpoint, seeded accounts with a public password, profile data exposure,
missing block/report/delete, one-sided journey progress, and more).
