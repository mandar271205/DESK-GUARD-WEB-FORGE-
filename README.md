# DeskGuard

DeskGuard is a Supabase-powered smart library seat booking and anti-hoarding MVP. It uses real authentication, server-owned timers, realtime desk updates, and short-lived rotating QR codes so a saved screenshot or printed label cannot claim a desk.

## Features

- Public landing page, signup, signin, signout, forgot-password, and reset-password flows
- Auth profile trigger that creates every public signup as a `student`
- Server-backed role checks for librarian-only screens
- Live desk map with Free, Occupied, Away, Abandoned, and Unavailable states
- Live rotating QR displays for desks and kiosks
- One-time QR claim URLs at `/claim?token=...`
- QR tokens generated server-side, stored as hashes, revoked on refresh, and marked used after claim
- Student session actions: claim, Away Mode, resume, confirm presence, release
- Backend cleanup sweep for expired Away/presence sessions and old QR challenges
- Librarian operations, maintenance toggle, QR display manager, audit logs, and analytics

## Tech Stack

React, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, Supabase Auth, Supabase Postgres, Supabase Realtime, PostgreSQL RLS, and a local Express API for backend-only secrets during hackathon development. In production, the QR issuing and claim endpoints can be moved to Supabase Edge Functions.

## Environment

Create `.env.local` from `.env.example`.

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
API_PORT=8787
APP_BASE_URL=http://localhost:5173
DEMO_MODE=true
DEMO_AWAY_SECONDS=20
DEMO_SESSION_SECONDS=60
DEMO_SWEEP_SECONDS=5
QR_ROTATION_SECONDS=120
QR_TOKEN_EXPIRY_SECONDS=120
QR_TOKEN_GRACE_SECONDS=5
QR_FALLBACK_MODE_ENABLED=false
```

Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are browser-safe. Keep the service-role key and database URL server-side.

## Local Setup

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Supabase Authentication Setup

Users sign up through `/auth`. The database trigger creates `public.profiles` and always assigns role `student`, ignoring any role metadata sent from the browser.

## Custom SMTP Configuration

Custom SMTP must be configured manually in the Supabase dashboard. SMTP passwords and App Passwords must never be committed to the repository.

## Email Confirmation Mode

When email confirmation is enabled, Supabase sends a verification email upon signup. Users must click the verification link before they can sign in.

## Hackathon Testing Mode

If email verification is disabled for testing, Supabase returns a valid authenticated session immediately after signup and the user enters the app directly.

## Production Email Verification Mode

In production, enable email confirmation to verify identity. Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are correct so the browser can verify the token successfully.

## Password Recovery Setup

Password recovery uses `supabase.auth.resetPasswordForEmail()`. Supabase sends an email containing a link that returns the user to the `/reset-password` route where they can enter a new password.

## Site URL and Redirect URLs

Configure Supabase Auth Site URL as your app URL and add redirect URLs.

For local testing:
```text
Site URL:
http://localhost:5173

Redirect URLs:
http://localhost:5173/**
```

For Vercel deployment:
```text
Site URL:
https://YOUR_VERCEL_DOMAIN

Redirect URLs:
https://YOUR_VERCEL_DOMAIN/**
```

## Creating the First Librarian Securely

To create the first librarian for hackathon testing, use manual database promotion only:

```sql
update public.profiles
set role = 'librarian'
where email = 'LIBRARIAN_EMAIL_HERE';
```

## Authentication Acceptance Tests

Ensure you test the full authentication flow manually, including signup with fresh email addresses, verifying email arrival, profile creation, and session persistence across reloads. 

## Troubleshooting SMTP and Rate Limits

Use fresh email addresses when testing signup. Avoid repeatedly requesting verification or password-reset emails within a short period to prevent rate-limiting errors. If rate limited, wait before trying again.

## Live Rotating QR Codes

Printed labels are fallback identifiers only. A production claim requires a live QR code from a desk display or kiosk.

Routes:

```text
/claim?token=TEMPORARY_TOKEN
/desk/:deskCode
/librarian/qr-displays
/librarian/qr-display/:deskId
/display/:displayPublicId
```

How rotation works:

1. A display requests a token from the backend.
2. The backend generates a cryptographically random token.
3. Only the token hash is stored in `desk_qr_challenges`.
4. Older unused display tokens are revoked.
5. The QR renders a temporary `/claim?token=...` URL.
6. The student signs in and presses **Claim this desk**.
7. The backend atomically validates the token, marks it used, creates a session, and marks the desk Occupied.

Defaults:

```text
QR rotation interval: 30 seconds
QR token expiry: 35 seconds
QR grace: 5 seconds
```

Expired tokens show an expired QR message. Reused tokens show an already-used QR message. Raw QR tokens are not returned through public desk queries or realtime channels.

## Public Deployment URL

When deployed, DeskGuard QR codes must encode the public HTTPS application URL. 
A `192.168.x.x` URL works only on the same Wi-Fi network. The deployed Vercel or custom-domain URL works from any internet connection.

## Local QR Testing

Start the local dev server using `npm run dev`. Ensure `vite.config.ts` includes `host: true`. Open the app on your computer using the local network IP provided in the terminal (e.g. `http://192.168.x.x:5173`). Scan the QR from your phone on the same Wi-Fi.

## Production QR Testing

Deploy the frontend to Vercel. Set `VITE_PUBLIC_APP_URL` to your deployed HTTPS domain. Open the librarian QR display page on the deployed URL. Scan the QR from a phone using mobile data (not the same Wi-Fi) to confirm it connects and the claim page opens.

## Why localhost Fails on Phones

`localhost` refers to the device opening the link, so it must never be used inside a production QR code. If your QR code encodes `localhost`, your phone will try to load the page from the phone itself, which will fail.

## Vercel Environment Variables

Set `VITE_PUBLIC_APP_URL=https://your-deskguard-domain.vercel.app` in your Vercel Dashboard -> Project -> Settings -> Environment Variables.

## Supabase Auth Redirect URLs

The deployed URL must be added in Supabase Dashboard -> Authentication -> URL Configuration.
Set Site URL to your public domain and add Redirect URLs for both `http://localhost:5173/**` (for local) and `https://your-domain/**` (for production).

## Rotating QR Security Limitations

Do not falsely claim that a web QR token alone proves physical presence. Short expiry and single-use behavior reduce screenshot sharing risk, but the QR URLs themselves are standard HTTPS links that can be opened from any network.

## Database

`npm run db:migrate` applies `supabase/schema.sql` and files in `supabase/migrations`.

Key tables:

- `profiles`
- `desks`
- `sessions`
- `audit_logs`
- `notifications`
- `desk_qr_displays`
- `desk_qr_challenges`

`npm run db:seed` seeds only desks and QR display records. It does not seed users, credentials, auth sessions, or fake live seat sessions.

## Cron

For local development, the API runs cleanup every `DEMO_SWEEP_SECONDS`. In Supabase, schedule:

```sql
select public.expire_qr_challenges();
```

and use the app’s stale-session cleanup logic as an Edge Function or SQL cron in production.

## Scripts

```bash
npm run dev
npm run check
npm run build
npm run db:migrate
npm run db:seed
npm run db:setup
```

## Manual Demo Checklist

- Sign up a student account through `/auth`
- Promote one user to librarian with SQL
- Open `/display/display-f1-01-live`
- Confirm the QR appears, changes without reload, and countdown resets
- Open the QR claim URL while signed in
- Claim the desk and confirm the map updates to Occupied
- Reopen the same QR URL and confirm it is rejected
- Mark Away and wait for backend auto-release
- Open `/librarian/qr-displays` as librarian
- Confirm no service-role key appears in frontend source

## Deployment Notes

Deploy the frontend to Vercel with only browser-safe Vite variables. Move `/api/display/:id/issue-qr`, `/api/claim/preview`, and `/api/claim` into Supabase Edge Functions for production, keeping display credentials and service-role secrets in Supabase-managed function secrets.

Rotate any credentials that were shared outside a secure secret store.
