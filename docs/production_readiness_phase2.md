# Contextify production readiness — Phase 2

**Review date:** 2026-11-13  
**Scope:** migrations, database backups and restores, PHP runtime, and authentication token security.  
**Boundary:** No production system was accessed. No project database was opened or migrated, no user data was changed, and no Gemini request was made.

## 1. Database migration review

### Findings

- There are 19 Laravel migration files. Their timestamp ordering establishes the base `users` table before tables with user foreign keys, and creates `tasks` before notifications that reference tasks. The personal access token table and task table share a timestamp; their filenames sort deterministically, and neither depends on the other. No ordering conflict was found by static review.
- `up()` methods create tables or add columns. The reviewed migrations do not drop/rename existing tables or columns, change existing column types, or delete rows. New columns are nullable or have defaults where they are added to populated tables. In particular, `importance_source` defaults existing tasks to `legacy`; it does not alter their importance values or scores.
- All `down()` methods remove tables or columns created by their matching migrations. Rolling back these migrations can destroy data written to those tables/columns. Do not use `migrate:rollback`, `migrate:reset`, or `migrate:fresh` against a production database as a deployment recovery method.
- Ownership relationships are generally explicit: tasks, goals, feedback, comparisons, decision analyses, and notifications reference users. Most user-owned rows cascade when a user is deleted. Audit log ownership and feedback responder references become null on user deletion; deleting a task nulls its notification reference. `sessions.user_id` is indexed but intentionally has no foreign key. Decision analysis task snapshots are JSON and therefore are not protected by task foreign keys.
- Foreign-key child columns are indexed by the database where needed. Explicit query indexes exist for feedback status/type/time, notification unread ordering, and goal date ranges. No broad composite index was added during this audit. Review production query plans and table sizes before adding indexes or changing existing ones.
- Migrations use MySQL/MariaDB-compatible Laravel schema types including `ENUM`, `JSON`, unsigned integer types, foreign keys, and `AFTER` column placement. The exact production database engine/version has not been selected, so production compatibility is **not certified**. MySQL 8.4 documents instant column additions but has engine, table, and row-size limitations; other versions and MariaDB behave differently. Column reordering and table alterations can require locks or a table rebuild depending on the actual engine and version. Validate against a staging database matching production before applying migrations.
- The XAMPP `mysql`/`mysqldump` command-line tools available locally report MariaDB 10.4.32. This is the client utility version only; no server connection was made, so it does not establish the local database server version or a production target.

### Safe migration procedure

1. Identify the production database product and exact server version, storage engine, table sizes, and current applied migration list.
2. Take a verified pre-migration backup and record its checksum. Confirm a recovery owner and maintenance window.
3. Restore a **synthetic or sanitized** copy into isolated staging and run `php artisan migrate:status`, then `php artisan migrate --force` there. Inspect query plans, lock duration, warnings, and application workflows.
4. For production, take another backup immediately before the change; deploy compatible application code; apply forward migrations with `php artisan migrate --force` once; verify the migration table and key workflows.
5. If a migration fails, stop and assess the actual schema state. Do not run an automatic rollback or a `fresh` command. Use a forward fix or restore only under the approved recovery procedure.

This review did not inspect any database's `migrations` table or execute migrations against MySQL/MariaDB. The test suite below ran migrations against SQLite `:memory:` only. That checks Laravel's migration flow, not MySQL DDL compatibility or production lock behavior.

## 2. Backup and restore procedure

### Recommended operating policy

- Use automated daily encrypted database backups as a baseline. Add binary-log point-in-time recovery every 5–15 minutes if the project’s acceptable data-loss window requires it.
- Retain at least 7 daily, 4 weekly, and 12 monthly recovery points, subject to storage, privacy, and institutional retention policy.
- Keep backups outside the application/web root and on a separate failure domain. Restrict access to a dedicated least-privilege backup identity. Encrypt in transit and at rest; encrypt exports before off-host transfer using an organization-controlled key-management process. Keep encryption keys separate from backup files and test key recovery.
- Enable object versioning/immutability where available. Monitor backup job exit status, size, age, and checksums; alert on missed or unexpectedly small backups.
- Before every schema deployment, create a named pre-change snapshot and retain it until post-deployment verification is complete.

### Example logical backup command

Use a `mysqldump` client compatible with the selected database server. Put credentials in a protected option file outside the repository and web root (for example, a private `0600` MySQL option file on Unix, or a Windows file ACL limited to the service account). Never put passwords in command arguments, scripts committed to Git, shell history, or logs.

```sh
mysqldump --defaults-extra-file=/secure/path/contextify-backup.cnf \
  --single-transaction --routines --events --triggers --hex-blob \
  --default-character-set=utf8mb4 --databases contextify > contextify-UTC.sql
```

`--single-transaction` gives a consistent snapshot for transactional InnoDB tables; it does not make non-transactional tables consistent. Confirm the engine for every table. Encrypt the dump before off-site storage, remove temporary plaintext securely according to the host’s policy, and store a SHA-256 checksum alongside the encrypted artifact. For a large or high-write database, choose an engine-supported physical backup/PITR tool with the database operator instead of assuming a logical dump meets the recovery window.

### Restore and verify

1. Select a specific backup and verify its checksum, encryption metadata, timestamp, and key availability.
2. Create a new isolated database/schema such as `contextify_restore_test` on a disposable server. Use a separate restricted restore account. Never point a restore command at the application’s active database.
3. Decrypt into a protected temporary directory and import into the isolated database using the matching database client. Keep the restore logs private and remove temporary plaintext after verification.
4. Verify import exit status, table list, migration ledger, row counts, foreign-key checks, and representative relationships (users/tasks, goals, feedback, notifications). Run read-only application checks against the isolated restore and check logs for SQL errors.
5. Record restore duration, backup age, checksum, database version, and any recovery warnings. A backup is considered tested only after this isolated restore succeeds.

**Restore test result:** Not tested. No backup artifact was created, and no database server was contacted. The test suite used synthetic in-memory SQLite fixtures only; it is not evidence that a production MySQL backup can be restored.

### Automation decision

No backup script was added. Production host OS, database product/version, key-management method, backup storage destination, and retention policy are not yet chosen. A script without those decisions could mishandle credentials or leave plaintext exports behind. Schedule the reviewed command through the eventual host’s supported scheduler, with a private credentials file/secret manager and a tested encryption tool. Once the host and key workflow are selected, add and test a host-specific script without embedding secrets.

## 3. PHP runtime and dependency compatibility

- `server/composer.json` requires PHP `^8.2`; the locked Laravel framework is 12.62.0 and Sanctum is 4.3.2, both locked with PHP `^8.2`. Locked Dompdf 3.1.5 supports `^7.1 || ^8.0`. Laravel 12 release documentation lists PHP 8.2–8.5 support.
- The inspected local CLI is PHP **8.2.12** (XAMPP build). It satisfies the installed production dependency constraints, but it is an old patch release and PHP 8.2 reaches end of security support on **2026-12-31**. Do not carry this exact patch level into a public deployment.
- Recommended deployment runtime: the latest patched PHP **8.5.x**, after the full Composer lock and application test suite pass on the actual hosting image. PHP 8.5 is inside Laravel 12’s documented range and has a longer upstream security window than 8.2. A patched PHP 8.4.x is a conservative alternative if a hosting platform or a dependency prevents 8.5. No local PHP upgrade was performed.
- Verified current local non-dev Composer platform requirements pass. Laravel deployment requirements include Ctype, cURL, DOM, Fileinfo, Filter, Hash, Mbstring, OpenSSL, PCRE, PDO, Session, Tokenizer, and XML. This application’s MySQL connection also requires `pdo_mysql`; enable it in the selected runtime. The local environment also has `pdo_mysql`, though `composer check-platform-reqs --no-dev` was run against the vendor platform without requiring a live database connection.
- A target PHP 8.5 runtime was not available here. Composer’s PHP 8.5 conflict solver could not be completed offline because Composer attempted to contact Packagist; the locked direct package constraints and Laravel’s supported range indicate compatibility, but run `composer check-platform-reqs` and the full test suite inside the exact production PHP image before deployment.

## 4. Authentication token security review

### Current behavior

- Login and registration return Sanctum personal access tokens. The React client stores the bearer token in `localStorage` and attaches it to API calls. Logout deletes the current token; login deletes the user’s other tokens before issuing a new one; password reset deletes all of the user’s tokens.
- `config/sanctum.php` sets token `expiration` to `null`. The token table supports an individual `expires_at`, but this code does not set it when creating tokens. Tokens therefore have no configured age-based expiry; they remain valid until revoked, account state/authorization blocks them, or all tokens are deleted by the described flows.
- A token in `localStorage` is readable by JavaScript running on the origin. A successful cross-site scripting (XSS) attack could steal it and reuse it until revocation. HTTPS protects it in transit, but does not remove the XSS exposure.
- Laravel Sanctum’s stateful SPA middleware is registered for API routes. `bootstrap/app.php` exempts `api/*` from CSRF validation. This is not a protection needed for bearer-only requests, but it must be reviewed before cookie-based SPA authentication: stateful cookie requests require CSRF validation, and this broad exemption could undermine that protection. Keep the current bearer-token flow until cookie behavior is designed and tested; do not switch architecture by merely changing a frontend flag.

### Safer alternative and migration requirements

For a first-party React SPA on the same site (or correctly configured sibling subdomains), Sanctum’s session-cookie authentication can reduce token theft risk because session cookies can be `HttpOnly`, `Secure`, and `SameSite`. It requires a coordinated migration: remove the broad API CSRF exemption and test CSRF on unsafe requests; call `/sanctum/csrf-cookie`; enable Axios `withCredentials` and XSRF handling; configure exact credentialed CORS origins, `SANCTUM_STATEFUL_DOMAINS`, session cookie domain/path/secure/SameSite settings, session storage, HTTPS, and trusted proxy handling; update login/register/logout response handling; and test browser refresh, CSRF rejection, multi-tab behavior, logout, password reset, and existing token clients. Plan a transition that preserves or deliberately expires existing personal tokens rather than silently revoking them.

No authentication architecture, token expiry, CSRF, cookie, or CORS behavior was changed in Phase 2.

## 5. Verification results

- Backend tests: **81 tests, 391 assertions passed**, using Laravel’s configured SQLite `:memory:` test database; outbound network functions were disabled for the run. This included migration creation in the disposable SQLite database. No production or local persistent database was used.
- PHP syntax: **103 application/configuration/migration PHP files passed** `php -l`.
- Frontend production build: **passed**. Vite reports a JavaScript chunk above 500 kB; this is a performance warning, not a build failure.
- Frontend lint: **passed with 15 existing warnings** (unused imports, hook dependencies, and fast-refresh export warnings); no errors.
- Composer local production platform check: **passed** for the current PHP 8.2.12 runtime and installed non-dev packages.
- MySQL migration validation: **not run**. No target server/version was supplied, and the live XAMPP database was intentionally not touched. SQLite validation is not a substitute for testing the exact production engine/version.
- Backup/restore: **not run**. No disposable MySQL server or synthetic MySQL backup target is configured.
- Gemini: **not called**.

## 6. Remaining blockers and decisions

1. Select and document the production database product/version and hosting platform; run all migrations against a matching staging database with representative data volume.
2. Decide the backup/PITR recovery point and recovery time objectives, retention period, storage destination, encryption/key custody, and scheduler. Then implement and exercise a host-specific automated backup job.
3. Test a synthetic MySQL backup restore on a disposable MySQL-compatible server. Production readiness must not be claimed until restore succeeds.
4. Choose a maintained, patched PHP runtime. Test the locked application in its exact production PHP image; PHP 8.2.12 is not an acceptable public runtime level.
5. Decide whether to keep bearer tokens with a finite expiry/revocation policy or plan a Sanctum cookie migration. If choosing cookies, first correct and test the broad `api/*` CSRF exemption and coordinate frontend, session, CORS, and domain configuration.

The official 40/30/20/10 prioritization formula, task ranking methodology, AI/ML separation, and all application behavior remain unchanged.

## References

- [PHP supported versions](https://www.php.net/supported-versions.php)
- [Laravel 12 deployment requirements](https://laravel.com/docs/12.x/deployment)
- [Laravel 12 release support matrix](https://laravel.com/docs/12.x/releases)
- [MySQL 8.4 InnoDB online DDL operations](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html)
