# Contextify production readiness — Phase 1

This document records configuration for Phase 1 only: Laravel production settings, admin seeding, Gemini request limits, frontend API URLs, CORS, and HTTPS. No deployment was performed.

## Production environment

Keep the real backend `.env` outside source control. Set deployment-specific values on the server; do not copy development URLs or credentials into production. At minimum configure:

- `APP_ENV=production`, `APP_DEBUG=false`, and `APP_URL=https://<your-domain>`.
- `APP_KEY` generated once for the application and preserved across releases. Do not publish it or replace it during normal deploys.
- `FRONTEND_URL=https://<your-frontend-origin>` for password-reset links.
- A production database connection and restricted database account.
- `SESSION_SECURE_COOKIE=true` when served over HTTPS.
- `TRUSTED_PROXIES` set to the actual reverse-proxy IPs/CIDRs when TLS terminates before Laravel; do not trust all proxy sources.
- A real mail provider before relying on password recovery.
- A suitable `LOG_LEVEL` and a production log-retention destination.

The sample `.env.example` remains development-oriented for local use. Use `server/.env.production.example` as a checklist for the server's private environment, then replace every host and blank secret with deployment-specific values. It contains no actual production keys or credentials. Use `client/.env.production.example` when building the static frontend for a root-hosted deployment.

After setting the server environment, rebuild Laravel's configuration cache (`php artisan config:cache`) as part of the deployment process. Do not run that command with unresolved template placeholders.

## Admin bootstrap

No admin or test account is created by default. To create the first admin deliberately, set `ADMIN_SEED_ENABLED=true`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` of at least 16 characters in the server environment, then run:

```sh
php artisan db:seed --class=AdminSeeder --force
```

Immediately disable the one-time operation (`ADMIN_SEED_ENABLED=false`) and remove the password from the deployment environment. Re-running the seeder does not reset an existing account's password. Do not put credentials in source control, shell history, or logs.

## Gemini endpoint limits

Routes that call Gemini use a Laravel named limiter with both limits applied:

- 5 AI requests per authenticated user per minute by default.
- 5 AI requests total per minute across all users by default.

Tune with `AI_USER_PER_MINUTE` and `AI_GLOBAL_PER_MINUTE` according to the provider quota. The global limiter uses Laravel's configured cache store; use a shared cache backend when running more than one app instance. Rate-limit feature tests disable AI entirely and do not send provider requests.

## Frontend URL, CORS, and HTTPS

The frontend defaults to a same-origin `/api` URL. Set `VITE_API_URL` to an absolute `https://<api-domain>/api` only when the API is hosted separately. Set `VITE_BASE_PATH` to `/` for a domain-root frontend or to its exact URL path when mounted below a subpath; both values are compiled into the static frontend and require a rebuild after changes.

Set `CORS_ALLOWED_ORIGINS` to a comma-separated list of exact browser origins, including scheme and any nonstandard port, for example `https://app.example.test`. Do not include paths or trailing slashes. Origins must use HTTPS in public production. If the frontend and API share an origin, the default `/api` path avoids cross-origin browser calls.

HTTPS must terminate at the public web server or reverse proxy. Forward the appropriate HTTPS/proxy headers to Laravel and set the proxy addresses Laravel trusts. Serve Laravel only from `server/public`, and do not expose the repository root. Never expose the Python ML API directly; it is outside this phase.

## Verification notes

The frontend production build and lint should be run from `client`. Backend tests require the PHP dependencies and a functioning test runner. A deployment smoke test should verify registration/login, user-owned task access, admin-only routes, password reset mail, CORS preflight, and the AI 429 response without requiring successful Gemini generation.
