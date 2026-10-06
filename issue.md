# Issue Terbuka — JDIH ITH V2 (branch `niyato`)

Status per 5 Oktober 2026. Fitur utama portal publik dan panel admin sudah berjalan
di lokal. Daftar di bawah adalah hal yang **belum selesai**, **perlu keputusan**, atau
**perlu diketahui tim** sebelum rilis.

## Prioritas tinggi — memblokir rilis

### 1. Kredensial Google OAuth belum ada
- `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di `backend/.env.identity.local` masih placeholder,
  sehingga belum ada yang bisa login sungguhan.
- Perlu: buat OAuth Client di Google Cloud Console milik domain `ith.ac.id`, dengan redirect URI
  `…/api/v1/auth/google/callback`.

### 2. Akun Superadmin pertama belum diprovisioning
- Sesuai `database/v2/README.md` (bagian provisioning), Superadmin pertama dibuat langsung di
  database: email `@ith.ac.id`, `google_sub` NULL, peran `SUPERADMIN`. Akun Google terikat
  otomatis saat login pertama.
- Akun mahasiswa (`@mahasiswa.ith.ac.id`) **tidak bisa** dipakai; login menolak domain selain
  `ith.ac.id`.
- Perlu: email dosen/staf `@ith.ac.id` yang akan menjadi Superadmin.

### 3. Superadmin membuat akun Admin (bisa lebih dari satu) — belum ada
- Diagram V2 terbaru menyatakan Superadmin dapat membuat banyak akun Admin. Endpoint maupun
  UI-nya belum dibuat.
- `AGENTS.md` dan `docs/CODEX_*` masih menulis "tidak ada pembuatan Admin lewat UI", jadi
  dokumen itu perlu diperbarui agar tidak bertentangan.

### 4. Patch SQL harus dijalankan di database yang sudah ada
Belum ada migration runner. Database V2 yang sudah berjalan perlu menjalankan, berurutan:
1. `database/v2/patch-001-kontak-kantor.sql` — tabel `kontak_kantor` dan izin `contact.manage`.
2. `database/v2/patch-002-status-hapus-dokumen.sql` — izin `documents.delete`, serta
   `legal.correct_status` untuk Admin.

Database baru cukup memakai `schema.sql` dan `seed.sql` terbaru. Keduanya sudah memuat
perubahan ini: 24 tabel, 25 izin.

## Perlu keputusan

### 5. Jenis berkas unggahan
- Kebutuhan: hampir semua jenis berkas, terutama DOCX dan PDF.
- Saat ini backend hanya menerima **PDF** untuk dokumen dan **DOCX** untuk Format Persuratan.
- Perlu: daftar ekstensi/MIME yang diizinkan beserta batas ukurannya. Validasi isi berkas
  (magic bytes) perlu ditambah per jenis.

### 6. Siapa yang boleh hapus permanen dan ubah status hukum
- Saat ini **Admin dan Superadmin** memiliki `documents.delete` dan `legal.correct_status`.
- Hapus permanen bertentangan dengan aturan lama di `AGENTS.md` ("jangan hard-delete versi
  dokumen") dan dibuat atas permintaan pemilik proyek.
- Perlu: konfirmasi apakah hapus permanen sebaiknya khusus Superadmin.
- Jejak penghapusan tetap tercatat di `audit_log` (`DELETE_PERMANENT`).

### 7. Kontak JDIH
- Email yang tampil masih `humas@ith.ac.id` (statis di `frontend/src/lib/kontak-institusi.ts`).
- Nomor HP dapat diubah Admin lewat menu **Kontak Kantor**.
- Perlu: apakah JDIH punya email sendiri?

### 8. Isi halaman Profil
`/profil` masih berisi teks sementara. Perlu materi profil resmi.

## Belum dikerjakan

### 9. Preview dokumen di halaman detail publik
- Diminta: dokumen bisa dipratinjau sebelum diunduh.
- Backend sudah mendukung `?mode=inline` pada rute berkas. Frontend belum menampilkan
  pratinjau (misalnya `<iframe>` untuk PDF).

### 10. Daftar dokumen admin hanya menampilkan dokumen terbit
- Draf hanya bisa dibuka bila ID-nya sudah diketahui (lihat pesan di `admin-document-detail.tsx`).
- Perlu daftar draf/antrean milik penginput.

## Perubahan aturan yang perlu disinkronkan ke dokumen

### 11. Dokumen Internal kini sepenuhnya tersembunyi dari publik
Aturan lama di `AGENTS.md`: "search anonim menampilkan judul + badge INTERNAL". Aturan terbaru
dari pemilik proyek: **publik tidak boleh tahu dokumen Internal ada**. Yang sudah diterapkan:
- pencarian, daftar, beranda, dan menu tahun anonim hanya memuat dokumen publik, tanpa label
  akses;
- detail Internal/Rahasia untuk yang tidak berhak menghasilkan 404, sama dengan dokumen yang
  tidak ada;
- Format Persuratan tidak menyebut format Internal kepada publik;
- footer tidak lagi menampilkan "Masuk untuk Dosen/Staf".

Tes kontrak di `packages/shared/test/contracts.test.mjs` sudah mengikuti aturan baru.
`AGENTS.md` dan `docs/CODEX_*` perlu diperbarui.

## Catatan teknis

### 12. Login uji lokal (`LOGIN_UJI`)
- Tombol "Masuk sebagai Superadmin/Admin (uji)" di `/masuk` hanya aktif bila
  `LOGIN_UJI=true` (backend) dan `NEXT_PUBLIC_LOGIN_UJI=true` (frontend).
- Validasi env **menolak** `LOGIN_UJI=true` di produksi atau di host selain localhost.
- Setiap login uji tercatat di audit sebagai `LOGIN_UJI`.

### 13. Tes integrasi MySQL dilewati di lokal
- 33 tes `*.mysql.spec.ts` membutuhkan database tes khusus. `core-backend.mysql.spec.ts` dan
  `identity.mysql.spec.ts` sudah disesuaikan (24 tabel, tanpa badge anonim) tetapi belum
  dijalankan terhadap MySQL.
- Perlu: jalankan di CI atau database tes.

### 14. `prettier --check` gagal pada file lama
Sekitar 64 file bawaan niyato tidak sesuai Prettier (gaya satu baris). Ini bukan regresi;
putuskan apakah akan diformat massal.

### 15. Endpoint yang tidak lagi dipakai beranda
`GET /public/documents/latest` tidak lagi dipanggil sejak kartu "Produk Hukum terbaru"
dihapus. Beranda kini memakai "Regulasi Terbaru" (satu dokumen per jenis lewat
`/public/documents`). Endpoint boleh dihapus atau dibiarkan.
