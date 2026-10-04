# Shared contracts JDIH ITH V2

Kontrak TypeScript/Zod 4 untuk API dan web. Sumber desain adalah
[context V2](../../docs/CODEX_CONTEXT_JDIH_ITH_V2.md); bentuk penyimpanan mengikuti
[schema V2](../../database/v2/schema.sql). Phase 2 tidak mengimplementasikan service,
OAuth, query database, state machine, atau halaman fitur.

## Audit dan perubahan dari foundation legacy

Baseline audit: branch `niyato`, commit `12573494b6fd8a364b3b563046ab2cd23841ab53`.
Kontrak sebelumnya masih memuat akses `terbatas`, registrasi password/NIP,
metadata BPK, permintaan akses, role bertingkat/unit-scoped, dan 76 permission
schema lama. Kontrak aktif tersebut diganti dengan V2. Permission sekarang
bersumber dari 23 permission di `database/v2/seed.sql`; regenerasi menggunakan
`node scripts/gen-permissions.mjs` dari root repository.

Alias `STATUS_KEBERLAKUAN` dan label/warna terkait dipertahankan untuk tampilan
homepage, dengan nilai canonical V2 yang sama persis dengan `STATUS_HUKUM`.
Alias ini tidak menyediakan nilai status legacy tambahan.

## Peta kontrak

| File | Tanggung jawab |
| --- | --- |
| `src/enums.ts` | Enum canonical akses, workflow, status hukum/akun, relasi, file, template |
| `src/roles.ts`, `src/permissions.ts` | Tiga role persisted dan katalog permission V2; pengunjung anonim |
| `src/schemas/common.schema.ts` | ID, tanggal, pagination, response envelope |
| `src/schemas/auth.schema.ts` | Session/me, kelengkapan registrasi, approval/rejection/status akun |
| `src/schemas/dokumen.schema.ts` | Identitas stabil, metadata versi, kesiapan publish, detail dan file authorized |
| `src/schemas/search.schema.ts` | Query metadata dan hasil anonim/authorized yang terpisah |
| `src/schemas/workflow.schema.ts` | Payload submit, return, approve, publish, withdraw |
| `src/schemas/relasi.schema.ts` | Relasi, preview dampak hukum, konfirmasi manusia |
| `src/schemas/akses-rahasia.schema.ts` | Grant/revoke oleh Admin, expiry opsional |
| `src/schemas/template.schema.ts` | Metadata/version/archive template, list dan download |

## Pilihan transport dan batas keamanan

- ID menggunakan string desimal positif agar seluruh rentang MySQL
  `BIGINT UNSIGNED` tetap presisi pada JSON/JavaScript. Mapper database harus
  mengonversi ke bentuk ini tanpa melewati `Number`.
- Object request/response bersifat strict: field tambahan ditolak. Backend
  harus memproyeksikan data lalu memvalidasi response; schema tidak otomatis
  menghapus field sensitif dari object database.
- Registrasi melengkapi tepat satu jalur: `unitKerjaId` atau `unitManual`.
  Identitas Google yang telah diverifikasi berasal dari backend. Input tidak
  menerima role atau password. Akun baru berstatus `MENUNGGU_VERIFIKASI` dengan
  role `DOSEN_STAF`; unit manual tidak menjadi master secara otomatis.
- `DOSEN_STAF` + `MENUNGGU_VERIFIKASI` belum memiliki akses Internal.
  `DOSEN_STAF` + `AKTIF` baru eligible untuk akses Internal lintas unit.
  Role atau keberadaan session saja tidak memberikan akses. Enforcement
  authorization tetap dilakukan backend pada fase berikutnya.
- ID resource untuk command berasal dari route; actor berasal dari session.
  Pemeriksaan permission, status akun, self-approval, expiry grant, state
  transition, dan audit tetap wajib di backend.
- Hasil search anonim hanya memiliki varian PUBLIK dan INTERNAL. INTERNAL
  hanya berisi `judul` dan `badge: "INTERNAL"`, tanpa ID atau metadata lain.
  Hasil INTERNAL tidak clickable/openable bagi anonim.
  RAHASIA tidak mempunyai varian publik.
  Backend harus memfilter query, pagination/count, dan seluruh kanal publik.
  INTERNAL tidak dibatasi unit. Response authorized hanya boleh dibentuk
  setelah policy backend lolos; capability file bukan bukti otorisasi.
- Kesiapan publish diperiksa terhadap metadata tersimpan, bukan assertion
  client. Publish membutuhkan konfirmasi, termasuk ketika daftar dampak kosong.
  `tokenKonfirmasi` adalah token opaque yang backend kelak ikat ke snapshot
  preview; backend harus mengecek kesegaran, resource, dan seluruh dampak dalam
  transaksi. Payload tidak otomatis menerapkan perubahan status hukum.
- Publikasi atomic, pergantian current pointer, withdrawal, maksimum satu
  UTAMA, dan satu versi template ACTIVE tetap ditegakkan database/backend.
- Confirmation popup, loading, success/error feedback tetap kewajiban UI pada
  fase implementasinya. Phase 2 hanya menyediakan bentuk data yang diperlukan.

## Pemeriksaan

Final scope audit memulihkan helper generik `daftarIdTerpisahKoma`,
`daftarTeksTerpisahKoma`, dan normalisasi teks opsional kosong ke `undefined`.
Parser daftar ID memakai string desimal V2 dan menolak ID invalid tanpa
membuang kesalahan secara diam-diam. Envelope API, pagination, error validation,
parameter route, dan helper permission membership tetap tersedia. Export domain
legacy (password/reset/2FA, CMS/OCR/JDIHN, request-access, unit ACL, state-machine
lama, dan promosi role) tidak dipulihkan. Tidak ada consumer API/web source yang
masih membutuhkan export yang dihapus tersebut.

`npm run test --workspace=@jdih/shared` membangun package dan menjalankan unit
tests melalui Node test runner. Tests memeriksa enum, injeksi field, metadata,
redaksi response, dan kesesuaian permission dengan seed; tidak terhubung ke DB.
Jalankan juga `npm run typecheck`, `npm run lint`, dan `npm run test` dari root
untuk memeriksa consumer API/web. Tests shared tidak menggantikan runtime
validation database Phase 1 atau integration/security tests backend mendatang.
