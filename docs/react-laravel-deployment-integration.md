# React + Laravel deployment integration

## Local production build

From the Laravel application directory, run:

```powershell
cd server
npm run build
```

When `client/` is present, the command builds the existing React app with Vite, validates the output, refreshes the tracked deployment snapshot at `server/deployment/frontend/`, then copies the snapshot into `server/public/`. When `client/` is absent, it validates and copies the committed snapshot without installing or invoking client dependencies. It preserves Laravel's `index.php`, `.htaccess`, and unrelated public files; the client's Apache rewrite file is never copied.

### Refreshing the deployment snapshot

After changing the frontend:

1. Make and review the React changes in `client/`.
2. From `server/`, run `npm run build`.
3. Review the refreshed `server/deployment/frontend/` files and confirm the build completed successfully.
4. Commit the frontend changes and refreshed snapshot together.
5. Push the updated repository. With `server/` configured as EthioDeploy's Root Directory, its Laravel build can use the snapshot without needing `../client/`.

If a source build fails, the command stops before replacing the committed snapshot or copying it to `server/public/`; it does not silently deploy the previous snapshot as if it were current. On a source-free deployment build, the committed snapshot is deliberately used.

The snapshot validation rejects missing entry assets, source maps, environment files, development directories, credential-pattern matches, and private environment values inherited by the build process. Vite's existing public-environment allowlist remains in place.

The build uses these public, build-time settings when present, and otherwise uses the same-origin production defaults:

```text
VITE_API_URL=/api
VITE_BASE_PATH=/
```

Only `VITE_` values are embedded in frontend assets. Do not put API keys, database credentials, `APP_KEY`, or other private values in them.

## Laravel route behavior

Laravel serves the generated React `index.html` for `/` and client-side GET routes. The fallback excludes `/api`, `/sanctum`, `/up`, `/storage`, Laravel's `/build`, the React asset directory, and paths with file extensions. Missing static files therefore remain 404s instead of receiving the SPA HTML. The existing password-reset redirect route remains ahead of the fallback.

## EthioDeploy Root Directory note

EthioDeploy documents Laravel builds from a configured monorepo Root Directory and runs `npm run build` for Laravel projects with a build script. The deployment snapshot is inside `server/`, so the deployment command no longer depends on access to sibling `client/`.

Local full-repository and source-free simulations verify the two build paths. EthioDeploy documents standard Vite output under `public/build`, but Contextify uses a custom public output directory and the platform's retention of that custom output has not been confirmed by an EthioDeploy deployment. No deployment was performed for this integration phase.
