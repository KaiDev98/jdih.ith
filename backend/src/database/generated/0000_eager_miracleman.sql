-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `banner` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`judul` varchar(200) NOT NULL,
	`subjudul` varchar(300) DEFAULT 'NULL',
	`gambar` varchar(255) NOT NULL,
	`gambar_seluler` varchar(255) DEFAULT 'NULL',
	`tautan` varchar(500) DEFAULT 'NULL',
	`label_tombol` varchar(50) DEFAULT 'NULL',
	`tanggal_mulai` date DEFAULT 'NULL',
	`tanggal_selesai` date DEFAULT 'NULL',
	`is_aktif` tinyint(1) NOT NULL DEFAULT 1,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	`dibuat_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `berita` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`judul` varchar(255) NOT NULL,
	`slug` varchar(275) NOT NULL,
	`tipe` enum('berita','artikel_hukum','pengumuman','siaran_pers') NOT NULL DEFAULT '''berita''',
	`kategori_berita_id` bigint(20) unsigned DEFAULT 'NULL',
	`ringkasan` varchar(500) DEFAULT 'NULL',
	`isi` longtext NOT NULL,
	`gambar_utama` varchar(255) DEFAULT 'NULL',
	`sumber` varchar(255) DEFAULT 'NULL',
	`penulis_id` bigint(20) unsigned NOT NULL,
	`penulis_nama_tampil` varchar(150) DEFAULT 'NULL',
	`status` enum('draf','ditinjau','terbit','arsip') NOT NULL DEFAULT '''draf''',
	`diterbitkan_pada` datetime DEFAULT 'NULL',
	`jumlah_dilihat` int(10) unsigned NOT NULL DEFAULT 0,
	`is_disorot` tinyint(1) NOT NULL DEFAULT 0,
	`meta_judul` varchar(255) DEFAULT 'NULL',
	`meta_deskripsi` varchar(500) DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	`dihapus_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_berita_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `berita_dokumen` (
	`berita_id` bigint(20) unsigned NOT NULL,
	`dokumen_id` bigint(20) unsigned NOT NULL,
	`keterangan` varchar(255) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `berita_tag` (
	`berita_id` bigint(20) unsigned NOT NULL,
	`tag_id` bigint(20) unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bidang_hukum` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`kode` varchar(30) NOT NULL,
	`nama` varchar(120) NOT NULL,
	`deskripsi` varchar(255) DEFAULT 'NULL',
	`is_aktif` tinyint(1) NOT NULL DEFAULT 1,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `uq_bidang_hukum_kode` UNIQUE(`kode`),
	CONSTRAINT `uq_bidang_hukum_nama` UNIQUE(`nama`)
);
--> statement-breakpoint
CREATE TABLE `dokumen` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`kode_dokumen` varchar(30) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`jenis_peraturan_id` bigint(20) unsigned NOT NULL,
	`nomor` varchar(100) NOT NULL,
	`nomor_normal` varchar(100) GENERATED ALWAYS AS (ucase(trim(regexp_replace(`nomor`,'[[:space:]]+',' ')))) STORED DEFAULT 'NULL',
	`nomor_lengkap` varchar(255) DEFAULT 'NULL',
	`tahun` smallint(5) unsigned NOT NULL,
	`judul` varchar(500) NOT NULL,
	`judul_singkat` varchar(255) DEFAULT 'NULL',
	`teu` varchar(500) DEFAULT 'NULL',
	`teu_manual` tinyint(1) NOT NULL DEFAULT 0,
	`tempat_penetapan` varchar(100) NOT NULL DEFAULT '''Parepare''',
	`tanggal_penetapan` date NOT NULL,
	`tanggal_pengundangan` date DEFAULT 'NULL',
	`tanggal_berlaku` date DEFAULT 'NULL',
	`tanggal_berakhir` date DEFAULT 'NULL',
	`penerbit` varchar(255) NOT NULL DEFAULT '''Institut Teknologi Bacharuddin Jusuf Habibie''',
	`penandatangan` varchar(255) DEFAULT 'NULL',
	`jabatan_penandatangan` varchar(150) DEFAULT 'NULL',
	`sumber` varchar(255) DEFAULT 'NULL',
	`unit_kerja_id` bigint(20) unsigned NOT NULL,
	`bidang_hukum_id` bigint(20) unsigned DEFAULT 'NULL',
	`status_dokumen_id` bigint(20) unsigned NOT NULL,
	`lingkup` enum('internal','eksternal') NOT NULL DEFAULT '''internal''',
	`tingkat_akses` enum('publik','internal','terbatas','rahasia') NOT NULL DEFAULT '''publik''',
	`status_publikasi` enum('draf','diajukan','revisi','disetujui','terbit','ditarik') NOT NULL DEFAULT '''draf''',
	`bahasa` char(2) NOT NULL DEFAULT '''id''',
	`deskripsi_fisik` varchar(255) DEFAULT 'NULL',
	`nomor_panggil` varchar(50) DEFAULT 'NULL',
	`lokasi_arsip` varchar(255) DEFAULT 'NULL',
	`abstrak` mediumtext DEFAULT 'NULL',
	`catatan` text DEFAULT 'NULL',
	`isi_teks` longtext DEFAULT 'NULL',
	`jumlah_dilihat` int(10) unsigned NOT NULL DEFAULT 0,
	`jumlah_diunduh` int(10) unsigned NOT NULL DEFAULT 0,
	`is_disorot` tinyint(1) NOT NULL DEFAULT 0,
	`diterbitkan_pada` datetime DEFAULT 'NULL',
	`dijadwalkan_terbit_pada` datetime DEFAULT 'NULL',
	`catatan_revisi` text DEFAULT 'NULL',
	`sinkron_jdihn` enum('belum','tertunda','terkirim','gagal') NOT NULL DEFAULT '''belum''',
	`jdihn_id` varchar(64) DEFAULT 'NULL',
	`disinkron_pada` datetime DEFAULT 'NULL',
	`impor_batch_id` bigint(20) unsigned DEFAULT 'NULL',
	`versi` int(10) unsigned NOT NULL DEFAULT 1,
	`dibuat_oleh` bigint(20) unsigned NOT NULL,
	`diperiksa_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`diterbitkan_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`diperbarui_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	`dihapus_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_dokumen_kode` UNIQUE(`kode_dokumen`),
	CONSTRAINT `uq_dokumen_slug` UNIQUE(`slug`),
	CONSTRAINT `uq_dokumen_identitas` UNIQUE(`jenis_peraturan_id`,`nomor_normal`,`tahun`,`unit_kerja_id`)
);
--> statement-breakpoint
CREATE TABLE `dokumen_akses` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`dokumen_id` bigint(20) unsigned NOT NULL,
	`subjek_tipe` enum('peran','unit_kerja','pengguna') NOT NULL,
	`subjek_id` bigint(20) unsigned NOT NULL,
	`izin` enum('lihat','unduh') NOT NULL DEFAULT '''unduh''',
	`dibuat_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	CONSTRAINT `uq_dokumen_akses` UNIQUE(`dokumen_id`,`subjek_tipe`,`subjek_id`,`izin`)
);
--> statement-breakpoint
CREATE TABLE `dokumen_alur` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`dokumen_id` bigint(20) unsigned NOT NULL,
	`konteks` enum('publikasi','keberlakuan') NOT NULL DEFAULT '''publikasi''',
	`status_dari` varchar(40) DEFAULT 'NULL',
	`status_ke` varchar(40) NOT NULL,
	`aksi` varchar(50) NOT NULL,
	`catatan` text DEFAULT 'NULL',
	`dokumen_dasar_id` bigint(20) unsigned DEFAULT 'NULL',
	`oleh_id` bigint(20) unsigned DEFAULT 'NULL',
	`oleh_sistem` tinyint(1) NOT NULL DEFAULT 0,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `dokumen_berkas` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`dokumen_id` bigint(20) unsigned NOT NULL,
	`jenis_berkas` enum('dokumen_utama','lampiran','abstrak','naskah_akademik','terjemahan','dokumen_pencabut') NOT NULL DEFAULT '''dokumen_utama''',
	`nama_asli` varchar(255) NOT NULL,
	`nama_simpan` varchar(100) NOT NULL,
	`path` varchar(500) NOT NULL,
	`disk` varchar(30) NOT NULL DEFAULT '''lokal''',
	`mime_type` varchar(100) NOT NULL,
	`ukuran_bytes` bigint(20) unsigned NOT NULL,
	`jumlah_halaman` smallint(5) unsigned DEFAULT 'NULL',
	`hash_sha256` char(64) NOT NULL,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	`is_publik` tinyint(1) NOT NULL DEFAULT 1,
	`is_pratinjau` tinyint(1) NOT NULL DEFAULT 1,
	`is_versi_aktif` tinyint(1) NOT NULL DEFAULT 1,
	`jumlah_diunduh` int(10) unsigned NOT NULL DEFAULT 0,
	`status_ekstraksi` enum('menunggu','berhasil','gagal','tidak_perlu') NOT NULL DEFAULT '''menunggu''',
	`keterangan` varchar(255) DEFAULT 'NULL',
	`dibuat_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_dokumen_berkas_path` UNIQUE(`path`)
);
--> statement-breakpoint
CREATE TABLE `dokumen_kategori` (
	`dokumen_id` bigint(20) unsigned NOT NULL,
	`kategori_id` bigint(20) unsigned NOT NULL,
	`is_utama` tinyint(1) NOT NULL DEFAULT 0,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `dokumen_relasi` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`dokumen_id` bigint(20) unsigned NOT NULL,
	`dokumen_terkait_id` bigint(20) unsigned NOT NULL,
	`jenis_relasi_id` bigint(20) unsigned NOT NULL,
	`keterangan` varchar(500) DEFAULT 'NULL',
	`dibuat_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	CONSTRAINT `uq_dokumen_relasi` UNIQUE(`dokumen_id`,`dokumen_terkait_id`,`jenis_relasi_id`)
);
--> statement-breakpoint
CREATE TABLE `dokumen_riwayat` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`dokumen_id` bigint(20) unsigned NOT NULL,
	`versi` int(10) unsigned NOT NULL,
	`cuplikan_metadata` longtext NOT NULL,
	`cuplikan_berkas` longtext DEFAULT 'NULL',
	`ringkasan_perubahan` varchar(500) DEFAULT 'NULL',
	`oleh_id` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	CONSTRAINT `uq_dokumen_riwayat_versi` UNIQUE(`dokumen_id`,`versi`)
);
--> statement-breakpoint
CREATE TABLE `dokumen_statistik_harian` (
	`dokumen_id` bigint(20) unsigned NOT NULL,
	`tanggal` date NOT NULL,
	`jumlah_dilihat` int(10) unsigned NOT NULL DEFAULT 0,
	`jumlah_diunduh` int(10) unsigned NOT NULL DEFAULT 0,
	`jumlah_dilihat_anonim` int(10) unsigned NOT NULL DEFAULT 0,
	`jumlah_diunduh_anonim` int(10) unsigned NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `dokumen_tag` (
	`dokumen_id` bigint(20) unsigned NOT NULL,
	`tag_id` bigint(20) unsigned NOT NULL,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `faq` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`pertanyaan` varchar(500) NOT NULL,
	`jawaban` text NOT NULL,
	`kelompok` varchar(60) DEFAULT 'NULL',
	`is_aktif` tinyint(1) NOT NULL DEFAULT 1,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `halaman` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`judul` varchar(200) NOT NULL,
	`slug` varchar(220) NOT NULL,
	`isi` longtext DEFAULT 'NULL',
	`induk_id` bigint(20) unsigned DEFAULT 'NULL',
	`templat` varchar(50) NOT NULL DEFAULT '''baku''',
	`status` enum('draf','terbit') NOT NULL DEFAULT '''draf''',
	`is_sistem` tinyint(1) NOT NULL DEFAULT 0,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	`meta_judul` varchar(255) DEFAULT 'NULL',
	`meta_deskripsi` varchar(500) DEFAULT 'NULL',
	`disusun_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_halaman_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `impor_batch` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`nama_berkas` varchar(255) NOT NULL,
	`path` varchar(500) NOT NULL,
	`mode` enum('buat','perbarui') NOT NULL DEFAULT '''buat''',
	`total_baris` int(10) unsigned NOT NULL DEFAULT 0,
	`jumlah_berhasil` int(10) unsigned NOT NULL DEFAULT 0,
	`jumlah_gagal` int(10) unsigned NOT NULL DEFAULT 0,
	`baris_terakhir` int(10) unsigned NOT NULL DEFAULT 0,
	`status` enum('pravalidasi','menunggu','berjalan','selesai','gagal','dibatalkan') NOT NULL DEFAULT '''pravalidasi''',
	`laporan` longtext DEFAULT 'NULL',
	`oleh_id` bigint(20) unsigned NOT NULL,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	`selesai_pada` datetime DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `izin` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`kode` varchar(60) NOT NULL,
	`nama` varchar(120) NOT NULL,
	`modul` varchar(40) NOT NULL,
	`deskripsi` varchar(255) DEFAULT 'NULL',
	`is_berdampak_tinggi` tinyint(1) NOT NULL DEFAULT 0,
	`is_sistem` tinyint(1) NOT NULL DEFAULT 1,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `uq_izin_kode` UNIQUE(`kode`)
);
--> statement-breakpoint
CREATE TABLE `jenis_peraturan` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`kode` varchar(30) NOT NULL,
	`nama` varchar(120) NOT NULL,
	`bentuk_singkat` varchar(40) DEFAULT 'NULL',
	`lingkup` enum('internal','eksternal') NOT NULL DEFAULT '''internal''',
	`tingkat_hierarki` tinyint(3) unsigned NOT NULL DEFAULT 50,
	`lingkup_penomoran` enum('institut','unit') NOT NULL DEFAULT '''institut''',
	`pola_nomor` varchar(100) DEFAULT 'NULL',
	`deskripsi` varchar(255) DEFAULT 'NULL',
	`is_aktif` tinyint(1) NOT NULL DEFAULT 1,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_jenis_peraturan_kode` UNIQUE(`kode`),
	CONSTRAINT `uq_jenis_peraturan_nama` UNIQUE(`nama`)
);
--> statement-breakpoint
CREATE TABLE `jenis_relasi` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`kode` varchar(40) NOT NULL,
	`nama` varchar(80) NOT NULL,
	`nama_kebalikan` varchar(80) NOT NULL,
	`kode_kebalikan` varchar(40) DEFAULT 'NULL',
	`is_simetris` tinyint(1) NOT NULL DEFAULT 0,
	`is_mengubah_status` tinyint(1) NOT NULL DEFAULT 0,
	`status_akibat_id` bigint(20) unsigned DEFAULT 'NULL',
	`is_sistem` tinyint(1) NOT NULL DEFAULT 0,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `uq_jenis_relasi_kode` UNIQUE(`kode`)
);
--> statement-breakpoint
CREATE TABLE `kategori` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`kode` varchar(30) NOT NULL,
	`nama` varchar(120) NOT NULL,
	`slug` varchar(140) NOT NULL,
	`induk_id` bigint(20) unsigned DEFAULT 'NULL',
	`jalur` varchar(255) NOT NULL DEFAULT '''''',
	`kedalaman` tinyint(3) unsigned NOT NULL DEFAULT 0,
	`deskripsi` varchar(255) DEFAULT 'NULL',
	`ikon` varchar(60) DEFAULT 'NULL',
	`jumlah_dokumen` int(10) unsigned NOT NULL DEFAULT 0,
	`is_aktif` tinyint(1) NOT NULL DEFAULT 1,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_kategori_kode` UNIQUE(`kode`),
	CONSTRAINT `uq_kategori_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `kategori_berita` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`nama` varchar(100) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`deskripsi` varchar(255) DEFAULT 'NULL',
	`is_aktif` tinyint(1) NOT NULL DEFAULT 1,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_kategori_berita_nama` UNIQUE(`nama`),
	CONSTRAINT `uq_kategori_berita_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `koleksi_pengguna` (
	`pengguna_id` bigint(20) unsigned NOT NULL,
	`dokumen_id` bigint(20) unsigned NOT NULL,
	`catatan` varchar(255) DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `layanan_hukum` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`kode` varchar(30) NOT NULL,
	`nama` varchar(150) NOT NULL,
	`deskripsi` text DEFAULT 'NULL',
	`sla_hari` smallint(5) unsigned NOT NULL DEFAULT 14,
	`definisi_formulir` longtext DEFAULT 'NULL',
	`unit_penanggung_jawab_id` bigint(20) unsigned DEFAULT 'NULL',
	`is_aktif` tinyint(1) NOT NULL DEFAULT 1,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_layanan_hukum_kode` UNIQUE(`kode`)
);
--> statement-breakpoint
CREATE TABLE `log_aktivitas` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`pengguna_id` bigint(20) unsigned DEFAULT 'NULL',
	`pelaku_nama` varchar(150) DEFAULT 'NULL',
	`peran_saat_itu` varchar(40) DEFAULT 'NULL',
	`aksi` varchar(50) NOT NULL,
	`entitas` varchar(60) NOT NULL,
	`entitas_id` bigint(20) unsigned DEFAULT 'NULL',
	`deskripsi` varchar(500) DEFAULT 'NULL',
	`data_lama` longtext DEFAULT 'NULL',
	`data_baru` longtext DEFAULT 'NULL',
	`ip_hash` char(64) DEFAULT 'NULL',
	`agen_ringkas` varchar(150) DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `log_autentikasi` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`pengguna_id` bigint(20) unsigned DEFAULT 'NULL',
	`email_dicoba` varchar(190) DEFAULT 'NULL',
	`aksi` enum('login_berhasil','login_gagal','logout','terkunci','reset_diminta','reset_berhasil','2fa_gagal','2fa_berhasil') NOT NULL,
	`keterangan` varchar(255) DEFAULT 'NULL',
	`ip_hash` char(64) NOT NULL,
	`agen_ringkas` varchar(150) DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `log_pencarian` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`kata_kunci` varchar(255) DEFAULT 'NULL',
	`filter` longtext DEFAULT 'NULL',
	`jumlah_hasil` int(10) unsigned NOT NULL DEFAULT 0,
	`pengguna_id` bigint(20) unsigned DEFAULT 'NULL',
	`ip_hash` char(64) DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `log_sinkronisasi_jdihn` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`dokumen_id` bigint(20) unsigned NOT NULL,
	`arah` enum('kirim','perbarui','hapus') NOT NULL DEFAULT '''kirim''',
	`muatan` longtext DEFAULT 'NULL',
	`kode_respons` smallint(5) unsigned DEFAULT 'NULL',
	`pesan_respons` text DEFAULT 'NULL',
	`status` enum('berhasil','gagal') NOT NULL,
	`percobaan_ke` tinyint(3) unsigned NOT NULL DEFAULT 1,
	`durasi_ms` int(10) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`nama_asli` varchar(255) NOT NULL,
	`nama_simpan` varchar(100) NOT NULL,
	`path` varchar(500) NOT NULL,
	`disk` varchar(30) NOT NULL DEFAULT '''lokal''',
	`mime_type` varchar(100) NOT NULL,
	`ukuran_bytes` bigint(20) unsigned NOT NULL,
	`lebar` smallint(5) unsigned DEFAULT 'NULL',
	`tinggi` smallint(5) unsigned DEFAULT 'NULL',
	`teks_alternatif` varchar(255) DEFAULT 'NULL',
	`folder` varchar(100) DEFAULT 'NULL',
	`hash_sha256` char(64) DEFAULT 'NULL',
	`diunggah_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	CONSTRAINT `uq_media_path` UNIQUE(`path`)
);
--> statement-breakpoint
CREATE TABLE `menu` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`kode` varchar(40) NOT NULL,
	`nama` varchar(80) NOT NULL,
	`lokasi` enum('header','footer','sidebar','kaki_kolom_1','kaki_kolom_2') NOT NULL DEFAULT '''header''',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_menu_kode` UNIQUE(`kode`)
);
--> statement-breakpoint
CREATE TABLE `menu_item` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`menu_id` bigint(20) unsigned NOT NULL,
	`induk_id` bigint(20) unsigned DEFAULT 'NULL',
	`label` varchar(100) NOT NULL,
	`tipe_target` enum('beranda','halaman','jenis_peraturan','kategori','berita','url','pencarian') NOT NULL DEFAULT '''url''',
	`target_id` bigint(20) unsigned DEFAULT 'NULL',
	`url` varchar(500) DEFAULT 'NULL',
	`ikon` varchar(60) DEFAULT 'NULL',
	`target_jendela` enum('sama','baru') NOT NULL DEFAULT '''sama''',
	`is_aktif` tinyint(1) NOT NULL DEFAULT 1,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `notifikasi` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`pengguna_id` bigint(20) unsigned NOT NULL,
	`tipe` varchar(50) NOT NULL,
	`judul` varchar(200) NOT NULL,
	`pesan` varchar(500) NOT NULL,
	`tautan` varchar(500) DEFAULT 'NULL',
	`entitas` varchar(60) DEFAULT 'NULL',
	`entitas_id` bigint(20) unsigned DEFAULT 'NULL',
	`dibaca_pada` datetime DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `pengaturan` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`kunci` varchar(100) NOT NULL,
	`nilai` text DEFAULT 'NULL',
	`tipe` enum('teks','angka','boolean','json','berkas','teks_panjang') NOT NULL DEFAULT '''teks''',
	`grup` varchar(40) NOT NULL DEFAULT '''umum''',
	`label` varchar(150) NOT NULL,
	`deskripsi` varchar(255) DEFAULT 'NULL',
	`is_publik` tinyint(1) NOT NULL DEFAULT 0,
	`is_terenkripsi` tinyint(1) NOT NULL DEFAULT 0,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	`diperbarui_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_pengaturan_kunci` UNIQUE(`kunci`)
);
--> statement-breakpoint
CREATE TABLE `pengguna` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`nama_lengkap` varchar(150) NOT NULL,
	`email` varchar(190) NOT NULL,
	`nip_nidn` varchar(30) DEFAULT 'NULL',
	`kata_sandi` varchar(255) NOT NULL,
	`no_telepon` varchar(25) DEFAULT 'NULL',
	`unit_kerja_id` bigint(20) unsigned DEFAULT 'NULL',
	`jabatan` varchar(120) DEFAULT 'NULL',
	`foto` varchar(255) DEFAULT 'NULL',
	`status` enum('menunggu_verifikasi','aktif','nonaktif','ditangguhkan') NOT NULL DEFAULT '''menunggu_verifikasi''',
	`email_terverifikasi_pada` datetime DEFAULT 'NULL',
	`is_2fa_aktif` tinyint(1) NOT NULL DEFAULT 0,
	`rahasia_2fa` varchar(255) DEFAULT 'NULL',
	`kode_pemulihan_2fa` longtext DEFAULT 'NULL',
	`jumlah_gagal_login` tinyint(3) unsigned NOT NULL DEFAULT 0,
	`dikunci_hingga` datetime DEFAULT 'NULL',
	`terakhir_login_pada` datetime DEFAULT 'NULL',
	`terakhir_login_ip` varchar(45) DEFAULT 'NULL',
	`sumber_akun` enum('lokal','sso') NOT NULL DEFAULT '''lokal''',
	`sso_subject` varchar(190) DEFAULT 'NULL',
	`preferensi` longtext DEFAULT 'NULL',
	`diverifikasi_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`diverifikasi_pada` datetime DEFAULT 'NULL',
	`token_ingat` varchar(100) DEFAULT 'NULL',
	`dibuat_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	`dihapus_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_pengguna_email` UNIQUE(`email`),
	CONSTRAINT `uq_pengguna_nip` UNIQUE(`nip_nidn`),
	CONSTRAINT `uq_pengguna_sso` UNIQUE(`sso_subject`)
);
--> statement-breakpoint
CREATE TABLE `pengguna_izin` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`pengguna_id` bigint(20) unsigned NOT NULL,
	`izin_id` bigint(20) unsigned NOT NULL,
	`mode` enum('berikan','cabut') NOT NULL DEFAULT '''berikan''',
	`berlaku_hingga` date DEFAULT 'NULL',
	`alasan` varchar(255) DEFAULT 'NULL',
	`ditetapkan_oleh` bigint(20) unsigned NOT NULL,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	CONSTRAINT `uq_pengguna_izin` UNIQUE(`pengguna_id`,`izin_id`)
);
--> statement-breakpoint
CREATE TABLE `pengguna_peran` (
	`pengguna_id` bigint(20) unsigned NOT NULL,
	`peran_id` bigint(20) unsigned NOT NULL,
	`ditetapkan_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `pengguna_unit_akses` (
	`pengguna_id` bigint(20) unsigned NOT NULL,
	`unit_kerja_id` bigint(20) unsigned NOT NULL,
	`termasuk_bawahan` tinyint(1) NOT NULL DEFAULT 1,
	`ditetapkan_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `peran` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`kode` varchar(40) NOT NULL,
	`nama` varchar(80) NOT NULL,
	`deskripsi` varchar(255) DEFAULT 'NULL',
	`tingkat` tinyint(3) unsigned NOT NULL DEFAULT 9,
	`is_sistem` tinyint(1) NOT NULL DEFAULT 0,
	`is_anonim` tinyint(1) NOT NULL DEFAULT 0,
	`is_wajib_2fa` tinyint(1) NOT NULL DEFAULT 0,
	`is_lingkup_unit` tinyint(1) NOT NULL DEFAULT 0,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_peran_kode` UNIQUE(`kode`),
	CONSTRAINT `uq_peran_nama` UNIQUE(`nama`)
);
--> statement-breakpoint
CREATE TABLE `peran_izin` (
	`peran_id` bigint(20) unsigned NOT NULL,
	`izin_id` bigint(20) unsigned NOT NULL,
	`diberikan_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `permintaan_akses` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`dokumen_id` bigint(20) unsigned NOT NULL,
	`pengguna_id` bigint(20) unsigned NOT NULL,
	`alasan` text NOT NULL,
	`status` enum('menunggu','disetujui','ditolak','kedaluwarsa') NOT NULL DEFAULT '''menunggu''',
	`diputuskan_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`catatan_keputusan` text DEFAULT 'NULL',
	`diputuskan_pada` datetime DEFAULT 'NULL',
	`berlaku_hingga` date DEFAULT 'NULL',
	`kunci_menunggu` varchar(50) GENERATED ALWAYS AS (if(`status` = 'menunggu',concat(`dokumen_id`,'-',`pengguna_id`),NULL)) STORED DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_permintaan_akses_menunggu` UNIQUE(`kunci_menunggu`)
);
--> statement-breakpoint
CREATE TABLE `permintaan_layanan` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`nomor_tiket` varchar(30) NOT NULL,
	`layanan_hukum_id` bigint(20) unsigned NOT NULL,
	`pemohon_id` bigint(20) unsigned NOT NULL,
	`unit_kerja_id` bigint(20) unsigned NOT NULL,
	`judul` varchar(255) NOT NULL,
	`uraian` text NOT NULL,
	`data_formulir` longtext DEFAULT 'NULL',
	`status` enum('baru','ditelaah','butuh_info','selesai','ditolak','dibatalkan') NOT NULL DEFAULT '''baru''',
	`prioritas` enum('rendah','normal','tinggi','segera') NOT NULL DEFAULT '''normal''',
	`ditugaskan_ke` bigint(20) unsigned DEFAULT 'NULL',
	`tenggat` date DEFAULT 'NULL',
	`hasil_telaah` text DEFAULT 'NULL',
	`dokumen_hasil_id` bigint(20) unsigned DEFAULT 'NULL',
	`diselesaikan_pada` datetime DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_permintaan_layanan_tiket` UNIQUE(`nomor_tiket`)
);
--> statement-breakpoint
CREATE TABLE `permintaan_layanan_berkas` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`permintaan_layanan_id` bigint(20) unsigned NOT NULL,
	`jenis` enum('lampiran_pemohon','hasil_telaah','dokumen_pendukung') NOT NULL DEFAULT '''lampiran_pemohon''',
	`nama_asli` varchar(255) NOT NULL,
	`path` varchar(500) NOT NULL,
	`disk` varchar(30) NOT NULL DEFAULT '''lokal''',
	`mime_type` varchar(100) NOT NULL,
	`ukuran_bytes` bigint(20) unsigned NOT NULL,
	`hash_sha256` char(64) NOT NULL,
	`diunggah_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	CONSTRAINT `uq_permintaan_layanan_berkas_path` UNIQUE(`path`)
);
--> statement-breakpoint
CREATE TABLE `permintaan_layanan_log` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`permintaan_layanan_id` bigint(20) unsigned NOT NULL,
	`status_dari` varchar(30) DEFAULT 'NULL',
	`status_ke` varchar(30) NOT NULL,
	`aksi` varchar(50) NOT NULL,
	`catatan` text DEFAULT 'NULL',
	`is_terlihat_pemohon` tinyint(1) NOT NULL DEFAULT 1,
	`oleh_id` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `pesan_kontak` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`nama` varchar(150) NOT NULL,
	`email` varchar(190) NOT NULL,
	`no_telepon` varchar(25) DEFAULT 'NULL',
	`subjek` varchar(255) NOT NULL,
	`pesan` text NOT NULL,
	`status` enum('baru','diproses','selesai','spam') NOT NULL DEFAULT '''baru''',
	`ditangani_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`catatan_penanganan` text DEFAULT 'NULL',
	`ditangani_pada` datetime DEFAULT 'NULL',
	`ip_hash` char(64) NOT NULL,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `status_dokumen` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`kode` varchar(30) NOT NULL,
	`nama` varchar(60) NOT NULL,
	`warna` char(7) NOT NULL DEFAULT '''#6B7280''',
	`deskripsi` varchar(255) DEFAULT 'NULL',
	`is_berlaku_efektif` tinyint(1) NOT NULL DEFAULT 0,
	`is_sistem` tinyint(1) NOT NULL DEFAULT 0,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `uq_status_dokumen_kode` UNIQUE(`kode`)
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`nama` varchar(80) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`jumlah_pakai` int(10) unsigned NOT NULL DEFAULT 0,
	`dibuat_oleh` bigint(20) unsigned DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	CONSTRAINT `uq_tag_nama` UNIQUE(`nama`),
	CONSTRAINT `uq_tag_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `tautan_terkait` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`nama` varchar(150) NOT NULL,
	`url` varchar(500) NOT NULL,
	`logo` varchar(255) DEFAULT 'NULL',
	`kelompok` enum('jdihn','kementerian','perguruan_tinggi','internal','lainnya') NOT NULL DEFAULT '''lainnya''',
	`deskripsi` varchar(255) DEFAULT 'NULL',
	`is_aktif` tinyint(1) NOT NULL DEFAULT 1,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_tautan_terkait_url` UNIQUE(`url`)
);
--> statement-breakpoint
CREATE TABLE `token_reset_sandi` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`pengguna_id` bigint(20) unsigned NOT NULL,
	`token_hash` char(64) NOT NULL,
	`kedaluwarsa_pada` datetime NOT NULL,
	`dipakai_pada` datetime DEFAULT 'NULL',
	`ip_hash` char(64) DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	CONSTRAINT `uq_token_reset_hash` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `unduhan` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`dokumen_id` bigint(20) unsigned NOT NULL,
	`dokumen_berkas_id` bigint(20) unsigned DEFAULT 'NULL',
	`pengguna_id` bigint(20) unsigned DEFAULT 'NULL',
	`peran_saat_unduh` varchar(30) NOT NULL DEFAULT '''pengunjung''',
	`ip_hash` char(64) NOT NULL,
	`agen_ringkas` varchar(150) DEFAULT 'NULL',
	`perujuk` varchar(255) DEFAULT 'NULL',
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `unit_kerja` (
	`id` bigint(20) unsigned AUTO_INCREMENT NOT NULL,
	`kode` varchar(20) NOT NULL,
	`nama` varchar(150) NOT NULL,
	`singkatan` varchar(30) DEFAULT 'NULL',
	`jenis` enum('institut','senat','rektorat','biro','fakultas','jurusan','prodi','lembaga','upt','satuan','unit','eksternal') NOT NULL DEFAULT '''unit''',
	`induk_id` bigint(20) unsigned DEFAULT 'NULL',
	`jalur` varchar(255) NOT NULL DEFAULT '''''',
	`kedalaman` tinyint(3) unsigned NOT NULL DEFAULT 0,
	`kepala_unit` varchar(150) DEFAULT 'NULL',
	`email_unit` varchar(150) DEFAULT 'NULL',
	`is_aktif` tinyint(1) NOT NULL DEFAULT 1,
	`urutan` smallint(5) unsigned NOT NULL DEFAULT 0,
	`dibuat_pada` datetime NOT NULL DEFAULT 'current_timestamp()',
	`diperbarui_pada` datetime DEFAULT 'NULL',
	CONSTRAINT `uq_unit_kerja_kode` UNIQUE(`kode`)
);
--> statement-breakpoint
ALTER TABLE `banner` ADD CONSTRAINT `fk_banner_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `berita` ADD CONSTRAINT `fk_berita_kategori` FOREIGN KEY (`kategori_berita_id`) REFERENCES `kategori_berita`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `berita` ADD CONSTRAINT `fk_berita_penulis` FOREIGN KEY (`penulis_id`) REFERENCES `pengguna`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `berita_dokumen` ADD CONSTRAINT `fk_berita_dokumen_berita` FOREIGN KEY (`berita_id`) REFERENCES `berita`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `berita_dokumen` ADD CONSTRAINT `fk_berita_dokumen_dokumen` FOREIGN KEY (`dokumen_id`) REFERENCES `dokumen`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `berita_tag` ADD CONSTRAINT `fk_berita_tag_berita` FOREIGN KEY (`berita_id`) REFERENCES `berita`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `berita_tag` ADD CONSTRAINT `fk_berita_tag_tag` FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen` ADD CONSTRAINT `fk_dokumen_bidang` FOREIGN KEY (`bidang_hukum_id`) REFERENCES `bidang_hukum`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen` ADD CONSTRAINT `fk_dokumen_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`) REFERENCES `pengguna`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen` ADD CONSTRAINT `fk_dokumen_diperbarui_oleh` FOREIGN KEY (`diperbarui_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen` ADD CONSTRAINT `fk_dokumen_diperiksa_oleh` FOREIGN KEY (`diperiksa_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen` ADD CONSTRAINT `fk_dokumen_diterbitkan_oleh` FOREIGN KEY (`diterbitkan_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen` ADD CONSTRAINT `fk_dokumen_impor` FOREIGN KEY (`impor_batch_id`) REFERENCES `impor_batch`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen` ADD CONSTRAINT `fk_dokumen_jenis` FOREIGN KEY (`jenis_peraturan_id`) REFERENCES `jenis_peraturan`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen` ADD CONSTRAINT `fk_dokumen_status` FOREIGN KEY (`status_dokumen_id`) REFERENCES `status_dokumen`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen` ADD CONSTRAINT `fk_dokumen_unit` FOREIGN KEY (`unit_kerja_id`) REFERENCES `unit_kerja`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_akses` ADD CONSTRAINT `fk_dokumen_akses_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_akses` ADD CONSTRAINT `fk_dokumen_akses_dokumen` FOREIGN KEY (`dokumen_id`) REFERENCES `dokumen`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_alur` ADD CONSTRAINT `fk_dokumen_alur_dasar` FOREIGN KEY (`dokumen_dasar_id`) REFERENCES `dokumen`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_alur` ADD CONSTRAINT `fk_dokumen_alur_dokumen` FOREIGN KEY (`dokumen_id`) REFERENCES `dokumen`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_alur` ADD CONSTRAINT `fk_dokumen_alur_oleh` FOREIGN KEY (`oleh_id`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_berkas` ADD CONSTRAINT `fk_dokumen_berkas_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_berkas` ADD CONSTRAINT `fk_dokumen_berkas_dokumen` FOREIGN KEY (`dokumen_id`) REFERENCES `dokumen`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_kategori` ADD CONSTRAINT `fk_dokumen_kategori_dokumen` FOREIGN KEY (`dokumen_id`) REFERENCES `dokumen`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_kategori` ADD CONSTRAINT `fk_dokumen_kategori_kategori` FOREIGN KEY (`kategori_id`) REFERENCES `kategori`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_relasi` ADD CONSTRAINT `fk_dokumen_relasi_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_relasi` ADD CONSTRAINT `fk_dokumen_relasi_dokumen` FOREIGN KEY (`dokumen_id`) REFERENCES `dokumen`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_relasi` ADD CONSTRAINT `fk_dokumen_relasi_jenis` FOREIGN KEY (`jenis_relasi_id`) REFERENCES `jenis_relasi`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_relasi` ADD CONSTRAINT `fk_dokumen_relasi_terkait` FOREIGN KEY (`dokumen_terkait_id`) REFERENCES `dokumen`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_riwayat` ADD CONSTRAINT `fk_dokumen_riwayat_dokumen` FOREIGN KEY (`dokumen_id`) REFERENCES `dokumen`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_riwayat` ADD CONSTRAINT `fk_dokumen_riwayat_oleh` FOREIGN KEY (`oleh_id`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_statistik_harian` ADD CONSTRAINT `fk_dokumen_statistik_dokumen` FOREIGN KEY (`dokumen_id`) REFERENCES `dokumen`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_tag` ADD CONSTRAINT `fk_dokumen_tag_dokumen` FOREIGN KEY (`dokumen_id`) REFERENCES `dokumen`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `dokumen_tag` ADD CONSTRAINT `fk_dokumen_tag_tag` FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `halaman` ADD CONSTRAINT `fk_halaman_induk` FOREIGN KEY (`induk_id`) REFERENCES `halaman`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `halaman` ADD CONSTRAINT `fk_halaman_penyusun` FOREIGN KEY (`disusun_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `impor_batch` ADD CONSTRAINT `fk_impor_batch_oleh` FOREIGN KEY (`oleh_id`) REFERENCES `pengguna`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `jenis_relasi` ADD CONSTRAINT `fk_jenis_relasi_status_akibat` FOREIGN KEY (`status_akibat_id`) REFERENCES `status_dokumen`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `kategori` ADD CONSTRAINT `fk_kategori_induk` FOREIGN KEY (`induk_id`) REFERENCES `kategori`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `koleksi_pengguna` ADD CONSTRAINT `fk_koleksi_pengguna_dokumen` FOREIGN KEY (`dokumen_id`) REFERENCES `dokumen`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `koleksi_pengguna` ADD CONSTRAINT `fk_koleksi_pengguna_pengguna` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `layanan_hukum` ADD CONSTRAINT `fk_layanan_hukum_unit` FOREIGN KEY (`unit_penanggung_jawab_id`) REFERENCES `unit_kerja`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `log_aktivitas` ADD CONSTRAINT `fk_log_aktivitas_pengguna` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `log_autentikasi` ADD CONSTRAINT `fk_log_autentikasi_pengguna` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `log_pencarian` ADD CONSTRAINT `fk_log_pencarian_pengguna` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `log_sinkronisasi_jdihn` ADD CONSTRAINT `fk_log_sinkronisasi_dokumen` FOREIGN KEY (`dokumen_id`) REFERENCES `dokumen`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `media` ADD CONSTRAINT `fk_media_pengunggah` FOREIGN KEY (`diunggah_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `menu_item` ADD CONSTRAINT `fk_menu_item_induk` FOREIGN KEY (`induk_id`) REFERENCES `menu_item`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `menu_item` ADD CONSTRAINT `fk_menu_item_menu` FOREIGN KEY (`menu_id`) REFERENCES `menu`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `notifikasi` ADD CONSTRAINT `fk_notifikasi_pengguna` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `pengaturan` ADD CONSTRAINT `fk_pengaturan_pengubah` FOREIGN KEY (`diperbarui_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `pengguna` ADD CONSTRAINT `fk_pengguna_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `pengguna` ADD CONSTRAINT `fk_pengguna_diverifikasi_oleh` FOREIGN KEY (`diverifikasi_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `pengguna` ADD CONSTRAINT `fk_pengguna_unit` FOREIGN KEY (`unit_kerja_id`) REFERENCES `unit_kerja`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `pengguna_izin` ADD CONSTRAINT `fk_pengguna_izin_izin` FOREIGN KEY (`izin_id`) REFERENCES `izin`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `pengguna_izin` ADD CONSTRAINT `fk_pengguna_izin_penetap` FOREIGN KEY (`ditetapkan_oleh`) REFERENCES `pengguna`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `pengguna_izin` ADD CONSTRAINT `fk_pengguna_izin_pengguna` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `pengguna_peran` ADD CONSTRAINT `fk_pengguna_peran_penetap` FOREIGN KEY (`ditetapkan_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `pengguna_peran` ADD CONSTRAINT `fk_pengguna_peran_pengguna` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `pengguna_peran` ADD CONSTRAINT `fk_pengguna_peran_peran` FOREIGN KEY (`peran_id`) REFERENCES `peran`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `pengguna_unit_akses` ADD CONSTRAINT `fk_pengguna_unit_akses_penetap` FOREIGN KEY (`ditetapkan_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `pengguna_unit_akses` ADD CONSTRAINT `fk_pengguna_unit_akses_pengguna` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `pengguna_unit_akses` ADD CONSTRAINT `fk_pengguna_unit_akses_unit` FOREIGN KEY (`unit_kerja_id`) REFERENCES `unit_kerja`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `peran_izin` ADD CONSTRAINT `fk_peran_izin_izin` FOREIGN KEY (`izin_id`) REFERENCES `izin`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `peran_izin` ADD CONSTRAINT `fk_peran_izin_pemberi` FOREIGN KEY (`diberikan_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `peran_izin` ADD CONSTRAINT `fk_peran_izin_peran` FOREIGN KEY (`peran_id`) REFERENCES `peran`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `permintaan_akses` ADD CONSTRAINT `fk_permintaan_akses_dokumen` FOREIGN KEY (`dokumen_id`) REFERENCES `dokumen`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `permintaan_akses` ADD CONSTRAINT `fk_permintaan_akses_pemutus` FOREIGN KEY (`diputuskan_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `permintaan_akses` ADD CONSTRAINT `fk_permintaan_akses_pengguna` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `permintaan_layanan` ADD CONSTRAINT `fk_permintaan_layanan_dokumen` FOREIGN KEY (`dokumen_hasil_id`) REFERENCES `dokumen`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `permintaan_layanan` ADD CONSTRAINT `fk_permintaan_layanan_layanan` FOREIGN KEY (`layanan_hukum_id`) REFERENCES `layanan_hukum`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `permintaan_layanan` ADD CONSTRAINT `fk_permintaan_layanan_pemohon` FOREIGN KEY (`pemohon_id`) REFERENCES `pengguna`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `permintaan_layanan` ADD CONSTRAINT `fk_permintaan_layanan_penelaah` FOREIGN KEY (`ditugaskan_ke`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `permintaan_layanan` ADD CONSTRAINT `fk_permintaan_layanan_unit` FOREIGN KEY (`unit_kerja_id`) REFERENCES `unit_kerja`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `permintaan_layanan_berkas` ADD CONSTRAINT `fk_pl_berkas_pengunggah` FOREIGN KEY (`diunggah_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `permintaan_layanan_berkas` ADD CONSTRAINT `fk_pl_berkas_permintaan` FOREIGN KEY (`permintaan_layanan_id`) REFERENCES `permintaan_layanan`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `permintaan_layanan_log` ADD CONSTRAINT `fk_pl_log_oleh` FOREIGN KEY (`oleh_id`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `permintaan_layanan_log` ADD CONSTRAINT `fk_pl_log_permintaan` FOREIGN KEY (`permintaan_layanan_id`) REFERENCES `permintaan_layanan`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `pesan_kontak` ADD CONSTRAINT `fk_pesan_kontak_penangan` FOREIGN KEY (`ditangani_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `tag` ADD CONSTRAINT `fk_tag_dibuat_oleh` FOREIGN KEY (`dibuat_oleh`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `token_reset_sandi` ADD CONSTRAINT `fk_token_reset_pengguna` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `unduhan` ADD CONSTRAINT `fk_unduhan_berkas` FOREIGN KEY (`dokumen_berkas_id`) REFERENCES `dokumen_berkas`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `unduhan` ADD CONSTRAINT `fk_unduhan_dokumen` FOREIGN KEY (`dokumen_id`) REFERENCES `dokumen`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `unduhan` ADD CONSTRAINT `fk_unduhan_pengguna` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `unit_kerja` ADD CONSTRAINT `fk_unit_kerja_induk` FOREIGN KEY (`induk_id`) REFERENCES `unit_kerja`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `idx_banner_tampil` ON `banner` (`is_aktif`,`tanggal_mulai`,`tanggal_selesai`,`urutan`);--> statement-breakpoint
CREATE INDEX `idx_berita_daftar` ON `berita` (`status`,`tipe`,`diterbitkan_pada`,`dihapus_pada`);--> statement-breakpoint
CREATE INDEX `idx_berita_disorot` ON `berita` (`is_disorot`,`diterbitkan_pada`);--> statement-breakpoint
CREATE INDEX `ft_berita_pencarian` ON `berita` (`judul`,`ringkasan`,`isi`);--> statement-breakpoint
CREATE INDEX `idx_berita_dokumen_dokumen` ON `berita_dokumen` (`dokumen_id`);--> statement-breakpoint
CREATE INDEX `idx_berita_tag_tag` ON `berita_tag` (`tag_id`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_daftar_publik` ON `dokumen` (`status_publikasi`,`tingkat_akses`,`dihapus_pada`,`tanggal_penetapan`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_jenis_tahun` ON `dokumen` (`jenis_peraturan_id`,`tahun`,`status_publikasi`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_unit_status` ON `dokumen` (`unit_kerja_id`,`status_publikasi`,`dihapus_pada`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_status_keberlakuan` ON `dokumen` (`status_dokumen_id`,`status_publikasi`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_bidang` ON `dokumen` (`bidang_hukum_id`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_jadwal` ON `dokumen` (`dijadwalkan_terbit_pada`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_sinkron` ON `dokumen` (`sinkron_jdihn`,`tingkat_akses`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_populer` ON `dokumen` (`jumlah_diunduh`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_disorot` ON `dokumen` (`is_disorot`,`diterbitkan_pada`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_diterbitkan` ON `dokumen` (`diterbitkan_pada`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_dibuat_oleh` ON `dokumen` (`dibuat_oleh`);--> statement-breakpoint
CREATE INDEX `ft_dokumen_pencarian` ON `dokumen` (`judul`,`abstrak`,`isi_teks`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_akses_subjek` ON `dokumen_akses` (`subjek_tipe`,`subjek_id`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_alur_dokumen` ON `dokumen_alur` (`dokumen_id`,`konteks`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_berkas_dokumen` ON `dokumen_berkas` (`dokumen_id`,`jenis_berkas`,`is_versi_aktif`,`urutan`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_berkas_hash` ON `dokumen_berkas` (`hash_sha256`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_berkas_ekstraksi` ON `dokumen_berkas` (`status_ekstraksi`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_kategori_kategori` ON `dokumen_kategori` (`kategori_id`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_relasi_terkait` ON `dokumen_relasi` (`dokumen_terkait_id`,`jenis_relasi_id`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_statistik_tanggal` ON `dokumen_statistik_harian` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_dokumen_tag_tag` ON `dokumen_tag` (`tag_id`);--> statement-breakpoint
CREATE INDEX `idx_faq_kelompok` ON `faq` (`kelompok`,`is_aktif`,`urutan`);--> statement-breakpoint
CREATE INDEX `idx_halaman_status` ON `halaman` (`status`,`urutan`);--> statement-breakpoint
CREATE INDEX `idx_halaman_induk` ON `halaman` (`induk_id`);--> statement-breakpoint
CREATE INDEX `idx_impor_batch_status` ON `impor_batch` (`status`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_izin_modul` ON `izin` (`modul`,`urutan`);--> statement-breakpoint
CREATE INDEX `idx_jenis_peraturan_lingkup` ON `jenis_peraturan` (`lingkup`,`is_aktif`,`urutan`);--> statement-breakpoint
CREATE INDEX `idx_kategori_jalur` ON `kategori` (`jalur`);--> statement-breakpoint
CREATE INDEX `idx_kategori_induk` ON `kategori` (`induk_id`);--> statement-breakpoint
CREATE INDEX `idx_kategori_aktif` ON `kategori` (`is_aktif`,`urutan`);--> statement-breakpoint
CREATE INDEX `idx_koleksi_dokumen` ON `koleksi_pengguna` (`dokumen_id`);--> statement-breakpoint
CREATE INDEX `idx_log_aktivitas_entitas` ON `log_aktivitas` (`entitas`,`entitas_id`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_log_aktivitas_pelaku` ON `log_aktivitas` (`pengguna_id`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_log_aktivitas_aksi` ON `log_aktivitas` (`aksi`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_log_aktivitas_waktu` ON `log_aktivitas` (`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_log_autentikasi_email` ON `log_autentikasi` (`email_dicoba`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_log_autentikasi_ip` ON `log_autentikasi` (`ip_hash`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_log_autentikasi_aksi` ON `log_autentikasi` (`aksi`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_log_pencarian_kata` ON `log_pencarian` (`kata_kunci`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_log_pencarian_waktu` ON `log_pencarian` (`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_log_sinkronisasi_dokumen` ON `log_sinkronisasi_jdihn` (`dokumen_id`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_log_sinkronisasi_status` ON `log_sinkronisasi_jdihn` (`status`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_media_folder` ON `media` (`folder`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_media_hash` ON `media` (`hash_sha256`);--> statement-breakpoint
CREATE INDEX `idx_menu_item_susunan` ON `menu_item` (`menu_id`,`induk_id`,`urutan`);--> statement-breakpoint
CREATE INDEX `idx_menu_item_aktif` ON `menu_item` (`is_aktif`);--> statement-breakpoint
CREATE INDEX `idx_notifikasi_penerima` ON `notifikasi` (`pengguna_id`,`dibaca_pada`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_pengaturan_grup` ON `pengaturan` (`grup`,`urutan`);--> statement-breakpoint
CREATE INDEX `idx_pengguna_status_unit` ON `pengguna` (`status`,`unit_kerja_id`);--> statement-breakpoint
CREATE INDEX `idx_pengguna_nama` ON `pengguna` (`nama_lengkap`);--> statement-breakpoint
CREATE INDEX `idx_pengguna_dihapus` ON `pengguna` (`dihapus_pada`);--> statement-breakpoint
CREATE INDEX `idx_pengguna_izin_berlaku` ON `pengguna_izin` (`berlaku_hingga`);--> statement-breakpoint
CREATE INDEX `idx_pengguna_peran_peran` ON `pengguna_peran` (`peran_id`);--> statement-breakpoint
CREATE INDEX `idx_pengguna_unit_akses_unit` ON `pengguna_unit_akses` (`unit_kerja_id`);--> statement-breakpoint
CREATE INDEX `idx_peran_izin_izin` ON `peran_izin` (`izin_id`);--> statement-breakpoint
CREATE INDEX `idx_permintaan_akses_status` ON `permintaan_akses` (`status`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_permintaan_layanan_status` ON `permintaan_layanan` (`status`,`tenggat`);--> statement-breakpoint
CREATE INDEX `idx_permintaan_layanan_pemohon` ON `permintaan_layanan` (`pemohon_id`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_permintaan_layanan_penelaah` ON `permintaan_layanan` (`ditugaskan_ke`,`status`);--> statement-breakpoint
CREATE INDEX `idx_pl_berkas_permintaan` ON `permintaan_layanan_berkas` (`permintaan_layanan_id`,`jenis`);--> statement-breakpoint
CREATE INDEX `idx_pl_log_permintaan` ON `permintaan_layanan_log` (`permintaan_layanan_id`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_pesan_kontak_status` ON `pesan_kontak` (`status`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_pesan_kontak_ip_waktu` ON `pesan_kontak` (`ip_hash`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_pesan_kontak_email` ON `pesan_kontak` (`email`);--> statement-breakpoint
CREATE INDEX `idx_tag_populer` ON `tag` (`jumlah_pakai`);--> statement-breakpoint
CREATE INDEX `idx_tautan_terkait_kelompok` ON `tautan_terkait` (`kelompok`,`is_aktif`,`urutan`);--> statement-breakpoint
CREATE INDEX `idx_token_reset_kedaluwarsa` ON `token_reset_sandi` (`kedaluwarsa_pada`);--> statement-breakpoint
CREATE INDEX `idx_unduhan_dokumen_tanggal` ON `unduhan` (`dokumen_id`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_unduhan_ip_waktu` ON `unduhan` (`ip_hash`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_unduhan_pengguna_waktu` ON `unduhan` (`pengguna_id`,`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_unduhan_waktu` ON `unduhan` (`dibuat_pada`);--> statement-breakpoint
CREATE INDEX `idx_unit_kerja_jalur` ON `unit_kerja` (`jalur`);--> statement-breakpoint
CREATE INDEX `idx_unit_kerja_induk` ON `unit_kerja` (`induk_id`);--> statement-breakpoint
CREATE INDEX `idx_unit_kerja_aktif_jenis` ON `unit_kerja` (`is_aktif`,`jenis`);--> statement-breakpoint
CREATE INDEX `idx_unit_kerja_nama` ON `unit_kerja` (`nama`);--> statement-breakpoint
CREATE ALGORITHM = undefined
SQL SECURITY definer
VIEW `v_dokumen_publik` AS (select `d`.`id` AS `id`,`d`.`kode_dokumen` AS `kode_dokumen`,`d`.`slug` AS `slug`,`d`.`judul` AS `judul`,`d`.`nomor` AS `nomor`,`d`.`nomor_lengkap` AS `nomor_lengkap`,`d`.`tahun` AS `tahun`,`d`.`tanggal_penetapan` AS `tanggal_penetapan`,`d`.`tingkat_akses` AS `tingkat_akses`,`d`.`abstrak` AS `abstrak`,`d`.`jumlah_dilihat` AS `jumlah_dilihat`,`d`.`jumlah_diunduh` AS `jumlah_diunduh`,`d`.`diterbitkan_pada` AS `diterbitkan_pada`,`d`.`is_disorot` AS `is_disorot`,`jp`.`nama` AS `jenis_peraturan`,`jp`.`bentuk_singkat` AS `bentuk_singkat`,`uk`.`nama` AS `unit_kerja`,`uk`.`jalur` AS `unit_jalur`,`sd`.`nama` AS `status_keberlakuan`,`sd`.`warna` AS `status_warna`,`bh`.`nama` AS `bidang_hukum` from ((((`jdih_ith__introspeksi`.`dokumen` `d` join `jdih_ith__introspeksi`.`jenis_peraturan` `jp` on(`jp`.`id` = `d`.`jenis_peraturan_id`)) join `jdih_ith__introspeksi`.`unit_kerja` `uk` on(`uk`.`id` = `d`.`unit_kerja_id`)) join `jdih_ith__introspeksi`.`status_dokumen` `sd` on(`sd`.`id` = `d`.`status_dokumen_id`)) left join `jdih_ith__introspeksi`.`bidang_hukum` `bh` on(`bh`.`id` = `d`.`bidang_hukum_id`)) where `d`.`status_publikasi` = 'terbit' and `d`.`tingkat_akses` <> 'rahasia' and `d`.`dihapus_pada` is null);--> statement-breakpoint
CREATE ALGORITHM = undefined
SQL SECURITY definer
VIEW `v_dokumen_relasi_dua_arah` AS (select `dr`.`dokumen_id` AS `dokumen_id`,`dr`.`dokumen_terkait_id` AS `dokumen_lain_id`,`jr`.`nama` AS `label_relasi`,`jr`.`urutan` AS `urutan`,'aktif' AS `arah`,`dr`.`keterangan` AS `keterangan` from (`jdih_ith__introspeksi`.`dokumen_relasi` `dr` join `jdih_ith__introspeksi`.`jenis_relasi` `jr` on(`jr`.`id` = `dr`.`jenis_relasi_id`)) union all select `dr`.`dokumen_terkait_id` AS `dokumen_id`,`dr`.`dokumen_id` AS `dokumen_lain_id`,`jr`.`nama_kebalikan` AS `label_relasi`,`jr`.`urutan` AS `urutan`,'pasif' AS `arah`,`dr`.`keterangan` AS `keterangan` from (`jdih_ith__introspeksi`.`dokumen_relasi` `dr` join `jdih_ith__introspeksi`.`jenis_relasi` `jr` on(`jr`.`id` = `dr`.`jenis_relasi_id`)) where `jr`.`is_simetris` = 0);--> statement-breakpoint
CREATE ALGORITHM = undefined
SQL SECURITY definer
VIEW `v_rekap_dokumen_unit` AS (select `uk`.`id` AS `unit_kerja_id`,`uk`.`nama` AS `unit_kerja`,`uk`.`jalur` AS `jalur`,count(`d`.`id`) AS `total`,sum(`d`.`status_publikasi` = 'terbit') AS `terbit`,sum(`d`.`status_publikasi` = 'draf') AS `draf`,sum(`d`.`status_publikasi` = 'diajukan') AS `menunggu_verifikasi`,sum(`d`.`status_publikasi` = 'revisi') AS `perlu_revisi`,sum(`d`.`tingkat_akses` = 'publik' and `d`.`status_publikasi` = 'terbit') AS `publik`,sum(`d`.`jumlah_diunduh`) AS `total_unduhan` from (`jdih_ith__introspeksi`.`unit_kerja` `uk` left join `jdih_ith__introspeksi`.`dokumen` `d` on(`d`.`unit_kerja_id` = `uk`.`id` and `d`.`dihapus_pada` is null)) group by `uk`.`id`,`uk`.`nama`,`uk`.`jalur`);
*/