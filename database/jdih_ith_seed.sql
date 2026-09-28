-- =============================================================================
--  PORTAL JDIH ITH PAREPARE — DATA REFERENSI AWAL (SEED)
-- =============================================================================
--  Versi   : 1.0
--  Tanggal : 26 September 2026
--  Prasyarat: jalankan jdih_ith_schema.sql terlebih dahulu
-- =============================================================================
--  ⚠ PERINGATAN VERIFIKASI
--  Data unit_kerja dan jenis_peraturan di bawah merupakan CONTOH AWAL yang
--  disusun berdasarkan pola umum PTN. Sebelum digunakan pada produksi, WAJIB
--  diverifikasi terhadap:
--    • Peraturan Menteri tentang Organisasi dan Tata Kerja (OTK) ITH  → unit_kerja
--    • Statuta ITH dan Peraturan Rektor tentang Tata Naskah Dinas ITH → jenis_peraturan
--  Lihat docs/01-analisis-kebutuhan.md § A.9.3 (butir V-01 s.d. V-03).
-- =============================================================================

USE `jdih_ith`;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;


-- =============================================================================
--  1. STATUS KEBERLAKUAN DOKUMEN
-- =============================================================================
INSERT INTO `status_dokumen`
    (`kode`, `nama`, `warna`, `deskripsi`, `is_berlaku_efektif`, `is_sistem`, `urutan`)
VALUES
    ('berlaku',          'Berlaku',           '#16A34A',
     'Peraturan masih berlaku dan dapat dijadikan dasar hukum.',                 TRUE,  TRUE, 1),
    ('diubah',           'Diubah',            '#F59E0B',
     'Peraturan masih berlaku namun sebagian ketentuannya telah diubah oleh peraturan lain.',
                                                                                 TRUE,  TRUE, 2),
    ('dicabut_sebagian', 'Dicabut Sebagian',  '#EA580C',
     'Sebagian ketentuan peraturan telah dicabut; ketentuan lainnya masih berlaku.',
                                                                                 TRUE,  TRUE, 3),
    ('belum_berlaku',    'Belum Berlaku',     '#3B82F6',
     'Peraturan telah ditetapkan namun tanggal mulai berlakunya belum tiba.',    FALSE, TRUE, 4),
    ('dicabut',          'Dicabut',           '#DC2626',
     'Peraturan telah dicabut dan tidak dapat dijadikan dasar hukum.',           FALSE, TRUE, 5),
    ('tidak_berlaku',    'Tidak Berlaku',     '#6B7280',
     'Peraturan sudah tidak berlaku, antara lain karena masa berlakunya berakhir.',
                                                                                 FALSE, TRUE, 6);


-- =============================================================================
--  2. JENIS RELASI ANTARPERATURAN
-- =============================================================================
INSERT INTO `jenis_relasi`
    (`kode`, `nama`, `nama_kebalikan`, `kode_kebalikan`, `is_simetris`,
     `is_mengubah_status`, `status_akibat_id`, `is_sistem`, `urutan`)
VALUES
    ('dasar_hukum',       'Dasar Hukum',        'Menjadi Dasar Hukum bagi', NULL, FALSE, FALSE,
        NULL, TRUE, 1),
    ('mengubah',          'Mengubah',           'Diubah oleh',              NULL, FALSE, TRUE,
        (SELECT `id` FROM `status_dokumen` WHERE `kode` = 'diubah'), TRUE, 2),
    ('mencabut',          'Mencabut',           'Dicabut oleh',             NULL, FALSE, TRUE,
        (SELECT `id` FROM `status_dokumen` WHERE `kode` = 'dicabut'), TRUE, 3),
    ('mencabut_sebagian', 'Mencabut Sebagian',  'Dicabut Sebagian oleh',    NULL, FALSE, TRUE,
        (SELECT `id` FROM `status_dokumen` WHERE `kode` = 'dicabut_sebagian'), TRUE, 4),
    ('dilaksanakan_oleh', 'Dilaksanakan oleh',  'Melaksanakan',             NULL, FALSE, FALSE,
        NULL, TRUE, 5),
    ('juknis',            'Petunjuk Teknis',    'Petunjuk Teknis dari',     NULL, FALSE, FALSE,
        NULL, TRUE, 6),
    ('terkait',           'Terkait',            'Terkait',                  NULL, TRUE,  FALSE,
        NULL, TRUE, 7);


-- =============================================================================
--  3. JENIS PERATURAN  ⚠ verifikasi terhadap Tata Naskah Dinas ITH (V-02, V-03)
--     tingkat_hierarki: makin kecil makin tinggi kedudukannya
-- =============================================================================
INSERT INTO `jenis_peraturan`
    (`kode`, `nama`, `bentuk_singkat`, `lingkup`, `tingkat_hierarki`,
     `lingkup_penomoran`, `pola_nomor`, `deskripsi`, `is_aktif`, `urutan`)
VALUES
    -- Peraturan eksternal yang dikatalog sebagai rujukan
    ('UU',        'Undang-Undang',                    'UU',      'eksternal',  1, 'institut',
        'UU No. {nomor} Tahun {tahun}',    'Peraturan tingkat nasional sebagai rujukan.', TRUE,  1),
    ('PERPPU',    'Peraturan Pemerintah Pengganti UU', 'Perppu',  'eksternal',  2, 'institut',
        NULL, NULL, TRUE,  2),
    ('PP',        'Peraturan Pemerintah',             'PP',      'eksternal',  3, 'institut',
        'PP No. {nomor} Tahun {tahun}',    NULL, TRUE,  3),
    ('PERPRES',   'Peraturan Presiden',               'Perpres', 'eksternal',  4, 'institut',
        NULL, NULL, TRUE,  4),
    ('PERMEN',    'Peraturan Menteri',                'Permen',  'eksternal',  5, 'institut',
        NULL, 'Termasuk peraturan menteri yang membidangi pendidikan tinggi.', TRUE,  5),
    ('KEPMEN',    'Keputusan Menteri',                'Kepmen',  'eksternal',  6, 'institut',
        NULL, NULL, TRUE,  6),

    -- Produk hukum internal ITH
    ('STATUTA',   'Statuta',                          'Statuta', 'internal',  10, 'institut',
        NULL, 'Statuta Institut Teknologi Bacharuddin Jusuf Habibie.', TRUE, 10),
    ('PERSEN',    'Peraturan Senat',                  'PerSen',  'internal',  20, 'institut',
        '{nomor}/PER/SENAT/ITH/{tahun}', 'Peraturan yang ditetapkan Senat Institut.', TRUE, 11),
    ('KEPSEN',    'Keputusan Senat',                  'KepSen',  'internal',  25, 'institut',
        '{nomor}/KEP/SENAT/ITH/{tahun}', NULL, TRUE, 12),
    ('PERREK',    'Peraturan Rektor',                 'PerRek',  'internal',  30, 'institut',
        '{nomor}/PER/ITH/{tahun}', 'Peraturan yang bersifat mengatur, ditetapkan Rektor.', TRUE, 13),
    ('KEPREK',    'Keputusan Rektor',                 'KepRek',  'internal',  35, 'institut',
        '{nomor}/KEP/ITH/{tahun}', 'Keputusan yang bersifat menetapkan.', TRUE, 14),
    ('INSREK',    'Instruksi Rektor',                 'InsRek',  'internal',  40, 'institut',
        '{nomor}/INS/ITH/{tahun}', NULL, TRUE, 15),
    ('SEREK',     'Surat Edaran Rektor',              'SE',      'internal',  45, 'institut',
        '{nomor}/SE/ITH/{tahun}', 'Pemberitahuan dan arahan pelaksanaan.', TRUE, 16),
    ('PEDOMAN',   'Pedoman dan Panduan',              'Pedoman', 'internal',  50, 'institut',
        NULL, 'Pedoman akademik, panduan teknis, dan buku pedoman lainnya.', TRUE, 17),
    ('SOP',       'Standar Operasional Prosedur',     'SOP',     'internal',  55, 'unit',
        '{nomor}/SOP/{unit}/{tahun}', NULL, TRUE, 18),
    ('KEPDEK',    'Keputusan Dekan',                  'KepDek',  'internal',  60, 'unit',
        '{nomor}/KEP/{unit}/{tahun}', 'Keputusan pada tingkat fakultas.', TRUE, 19),
    ('KEPKAJUR',  'Keputusan Ketua Jurusan',          'KepJur',  'internal',  65, 'unit',
        '{nomor}/KEP/{unit}/{tahun}', NULL, TRUE, 20),
    ('KERJASAMA', 'Dokumen Kerja Sama',               'MoU/MoA', 'internal',  70, 'institut',
        NULL, 'Memorandum of Understanding, Memorandum of Agreement, dan Implementing Arrangement.',
        TRUE, 21),
    ('NASKAH_AK', 'Naskah Akademik',                  'NA',      'internal',  80, 'institut',
        NULL, 'Kajian akademik pendukung penyusunan peraturan.', TRUE, 22),
    ('LAINNYA',   'Dokumen Hukum Lainnya',            'Lainnya', 'internal',  90, 'unit',
        NULL, NULL, TRUE, 23);


-- =============================================================================
--  4. BIDANG HUKUM (klasifikasi standar JDIHN)
--     ⚠ selaraskan dengan daftar resmi bidang hukum JDIHN (butir V-08)
-- =============================================================================
INSERT INTO `bidang_hukum` (`kode`, `nama`, `deskripsi`, `is_aktif`, `urutan`) VALUES
    ('PENDIDIKAN',    'Pendidikan',                  'Penyelenggaraan pendidikan dan pengajaran.', TRUE,  1),
    ('KEPEGAWAIAN',   'Kepegawaian',                 'Aparatur, dosen, dan tenaga kependidikan.',  TRUE,  2),
    ('KEUANGAN',      'Keuangan Negara',             'Pengelolaan anggaran, PNBP, dan aset.',      TRUE,  3),
    ('TATA_KELOLA',   'Organisasi dan Tata Kelola',  'Kelembagaan, tata kerja, dan tata laksana.', TRUE,  4),
    ('KEMAHASISWAAN', 'Kemahasiswaan',               'Kemahasiswaan dan alumni.',                  TRUE,  5),
    ('PENELITIAN',    'Penelitian dan Pengabdian',   'Penelitian dan pengabdian kepada masyarakat.', TRUE, 6),
    ('KERJA_SAMA',    'Kerja Sama',                  'Kerja sama dalam dan luar negeri.',          TRUE,  7),
    ('SARANA',        'Sarana dan Prasarana',        'Pengadaan, pemanfaatan, dan pemeliharaan.',  TRUE,  8),
    ('PENGAWASAN',    'Pengawasan dan Pengendalian', 'Pengawasan internal dan penjaminan mutu.',   TRUE,  9),
    ('ADM_UMUM',      'Administrasi Umum',           'Persuratan, kearsipan, dan kerumahtanggaan.', TRUE, 10),
    ('TIK',           'Teknologi Informasi',         'Tata kelola teknologi informasi dan data.',  TRUE, 11),
    ('LAINNYA',       'Lainnya',                     'Bidang hukum yang belum terklasifikasi.',    TRUE, 99);


-- =============================================================================
--  5. UNIT KERJA  ⚠ WAJIB diverifikasi terhadap OTK ITH (butir V-01)
--     Struktur berikut adalah CONTOH pola umum PTN, bukan data resmi ITH.
-- =============================================================================
INSERT INTO `unit_kerja` (`id`, `kode`, `nama`, `singkatan`, `jenis`, `induk_id`,
                          `jalur`, `kedalaman`, `is_aktif`, `urutan`) VALUES
    ( 1, 'ITH',       'Institut Teknologi Bacharuddin Jusuf Habibie', 'ITH',
                      'institut',  NULL, '1',      0, TRUE,  1),
    ( 2, 'SENAT',     'Senat Institut',                              'Senat',
                      'senat',        1, '1/2',    1, TRUE,  2),
    ( 3, 'REKTORAT',  'Rektorat',                                    'Rektorat',
                      'rektorat',     1, '1/3',    1, TRUE,  3),
    ( 4, 'BIRO-UK',   'Biro Umum dan Keuangan',                      'BUK',
                      'biro',         1, '1/4',    1, TRUE,  4),
    ( 5, 'BAG-HUKUM', 'Bagian Hukum dan Tata Laksana',               'Bag. Hukum',
                      'unit',         4, '1/4/5',  2, TRUE,  1),
    ( 6, 'BAG-KEU',   'Bagian Keuangan dan Kepegawaian',             'Bag. Keu',
                      'unit',         4, '1/4/6',  2, TRUE,  2),
    ( 7, 'BIRO-AK',   'Biro Akademik dan Kemahasiswaan',             'BAAK',
                      'biro',         1, '1/7',    1, TRUE,  5),
    ( 8, 'LPPM',      'Lembaga Penelitian dan Pengabdian kepada Masyarakat', 'LPPM',
                      'lembaga',      1, '1/8',    1, TRUE,  6),
    ( 9, 'LPM',       'Lembaga Penjaminan Mutu',                     'LPM',
                      'lembaga',      1, '1/9',    1, TRUE,  7),
    (10, 'SPI',       'Satuan Pengawasan Internal',                  'SPI',
                      'satuan',       1, '1/10',   1, TRUE,  8),
    (11, 'UPT-TIK',   'UPT Teknologi Informasi dan Komunikasi',      'UPT TIK',
                      'upt',          1, '1/11',   1, TRUE,  9),
    (12, 'UPT-PUST',  'UPT Perpustakaan',                            'UPT Pustaka',
                      'upt',          1, '1/12',   1, TRUE, 10),
    (13, 'FTI',       'Fakultas Teknologi Industri',                 'FTI',
                      'fakultas',     1, '1/13',   1, TRUE, 11),
    (14, 'JUR-TIF',   'Jurusan Teknik Informatika',                  'TIF',
                      'jurusan',     13, '1/13/14',2, TRUE,  1),
    (15, 'JUR-TM',    'Jurusan Teknik Mesin',                        'TM',
                      'jurusan',     13, '1/13/15',2, TRUE,  2),
    (16, 'FST',       'Fakultas Sains dan Teknologi',                'FST',
                      'fakultas',     1, '1/16',   1, TRUE, 12),
    (99, 'EKSTERNAL', 'Instansi Eksternal',                          'Eksternal',
                      'eksternal',    1, '1/99',   1, TRUE, 99);


-- =============================================================================
--  6. KATEGORI (taksonomi klasifikasi internal, berjenjang)
-- =============================================================================
INSERT INTO `kategori` (`id`, `kode`, `nama`, `slug`, `induk_id`, `jalur`,
                        `kedalaman`, `is_aktif`, `urutan`) VALUES
    -- Tingkat 1
    ( 1, 'AKADEMIK',     'Akademik',                  'akademik',                  NULL, '1',    0, TRUE, 1),
    ( 2, 'KEPEGAWAIAN',  'Kepegawaian',               'kepegawaian',               NULL, '2',    0, TRUE, 2),
    ( 3, 'KEUANGAN',     'Keuangan dan Aset',         'keuangan-dan-aset',         NULL, '3',    0, TRUE, 3),
    ( 4, 'KEMAHASISWAAN','Kemahasiswaan dan Alumni',  'kemahasiswaan-dan-alumni',  NULL, '4',    0, TRUE, 4),
    ( 5, 'TATA_KELOLA',  'Organisasi dan Tata Kelola','organisasi-dan-tata-kelola',NULL, '5',    0, TRUE, 5),
    ( 6, 'PENELITIAN',   'Penelitian dan Pengabdian', 'penelitian-dan-pengabdian', NULL, '6',    0, TRUE, 6),
    ( 7, 'KERJA_SAMA',   'Kerja Sama',                'kerja-sama',                NULL, '7',    0, TRUE, 7),
    ( 8, 'SARANA',       'Sarana dan Prasarana',      'sarana-dan-prasarana',      NULL, '8',    0, TRUE, 8),
    ( 9, 'PENJAMINAN',   'Penjaminan Mutu',           'penjaminan-mutu',           NULL, '9',    0, TRUE, 9),
    (10, 'TIK',          'Teknologi Informasi',       'teknologi-informasi',       NULL, '10',   0, TRUE, 10),
    -- Tingkat 2 — Akademik
    (11, 'AKADEMIK-KUR', 'Kurikulum',                 'kurikulum',                    1, '1/11', 1, TRUE, 1),
    (12, 'AKADEMIK-PBM', 'Pembelajaran dan Penilaian','pembelajaran-dan-penilaian',   1, '1/12', 1, TRUE, 2),
    (13, 'AKADEMIK-PMB', 'Penerimaan Mahasiswa Baru', 'penerimaan-mahasiswa-baru',    1, '1/13', 1, TRUE, 3),
    (14, 'AKADEMIK-TA',  'Tugas Akhir dan Kelulusan', 'tugas-akhir-dan-kelulusan',    1, '1/14', 1, TRUE, 4),
    (15, 'AKADEMIK-KAL', 'Kalender Akademik',         'kalender-akademik',            1, '1/15', 1, TRUE, 5),
    -- Tingkat 2 — Kepegawaian
    (16, 'PEG-DOSEN',    'Dosen',                     'dosen',                        2, '2/16', 1, TRUE, 1),
    (17, 'PEG-TENDIK',   'Tenaga Kependidikan',       'tenaga-kependidikan',          2, '2/17', 1, TRUE, 2),
    (18, 'PEG-KINERJA',  'Penilaian Kinerja',         'penilaian-kinerja',            2, '2/18', 1, TRUE, 3),
    -- Tingkat 2 — Keuangan
    (19, 'KEU-UKT',      'Biaya Pendidikan dan UKT',  'biaya-pendidikan-dan-ukt',     3, '3/19', 1, TRUE, 1),
    (20, 'KEU-ANGGARAN', 'Anggaran dan Pelaporan',    'anggaran-dan-pelaporan',       3, '3/20', 1, TRUE, 2),
    (21, 'KEU-PENGADAAN','Pengadaan Barang dan Jasa', 'pengadaan-barang-dan-jasa',    3, '3/21', 1, TRUE, 3),
    -- Tingkat 2 — Kemahasiswaan
    (22, 'MHS-BEASISWA', 'Beasiswa',                  'beasiswa',                     4, '4/22', 1, TRUE, 1),
    (23, 'MHS-ORMAWA',   'Organisasi Kemahasiswaan',  'organisasi-kemahasiswaan',     4, '4/23', 1, TRUE, 2),
    (24, 'MHS-TATIB',    'Tata Tertib dan Etika',     'tata-tertib-dan-etika',        4, '4/24', 1, TRUE, 3);


-- =============================================================================
--  7. PERAN
-- =============================================================================
INSERT INTO `peran` (`kode`, `nama`, `deskripsi`, `tingkat`, `is_sistem`,
                     `is_anonim`, `is_wajib_2fa`, `is_lingkup_unit`) VALUES
    ('superadmin', 'Superadmin',
     'Administrator sistem dengan kewenangan penuh atas seluruh data dan konfigurasi.',
     1, TRUE, FALSE, TRUE,  FALSE),
    ('admin',      'Admin',
     'Pengelola dokumentasi hukum, dibatasi pada cakupan unit kerjanya.',
     2, TRUE, FALSE, FALSE, TRUE),
    ('dosen_staf', 'Dosen/Staf',
     'Pengguna terautentikasi yang dapat mengakses dokumen internal.',
     3, TRUE, FALSE, FALSE, FALSE),
    ('pengunjung', 'Pengunjung Publik',
     'Peran virtual untuk permintaan tanpa autentikasi; tidak pernah ditetapkan ke akun.',
     4, TRUE, TRUE,  FALSE, FALSE);


-- =============================================================================
--  8. IZIN (78 butir)
-- =============================================================================
INSERT INTO `izin` (`kode`, `nama`, `modul`, `is_berdampak_tinggi`, `urutan`) VALUES
    -- Modul dokumen: konsumsi
    ('dokumen.lihat_publik',    'Melihat dokumen publik',              'dokumen', FALSE,  1),
    ('dokumen.unduh_publik',    'Mengunduh dokumen publik',            'dokumen', FALSE,  2),
    ('dokumen.lihat_internal',  'Melihat dokumen internal',            'dokumen', FALSE,  3),
    ('dokumen.unduh_internal',  'Mengunduh dokumen internal',          'dokumen', FALSE,  4),
    ('dokumen.lihat_terbatas',  'Melihat dokumen terbatas',            'dokumen', FALSE,  5),
    ('dokumen.unduh_terbatas',  'Mengunduh dokumen terbatas',          'dokumen', FALSE,  6),
    ('dokumen.lihat_rahasia',   'Melihat dokumen rahasia',             'dokumen', TRUE,   7),
    ('dokumen.lihat_admin',     'Melihat dokumen pada panel admin',    'dokumen', FALSE,  8),
    -- Modul dokumen: pengelolaan
    ('dokumen.buat',            'Membuat dokumen',                     'dokumen', FALSE,  9),
    ('dokumen.ubah',            'Mengubah metadata dokumen',           'dokumen', FALSE, 10),
    ('dokumen.hapus',           'Menghapus dokumen',                   'dokumen', FALSE, 11),
    ('dokumen.pulihkan',        'Memulihkan dokumen',                  'dokumen', FALSE, 12),
    ('dokumen.hapus_permanen',  'Menghapus dokumen permanen',          'dokumen', TRUE,  13),
    ('dokumen.unggah_berkas',   'Mengunggah berkas dokumen',           'dokumen', FALSE, 14),
    ('dokumen.hapus_berkas',    'Menghapus berkas dokumen',            'dokumen', FALSE, 15),
    ('dokumen.kelola_relasi',   'Mengelola relasi antarperaturan',     'dokumen', FALSE, 16),
    ('dokumen.ubah_status',     'Mengubah status keberlakuan',         'dokumen', TRUE,  17),
    ('dokumen.ubah_akses',      'Menetapkan tingkat akses dokumen',    'dokumen', TRUE,  18),
    ('dokumen.ajukan',          'Mengajukan dokumen untuk verifikasi', 'dokumen', FALSE, 19),
    ('dokumen.verifikasi',      'Memverifikasi dan menyetujui dokumen','dokumen', TRUE,  20),
    ('dokumen.terbitkan',       'Mempublikasikan dokumen',             'dokumen', TRUE,  21),
    ('dokumen.tarik',           'Menarik dokumen terbit',              'dokumen', TRUE,  22),
    ('dokumen.impor',           'Mengimpor metadata massal',           'dokumen', TRUE,  23),
    ('dokumen.ekspor',          'Mengekspor data dokumen',             'dokumen', FALSE, 24),
    ('dokumen.operasi_massal',  'Melakukan operasi massal',            'dokumen', TRUE,  25),
    ('dokumen.lihat_riwayat',   'Melihat riwayat perubahan dokumen',   'dokumen', FALSE, 26),
    ('dokumen.putuskan_akses',  'Memutuskan permintaan akses dokumen', 'dokumen', FALSE, 27),
    -- Modul akses pribadi
    ('akses.minta',             'Mengajukan permintaan akses',         'akses_pribadi', FALSE, 28),
    ('akses.koleksi',           'Mengelola koleksi dokumen pribadi',   'akses_pribadi', FALSE, 29),
    ('akses.riwayat_unduh',     'Melihat riwayat unduhan pribadi',     'akses_pribadi', FALSE, 30),
    ('profil.ubah',             'Mengubah profil pribadi',             'akses_pribadi', FALSE, 31),
    ('profil.ubah_sandi',       'Mengubah kata sandi sendiri',         'akses_pribadi', FALSE, 32),
    -- Modul konten
    ('berita.lihat_admin',      'Melihat daftar berita di panel admin','konten', FALSE, 33),
    ('berita.kelola',           'Mengelola berita dan artikel hukum',  'konten', FALSE, 34),
    ('berita.terbitkan',        'Menerbitkan berita',                  'konten', FALSE, 35),
    ('berita.hapus',            'Menghapus berita',                    'konten', FALSE, 36),
    ('halaman.kelola',          'Mengelola halaman statis',            'konten', FALSE, 37),
    ('banner.kelola',           'Mengelola banner dan pengumuman',     'konten', FALSE, 38),
    ('media.kelola',            'Mengelola pustaka media',             'konten', FALSE, 39),
    ('tautan.kelola',           'Mengelola tautan terkait',            'konten', FALSE, 40),
    ('faq.kelola',              'Mengelola daftar tanya-jawab',        'konten', FALSE, 41),
    -- Modul interaksi
    ('kontak.lihat',            'Melihat pesan kontak masuk',          'interaksi', FALSE, 42),
    ('kontak.kelola',           'Menanggapi dan menutup pesan kontak', 'interaksi', FALSE, 43),
    -- Modul master data
    ('master.lihat',            'Melihat data master',                 'master', FALSE, 44),
    ('unit_kerja.kelola',       'Mengelola unit kerja',                'master', TRUE,  45),
    ('jenis_peraturan.kelola',  'Mengelola jenis peraturan',           'master', TRUE,  46),
    ('kategori.kelola',         'Mengelola kategori',                  'master', FALSE, 47),
    ('bidang_hukum.kelola',     'Mengelola bidang hukum',              'master', FALSE, 48),
    ('tag.kelola',              'Mengelola kata kunci',                'master', FALSE, 49),
    ('status.kelola',           'Mengelola status keberlakuan',        'master', TRUE,  50),
    ('jenis_relasi.kelola',     'Mengelola jenis relasi',              'master', TRUE,  51),
    -- Modul pengguna
    ('pengguna.lihat',          'Melihat daftar pengguna',             'pengguna', FALSE, 52),
    ('pengguna.kelola',         'Mengelola akun pengguna',             'pengguna', TRUE,  53),
    ('pengguna.hapus',          'Menghapus akun pengguna',             'pengguna', TRUE,  54),
    ('pengguna.reset_sandi',    'Menetapkan ulang kata sandi',         'pengguna', TRUE,  55),
    ('pengguna.verifikasi',     'Memverifikasi pendaftaran akun',      'pengguna', FALSE, 56),
    ('pengguna.tetapkan_peran', 'Menetapkan peran kepada akun',        'pengguna', TRUE,  57),
    ('pengguna.tetapkan_unit',  'Menetapkan unit kerja dan akses',     'pengguna', TRUE,  58),
    -- Modul otorisasi
    ('peran.lihat',             'Melihat daftar peran dan izin',       'otorisasi', FALSE, 59),
    ('peran.kelola',            'Mengelola peran dan izinnya',         'otorisasi', TRUE,  60),
    ('izin.tetapkan_langsung',  'Menetapkan izin langsung pada akun',  'otorisasi', TRUE,  61),
    -- Modul sistem
    ('panel.akses',             'Mengakses panel administrasi',        'sistem', FALSE, 62),
    ('dasbor.lihat',            'Melihat dasbor statistik',            'sistem', FALSE, 63),
    ('laporan.lihat',           'Melihat dan mengekspor laporan',      'sistem', FALSE, 64),
    ('menu.kelola',             'Mengelola struktur menu navigasi',    'sistem', FALSE, 65),
    ('sistem.konfigurasi',      'Mengelola konfigurasi sistem',        'sistem', TRUE,  66),
    ('sistem.log_aktivitas',    'Melihat log aktivitas',               'sistem', TRUE,  67),
    ('sistem.log_keamanan',     'Melihat log keamanan',                'sistem', TRUE,  68),
    ('sistem.cadangan',         'Mengelola pencadangan dan pemulihan', 'sistem', TRUE,  69),
    ('sistem.pemeliharaan',     'Mengaktifkan mode pemeliharaan',      'sistem', TRUE,  70),
    ('jdihn.kelola',            'Mengelola sinkronisasi JDIHN',        'sistem', TRUE,  71),
    -- Modul layanan hukum (Fase 3)
    ('layanan.ajukan',          'Mengajukan permohonan layanan hukum', 'layanan', FALSE, 72),
    ('layanan.lihat_sendiri',   'Melihat permohonan sendiri',          'layanan', FALSE, 73),
    ('layanan.kelola',          'Mengelola seluruh permohonan',        'layanan', FALSE, 74),
    ('layanan.tugaskan',        'Menugaskan penelaah',                 'layanan', FALSE, 75),
    ('layanan.master',          'Mengelola katalog jenis layanan',     'layanan', TRUE,  76);


-- =============================================================================
--  9. PEMETAAN PERAN → IZIN  (lihat docs/05-role-permission.md § E.4)
-- =============================================================================

-- 9a. Superadmin: seluruh izin, kecuali dua izin yang tidak bermakna baginya
INSERT INTO `peran_izin` (`peran_id`, `izin_id`)
SELECT p.`id`, i.`id`
FROM `peran` p CROSS JOIN `izin` i
WHERE p.`kode` = 'superadmin'
  AND i.`kode` NOT IN ('akses.minta', 'layanan.ajukan');

-- 9b. Pengunjung Publik (peran virtual): hanya akses baca publik
INSERT INTO `peran_izin` (`peran_id`, `izin_id`)
SELECT p.`id`, i.`id`
FROM `peran` p JOIN `izin` i
  ON i.`kode` IN ('dokumen.lihat_publik', 'dokumen.unduh_publik')
WHERE p.`kode` = 'pengunjung';

-- 9c. Dosen/Staf
INSERT INTO `peran_izin` (`peran_id`, `izin_id`)
SELECT p.`id`, i.`id`
FROM `peran` p JOIN `izin` i
  ON i.`kode` IN (
      'dokumen.lihat_publik',   'dokumen.unduh_publik',
      'dokumen.lihat_internal', 'dokumen.unduh_internal',
      'dokumen.lihat_terbatas', 'dokumen.unduh_terbatas',
      'akses.minta',            'akses.koleksi',       'akses.riwayat_unduh',
      'profil.ubah',            'profil.ubah_sandi',
      'layanan.ajukan',         'layanan.lihat_sendiri'
  )
WHERE p.`kode` = 'dosen_staf';

-- 9d. Admin (himpunan baku; izin bertanda "○" pada matriks diberikan per akun
--     melalui pengguna_izin, atau melalui peran turunan)
INSERT INTO `peran_izin` (`peran_id`, `izin_id`)
SELECT p.`id`, i.`id`
FROM `peran` p JOIN `izin` i
  ON i.`kode` IN (
      -- warisan konsumsi dokumen
      'dokumen.lihat_publik',   'dokumen.unduh_publik',
      'dokumen.lihat_internal', 'dokumen.unduh_internal',
      'dokumen.lihat_terbatas', 'dokumen.unduh_terbatas',
      'dokumen.lihat_rahasia',
      -- pengelolaan dokumen dalam cakupan unit
      'dokumen.lihat_admin',    'dokumen.buat',          'dokumen.ubah',
      'dokumen.hapus',          'dokumen.pulihkan',
      'dokumen.unggah_berkas',  'dokumen.hapus_berkas',
      'dokumen.kelola_relasi',  'dokumen.ajukan',
      'dokumen.ekspor',         'dokumen.lihat_riwayat', 'dokumen.putuskan_akses',
      -- akses pribadi
      'akses.minta',            'akses.koleksi',         'akses.riwayat_unduh',
      'profil.ubah',            'profil.ubah_sandi',
      -- konten dan master terbatas
      'berita.lihat_admin',     'media.kelola',          'tag.kelola',
      'master.lihat',           'pengguna.lihat',        'peran.lihat',
      -- sistem
      'panel.akses',            'dasbor.lihat',          'laporan.lihat',
      -- layanan
      'layanan.ajukan',         'layanan.lihat_sendiri'
  )
WHERE p.`kode` = 'admin';


-- =============================================================================
--  10. KATEGORI BERITA
-- =============================================================================
INSERT INTO `kategori_berita` (`nama`, `slug`, `deskripsi`, `is_aktif`, `urutan`) VALUES
    ('Sosialisasi Peraturan', 'sosialisasi-peraturan',
     'Sosialisasi dan diseminasi produk hukum baru.',            TRUE, 1),
    ('Kajian Hukum',          'kajian-hukum',
     'Artikel, telaah, dan kajian hukum.',                       TRUE, 2),
    ('Kegiatan',              'kegiatan',
     'Kegiatan bidang hukum dan tata laksana.',                  TRUE, 3),
    ('Pengumuman',            'pengumuman',
     'Pengumuman resmi pengelola JDIH.',                         TRUE, 4),
    ('Layanan',               'layanan',
     'Informasi terkait layanan hukum.',                         TRUE, 5);


-- =============================================================================
--  11. TAUTAN TERKAIT
-- =============================================================================
INSERT INTO `tautan_terkait` (`nama`, `url`, `kelompok`, `deskripsi`, `is_aktif`, `urutan`) VALUES
    ('JDIH Nasional',        'https://jdihn.go.id',              'jdihn',
     'Portal Jaringan Dokumentasi dan Informasi Hukum Nasional.', TRUE, 1),
    ('Peraturan BPK',        'https://peraturan.bpk.go.id',      'jdihn',
     'Basis data peraturan perundang-undangan.',                  TRUE, 2),
    ('Peraturan Pemerintah', 'https://peraturan.go.id',          'jdihn',
     'Portal peraturan perundang-undangan nasional.',             TRUE, 3),
    ('Situs Utama ITH',      'https://ith.ac.id',                'internal',
     'Situs resmi Institut Teknologi Bacharuddin Jusuf Habibie.', TRUE, 4);


-- =============================================================================
--  12. HALAMAN STATIS (kerangka; isi dilengkapi melalui panel admin)
-- =============================================================================
INSERT INTO `halaman` (`judul`, `slug`, `templat`, `status`, `is_sistem`, `urutan`) VALUES
    ('Tentang JDIH ITH',        'tentang-jdih',        'baku',      'draf',   TRUE,  1),
    ('Visi, Misi, dan Tujuan',  'visi-misi',           'baku',      'draf',   TRUE,  2),
    ('Dasar Hukum',             'dasar-hukum',         'baku',      'draf',   TRUE,  3),
    ('Struktur Pengelola',      'struktur-pengelola',  'baku',      'draf',   TRUE,  4),
    ('Tugas dan Fungsi',        'tugas-fungsi',        'baku',      'draf',   TRUE,  5),
    ('Alur Layanan',            'alur-layanan',        'baku',      'draf',   TRUE,  6),
    ('Kebijakan Privasi',       'kebijakan-privasi',   'baku',      'draf',   TRUE, 90),
    ('Kontak',                  'kontak',              'kontak',    'draf',   TRUE, 91),
    ('Statistik',               'statistik',           'statistik', 'draf',   TRUE, 92);


-- =============================================================================
--  13. MENU NAVIGASI
-- =============================================================================
INSERT INTO `menu` (`kode`, `nama`, `lokasi`) VALUES
    ('utama',        'Menu Utama',           'header'),
    ('kaki_hukum',   'Kaki — Produk Hukum',  'kaki_kolom_1'),
    ('kaki_info',    'Kaki — Informasi',     'kaki_kolom_2');


-- =============================================================================
--  14. KONFIGURASI SISTEM
-- =============================================================================
INSERT INTO `pengaturan`
    (`kunci`, `nilai`, `tipe`, `grup`, `label`, `is_publik`, `is_terenkripsi`, `urutan`)
VALUES
    -- Umum
    ('situs.nama',            'JDIH ITH Parepare',             'teks',    'umum',
     'Nama Situs',                                            TRUE,  FALSE,  1),
    ('situs.nama_panjang',    'Jaringan Dokumentasi dan Informasi Hukum Institut Teknologi Bacharuddin Jusuf Habibie',
                                                              'teks',    'umum',
     'Nama Lengkap Situs',                                    TRUE,  FALSE,  2),
    ('situs.deskripsi',       'Portal resmi dokumentasi dan informasi hukum ITH Parepare.',
                                                              'teks',    'umum',
     'Deskripsi Situs',                                       TRUE,  FALSE,  3),
    ('situs.institusi',       'Institut Teknologi Bacharuddin Jusuf Habibie', 'teks', 'umum',
     'Nama Institusi',                                        TRUE,  FALSE,  4),
    ('situs.alamat',          'Parepare, Sulawesi Selatan',    'teks',    'umum',
     'Alamat',                                                TRUE,  FALSE,  5),
    ('situs.email',           'jdih@ith.ac.id',                'teks',    'umum',
     'Surel Kontak',                                          TRUE,  FALSE,  6),
    ('situs.telepon',         '',                              'teks',    'umum',
     'Nomor Telepon',                                         TRUE,  FALSE,  7),
    -- Tampilan
    ('tampilan.logo',         '',                              'berkas',  'tampilan',
     'Logo Situs',                                            TRUE,  FALSE, 10),
    ('tampilan.favicon',      '',                              'berkas',  'tampilan',
     'Favicon',                                               TRUE,  FALSE, 11),
    ('tampilan.per_halaman',  '20',                            'angka',   'tampilan',
     'Jumlah Data per Halaman',                               TRUE,  FALSE, 12),
    ('tampilan.mode_gelap',   '1',                             'boolean', 'tampilan',
     'Aktifkan Mode Gelap',                                   TRUE,  FALSE, 13),
    -- Unggahan
    ('unggahan.ukuran_maks_mb','25',                           'angka',   'unggahan',
     'Ukuran Maksimum Berkas (MB)',                           FALSE, FALSE, 20),
    ('unggahan.jenis_diizinkan','["application/pdf"]',         'json',    'unggahan',
     'Jenis MIME Berkas Dokumen yang Diizinkan',              FALSE, FALSE, 21),
    ('unggahan.diska',        'lokal',                         'teks',    'unggahan',
     'Diska Penyimpanan',                                     FALSE, FALSE, 22),
    ('unggahan.antivirus',    '0',                             'boolean', 'unggahan',
     'Aktifkan Pemindaian Antivirus',                         FALSE, FALSE, 23),
    ('unggahan.ocr',          '1',                             'boolean', 'unggahan',
     'Aktifkan OCR untuk PDF Hasil Pindaian',                 FALSE, FALSE, 24),
    -- Kebijakan akses
    ('akses.tingkat_baku',    'internal',                      'teks',    'akses',
     'Tingkat Akses Baku Dokumen Baru',                       FALSE, FALSE, 30),
    ('akses.tanda_air',       '0',                             'boolean', 'akses',
     'Sisipkan Tanda Air pada Dokumen Internal/Terbatas',     FALSE, FALSE, 31),
    ('akses.unduh_anonim_per_jam','30',                        'angka',   'akses',
     'Batas Unduhan Pengunjung Anonim per Jam',               FALSE, FALSE, 32),
    ('akses.url_kedaluwarsa_menit','15',                       'angka',   'akses',
     'Masa Berlaku URL Unduh Bertanda Tangan (menit)',        FALSE, FALSE, 33),
    ('akses.domain_pendaftaran','["ith.ac.id"]',               'json',    'akses',
     'Domain Surel yang Diizinkan Mendaftar',                 FALSE, FALSE, 34),
    -- Alur kerja
    ('alur.izinkan_setujui_sendiri','0',                       'boolean', 'akses',
     'Izinkan Verifikator Menyetujui Dokumen Buatannya Sendiri', FALSE, FALSE, 35),
    ('alur.wajib_verifikasi', '1',                             'boolean', 'akses',
     'Wajibkan Verifikasi sebelum Publikasi',                 FALSE, FALSE, 36),
    -- Integrasi
    ('integrasi.jdihn_aktif', '0',                             'boolean', 'integrasi',
     'Aktifkan Sinkronisasi JDIHN',                           FALSE, FALSE, 40),
    ('integrasi.jdihn_url',   '',                              'teks',    'integrasi',
     'URL Titik Akhir JDIHN',                                 FALSE, FALSE, 41),
    ('integrasi.jdihn_kunci', '',                              'teks',    'integrasi',
     'Kredensial JDIHN',                                      FALSE, TRUE,  42),
    ('integrasi.sso_aktif',   '0',                             'boolean', 'integrasi',
     'Aktifkan Login SSO Institusi',                          FALSE, FALSE, 43),
    ('integrasi.api_publik',  '1',                             'boolean', 'integrasi',
     'Aktifkan API Publik Baca-Saja',                         FALSE, FALSE, 44),
    -- Pemeliharaan
    ('pemeliharaan.aktif',    '0',                             'boolean', 'pemeliharaan',
     'Aktifkan Mode Pemeliharaan',                            FALSE, FALSE, 50),
    ('pemeliharaan.pesan',    'Sistem sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi.',
                                                              'teks',    'pemeliharaan',
     'Pesan Mode Pemeliharaan',                               TRUE,  FALSE, 51);


-- =============================================================================
--  15. LAYANAN HUKUM (Fase 3)
-- =============================================================================
INSERT INTO `layanan_hukum`
    (`kode`, `nama`, `deskripsi`, `sla_hari`, `unit_penanggung_jawab_id`, `is_aktif`, `urutan`)
VALUES
    ('TELAAH',    'Telaah Hukum',
     'Telaah atas permasalahan hukum yang dihadapi unit kerja.',                14, 5, TRUE, 1),
    ('OPINI',     'Pendapat Hukum (Legal Opinion)',
     'Penyusunan pendapat hukum atas suatu perkara atau rencana kebijakan.',    21, 5, TRUE, 2),
    ('DRAFTING',  'Penyusunan Rancangan Peraturan',
     'Pendampingan penyusunan rancangan produk hukum internal.',                30, 5, TRUE, 3),
    ('KERJASAMA', 'Penelaahan Dokumen Kerja Sama',
     'Penelaahan rancangan perjanjian kerja sama sebelum penandatanganan.',      14, 5, TRUE, 4),
    ('KONSULTASI','Konsultasi Hukum',
     'Konsultasi atas penerapan peraturan internal.',                            7, 5, TRUE, 5);


-- =============================================================================
--  16. AKUN SUPERADMIN AWAL
-- =============================================================================
--  ⚠ WAJIB: ganti surel dan kata sandi sebelum digunakan.
--  Nilai `kata_sandi` di bawah adalah placeholder dan HARUS diganti dengan hash
--  yang dihasilkan aplikasi. Contoh pembuatan hash melalui Laravel Tinker:
--      php artisan tinker
--      >>> Hash::make('KataSandiKuatAnda');
--  Setelah login pertama, aktifkan 2FA (diwajibkan bagi peran Superadmin).
-- =============================================================================
INSERT INTO `pengguna`
    (`nama_lengkap`, `email`, `nip_nidn`, `kata_sandi`, `unit_kerja_id`, `jabatan`,
     `status`, `email_terverifikasi_pada`, `sumber_akun`, `dibuat_pada`)
VALUES
    ('Administrator Sistem', 'admin@ith.ac.id', NULL,
     '$2y$12$GANTI.HASH.INI.DENGAN.HASH.YANG.DIHASILKAN.APLIKASI.AAAAAAAAAAAA',
     5, 'Administrator JDIH', 'aktif', NOW(), 'lokal', NOW());

INSERT INTO `pengguna_peran` (`pengguna_id`, `peran_id`)
SELECT pg.`id`, pr.`id`
FROM `pengguna` pg CROSS JOIN `peran` pr
WHERE pg.`email` = 'admin@ith.ac.id' AND pr.`kode` = 'superadmin';


SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
--  RINGKASAN DATA AWAL
-- =============================================================================
--    status_dokumen  :  6 baris
--    jenis_relasi    :  7 baris
--    jenis_peraturan : 20 baris   ⚠ verifikasi V-02, V-03
--    bidang_hukum    : 12 baris   ⚠ selaraskan dengan daftar JDIHN
--    unit_kerja      : 17 baris   ⚠ VERIFIKASI V-01 (OTK ITH) — data contoh
--    kategori        : 24 baris
--    peran           :  4 baris
--    izin            : 76 baris  (superadmin 74, admin 35, dosen_staf 13, pengunjung 2)
--    peran_izin      : dipetakan otomatis sesuai matriks docs/05
--    kategori_berita :  5 baris
--    tautan_terkait  :  4 baris
--    halaman         :  9 baris (kerangka, status draf)
--    menu            :  3 baris
--    pengaturan      : 30 baris
--    layanan_hukum   :  5 baris
--    pengguna        :  1 baris   ⚠ GANTI surel dan hash kata sandi
-- =============================================================================
