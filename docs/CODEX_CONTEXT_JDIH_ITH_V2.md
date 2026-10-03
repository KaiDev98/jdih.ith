# CODEX CONTEXT — JDIH ITH PAREPARE V2

**Dokumen ini adalah konteks lengkap yang harus dipahami Codex sebelum mengerjakan project.**  
Bahasa utama project: Bahasa Indonesia.  
Tanggal baseline V2: 2026-10-03.

---

# 1. Tujuan Project

Membangun Portal **JDIH ITH Parepare** — Jaringan Dokumentasi dan Informasi Hukum untuk Institut Teknologi Bacharuddin Jusuf Habibie, Parepare.

Tujuan utamanya bukan sekadar tempat menyimpan PDF. Sistem harus menjadi portal terstruktur untuk:

- publikasi Produk Hukum ITH;
- pencarian Produk Hukum;
- pengelolaan metadata hukum;
- file utama + banyak lampiran;
- workflow input → verifikasi → publish;
- status hukum dan relasi antarproduk hukum;
- akses Publik/Internal/Rahasia;
- login Dosen/Staf ITH;
- verifikasi akun Dosen/Staf oleh Admin;
- versioning dokumen;
- pengelolaan Format Persuratan;
- audit aktivitas;
- dashboard administratif.

Portal publik harus ringan, mudah dicari, SEO-friendly, mobile-friendly, dan tidak membuka data internal/rahasia secara tidak sengaja.

---

# 2. Referensi Visual / Produk

User memberikan referensi:

- https://peraturan.bpk.go.id/
  - inspirasi utama untuk pola search Produk Hukum, detail metadata, status hukum, relasi, preview/download.
- https://divisihukum.ub.ac.id/
  - referensi umum portal hukum universitas.
  - jangan menyalin literal; hanya inspirasi.

Identitas visual:
- Logo ITH digunakan.
- Warna visual: biru–hijau–oranye ITH.
- Logo yang diberikan user disertakan pada context pack: `assets/Logo_ith_pare.png`.

---

# 3. Current Repository / Existing Foundation

Repository:
`https://github.com/KaiDev98/jdih.ith.git`

Snapshot saat context pack dibuat:

- default branch: `nesta`
- commit: `4e12664540013562e2fc5d30d5afb6cdbffdb527`
- commit message: `chore: add JDIH ITH portal setup`
- current source is a monorepo.
- backend domain modules belum dibangun; `apps/api/src/modules/` hanya berisi README.

Current structure:

```text
jdih.ith/
├── apps/
│   ├── api/              NestJS 12 backend
│   └── web/              Next.js 16 frontend
├── packages/
│   └── shared/           shared Zod/API/enums/roles/permissions
├── database/             legacy SQL schema + seed
├── docs/                 legacy design docs
├── scripts/
└── package.json
```

Foundation yang sudah ada dan layak dipertahankan:

- NestJS 12.
- Next.js 16 App Router.
- TypeScript.
- Drizzle ORM dengan MySQL driver.
- Zod 4 shared contracts.
- Tailwind CSS 4.
- Vitest.
- pino logging.
- request-id/correlation.
- error filter.
- standard response wrapper.
- env validation.
- health infrastructure.
- Helmet.
- CORS.
- rate limiting.
- Swagger/OpenAPI development support.
- API client untuk browser dan Next server-side.
- SQL-first introspection utilities.

Current repository uses Node/npm workspaces.

Current root scripts include:

```text
npm run dev
npm run build
npm run typecheck
npm run lint
npm test
npm run db:import
npm run db:reset
npm run db:pull
npm run doctor
```

## Important: current repo docs are partially stale

The current README and docs still describe the old 50-table database as source of truth.

For V2, this is no longer true.

Also `docs/07-rekomendasi-teknis.md` historically referenced Laravel 11 / Blade / Livewire / Filament. That recommendation is obsolete. The actual target is NestJS + Next.js.

Codex must preserve useful infrastructure but update domain design to this V2 context.

---

# 4. Target Architecture

Use a **modular monolith**, not microservices.

```text
Browser
   |
   v
Next.js + React + TypeScript
   |
   | HTTPS / REST JSON
   v
NestJS + TypeScript
   |
   +--> Drizzle --> MySQL 8
   |
   +--> StorageService --> LocalStorageDriver (V1)
                         --> S3/MinIO driver (future)
   |
   +--> Google OAuth/OIDC
```

Production recommendation:

```text
https://jdih.ith.ac.id
    |
    +-- /              -> Next.js
    |
    +-- /api/v1/*      -> NestJS
```

Use Nginx/reverse proxy so frontend and API can use the same public origin.

Local development target:

```text
Next.js:  localhost:3000
NestJS:   localhost:3001
MySQL 8:  localhost:3307
```

The user explicitly prefers Docker Compose MySQL 8 with host port `3307` for local development to reduce conflicts with existing local MySQL.

Current repo originally supports XAMPP/no Docker. V2 target may add Docker Compose while preserving the ability to configure DB via `.env`.

---

# 5. Public Information Architecture

Final top navigation:

```text
Beranda
Profil
Produk Hukum
Format Persuratan
Masuk
```

Changes from earlier UI:
- `Informasi Hukum` becomes **Format Persuratan**.
- Remove **Statistik** from public navbar.
- No dedicated public Statistics page.

## Beranda

Public homepage should be simple and light:

1. Navbar.
2. Hero:
   - JARINGAN DOKUMENTASI DAN INFORMASI HUKUM.
   - Institut Teknologi Bacharuddin Jusuf Habibie.
   - Parepare, Sulawesi Selatan.
3. Main search.
4. **One latest public uploaded/published document** below search.
5. Footer.

Do **not** show public statistics counts on homepage in V1.

Admin dashboard may show statistics.

Remove the current development-only “Status Pemasangan” block after real modules exist.

## Profil

Low priority.

For now, profile only needs general information **Tentang ITH**.  
Do not overbuild:
- no mandatory Visi/Misi,
- no required structure,
- no required legal-basis section.

This can be expanded later.

---

# 6. Actors

## 6.1 Pengunjung Publik

Can:
- search Products Hukum;
- use filters;
- view public document detail;
- preview/download public files;
- see Internal document **title + INTERNAL badge** in public search;
- download public letter templates;
- view basic Profile.

Cannot:
- open Internal detail/file;
- discover Secret documents;
- access admin features.

## 6.2 Dosen/Staf ITH

Authentication:
- Google account with `@ith.ac.id`.
- Must be approved by Admin before internal access.

Can after account `AKTIF`:
- everything Public;
- view/download all Internal documents;
- view/download Internal letter templates;
- access Secret documents only if explicit user grant exists.

Important:
- INTERNAL is **not unit-scoped**.
- all active Dosen/Staf can access every Internal document.

## 6.3 Admin

Admin account is pre-provisioned.

Can:
- create/edit product law drafts;
- upload main PDF and attachments;
- choose access level;
- manage categories/tags/relations;
- submit document versions;
- create new revisions;
- manage letter templates;
- verify/reject Dosen/Staf registrations;
- manage units/master data;
- manage explicit Secret grants;
- view dashboard/audit according to permission.

Admin may also have verifier permission.

## 6.4 Admin Verifikator

This is not necessarily a separate role.  
Preferred model: Admin + verification permission.

Can:
- review submitted versions;
- return for revision;
- approve;
- publish;
- withdraw;
- confirm legal relation impact.

Critical:
- may **not approve a version they created**.

## 6.5 Superadmin

Pre-provisioned and controlled by developers/operations.

Can:
- administrative full access;
- verifier functions;
- system/master administration;
- secret document administration.

But:
- there must still be **no UI to create/promote Admin/Superadmin**.

## 6.6 Google Identity Provider

Used for authentication.

---

# 7. Authentication & Account Registration

## 7.1 Domains

Staff:
`@ith.ac.id`

Students:
`@mahasiswa.ith.ac.id`

Students must not receive Dosen/Staf internal access.

Other domains must be rejected.

## 7.2 No local password for target V1

Dosen/Staf use Google login.

Admin and Superadmin should also authenticate using ITH Google account, but their roles are already pre-provisioned in DB/config/seed.

Legacy local-password flows are not target V1.

## 7.3 First login flow

```text
Login Google
    |
    v
Domain @ith.ac.id?
    | no -> reject
    v yes
Existing account?
    | yes -> check status
    |
    no
    v
Prefill name/email/avatar from Google
    |
    v
Choose Unit
    |
    +-- unit exists -> choose master unit
    |
    +-- unit missing -> enter unit manually
    |
    v
Confirm registration popup
    |
    v
Create:
role = DOSEN_STAF
status = MENUNGGU_VERIFIKASI
    |
    v
Admin review
    |
    +-- approve -> AKTIF
    |
    +-- reject -> DITOLAK
```

## 7.4 Why Admin approval exists

Domain validation alone is not considered sufficient.

The user explicitly wants Admin verification to reduce the risk of bogus or inappropriate accounts.

## 7.5 Unit manual

If staff unit is not found in master:
- user can type manual unit name;
- it is not immediately treated as canonical unit;
- Admin review:
  - map to existing unit, or
  - create the missing unit in master;
- only then finalize `unit_kerja_id`.

V1 registration data is sufficient with:
- Google account identity,
- unit.

NIP/NIDN is **not required**.

## 7.6 Admin creation restrictions

No UI or normal API for:
- create Admin;
- promote user to Admin;
- create Superadmin;
- promote user to Superadmin.

Admin/Superadmin identities are provisioned intentionally through developer/operations-controlled configuration/seed/database process.

---

# 8. Roles & Permissions

Canonical conceptual roles:

```text
SUPERADMIN
ADMIN
DOSEN_STAF
PENGUNJUNG (virtual / anonymous)
```

Admin verifier = Admin with verification permission.

RBAC should support:
- role permissions;
- optional direct user allow/deny permissions if needed.

Do not use role alone as document-security logic.

Document visibility is its own policy layer.

Suggested security layers:

1. Authentication.
2. Functional permission.
3. Document access policy.

Legacy unit-based document scope must **not** be reused for INTERNAL access.

Unit remains useful as:
- profile data;
- publisher/manager classification;
- search/filter metadata;
- SOP/category/organization context.

---

# 9. Document Access Levels — FINAL V2

Only 3 values:

```text
publik
internal
rahasia
```

There is **no `terbatas`**.

## 9.1 PUBLIK

Anonymous:
- appears in search;
- full public detail;
- preview/download allowed.

Authenticated:
- same.

Requirements:
- current published version;
- not deleted/withdrawn.

## 9.2 INTERNAL

Anonymous:
- appears in public search as **title + INTERNAL badge only**;
- no full metadata;
- no detail;
- no preview/download.

Active Dosen/Staf:
- can open full detail;
- can preview/download.
- no unit restriction.

If anonymous clicks Internal result:
- show popup/login prompt.

## 9.3 RAHASIA

Anonymous:
- must not appear anywhere public.

Must not leak through:
- public search;
- autocomplete;
- recommendations;
- sitemap;
- public APIs;
- counts that reveal existence.

Active Dosen/Staf:
- can see only if explicit user grant exists.

Unauthorized direct access:
- prefer 404 so existence is not disclosed.

Admin/Superadmin:
- can manage according to admin permissions.

Secret view/download:
- audit.

## 9.4 Minta Akses history

A “Minta Akses” feature was discussed and is technically possible.

However it is **not part of V1 final flow** because:
- RAHASIA must be undiscoverable;
- a request button would reveal that a secret document exists.

V1:
- Admin explicitly grants a user access.

Future:
- access request can be reconsidered if there is a safe mechanism that does not leak secret resource existence.

---

# 10. Product Law Types

Final V1 master list:

1. Peraturan Rektor
2. SK Rektor
3. Instruksi Rektor
4. Surat Edaran Rektor
5. SOP

Do not add `Statuta` as a final V1 product type unless user explicitly requests it later.

---

# 11. SOP Categories

SOP remains one document type.

Do not create separate document types for each SOP area.

SOP categories should be dynamic master data.

Initial examples:

- Jurusan Sains
- Jurusan TPI
- Perpustakaan
- TIK
- Akademik & Kemahasiswaan
- BMN
- Kepegawaian
- Keuangan
- LPPM

Example:

```text
Jenis Dokumen = SOP
Kategori = Keuangan
Judul = SOP ...
```

Categories may later be added by Admin without changing source code.

---

# 12. Legal Status — FINAL V2

Only:

```text
BERLAKU
DIUBAH
DICABUT
```

Status hukum is different from workflow/publishing status.

A document can be:
- workflow/current publication = TERBIT;
- legal status = DICABUT.

It should remain searchable historically if access rules allow.

---

# 13. Legal Relations

V1 relation types:

```text
MENGUBAH
MENCABUT
DASAR_HUKUM
TERKAIT
```

Historical relation types from old design such as `dilaksanakan_oleh` or `juknis` are not V1 requirements.

## 13.1 Status impact

Example:

```text
Peraturan Rektor 5/2026
   MENGUBAH
Peraturan Rektor 10/2025
```

Proposed target transition:
`BERLAKU -> DIUBAH`

Example:

```text
Peraturan Rektor 8/2027
   MENCABUT
Peraturan Rektor 10/2025
```

Proposed target transition:
`BERLAKU/DIUBAH -> DICABUT`

## 13.2 Never silently auto-change

System may compute/propose impact, but must show it before publish.

Example confirmation:

```text
Dokumen ini MENCABUT:
Peraturan Rektor No. 10 Tahun 2025

Status target:
DIUBAH -> DICABUT

[Batal] [Konfirmasi & Terbitkan]
```

Only after Verifier confirms:
- publish source version;
- apply relation;
- update target legal status;
- add legal-status history;
- workflow log;
- audit log.

All in one transaction.

## 13.3 Withdrawal is not legal rollback

If source document is later withdrawn from portal:
- do not automatically reverse target legal status.
- legal status correction must be explicit and audited.

---

# 14. Workflow / Publication Lifecycle

Workflow is a property of a **document version**, not the stable document identity.

Canonical states:

```text
DRAF
DIAJUKAN
REVISI
DISETUJUI
TERBIT
DITARIK
```

Canonical flow:

```text
DRAF
  |
  v
DIAJUKAN
  |
  +-- perlu perbaikan --> REVISI --> DIAJUKAN
  |
  +-- sesuai ---------> DISETUJUI --> TERBIT --> DITARIK
```

There is **no DITOLAK state** for document workflow.

## 14.1 Separation of duties

Backend rule:

```text
version.created_by != approving_user.id
```

This must be enforced server-side.

Do not only hide the button in frontend.

## 14.2 Return for revision

Requires a revision note.

## 14.3 Publish

Before publish:
- state must be DISETUJUI;
- required metadata present;
- required main file present;
- actor has permission;
- legal relation impacts recomputed against current target status;
- show impact popup.

Publish is transactional.

## 14.4 Withdraw

Requires reason.

Use confirmation popup.

After withdrawal:
- version no longer public;
- if it is current published version, stable document public pointer is cleared or handled explicitly.

Do not delete history.

---

# 15. Versioning — IMPORTANT DESIGN CORRECTION

This is one of the most important V2 improvements.

The stable entity is `dokumen`.

Editable/versioned publication data lives in `dokumen_versi`.

A currently published version must remain publicly available while a new revision is prepared.

Example:

```text
DOKUMEN X
|
+-- Version 1 = TERBIT
|     current public version
|
+-- Version 2 = DRAF / DIAJUKAN / REVISI / DISETUJUI
      not public yet
```

Only when Version 2 successfully publishes:

```text
dokumen.current_published_version_id
Version 1 -> Version 2
```

Then:
- Version 2 = TERBIT/current.
- Version 1 gets `superseded_at`.
- Version 1 remains in history.

No automatic overwrite.

No hard deletion of normal versions.

## 15.1 Versioned metadata

Prefer storing mutable publication metadata on `dokumen_versi`, including:

- access level;
- number;
- year;
- title;
- abstract;
- managing/publishing unit;
- categories;
- tags;
- files;
- relations for that version;
- workflow state;
- verifier/publisher fields.

Stable `dokumen` holds:
- internal code;
- slug;
- document type if type is considered stable;
- current legal status;
- current published version pointer;
- creation/audit identity;
- soft-delete flag.

---

# 16. Files & Attachments

One document version can have:

```text
Dokumen Utama.pdf
Lampiran I.pdf
Lampiran II.pdf
Lampiran III.pdf
...
```

Requirements:
- one main legal document file;
- zero or many attachments;
- files belong to a version;
- validate MIME;
- validate size;
- checksum;
- preserve original file name;
- use storage path/key;
- ordered attachments.

File access must always be rechecked when preview/download request occurs.

---

# 17. Storage

V1:
- local file storage is acceptable and preferred for demonstration/deployment if ITH provides it.

But code must not use raw filesystem paths throughout business logic.

Use abstraction:

```text
StorageService
  |
  +-- LocalStorageDriver   (V1)
  |
  +-- S3StorageDriver      (future)
  |
  +-- MinIODriver          (future)
```

This allows storage migration without rewriting document business logic.

---

# 18. Search V1

Two search patterns are required.

## 18.1 Keyword search

Search metadata:

- judul;
- nomor;
- tahun;
- jenis/tipe dokumen;
- kategori;
- tag/kata kunci.

No PDF-content full-text in V1.

## 18.2 Browse/filter search

Filters:

- jenis Produk Hukum;
- tahun;
- unit;
- kategori;
- status hukum.

Can combine filters.

Use pagination and sorting.

## 18.3 Security-aware search

Anonymous:
- PUBLIK: metadata summary.
- INTERNAL: title + INTERNAL badge only.
- RAHASIA: exclude.

Dosen/Staf active:
- PUBLIK + INTERNAL full authorized result.
- RAHASIA only explicit granted documents.

Admin:
- admin endpoint;
- can filter workflow states according to permission.

---

# 19. Format Persuratan

This is a separate module from Product Law.

Concept:
- Admin creates letter template outside the system.
- Usually `.docx`.
- Admin uploads the file.
- Users download it.
- When format changes, Admin uploads a new version.
- Old version is archived, not destroyed.

V1 access levels for letter templates only:

```text
PUBLIK
INTERNAL
```

No secret template level is required.

## 19.1 PUBLIK template

- visible to anonymous;
- downloadable to anonymous.

## 19.2 INTERNAL template

- hidden/unavailable to anonymous;
- visible/downloadable by active Dosen/Staf.

## 19.3 File types

Expected current template format: `.docx`.

Backend should be extensible enough to allow other safe MIME types later, but UI V1 may focus on `.docx`.

Potential future:
- `.pdf`
- `.xlsx`

Do not make the implementation unsafe by accepting arbitrary executable formats.

## 19.4 Template versioning

```text
Template Surat Tugas
|
+-- v1 ARCHIVED
|
+-- v2 ACTIVE
```

Stable template has `current_version_id`.

Old file remains stored.

---

# 20. UI Action / Popup Rule

User explicitly requested popup for actions.

Final rule:

## 20.1 Confirmation modal required for write/high-impact actions

Examples:
- Submit document.
- Return for revision.
- Approve document.
- Publish.
- Withdraw.
- Change legal status.
- Upload revision.
- Archive/replace template version.
- Approve account.
- Reject account.
- Grant secret access.
- Revoke secret access.
- Delete/archive data.
- Logout.

Flow:

```text
Click action
  |
  v
Confirmation Modal
  |
  +-- Cancel -> no change
  |
  v
Loading
  |
  v
API request
  |
  +-- success -> success toast/popup
  |
  +-- failure -> error feedback
```

## 20.2 No confirmation needed

- search;
- filter;
- pagination;
- navigation;
- open detail.

Still show loading/error states where appropriate.

---

# 21. Format Publik Homepage / UI

Visual style from user screenshot:
- clean white layout;
- ITH brand block in header;
- nav aligned right;
- centered hero;
- large primary search field;
- ITH blue as primary.

Final public navbar:

```text
Beranda
Profil
Produk Hukum
Format Persuratan
Masuk
```

No `Statistik`.

Below search:
- show one latest **PUBLIK + TERBIT** document.

Admin dashboard owns statistics instead.

---

# 22. Admin Dashboard

Not public.

Potential V1 cards:

- total Peraturan Rektor;
- total SK Rektor;
- total Instruksi Rektor;
- total Surat Edaran Rektor;
- total SOP;
- accounts waiting approval;
- document versions waiting verification;
- published documents;
- internal documents;
- recent administrative activity.

Do not expose a public statistics page unless user later asks.

---

# 23. Backend Module Target

Recommended V2 modules:

```text
apps/api/src/modules/
├── auth/
├── users/
├── authorization/
├── units/
├── master/
├── documents/
├── document-files/
├── workflow/
├── legal-relations/
├── secret-access/
├── search/
├── letter-templates/
├── dashboard/
└── audit/
```

Existing:
- config/
- common/
- database/
- health/

Do not rename foundation files only for style consistency unless necessary.

Project currently uses Indonesian naming heavily internally. Preserve existing conventions rather than performing cosmetic mass renames.

---

# 24. Backend Request Layering

Preferred:

```text
Controller
  |
  v
Zod Validation
  |
  v
Authentication Guard
  |
  v
Permission Guard
  |
  v
Document Access Policy
  |
  v
Service / Business Rules
  |
  +--> Repository --> Drizzle --> MySQL
  |
  +--> StorageService
  |
  +--> AuditService
  |
  v
Standard API Response
```

Rules:
- controller: HTTP only;
- validation: shared Zod;
- service: business rules + transactions;
- repository: SQL/query;
- access policy: centralized;
- no direct DB queries scattered in controllers.

---

# 25. Validation

Current repo already uses shared Zod.

Keep this.

Do not duplicate with NestJS `class-validator` DTO rules unless there is a strong explicit reason.

Preferred source:

```text
packages/shared/
    schemas/
```

Used by:
- NestJS API;
- Next.js forms/clients.

This prevents backend/frontend validation drift.

---

# 26. Route Security

Default closed.

A new route must not accidentally become public.

Preferred pattern:
- global auth/security guard;
- explicit public decorator/metadata for public endpoints.

Public does not mean unprotected from:
- rate limits;
- visibility filtering;
- file validation.

---

# 27. Authentication Technical Direction

Preferred target:
- Google OAuth/OIDC.
- Secure HttpOnly cookies.
- Same-origin production.
- session/refresh state stored server-side enough to revoke sessions.

Proposed `sesi_pengguna` stores:
- user;
- refresh token hash or session token hash;
- user-agent;
- IP hash;
- expiry;
- last use;
- revocation time.

Short-lived access + refresh rotation is acceptable.

Never store raw refresh token in DB.

The exact token library can be finalized during implementation, but revocation/logout must be possible.

---

# 28. Database V2 — Proposed 23 Core Tables

This is the current V2 logical design.

## Identity / RBAC

1. `unit_kerja`
2. `pengguna`
3. `peran`
4. `izin`
5. `pengguna_peran`
6. `peran_izin`
7. `pengguna_izin`
8. `sesi_pengguna`

## Product Law

9. `jenis_dokumen`
10. `kategori`
11. `tag`
12. `dokumen`
13. `dokumen_versi`
14. `dokumen_versi_kategori`
15. `dokumen_versi_tag`
16. `dokumen_berkas`
17. `dokumen_relasi`
18. `dokumen_akses_rahasia`
19. `dokumen_workflow`
20. `dokumen_status_hukum_riwayat`

## Letter Templates / Audit

21. `template_surat`
22. `template_surat_versi`
23. `audit_log`

This is logical/physical-preliminary design, not yet final SQL.

---

# 29. ERD Field Direction

## 29.1 `unit_kerja`

Suggested:
- `id`
- `parent_id` nullable self-FK
- `kode`
- `nama`
- `aktif`
- timestamps

Unit hierarchy is useful but not used to gate INTERNAL documents.

## 29.2 `pengguna`

Suggested:
- `id`
- `google_sub` unique
- `email` unique
- `nama`
- `avatar_url`
- `unit_kerja_id`
- `unit_manual`
- `status`
- `verified_at`
- `verified_by`
- timestamps

Statuses may include:
- `MENUNGGU_VERIFIKASI`
- `AKTIF`
- `DITOLAK`
- `NONAKTIF`

## 29.3 `dokumen`

Stable identity:
- `id`
- `kode_dokumen`
- `slug`
- `jenis_dokumen_id`
- `status_hukum`
- `current_published_version_id`
- `created_by`
- `deleted_at`
- timestamps

## 29.4 `dokumen_versi`

Suggested mutable publication metadata:
- `id`
- `dokumen_id`
- `nomor_versi`
- `status_workflow`
- `tingkat_akses`
- `nomor`
- `tahun`
- `judul`
- `abstrak`
- `unit_kerja_id`
- `created_by`
- `verified_by`
- `published_by`
- `published_at`
- `superseded_at`
- timestamps

Additional metadata fields can be added during physical schema design based on JDIH needs.

## 29.5 `dokumen_berkas`

Suggested:
- `id`
- `dokumen_versi_id`
- `jenis_berkas`
- `judul`
- `storage_path`
- `nama_asli`
- `mime_type`
- `size_bytes`
- `checksum`
- `urutan`
- timestamp

## 29.6 `dokumen_relasi`

Suggested:
- `id`
- `source_version_id`
- `target_document_id`
- `jenis_relasi`
- `catatan`
- timestamp

## 29.7 `dokumen_akses_rahasia`

Suggested:
- `id`
- `dokumen_id`
- `pengguna_id`
- `granted_by`
- `expires_at` nullable
- `revoked_at` nullable
- timestamp

## 29.8 `dokumen_workflow`

Suggested:
- `id`
- `dokumen_versi_id`
- `status_asal`
- `status_tujuan`
- `action`
- `catatan`
- `actor_id`
- timestamp

## 29.9 `dokumen_status_hukum_riwayat`

Suggested:
- `id`
- `dokumen_id`
- `status_asal`
- `status_tujuan`
- `source_document_id` nullable
- `alasan`
- `actor_id`
- timestamp

## 29.10 `template_surat`

Suggested:
- `id`
- `slug`
- `nama`
- `deskripsi`
- `current_version_id`
- `aktif`
- `created_by`
- timestamps

## 29.11 `template_surat_versi`

Suggested:
- `id`
- `template_surat_id`
- `nomor_versi`
- `tingkat_akses`
- `status` = ACTIVE/ARCHIVED
- `storage_path`
- `nama_asli`
- `mime_type`
- `size_bytes`
- `checksum`
- `created_by`
- `activated_at`
- `archived_at`
- timestamp

## 29.12 `audit_log`

Suggested:
- `id`
- `actor_id` nullable
- `modul`
- `action`
- `entity_type`
- `entity_id`
- `before_json`
- `after_json`
- `request_id`
- `ip_hash`
- `user_agent`
- timestamp

---

# 30. REST API Direction

This is the conceptual V2 route map.

## Health

Prefer infrastructure endpoints outside business versioning:

```text
GET /health/live
GET /health/ready
```

Current repo health path can be migrated carefully.

## Public

```text
GET /api/v1/public/documents
GET /api/v1/public/documents/:slug
GET /api/v1/public/documents/:slug/files/:fileId
GET /api/v1/public/units

GET /api/v1/letter-templates
GET /api/v1/letter-templates/:slug/download
```

## Auth

```text
GET  /api/v1/auth/google
GET  /api/v1/auth/google/callback
POST /api/v1/auth/register
GET  /api/v1/auth/me
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

## Authenticated user

```text
GET /api/v1/documents
GET /api/v1/documents/:slug
GET /api/v1/documents/:slug/files/:fileId/download
```

These endpoints expose Internal and granted Secret data according to policy.

## Admin documents

```text
GET    /api/v1/admin/documents
POST   /api/v1/admin/documents
GET    /api/v1/admin/documents/:id
PATCH  /api/v1/admin/documents/:id

POST   /api/v1/admin/documents/:id/versions
PATCH  /api/v1/admin/documents/:id/versions/:versionId
POST   /api/v1/admin/documents/:id/versions/:versionId/files
```

## Workflow

```text
POST /api/v1/admin/versions/:id/submit
POST /api/v1/admin/versions/:id/return
POST /api/v1/admin/versions/:id/approve
GET  /api/v1/admin/versions/:id/publication-impact
POST /api/v1/admin/versions/:id/publish
POST /api/v1/admin/documents/:id/withdraw
```

## Users

```text
GET   /api/v1/admin/users
GET   /api/v1/admin/users/:id
POST  /api/v1/admin/users/:id/approve
POST  /api/v1/admin/users/:id/reject
PATCH /api/v1/admin/users/:id/status
```

## Secret grants

```text
GET    /api/v1/admin/documents/:id/secret-grants
POST   /api/v1/admin/documents/:id/secret-grants
DELETE /api/v1/admin/documents/:id/secret-grants/:grantId
```

## Letter templates admin

```text
GET   /api/v1/admin/letter-templates
POST  /api/v1/admin/letter-templates
GET   /api/v1/admin/letter-templates/:id
PATCH /api/v1/admin/letter-templates/:id
POST  /api/v1/admin/letter-templates/:id/versions
```

## Master

```text
/admin/units
/admin/document-types
/admin/categories
/admin/tags
```

Use CRUD as needed.

## Admin dashboard/audit

```text
GET /api/v1/admin/dashboard
GET /api/v1/admin/audit-logs
```

No public `/statistics` requirement in V1.

---

# 31. API Response

Current foundation wraps successful response roughly as:

```json
{
  "sukses": true,
  "data": {}
}
```

Errors use a standard error envelope and request correlation id.

Keep one consistent envelope.

Paginated endpoint should retain:
- `data`
- `meta`

Search may add facets later, but V1 does not need to overcomplicate.

---

# 32. Security / Reliability

Keep/use:
- Helmet;
- CORS, especially local development;
- global rate limiting;
- request/correlation ID;
- log redaction;
- file MIME/size validation;
- checksum;
- database transactions for high-impact operations;
- soft delete;
- audit.

Production:
- Swagger disabled or protected.
- secure cookies.
- HTTPS.
- DB credentials never committed.
- storage directory not directly publicly browsable.
- downloads go through authorization-aware API.

---

# 33. Performance Direction

User wants communication between frontend/backend to remain reliable under concurrent access.

Avoid premature complexity.

V1:
- MySQL indexes.
- pagination.
- SSR/public caching where safe.
- proper connection pool.
- cache public read-only results if useful.
- do not cache user-specific Internal/Secret data globally.
- stream files instead of reading whole file into memory.
- keep public homepage light.
- avoid large payloads.

Redis is not required for initial single-process deployment.

If multiple API processes are later used:
- shared cache/session/rate-limit infrastructure may require Redis.

Meilisearch is deferred until metadata search proves insufficient.

---

# 34. Database Development Direction

User wants:
- MySQL 8.
- Docker Compose local DB.
- host port `3307`.
- sample document data for local testing.

However:
- old 50-table SQL is no longer final.
- do not simply import old schema as target V2.
- first build/approve V2 physical schema.

Preserve SQL-first philosophy:
- SQL schema is intentional.
- Drizzle types can be derived from DB.
- do not let ORM migrations silently lose triggers/check constraints/views if later used.

During transition:
- keep legacy schema as historical reference;
- create V2 schema separately until user explicitly approves replacement.

Never run destructive reset on non-local DB.

---

# 35. Testing Expectations

At minimum, create tests for:

## Auth
- reject `@mahasiswa.ith.ac.id`;
- reject external domain;
- create pending staff on first valid registration;
- pending user cannot access Internal;
- active user can access Internal.

## Access
- anonymous can access Public.
- anonymous sees Internal title in search but not detail.
- anonymous cannot download Internal.
- active staff can download Internal.
- Secret is absent from public search.
- staff without grant receives non-disclosing response.
- staff with active grant can open/download Secret.
- revoked/expired grant fails.

## Workflow
- invalid transition fails.
- author cannot approve own version.
- revision requires note.
- publish only from approved.
- publish transaction updates current pointer.
- old published version remains current before new version publishes.
- old version remains history after superseded.

## Legal relations
- MENGUBAH impact computed.
- MENCABUT impact computed.
- target status does not change before publish confirmation.
- legal status history inserted.
- withdrawal does not silently rollback target legal status.

## Search
- Secret excluded anonymous.
- Internal redacted anonymous.
- filters combine correctly.

## Templates
- public template anonymous download.
- internal template anonymous denied.
- internal template active user allowed.
- new version archives old one.

---

# 36. Features Explicitly Deferred / Out of V1

Do not implement unless user asks:

- full-text search inside PDF;
- OCR;
- Meilisearch;
- JDIHN synchronization;
- external public API for third parties;
- news;
- legal articles;
- banners;
- FAQ;
- dynamic menus CMS;
- contact/message module;
- personal collections;
- public statistics page;
- legal-services request module;
- electronic signature;
- collaborative legal drafting;
- e-office letter numbering;
- advanced mail notification system;
- S3/MinIO deployment (prepare abstraction only);
- separate mobile app;
- microservices.

---

# 37. Legacy 50-Table Design — Historical Reference Only

The old design contained 50 tables:

## Master
1. `unit_kerja`
2. `status_dokumen`
3. `bidang_hukum`
4. `kategori`
5. `jenis_peraturan`
6. `jenis_relasi`

## User / RBAC
7. `pengguna`
8. `peran`
9. `izin`
10. `peran_izin`
11. `pengguna_peran`
12. `pengguna_izin`
13. `pengguna_unit_akses`
14. `token_reset_sandi`

## Document
15. `tag`
16. `impor_batch`
17. `dokumen`
18. `dokumen_berkas`
19. `dokumen_kategori`
20. `dokumen_tag`
21. `dokumen_relasi`
22. `dokumen_akses`
23. `dokumen_alur`
24. `dokumen_riwayat`
25. `dokumen_statistik_harian`
26. `unduhan`
27. `permintaan_akses`
28. `koleksi_pengguna`
29. `log_sinkronisasi_jdihn`

## Content
30. `kategori_berita`
31. `berita`
32. `berita_tag`
33. `berita_dokumen`
34. `halaman`
35. `menu`
36. `menu_item`
37. `banner`
38. `media`
39. `tautan_terkait`
40. `faq`
41. `pesan_kontak`

## System
42. `log_pencarian`
43. `pengaturan`
44. `log_aktivitas`
45. `log_autentikasi`
46. `notifikasi`

## Legal services
47. `layanan_hukum`
48. `permintaan_layanan`
49. `permintaan_layanan_berkas`
50. `permintaan_layanan_log`

Legacy schema also had:
- 3 views;
- 4 triggers;
- many FK/check/unique constraints;
- JDIHN/SSO/content/legal-service ideas.

It is useful as a source of prior ideas, but **must not constrain V2**.

Legacy design metrics discussed historically:
- about 124 functional requirements;
- 41 nonfunctional requirements;
- 32 business rules;
- 69 use cases plus included use cases;
- 4 roles;
- 76 permissions.

Do not blindly port them.

---

# 38. Important Superseded Decisions

This section exists so Codex understands what was considered and later changed.

## Superseded: 4 access levels

Earlier:
- publik
- internal
- terbatas
- rahasia

Final:
- publik
- internal
- rahasia

`terbatas` was removed.

## Superseded: unit-scoped Internal

Earlier we considered restricting Internal by user unit.

Final:
- all active Dosen/Staf can access all Internal documents.

Unit-specific access is not used for Internal.

## Superseded: public metadata for Internal

Earlier we considered showing metadata but blocking file.

Final:
- anonymous public search shows only title + Internal badge.
- no clickable/full detail for anonymous.

## Superseded: “request access” V1

Discussed but excluded from V1 due secret-discovery problem.

## Superseded: 50-table DB

Old schema is legacy.

## Superseded: Laravel technical recommendation

Not used.

## Superseded: public statistics

Admin-only statistics.

---

# 39. Whimsical V2 Diagram Index

These are the latest design diagrams. V1 boards are archived/superseded.

## System / Use Case

- System Context:
  https://whimsical.com/T6xHBmfcjCq7iu7Nd1CEo1
- Use Case Publik & Akun:
  https://whimsical.com/SPXQLCW6Mzry5VvioV9FQh
- Use Case Admin & Workflow:
  https://whimsical.com/2rA2Hu1jRk2idad2ikYnBH

## Activities / Flows

- Registrasi Akun:
  https://whimsical.com/SwQ6h2t6RL6RTfKrTTVz8L
- Verifikasi Akun:
  https://whimsical.com/9gm1BgtZ2guBBJZ9qpaTn
- Lifecycle Produk Hukum overview:
  https://whimsical.com/KuHtk8CPzqZxcCEmaype4v
- Draft → Disetujui:
  https://whimsical.com/RNwVS59vwLG8iHFun2Lebk
- Publish → Ditarik:
  https://whimsical.com/RsSodkDZeGGreYd9pL2Ljj
- Revisi & Versioning:
  https://whimsical.com/XVLQBAX4WcPxqWmfQw53pu
- Relasi & Status Hukum:
  https://whimsical.com/2DfsCzitpLM9PhxMQSydQB
- Format Persuratan:
  https://whimsical.com/XmtvsaARF9ieajaP61NuyC
- Access Control:
  https://whimsical.com/WhfUmHAxXhaFD7B4JvtJLw
- Search & Visibility:
  https://whimsical.com/5WrBKV3QKR7HYcwVeGgjMG

## Sequence

- Registrasi akun:
  https://whimsical.com/LAht8w2ypBgB7actgy6eXL
- Persetujuan akun:
  https://whimsical.com/LTBwrW3MD8V2ehhWGx25Lz
- Create/verify/publish:
  https://whimsical.com/DdqwPLfGBzKx6fyBAWj7Cb
- Akses Public:
  https://whimsical.com/LbSB18PbYJP55LY4Uob7Ue
- Akses Internal:
  https://whimsical.com/gFmTYNiSErY1Tny5vHKHZ
- Grant + akses Secret:
  https://whimsical.com/JJtcRajzDKu9iPo2dmNZ2r
- Upload/revisi template:
  https://whimsical.com/GbezD2NqeJbjSVipCzDtvD
- Download template:
  https://whimsical.com/8E9dmUThDGDHwsrMpcjpGo

## ERD

- Identity & RBAC:
  https://whimsical.com/UuWHy2AWLtNQiTAWJFCJrN
- Produk Hukum:
  https://whimsical.com/YXod8pJQ17BnJGwx8FduFx
- Persuratan & Audit:
  https://whimsical.com/AAuFHDYqfdkjsHE5z388AT
- Domain overview:
  https://whimsical.com/ScmgQuwitbUmTUxny8QB5z

## Architecture

- Backend request architecture:
  https://whimsical.com/EGsdfqSqbez4kz9TdgYUTm
- NestJS module map:
  https://whimsical.com/TbmzUEF3bfLywetFHitH4M
- Frontend IA:
  https://whimsical.com/JkCwCzsNz9YpqbGdkxD9sr
- Deployment:
  https://whimsical.com/Ln7GW3n1PkQHEjqnbDrJ82
- REST API Map:
  https://whimsical.com/KGmBLSboPq8qdro6w71J5f
- Permission Matrix:
  https://whimsical.com/XTPxNSYU5hzAH81qWs1hiG

Master Whimsical document:
https://whimsical.com/TSZHR7sabWG99Hhvagtpht

## Diagram QA

Core flows were structurally checked:
- Registrasi: 0 orphan nodes.
- Account verification: 0 orphan nodes.
- Draft→Approved: 0 orphan nodes.
- Publish→Withdraw: 0 orphan nodes.
- Revision/versioning: 0 orphan nodes.
- Legal relation/status flow: 0 orphan nodes.
- Letter templates: 0 orphan nodes.
- Access Control: 0 orphan nodes.
- Search/visibility: 0 orphan nodes.

---

# 40. Business Rules — Canonical V2

**BR-001** Only Google `@ith.ac.id` may register as Dosen/Staf.

**BR-002** `@mahasiswa.ith.ac.id` does not receive staff/internal access.

**BR-003** New staff account is `MENUNGGU_VERIFIKASI` until Admin approves.

**BR-004** Unit manual must be resolved to canonical unit before activation.

**BR-005** No UI/API normal operation can create/promote Admin/Superadmin.

**BR-006** Public detail/files require current published Public version.

**BR-007** Anonymous Internal search result exposes title + badge only.

**BR-008** All active Dosen/Staf may access Internal; unit does not restrict it.

**BR-009** Secret is invisible publicly.

**BR-010** Active staff requires explicit grant to access Secret.

**BR-011** Unauthorized Secret direct access should not reveal existence.

**BR-012** Access must be re-evaluated on download.

**BR-013** Workflow follows defined state machine only.

**BR-014** Document author cannot approve own version.

**BR-015** Return-for-revision requires note.

**BR-016** Every high-impact/write action uses confirmation + success/failure feedback.

**BR-017** Publish is atomic transaction.

**BR-018** Revision creation never replaces current published version prematurely.

**BR-019** Old versions remain stored.

**BR-020** One version can have one main file + many attachments.

**BR-021** Legal status only BERLAKU/DIUBAH/DICABUT.

**BR-022** MENGUBAH/MENCABUT impact is calculated but not applied without human publish confirmation.

**BR-023** Withdrawal does not automatically rollback other documents' legal statuses.

**BR-024** Search excludes Secret for unauthorized/public channels.

**BR-025** Letter template versioning archives old version instead of hard deleting.

**BR-026** Public homepage has no statistics page/cards requirement; Admin dashboard owns stats.

**BR-027** Storage is abstracted.

**BR-028** Shared validation contract uses Zod.

**BR-029** Routes fail closed by default.

**BR-030** Sensitive/write activity is auditable.

---

# 41. Recommended Implementation Order

Do not start by building all modules at once.

Recommended:

## Phase 0 — Repository alignment
- add this context pack to repo;
- mark old docs/schema as legacy;
- confirm branch;
- run existing checks;
- list conflicts.

## Phase 1 — V2 physical database
- design SQL schema;
- constraints;
- indexes;
- seed master roles/permissions/document types;
- seed pre-provisioned admin accounts using configured emails;
- Docker Compose MySQL 8 :3307;
- local test data;
- Drizzle pull.

## Phase 2 — Shared contracts
- final enums;
- Zod schemas;
- response contracts;
- access/workflow helpers.

## Phase 3 — Auth & Account Approval
- Google auth;
- sessions;
- pending registration;
- admin approve/reject;
- unit manual resolution.

## Phase 4 — RBAC / Security
- default-closed routes;
- role/permission guards;
- document access policy;
- audit foundation.

## Phase 5 — Master data
- units;
- document types;
- categories;
- tags.

## Phase 6 — Documents / Files / Versioning
- stable document identity;
- versions;
- attachments;
- storage driver;
- CRUD.

## Phase 7 — Workflow
- submit;
- return revision;
- approve;
- publish;
- withdraw;
- separation of duties.

## Phase 8 — Legal relations/status
- relation CRUD;
- publication impact;
- legal status history.

## Phase 9 — Search
- keyword;
- filters;
- visibility redaction.

## Phase 10 — Secret grants
- grant/revoke;
- secret query visibility;
- audit.

## Phase 11 — Letter templates
- upload;
- versioning;
- public/internal download.

## Phase 12 — Admin dashboard/audit UI

## Phase 13 — Public frontend integration

---

# 42. What Codex Should Do When Unsure

Do not guess silently.

When a requirement is ambiguous:
1. show the conflicting interpretations;
2. state which existing V2 rule is affected;
3. ask the user before implementing irreversible schema/business logic.

For small implementation details that do not change business behavior, choose a conventional secure solution and document it.

---

# 43. First Recommended Codex Task

Before coding:

> Audit the current repository against `AGENTS.md`, `CODEX_CONTEXT_JDIH_ITH_V2.md`, and the decisions YAML. Produce a concise conflict report showing:
> - what foundation is reusable;
> - what existing enums/schemas/docs conflict with V2;
> - what database artifacts are legacy;
> - what files need to change for Phase 0/1;
> - do not implement the entire backend yet.

Then proceed only with the task requested by the user.
