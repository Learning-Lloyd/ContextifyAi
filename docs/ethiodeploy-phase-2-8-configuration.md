# EthioDeploy production configuration preparation

This note describes required configuration for the planned EthioDeploy setup. No project was created and no deployment, external database connection, or migration was performed.

## MySQL addon

Set `DB_CONNECTION=mysql`. EthioDeploy injects its MySQL connection string as `DATABASE_URL`; the Laravel MySQL connection now uses `DB_URL` when non-empty and falls back to `DATABASE_URL` when `DB_URL` is missing or blank. Do not copy database credentials into source files. After creating the project and adding the database, run migrations only after reviewing the current migration plan and taking a backup.

## Reverse proxy and HTTPS

`TRUSTED_PROXIES` accepts a comma-separated list of trusted proxy IPs/CIDRs, `*` for a platform that explicitly requires trusting its proxy, or blank for Laravel's existing default behavior. `config/trustedproxy.php` parses the value. Laravel's default global `TrustProxies` middleware reads that configuration; `bootstrap/app.php` keeps the default middleware stack and does not bypass Laravel's configuration cache.

EthioDeploy's Laravel guide recommends `trustProxies(at: '*')`. The EthioDeploy reference template uses `TRUSTED_PROXIES=*` accordingly. Apply this only to this host and replace it with the provider's exact proxy ranges if it supplies them. Confirm that the service is only reachable through EthioDeploy's proxy before using the wildcard; otherwise, forwarded headers must only be accepted from the actual trusted proxy addresses. The platform must send the standard `X-Forwarded-Proto` header for Laravel to detect HTTPS.

For production HTTPS, set `SESSION_SECURE_COOKIE=true`. The local `server/.env.example` remains unchanged with its local development setting. Keep `APP_DEBUG=false`, set `APP_URL` and `FRONTEND_URL` to the deployed HTTPS origin, and restrict `CORS_ALLOWED_ORIGINS` to exact browser origins. Current authentication remains bearer-token based; this configuration does not add cookie authentication or change CSRF behavior.

## Build-context and snapshot behavior

The Laravel build script uses React source from `../client` when present and refreshes a tracked snapshot inside `server/deployment/frontend/`. When `client/` is absent, it validates and deploys that snapshot. This removes the deployment build's dependency on sibling-directory access. EthioDeploy documents monorepo Root Directory builds and standard Vite output under `public/build`; retention of Contextify's custom SPA and `contextify-assets/` outputs has not been confirmed in a host deployment. No project was created and no deployment was performed.

## Experimental Python service

Laravel calls `CONTEXTIFY_PRIORITY_MODEL_URL` (defaulting locally to `http://127.0.0.1:8010/predict-priority`) with a four-second timeout. In production, `127.0.0.1` means the Laravel container itself; it is only correct if the FastAPI service runs in the same container. For a separately hosted service, set `CONTEXTIFY_PRIORITY_MODEL_URL` to its reachable private or HTTPS endpoint and keep the timeout appropriate for the host. Do not invent or expose a public service URL. If the service is offline, the experimental endpoint returns HTTP 503; the official PHP priority calculation and ranking remain separate and usable.

## Reference environment template

`server/.env.ethiodeploy.example` is a copy-by-hand reference for dashboard settings. It contains placeholders only. Set `VITE_API_URL=/api` and `VITE_BASE_PATH=/` as build-time public values; keep `GEMINI_API_KEY`, `APP_KEY`, and database connection strings as runtime secrets.
