# Identity & Security V2

Scope sesuai permintaan roadmap ringkas **Phase 2 — Identity & Security**,
baseline `niyato` / `27a088b968cbb27a0488168d54eebc774b4cfc11`.
Penamaan ini menggabungkan fase Auth/Approval/Authorization pada implementation
plan rinci; bukan mengulang Shared Contracts yang telah selesai. Tidak ada
modul CRUD/workflow/search/files/template/frontend/production deployment.

## Audit foundation

Dipertahankan: Nest bootstrap, Zod shared, response/error envelope, cookie-parser,
Helmet/CORS/rate limiting, health, Pino, pool MySQL dan Drizzle.
Sebelumnya decorator Publik/Izin belum ditegakkan guard global; belum ada modul
domain auth/session. Pool mengarah ke default legacy dan JWT local-password
config masih mandatory. Implementasi aktif sekarang memakai V2, default-closed
guard, Google verification dan opaque server sessions. SQL legacy tetap utuh.

## Alur dan endpoints

| Endpoint (prefix `/api/v1`) | Akses / perilaku |
| --- | --- |
| GET `/auth/google` | Publik; state + nonce + PKCE S256; redirect Google |
| GET `/auth/google/callback` | Publik; konsumsi flow satu kali, tukar code di server |
| GET `/auth/me` | Publik; session bila ada divalidasi; CSRF proof dan status registrasi |
| POST `/auth/register` | Identitas sementara terverifikasi + Origin/CSRF; input unit saja |
| POST `/auth/refresh` | Sesi aktif atau pending; rotasi token + audit |
| POST `/auth/logout` | Sesi aktif atau pending; revoke + audit + clear cookie |
| GET `/admin/users` | `users.read`; antrean pending dengan pagination |
| GET `/admin/users/:id` | `users.read`; detail pending saja |
| POST `/admin/users/:id/approve` | `users.approve`; unit master aktif wajib |
| POST `/admin/users/:id/reject` | `users.reject`; alasan wajib |
| PATCH `/admin/users/:id/status` | `users.set_status`; AKTIF ↔ NONAKTIF |
| GET `/public/units` | Pilihan unit aktif untuk registrasi; maksimum 1000 |
| POST `/admin/units` | `units.manage`; create minimal untuk resolusi unit manual |

Admin write juga memerlukan role ADMIN/SUPERADMIN. Endpoint akun hanya mengelola
target DOSEN_STAF; akun operations tetap di luar API normal. Tidak ada endpoint
assign role/promote. Resolusi manual dilakukan dengan memilih unit master pada
approval; bila belum ada, Admin berpermission membuat unit dahulu. Proposal
manual dipertahankan sebagai konteks historis, tidak otomatis menjadi master.

Google flow mengikuti [dokumentasi resmi OIDC Google](https://developers.google.com/identity/openid-connect/openid-connect).
`jose` memverifikasi signature RS256 menggunakan Google JWKS, issuer, audience,
expiry, iat/sub/nonce wajib. Claim email_verified harus boolean true, domain email
diparsing exact `ith.ac.id`, hosted-domain `hd` juga wajib `ith.ac.id`, dan azp
bila ada harus client ID yang sama. Nilai sub/email dari request body tidak
diterima. Existing sub adalah identity utama; email yang berbenturan ditolak.
Preprovisioned ADMIN/SUPERADMIN dengan sub NULL hanya di-bind setelah verifikasi
Google dan pencocokan email, dalam transaksi dengan row locks.

State/nonce/PKCE dan identitas sebelum registrasi disimpan server-side dalam
store sementara berkapasitas 10000, TTL 10 menit, handle satu kali. Cookie hanya
membawa handle random. Restart mengharuskan login ulang. Store ini ditujukan
untuk satu proses; multi-instance perlu shared store sebelum deployment.
Callback redirect hanya ke APP_URL yang dikonfigurasi. Tidak menerima return URL
dari pengguna. Kredensial/token Google tidak dikirim ke frontend atau disimpan.

## Sesi, CSRF, RBAC

- Token sesi random 256 bit; `sesi_pengguna.token_hash` hanya SHA-256 binary32.
  Cookie host-only, HttpOnly, SameSite=Lax, Path=/, Secure secara default.
- Expiry absolut maksimum 7 hari. Refresh merotasi hash dalam transaksi yang
  mengunci sesi; token lama invalid, batas expiry tidak diperpanjang. Refresh
  paralel dari client harus diserialisasi; tidak ada grace period token lama.
- Logout revoke sesi saat ini. Reject/deactivate mencabut semua sesi target.
  Session request membaca ulang account status, role, permission, DENY override;
  tidak ada privilege cache atau SUPERADMIN bypass terhadap DENY.
- Pending boleh me/refresh/logout saja. DOSEN_STAF pending belum memiliki akses
  Internal. Default route memerlukan sesi akun AKTIF. `@Publik` saja yang anonymous;
  jika ada metadata izin, izin tetap diperiksa meskipun route diberi Publik.
- Semua write harus exact Origin APP_URL dan `X-CSRF-Token` yang diambil dari
  auth/me. Proof HMAC terikat token sesi/registrasi. Setelah refresh, gunakan
  proof baru. Tidak ada token sensitif di localStorage. Browser mengirim cookie
  dengan credentials include. CORS hanya origin frontend, bukan wildcard.
- Google callback memakai state+nonce/PKCE sebagai proteksi login CSRF. API
  tidak mematikan CSRF global untuk request write yang diberi marker Publik.
- Frontend belum dibuat; kelak semua write wajib confirmation, progress dan
  success/error feedback. Saat ini pengujian dilakukan pada API.

## Document policy dan audit

Policy hanya menerima resource/grant yang dimuat trusted repository. Public
memerlukan current + published + not-deleted. Internal memerlukan staff AKTIF
tanpa scope unit; Admin aktif dengan documents.read_admin dapat membaca.
Secret memerlukan staff AKTIF dengan grant sesuai resource/user, belum revoked
dan belum expired; Admin memerlukan secret.read_admin. Penolakan Secret adalah
404. Tidak ada document endpoint atau search baru. Service policy mengaudit
keputusan akses Secret yang lolos; implementasi file nanti wajib memeriksa ulang
saat streaming dan mencatat action file aktual.

Audit identity memakai field allowlist: actor, action, target, status sebelum/
sesudah dan correlation UUID. Register/login/logout/refresh/approval/rejection/
deactivate/reactivate/create-unit dicatat. Alasan keputusan disimpan sebagai
field bisnis allowlisted. Mutasi dan audit berada di transaksi
yang sama; failure audit membatalkan mutasi. Alasan rejection juga disimpan di akun.
Tidak menerima raw request/token/cookie/header sebagai payload audit. SQL
parameter logging dimatikan; HTTP logger tidak menyimpan query callback atau
headers; filter error tidak mencetak raw exception yang bisa memuat SQL/token.

## Database dan konfigurasi

Tidak ada perubahan schema/seed/sample fisik. Binding terbatas sepuluh tabel
identity/RBAC/audit/grant ada di `apps/api/src/database/v2/schema.ts`. Ini pemetaan
kolom untuk runtime, bukan schema migrasi lengkap; FK/CHECK/index/default
otoritatif tetap SQL. Jangan gunakan drizzle push/generate terhadap binding ini.
IdentityRepository memakai prepared SQL mysql2 dalam repository tersentralisasi
untuk locking/transaksi; Drizzle foundation menggunakan binding V2, bukan legacy.

Startup membaca `apps/api/.env.identity.local` dan root `.env.v2.local` saat API
dijalankan melalui npm workspace. Contoh ada di `apps/api/.env.identity.example`.
Google credentials dan SESSION_KEY wajib diisi lokal; tidak ada default secret.
Konfigurasi JWT/password lama tidak diperlukan. DB_NAME hanya menerima
`jdih_ith_v2_dev` atau `jdih_ith_v2_test*`, startup memverifikasi MySQL 8.4 dan
DATABASE(). DB_PORT dibaca environment, tidak diasumsikan 3307. Koneksi UTC,
BIGINT string, multipleStatements off. Tidak ada import/reset otomatis.

Produksi belum dicakup: HTTPS + cookie Secure dan Swagger off wajib; trust proxy
default 0, hanya disetel sesuai topology proxy terpercaya. APP_URL harus origin
tanpa trailing slash; gunakan hostname yang konsisten antara API dan frontend
agar SameSite cookies bekerja (contoh keduanya localhost, berbeda port).

## Validasi dan batas runtime

Automated tests mencakup token RSA/JWKS lokal dan tampering, claims/domain,
state/replay/PKCE, expiry handle, lifecycle, RBAC/DENY, CSRF/cookie, policy
Secret/grants, audit allowlist, dan HTTP tests AppModule nyata.

MySQL integration test memakai database lokal terisolasi `jdih_ith_v2_test`.
Siapkan ulang dengan:

```sh
npm run test:mysql:prepare --workspace @jdih/api
```

Perintah prepare hanya menerima host loopback, nama database persis
`jdih_ith_v2_test`, dan MySQL 8.4.x. Ia mengosongkan tabel database tersebut,
memuat `database/v2/schema.sql` dan `database/v2/seed.sql`, serta mengganti
directive `USE jdih_ith_v2_dev` hanya saat runtime agar SQL sumber tidak berubah.
Sesudahnya jalankan suite, termasuk 20 skenario MySQL, dengan `IDENTITY_TEST_ENV`
menunjuk file env lokal `apps/api/.env.identity.test.local`; suite memeriksa ulang
versi dan database aktif sebelum mengakses data. Contoh PowerShell dari root repo:

```powershell
$env:IDENTITY_TEST_ENV = (Resolve-Path apps/api/.env.identity.test.local).Path
npm run test
Remove-Item Env:IDENTITY_TEST_ENV
```

File env lokal harus tetap di-ignore Git. Uji integrasi tidak mencakup login
Google live; acceptance tersebut tetap memerlukan kredensial Google nyata.

Uji Google live tetap pending saat konfigurasi Google belum tersedia. Tidak ada
commit/push pada fase ini.
