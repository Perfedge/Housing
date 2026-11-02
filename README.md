# Housing

A standalone Healdsburg housing planning app for high school students, now prepared for server hosting on Vercel. This is a separate app, account system, and database from Coach App.

## Features

- Username or email sign-in, account creation, sign-out, and password changes.
- Password reset links sent by email, expiring after 30 minutes and consumed once. Resetting invalidates all sessions. Passwords use salted scrypt; session cookies are HttpOnly, SameSite=Lax, and Secure in production. Login/reset endpoints use persistent rate limits.
- Account-owned saved scenarios, including inputs, reflection, and pinned baseline. The server checks ownership for every request.
- PDF planning briefs and real `.xlsx` workbooks. Excel includes formula-based current and baseline plans, typed numeric values, and a table of saved scenarios.
- JSON backup/import, including earlier simulator JSON files, plus CSV and text exports.

## Run locally

Use Node.js 24 and PostgreSQL. Run `npm install`, copy `.env.example` to `.env`, fill in a dedicated Housing database URL, run `npm run db:migrate`, then `npm run build` and `npm run dev`. Open http://localhost:8787.

For a development-only local PostgreSQL-compatible engine without a separate database server: `HOUSING_LOCAL_DB=1 npm run dev`. This uses PGlite under `.local-data/`, only in the local development server. Production uses PostgreSQL via DATABASE_URL. Password reset still requires real email configuration.

## Deploy to Vercel

Import `Perfedge/Housing` as its own Vercel project with framework preset Other, build command `npm run build`, and output directory `public`. Use Node.js 24. `vercel.json` routes `/api/*` to the Node account service.

Add these server-only environment variables:

- `DATABASE_URL`: a dedicated PostgreSQL database for Housing. Use provider-recommended TLS settings and a pooled connection for serverless hosting. Do not reuse Coach App credentials.
- `APP_URL`: the canonical HTTPS Housing deployment URL. Used for origin checks and password reset links.
- `RESEND_API_KEY`: a Resend API key. Enter it only in Vercel's environment settings.
- `RESET_FROM_EMAIL`: a sender address verified with Resend, such as `Housing <housing@your-domain.example>`.

The build creates Housing's tables with idempotent CREATE TABLE IF NOT EXISTS statements when DATABASE_URL is set. A missing database leaves account operations unavailable; the app never simulates successful authentication or email delivery. After environment changes, redeploy. `/api/health` reports database readiness and whether reset email configuration exists, without exposing credentials. Actual email delivery must be verified separately.

Do not commit `.env`, secrets, generated dependencies, or student scenarios. Periodically delete expired sessions, reset tokens, and rate-limit rows, and use your database provider's backup facilities.

The former GitHub Pages site cannot run this backend. Keep it available until the new Vercel deployment passes verification, then redirect its root `index.html` to the new URL. GitHub remains the app's source repository.

## Model and exports

All housing inputs and challenge thresholds are illustrative. The 1,600-home benchmark is hypothetical, not a verified City requirement. Affordable-home revenue is fixed at $250,000 per home. Height changes the illustration and capacity warning, not home count or cost. See the app for full limitations.

Saved plans now live in each Housing account. Earlier browser-local plans are not uploaded automatically. Export JSON in the earlier app, then import it after signing in. PDF and Excel downloads include the current plan; the workbook also contains saved plans and an optional baseline. Downloads are generated locally in the browser.

## Checks

`npm test` covers the account lifecycle, password reset expiry/reuse/session revocation, username and email login, rate limits, origin protection, scenario validation, and account isolation against a PostgreSQL-compatible PGlite engine. Export and browser checks are performed separately.
