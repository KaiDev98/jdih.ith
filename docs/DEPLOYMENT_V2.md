# JDIH ITH V2 — Deployment Preparation

Status: operational preparation only. No production database, Google project,
server, certificate, or deployment operation was accessed or changed while this
document was written. The baseline application is a same-origin modular
monolith; production deployment must use a reviewed release and real institution
credentials.

## Target architecture

```text
Browser ── HTTPS :443 ── Nginx
                           ├── /          → Next.js :3000 (loopback)
                           └── /api/v1/   → NestJS :3001 (loopback)
                                             ├── MySQL 8.4 / jdih_ith_v2_prod
                                             └── private local storage
```

Use one API process and one web process on one application host for the first
deployment. OAuth state/nonce/PKCE handles and the global rate limiter are
process-local. Do not run multiple API replicas until the OAuth flow store and
rate-limit state are shared safely. Sticky routing alone is not a replacement
for that work. Keep MySQL private and bind both Node services to loopback when
Nginx is on the same host. The local file storage root must be outside the web
root and outside any Nginx `alias` or static directory.

The checked-in `deploy/nginx/jdih-ith.conf.example` and systemd examples use
placeholders. Review them against the actual host, TLS certificate provisioner,
MySQL topology, and institution operations process before installation.

## Production environment

The active API configuration is validated by
[`backend/src/config/env.schema.ts`](../backend/src/config/env.schema.ts).
Do not copy the legacy [`backend/.env.example`](../backend/.env.example): it
contains the historical XAMPP/JWT configuration and is inactive for V2. Use
these protected files outside the repository, for example
`/etc/jdih-ith/api.env` and `/etc/jdih-ith/web.env`, owned by root and mode 0600.
Systemd reads the files before switching to the unprivileged `jdih` service
account. Never put production values in Git, build logs, tickets, or command-line
arguments.

| Area | API variables and production settings |
| --- | --- |
| Runtime | `NODE_ENV=production`, `API_HOST=127.0.0.1`, `API_PORT=3001`, `API_PREFIX=api/v1`; Web `HOSTNAME=127.0.0.1`, `PORT=3000` |
| Public origin | `APP_URL=https://jdih.ith.ac.id`, `CORS_ORIGIN=https://jdih.ith.ac.id` exactly; no path or trailing slash |
| Proxy | `TRUST_PROXY_HOPS=1` only for the single controlled Nginx hop shown here; API must not be reachable directly from the Internet |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI=https://jdih.ith.ac.id/api/v1/auth/google/callback`; the accepted issuer is pinned to `https://accounts.google.com` and the audience must match `GOOGLE_CLIENT_ID`; enforce the approved `@ith.ac.id` domain and register the exact callback in Google configuration |
| Session | `SESSION_KEY` from a secure random secret source, at least 32 characters; `SESSION_TTL_SECONDS` from 300 through 604800; `COOKIE_SECURE=true` |
| Database | `DB_HOST`, `DB_PORT`, `DB_NAME=jdih_ith_v2_prod`, `DB_USER`, non-empty `DB_PASSWORD`, `DB_POOL_LIMIT`, `DB_TIMEZONE=Z`, `DB_LOG_QUERY=false` |
| Storage | `STORAGE_DRIVER=lokal`, `STORAGE_LOCAL_PATH=/var/lib/jdih-ith/storage`, `UPLOAD_MAX_SIZE_MB=50` |
| API protection/logging | `SWAGGER_ENABLED=false`, `LOG_LEVEL=info`, `LOG_PRETTY=false`, `THROTTLE_TTL=60`, `THROTTLE_LIMIT=120` |

The app uses a host-only `jdih_session` cookie with `HttpOnly`, `SameSite=Lax`,
`Path=/`, and no `Domain` attribute. Do not add a cookie domain for the first
same-origin deployment. The web process needs `API_INTERNAL_URL=http://127.0.0.1:3001`
and `NEXT_PUBLIC_SITE_URL=https://jdih.ith.ac.id`; set the public URL before the
Next.js build as it may be included in generated assets. `NEXT_PUBLIC_NAMA_SITUS`
and `NEXT_PUBLIC_NAMA_INSTITUSI` control displayed names only.

The validator permits `jdih_ith_v2_prod` only when `NODE_ENV=production`; it
rejects that database name in development/test and rejects `dev`/`test*` names in
production. `DB_PORT` is read from configuration and must match the real private
MySQL endpoint; it is not assumed to be 3307. The deprecated JWT/password login
variables are not used by the V2 identity module. S3, Meilisearch, and Redis
settings are optional future drivers and are not part of this deployment plan.

The generic global limiter is 120 requests per 60 seconds per trusted client IP;
the Identity login, registration, and refresh routes override it to 20 per 60
seconds (session checks `/auth/me` and logout keep the general limit). Document download
streams and letter-template downloads have an additional fixed one-hour limit:
`UNDUH_LIMIT_ANONIM` per anonymous client IP (default 30) and
`UNDUH_LIMIT_PENGGUNA` per authenticated account (default 200). Inline document
previews (`?mode=inline`, loaded automatically on every public detail page) are
counted in a separate bucket: `PRATINJAU_LIMIT_ANONIM` (default 300) and
`PRATINJAU_LIMIT_PENGGUNA` (default 1000), so browsing does not use up the
download quota of visitors sharing one campus IP. Authorization
is resolved before counting/opening a file, so denied Secret resources retain
not-found semantics and do not consume a download slot. A request beyond the
applicable quota receives HTTP 429; file responses remain Node streams.

The download limiter and global limiter are in-memory per API process. Run one
API process for V1; multiple instances require a shared limiter/store and are
not supported by this configuration. Nginx must overwrite the forwarded client
address as shown below, and Express trusts only the configured proxy hop count.
**Download rate-limit enforcement: DONE.**

## MySQL 8.4 production preparation

Production must use a new database named `jdih_ith_v2_prod`, not the legacy
database or the local development/test database. Perform the following under a
change ticket and a DBA/operations account separate from the application user.
The example does not execute automatically:

```sql
CREATE DATABASE jdih_ith_v2_prod
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'jdih_app'@'<exact-application-host>' IDENTIFIED BY '<secret-from-secure-provisioning>';
GRANT SELECT, INSERT, UPDATE, DELETE ON jdih_ith_v2_prod.*
  TO 'jdih_app'@'<exact-application-host>';
```

Use the exact application source host in the MySQL account; do not use `%` when
the application host is known. Keep DDL privileges in a separate operations
account. The app account needs no schema, user, grant, or global administrative
privileges. Configure `DB_HOST`/`DB_PORT` to the private MySQL endpoint and use
MySQL 8.4 with UTC and strict SQL mode.

Before import, connect with the operations account and verify `SELECT VERSION()`,
`SELECT @@port`, `SELECT DATABASE()`, and that the target database has no tables.
The baseline DDL has no `DROP`, but its first line-level database selection is
fixed to `jdih_ith_v2_dev` for local validation. For a reviewed production import,
stream only that exact directive to the production name; leave the tracked SQL
unchanged and verify the rewritten directive before piping it to MySQL:

```sh
test "$(grep -c '^USE jdih_ith_v2_dev;$' database/v2/schema.sql)" -eq 1
sed 's/^USE jdih_ith_v2_dev;$/USE jdih_ith_v2_prod;/' database/v2/schema.sql \
  | mysql --defaults-extra-file=/etc/jdih-ith/mysql-ops.cnf --database=jdih_ith_v2_prod

test "$(grep -c '^USE jdih_ith_v2_dev;$' database/v2/seed.sql)" -eq 1
sed 's/^USE jdih_ith_v2_dev;$/USE jdih_ith_v2_prod;/' database/v2/seed.sql \
  | mysql --defaults-extra-file=/etc/jdih-ith/mysql-ops.cnf --database=jdih_ith_v2_prod
```

Protect `/etc/jdih-ith/mysql-ops.cnf` as a separate operations credential file;
do not place its password in a command, environment example, or this repository.
Verify 23 tables, 41 foreign keys, 33 enforced CHECK constraints, canonical
roles/permissions, and master seed rows using `information_schema` and reviewed
read-only queries. Do **not** import `database/v2/sample.sql` in production. Do
not import the legacy 50-table SQL, run `db:reset`, or use Drizzle push/generate.
Take and verify a backup before every later schema migration; a future migration
process must be reviewed separately because the current V2 SQL is a baseline,
not a production migration runner.

## Release and process management

Use systemd as the single process manager. Build an immutable release with the
repository's supported Node/npm versions, run the final checks, and keep source
and production runtime dependencies in the release directory. `npm run build`
builds shared contracts, API, and web in order. Install the example units from
`deploy/systemd/` after replacing the release path and service account. The web
unit runs the standalone server at
`frontend/.next/standalone/frontend/server.js`. The frontend `postbuild` hook
calls `frontend/scripts/prepare-standalone.mjs` to copy `.next/static` and, when
present, `public` into the standalone app directory. The helper replaces those
generated destinations on each build, so local startup and deployment consume
the same standalone artifact without a manual copy step. `npm run start:web`
uses this standalone server. Set `HOSTNAME=127.0.0.1` and `PORT=3000` in the web
environment file. Each service uses `Restart=on-failure`, a short
restart delay, and systemd journal stdout/stderr. `systemctl stop` the API before
maintenance requiring no writes; stop both API and web during a consistent
DB-plus-file restore.

Create the private directory before enabling the API:

```sh
install -d -o jdih -g jdih -m 0700 /var/lib/jdih-ith/storage
install -d -o root -g root -m 0700 /etc/jdih-ith
```

The API creates its configured storage root on startup and writes uploaded data
under private `objects/` and `.staging/` directories. Keep the systemd service
unprivileged, grant write access only to that storage root, and ensure the
Nginx-readable web root does not contain it.

## HTTPS, reverse proxy, and headers

Terminate TLS at Nginx. The sample config redirects HTTP to the canonical HTTPS
host, proxies `/` to Next.js and `/api/v1/` to NestJS, forwards the host/scheme,
sets a fresh request ID, and replaces—not appends to—`X-Forwarded-For` with the
edge-observed client address. With one Nginx hop, set `TRUST_PROXY_HOPS=1`, bind
the API to `127.0.0.1`, and firewall MySQL and Node ports from external access.
If a load balancer sits before Nginx, configure Nginx real-IP handling for only
its documented source CIDRs, then re-evaluate trusted hops; never trust arbitrary
forwarded chains. Rate-limit IP selection depends on this topology.

The sample allows 55 MiB multipart bodies for a 50 MiB application file limit,
uses request-body and upstream timeouts, and disables Nginx response buffering
for API streams. It has no `alias` for storage. Replace its certificate path
placeholders using the site's certificate process. Enable HSTS only after HTTPS
and certificate renewal have been verified; the example uses a one-year host
policy without `includeSubDomains` or preload.

**CSP enforcement: DONE.** Next.js sends an enforced, per-response nonce Content-Security-Policy from its
Next 16 `src/proxy.ts`. The Proxy forwards the CSP and `x-nonce` on the render
request so App Router can nonce its hydration/bootstrap scripts. This requires
dynamic rendering for matched pages and disables static page generation/CDN
HTML caching; immutable Next assets remain cacheable. Production does not allow
`'unsafe-inline'`, `'unsafe-eval'`, or wildcard sources. Development adds only
`'unsafe-eval'` for the React/Next debugging runtime and websocket schemes for
HMR. The policy permits same-origin API calls, blob-backed PDF previews, and the
narrow Google authorization form target. `frame-ancestors 'self'` agrees with
the existing `X-Frame-Options: SAMEORIGIN`; `object-src 'none'` prevents legacy
plugin embedding. Nginx does not replace this policy. Review actual browser
violations on staging when routes or third-party resources change, but CSP
enforcement is implemented and tested rather than a pending rollout gate.

Nest Helmet continues to disable CSP only on its JSON/file API responses. Its
other security headers remain active. Same-origin API rewrites are excluded
from the Next page Proxy, preserving API routing, cookie behavior, CSRF, and
Origin checks.

## Initial Admin provisioning

There is no public create/promote endpoint or Admin UI. Operations provisions the
first `ADMIN` or `SUPERADMIN` through a restricted DBA session after verifying
the authorized person and canonical unit. Do not put a real email in source,
seed, sample, or a command-line argument. Use a prepared/manual SQL session with
operator-supplied variables and a reviewed transaction. The essential records
are:

1. Insert an account with `google_sub=NULL`, exact approved `@ith.ac.id` email,
   verified display name, canonical unit, `status='AKTIF'`, and
   `verified_at=UTC_TIMESTAMP(6)`.
2. Assign exactly one seeded canonical role through `pengguna_peran`; the
   operations assignment actor may be NULL only for the initial bootstrap.
3. Insert an allowlisted `audit_log` `BOOTSTRAP_ADMIN` event in the same
   transaction with `actor_id=NULL`, generated request UUID, target account ID,
   and only status/role metadata. Do not copy credentials or identity tokens.
4. Commit only after checking exactly one user, one role assignment, and one
   audit event; roll back if the seeded role/unit is missing or any insert fails.
5. On first Google sign-in, the server verifies OIDC and binds the verified
   Google `sub` to the pre-provisioned email. Never accept email/sub from a
   registration body, and never promote an ordinary user through the app.

For later operations personnel, repeat a separately reviewed DBA transaction
with an appropriate operations identity. Avoid adding generic role-management
SQL or a reusable endpoint. There are no real Admin identities in seed data.

## Backup and restore

Keep encrypted DB backups and private storage backups outside the web host's
public root, with access and retention set by institutional operations. Supply
DB credentials through a protected MySQL option file, not inline arguments:

```sh
mysqldump --defaults-extra-file=/etc/jdih-ith/mysql-backup.cnf \
  --single-transaction --routines --triggers --hex-blob --databases jdih_ith_v2_prod \
  > /secure-backup/jdih-ith-v2-db.sql

tar --acls --xattrs -czf /secure-backup/jdih-ith-v2-storage.tar.gz \
  -C /var/lib/jdih-ith storage
```

For a restore, stop both services, restore the matching DB snapshot and storage
snapshot as one recovery point, verify ownership/modes and the current-version
file objects/checksums, then run read-only smoke checks before reopening traffic.
Restoring only the database can point to missing files; restoring only storage
can leave unreferenced objects. Keep a second copy and periodically perform a
restore rehearsal in an isolated recovery environment. Never run a restore
against `jdih_ith_v2_dev` or a legacy database.

## Health, logs, and support

- `GET /api/v1/kesehatan/hidup` is a lightweight liveness check.
- `GET /api/v1/kesehatan/siap` checks database, heap, and storage readiness and
  returns status only; it deliberately omits host paths, SQL details, and OS
  errors because the endpoint is public for monitoring.
- Both app processes log to stdout/stderr; systemd journals are the collection
  point. Set `LOG_PRETTY=false` and `LOG_LEVEL=info` in production.
- Pino assigns a request ID, strips query strings from request log URLs, and
  redacts authorization/cookie/token fields. Nginx replaces inbound request IDs
  with its generated `$request_id`; the API returns `X-Request-Id` for support.
- The global exception filter gives callers a generic response plus correlation
  ID and never returns raw unexpected exceptions. Audit API projections omit
  before/after payloads, request ID, IP, user-agent, and credentials.

## Known operating limits

- File storage is a private local disk root; S3/MinIO is not implemented.
- OAuth temporary state and rate limiting are in-process; run one API instance.
- Live Google OIDC has not been accepted with real ITH credentials. Production
  OAuth acceptance is mandatory before go-live.
- No antivirus scanner, OCR/full-PDF text search, Meilisearch, or PDF range
  requests are implemented.
- A sudden process/host failure in the file finalize/DB commit window can leave
  an orphan object. There is no automatic orphan sweeper; reconciliation must
  compare storage keys against database references before deletion.
- No production schema migration runner or rollback automation exists.
- Download and global rate limiting are in-memory per process; multi-instance
  operation requires a shared limiter/store.

## Deployment and rollback checklist

Before release: review the exact commit; take verified DB/storage backups; set
protected production environment files; provision TLS and the Google callback;
create the production DB and least-privilege user; import only reviewed V2
schema/seed into an empty target; provision the first Admin; verify storage
permissions; build and run checks; install/validate Nginx and systemd units;
verify HTTPS, cookies, the enforced CSP on rendered pages, `/kesehatan/hidup`,
and `/kesehatan/siap`.

For rollback: stop new writes, capture logs and request IDs, restore the last
known application release, and assess whether the database schema/data or
private storage changed. Do not roll back by importing legacy SQL or running a
destructive reset. If a schema/data migration has occurred, use the separately
reviewed recovery plan and matched backups; an app binary rollback alone may
not be compatible with newer data.
