# CODEX IMPLEMENTATION PLAN — JDIH ITH V2

This file tells Codex how to move from the current foundation to the agreed V2 without losing design intent.

## Rule 1 — Do not start with a giant rewrite

The repository already has useful infrastructure.

Reuse:
- NestJS bootstrap.
- config/env validation.
- logging.
- error filter.
- response interceptor.
- health foundation.
- database module.
- Next.js workspace.
- shared package.
- API client patterns.

Replace/refactor only what conflicts with V2.

## Rule 2 — Treat old domain design as legacy

Before implementation, identify conflicts in:
- `database/jdih_ith_schema.sql`
- `database/jdih_ith_seed.sql`
- `packages/shared/src/enums.ts`
- `packages/shared/src/roles.ts`
- `packages/shared/src/schemas/auth.schema.ts`
- `packages/shared/src/schemas/dokumen.schema.ts`
- old docs.

Expected conflicts include:
- `terbatas`.
- local password registration.
- legacy workflow/data fields.
- old 50-table modules.
- old public-statistics/content/legal-service scope.

## Phase 0 — Audit & Alignment

Deliverables:
- conflict report.
- source files to keep unchanged.
- source files to update.
- proposed V2 DB file paths.

Acceptance:
- no domain code implemented yet if user only requested audit.
- no destructive DB operation.
- no loss of legacy files.

## Phase 1 — Physical Database V2

Recommended transition:
- add `database/v2/` or explicit V2 SQL files first.
- do not destroy old SQL until V2 approved.

Create:
- schema.
- seed.
- Docker Compose MySQL 8 host port 3307.
- test/sample dataset.

Physical design must include:
- PK/FK.
- UNIQUE.
- CHECK where appropriate.
- indexes for search.
- soft delete.
- transaction-safe current version pointer.
- grant uniqueness.
- session indexes.
- audit indexes.

Required invariant examples:
- unique Google sub/email.
- one logical version number per document.
- no duplicate active secret grant for same user/document.
- valid access enums.
- valid workflow enums.
- valid legal status enums.
- file belongs to its version.
- current published pointer can only target same document.
  - enforce in service/transaction if DB cannot express cross-row invariant cleanly.

## Phase 2 — Shared Contracts

Update:
- access enum 3 levels.
- workflow states.
- legal statuses.
- relation types.
- account statuses.
- schemas for public search.
- schemas for admin document version create/update.
- schemas for account registration/approval.
- schemas for secret grants.
- schemas for template upload metadata.

Remove/deprecate:
- `terbatas`.
- local-password registration/reset if unused in V1.

Acceptance:
- both API and web compile against shared package.
- no duplicate validation definition.

## Phase 3 — Google Auth & Session

Implement:
- Google OAuth/OIDC.
- staff domain validation.
- student rejection.
- existing admin role lookup.
- pending user registration.
- secure session/refresh.
- logout/revoke.
- `/auth/me`.

Acceptance:
- pending account cannot access Internal.
- active account can.
- Admin role cannot be self-created.

## Phase 4 — Account Approval

Admin:
- list pending.
- detail.
- resolve manual unit.
- approve.
- reject with reason.
- deactivate/reactivate if later required.

Popup:
- approve/reject confirmation.

Audit all decisions.

## Phase 5 — Authorization

Implement:
- default-closed route policy.
- functional permissions.
- separate document access policy.
- explicit Secret grants.

Acceptance:
- anonymous Internal detail denied.
- active staff Internal allowed regardless of unit.
- Secret invisible without grant.

## Phase 6 — Master Data

Implement:
- units.
- document types.
- categories.
- tags.

Seed product types:
- Peraturan Rektor.
- SK Rektor.
- Instruksi Rektor.
- Surat Edaran Rektor.
- SOP.

Seed initial SOP categories as configurable master data.

## Phase 7 — Documents & Versioning

Implement:
- stable document.
- version creation.
- metadata.
- file uploads.
- attachments.
- current published pointer.

Critical acceptance:
- Version 1 stays public while Version 2 is draft.
- Version 2 only replaces pointer after publish commit.

## Phase 8 — Workflow

Implement:
- submit.
- return revision.
- approve.
- publish.
- withdraw.

Tests:
- self-approval blocked.
- invalid transition blocked.
- revision note required.
- publish only approved.

## Phase 9 — Legal Relations

Implement:
- relation CRUD.
- impact preview endpoint.
- confirmed status transition on publish.
- legal status history.

Never apply relation side effect while still draft.

## Phase 10 — Search

Implement metadata search and filters.

Anonymous redaction:
- Public = summary.
- Internal = title + badge.
- Secret = absent.

Authenticated:
- Internal detail/result.
- granted Secret.

## Phase 11 — Secret Grants

Admin UI/API:
- search active users.
- grant.
- revoke.
- optional expiry.
- audit.

No request-access UI in V1.

## Phase 12 — Letter Templates

Implement:
- stable template.
- versions.
- local storage.
- public/internal access.
- old version archive.

## Phase 13 — Dashboard & Audit

Admin only.

No public statistics page.

## Phase 14 — Frontend

Public:
- Beranda.
- Profil.
- Produk Hukum.
- Format Persuratan.
- Masuk.

Admin:
- dashboard.
- documents.
- verification.
- users.
- secret grants.
- templates.
- masters.
- audit.

## Definition of Done per Task

For each task:
- types compile.
- relevant lint passes.
- relevant tests pass.
- no access regression.
- no secret resource leak.
- update shared contract if API changed.
- update docs/context if business behavior changed.
- confirmation popup for write/high-impact frontend action.
