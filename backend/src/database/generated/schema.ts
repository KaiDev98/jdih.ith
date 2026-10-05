import { mysqlTable, mysqlSchema, AnyMySqlColumn, index, foreignKey, varchar, date, smallint, datetime, unique, mysqlEnum, longtext, int, char, mediumtext, text, mysqlView, decimal, bigint, tinyint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const banner = mysqlTable("banner", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	judul: varchar({ length: 200 }).notNull(),
	subjudul: varchar({ length: 300 }),
	gambar: varchar({ length: 255 }).notNull(),
	gambarSeluler: varchar("gambar_seluler", { length: 255 }),
	tautan: varchar({ length: 500 }),
	labelTombol: varchar("label_tombol", { length: 50 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	tanggalMulai: date("tanggal_mulai", { mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	tanggalSelesai: date("tanggal_selesai", { mode: 'string' }),
	isAktif: tinyint("is_aktif").default(1).notNull(),
	urutan: smallint().notNull(),
	dibuatOleh: bigint("dibuat_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	index("idx_banner_tampil").on(table.isAktif, table.tanggalMulai, table.tanggalSelesai, table.urutan),
]);

export const berita = mysqlTable("berita", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	judul: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 275 }).notNull(),
	tipe: mysqlEnum(['berita','artikel_hukum','pengumuman','siaran_pers']).default('berita').notNull(),
	kategoriBeritaId: bigint("kategori_berita_id", { mode: "number" }).references(() => kategoriBerita.id, { onDelete: "set null", onUpdate: "cascade" } ),
	ringkasan: varchar({ length: 500 }),
	isi: longtext().notNull(),
	gambarUtama: varchar("gambar_utama", { length: 255 }),
	sumber: varchar({ length: 255 }),
	penulisId: bigint("penulis_id", { mode: "number" }).notNull().references(() => pengguna.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	penulisNamaTampil: varchar("penulis_nama_tampil", { length: 150 }),
	status: mysqlEnum(['draf','ditinjau','terbit','arsip']).default('draf').notNull(),
	diterbitkanPada: datetime("diterbitkan_pada", { mode: 'string'}),
	jumlahDilihat: int("jumlah_dilihat").default(0).notNull(),
	isDisorot: tinyint("is_disorot").default(0).notNull(),
	metaJudul: varchar("meta_judul", { length: 255 }),
	metaDeskripsi: varchar("meta_deskripsi", { length: 500 }),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
	dihapusPada: datetime("dihapus_pada", { mode: 'string'}),
},
(table) => [
	index("idx_berita_daftar").on(table.status, table.tipe, table.diterbitkanPada, table.dihapusPada),
	index("idx_berita_disorot").on(table.isDisorot, table.diterbitkanPada),
	index("ft_berita_pencarian").on(table.judul, table.ringkasan, table.isi),
	unique("uq_berita_slug").on(table.slug),
]);

export const beritaDokumen = mysqlTable("berita_dokumen", {
	beritaId: bigint("berita_id", { mode: "number" }).notNull().references(() => berita.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	dokumenId: bigint("dokumen_id", { mode: "number" }).notNull().references(() => dokumen.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	keterangan: varchar({ length: 255 }),
},
(table) => [
	index("idx_berita_dokumen_dokumen").on(table.dokumenId),
]);

export const beritaTag = mysqlTable("berita_tag", {
	beritaId: bigint("berita_id", { mode: "number" }).notNull().references(() => berita.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	tagId: bigint("tag_id", { mode: "number" }).notNull().references(() => tag.id, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => [
	index("idx_berita_tag_tag").on(table.tagId),
]);

export const bidangHukum = mysqlTable("bidang_hukum", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	kode: varchar({ length: 30 }).notNull(),
	nama: varchar({ length: 120 }).notNull(),
	deskripsi: varchar({ length: 255 }),
	isAktif: tinyint("is_aktif").default(1).notNull(),
	urutan: smallint().notNull(),
},
(table) => [
	unique("uq_bidang_hukum_kode").on(table.kode),
	unique("uq_bidang_hukum_nama").on(table.nama),
]);

export const dokumen = mysqlTable("dokumen", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	kodeDokumen: varchar("kode_dokumen", { length: 30 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	jenisPeraturanId: bigint("jenis_peraturan_id", { mode: "number" }).notNull().references(() => jenisPeraturan.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	nomor: varchar({ length: 100 }).notNull(),
	nomorNormal: varchar("nomor_normal", { length: 100 }).generatedAlwaysAs(sql`ucase(trim(regexp_replace(\`nomor\`,'[[:space:]]+',' ')))`, { mode: "stored" }),
	nomorLengkap: varchar("nomor_lengkap", { length: 255 }),
	tahun: smallint().notNull(),
	judul: varchar({ length: 500 }).notNull(),
	judulSingkat: varchar("judul_singkat", { length: 255 }),
	teu: varchar({ length: 500 }),
	teuManual: tinyint("teu_manual").default(0).notNull(),
	tempatPenetapan: varchar("tempat_penetapan", { length: 100 }).default('Parepare').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	tanggalPenetapan: date("tanggal_penetapan", { mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	tanggalPengundangan: date("tanggal_pengundangan", { mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	tanggalBerlaku: date("tanggal_berlaku", { mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	tanggalBerakhir: date("tanggal_berakhir", { mode: 'string' }),
	penerbit: varchar({ length: 255 }).default('Institut Teknologi Bacharuddin Jusuf Habibie').notNull(),
	penandatangan: varchar({ length: 255 }),
	jabatanPenandatangan: varchar("jabatan_penandatangan", { length: 150 }),
	sumber: varchar({ length: 255 }),
	unitKerjaId: bigint("unit_kerja_id", { mode: "number" }).notNull().references(() => unitKerja.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	bidangHukumId: bigint("bidang_hukum_id", { mode: "number" }).references(() => bidangHukum.id, { onDelete: "set null", onUpdate: "cascade" } ),
	statusDokumenId: bigint("status_dokumen_id", { mode: "number" }).notNull().references(() => statusDokumen.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	lingkup: mysqlEnum(['internal','eksternal']).default('internal').notNull(),
	tingkatAkses: mysqlEnum("tingkat_akses", ['publik','internal','terbatas','rahasia']).default('publik').notNull(),
	statusPublikasi: mysqlEnum("status_publikasi", ['draf','diajukan','revisi','disetujui','terbit','ditarik']).default('draf').notNull(),
	bahasa: char({ length: 2 }).default('id').notNull(),
	deskripsiFisik: varchar("deskripsi_fisik", { length: 255 }),
	nomorPanggil: varchar("nomor_panggil", { length: 50 }),
	lokasiArsip: varchar("lokasi_arsip", { length: 255 }),
	abstrak: mediumtext(),
	catatan: text(),
	isiTeks: longtext("isi_teks"),
	jumlahDilihat: int("jumlah_dilihat").default(0).notNull(),
	jumlahDiunduh: int("jumlah_diunduh").default(0).notNull(),
	isDisorot: tinyint("is_disorot").default(0).notNull(),
	diterbitkanPada: datetime("diterbitkan_pada", { mode: 'string'}),
	dijadwalkanTerbitPada: datetime("dijadwalkan_terbit_pada", { mode: 'string'}),
	catatanRevisi: text("catatan_revisi"),
	sinkronJdihn: mysqlEnum("sinkron_jdihn", ['belum','tertunda','terkirim','gagal']).default('belum').notNull(),
	jdihnId: varchar("jdihn_id", { length: 64 }),
	disinkronPada: datetime("disinkron_pada", { mode: 'string'}),
	imporBatchId: bigint("impor_batch_id", { mode: "number" }).references(() => imporBatch.id, { onDelete: "set null", onUpdate: "cascade" } ),
	versi: int().default(1).notNull(),
	dibuatOleh: bigint("dibuat_oleh", { mode: "number" }).notNull().references(() => pengguna.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	diperiksaOleh: bigint("diperiksa_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	diterbitkanOleh: bigint("diterbitkan_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	diperbaruiOleh: bigint("diperbarui_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
	dihapusPada: datetime("dihapus_pada", { mode: 'string'}),
},
(table) => [
	index("idx_dokumen_daftar_publik").on(table.statusPublikasi, table.tingkatAkses, table.dihapusPada, table.tanggalPenetapan),
	index("idx_dokumen_jenis_tahun").on(table.jenisPeraturanId, table.tahun, table.statusPublikasi),
	index("idx_dokumen_unit_status").on(table.unitKerjaId, table.statusPublikasi, table.dihapusPada),
	index("idx_dokumen_status_keberlakuan").on(table.statusDokumenId, table.statusPublikasi),
	index("idx_dokumen_bidang").on(table.bidangHukumId),
	index("idx_dokumen_jadwal").on(table.dijadwalkanTerbitPada),
	index("idx_dokumen_sinkron").on(table.sinkronJdihn, table.tingkatAkses),
	index("idx_dokumen_populer").on(table.jumlahDiunduh),
	index("idx_dokumen_disorot").on(table.isDisorot, table.diterbitkanPada),
	index("idx_dokumen_diterbitkan").on(table.diterbitkanPada),
	index("idx_dokumen_dibuat_oleh").on(table.dibuatOleh),
	index("ft_dokumen_pencarian").on(table.judul, table.abstrak, table.isiTeks),
	unique("uq_dokumen_kode").on(table.kodeDokumen),
	unique("uq_dokumen_slug").on(table.slug),
	unique("uq_dokumen_identitas").on(table.jenisPeraturanId, table.nomorNormal, table.tahun, table.unitKerjaId),
]);

export const dokumenAkses = mysqlTable("dokumen_akses", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	dokumenId: bigint("dokumen_id", { mode: "number" }).notNull().references(() => dokumen.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	subjekTipe: mysqlEnum("subjek_tipe", ['peran','unit_kerja','pengguna']).notNull(),
	subjekId: bigint("subjek_id", { mode: "number" }).notNull(),
	izin: mysqlEnum(['lihat','unduh']).default('unduh').notNull(),
	dibuatOleh: bigint("dibuat_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_dokumen_akses_subjek").on(table.subjekTipe, table.subjekId),
	unique("uq_dokumen_akses").on(table.dokumenId, table.subjekTipe, table.subjekId, table.izin),
]);

export const dokumenAlur = mysqlTable("dokumen_alur", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	dokumenId: bigint("dokumen_id", { mode: "number" }).notNull().references(() => dokumen.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	konteks: mysqlEnum(['publikasi','keberlakuan']).default('publikasi').notNull(),
	statusDari: varchar("status_dari", { length: 40 }),
	statusKe: varchar("status_ke", { length: 40 }).notNull(),
	aksi: varchar({ length: 50 }).notNull(),
	catatan: text(),
	dokumenDasarId: bigint("dokumen_dasar_id", { mode: "number" }).references(() => dokumen.id, { onDelete: "set null", onUpdate: "cascade" } ),
	olehId: bigint("oleh_id", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	olehSistem: tinyint("oleh_sistem").default(0).notNull(),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_dokumen_alur_dokumen").on(table.dokumenId, table.konteks, table.dibuatPada),
]);

export const dokumenBerkas = mysqlTable("dokumen_berkas", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	dokumenId: bigint("dokumen_id", { mode: "number" }).notNull().references(() => dokumen.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	jenisBerkas: mysqlEnum("jenis_berkas", ['dokumen_utama','lampiran','abstrak','naskah_akademik','terjemahan','dokumen_pencabut']).default('dokumen_utama').notNull(),
	namaAsli: varchar("nama_asli", { length: 255 }).notNull(),
	namaSimpan: varchar("nama_simpan", { length: 100 }).notNull(),
	path: varchar({ length: 500 }).notNull(),
	disk: varchar({ length: 30 }).default('lokal').notNull(),
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	ukuranBytes: bigint("ukuran_bytes", { mode: "number" }).notNull(),
	jumlahHalaman: smallint("jumlah_halaman"),
	hashSha256: char("hash_sha256", { length: 64 }).notNull(),
	urutan: smallint().notNull(),
	isPublik: tinyint("is_publik").default(1).notNull(),
	isPratinjau: tinyint("is_pratinjau").default(1).notNull(),
	isVersiAktif: tinyint("is_versi_aktif").default(1).notNull(),
	jumlahDiunduh: int("jumlah_diunduh").default(0).notNull(),
	statusEkstraksi: mysqlEnum("status_ekstraksi", ['menunggu','berhasil','gagal','tidak_perlu']).default('menunggu').notNull(),
	keterangan: varchar({ length: 255 }),
	dibuatOleh: bigint("dibuat_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	index("idx_dokumen_berkas_dokumen").on(table.dokumenId, table.jenisBerkas, table.isVersiAktif, table.urutan),
	index("idx_dokumen_berkas_hash").on(table.hashSha256),
	index("idx_dokumen_berkas_ekstraksi").on(table.statusEkstraksi),
	unique("uq_dokumen_berkas_path").on(table.path),
]);

export const dokumenKategori = mysqlTable("dokumen_kategori", {
	dokumenId: bigint("dokumen_id", { mode: "number" }).notNull().references(() => dokumen.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	kategoriId: bigint("kategori_id", { mode: "number" }).notNull().references(() => kategori.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	isUtama: tinyint("is_utama").default(0).notNull(),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_dokumen_kategori_kategori").on(table.kategoriId),
]);

export const dokumenRelasi = mysqlTable("dokumen_relasi", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	dokumenId: bigint("dokumen_id", { mode: "number" }).notNull().references(() => dokumen.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	dokumenTerkaitId: bigint("dokumen_terkait_id", { mode: "number" }).notNull().references(() => dokumen.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	jenisRelasiId: bigint("jenis_relasi_id", { mode: "number" }).notNull().references(() => jenisRelasi.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	keterangan: varchar({ length: 500 }),
	dibuatOleh: bigint("dibuat_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_dokumen_relasi_terkait").on(table.dokumenTerkaitId, table.jenisRelasiId),
	unique("uq_dokumen_relasi").on(table.dokumenId, table.dokumenTerkaitId, table.jenisRelasiId),
]);

export const dokumenRiwayat = mysqlTable("dokumen_riwayat", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	dokumenId: bigint("dokumen_id", { mode: "number" }).notNull().references(() => dokumen.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	versi: int().notNull(),
	cuplikanMetadata: longtext("cuplikan_metadata").notNull(),
	cuplikanBerkas: longtext("cuplikan_berkas"),
	ringkasanPerubahan: varchar("ringkasan_perubahan", { length: 500 }),
	olehId: bigint("oleh_id", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	unique("uq_dokumen_riwayat_versi").on(table.dokumenId, table.versi),
]);

export const dokumenStatistikHarian = mysqlTable("dokumen_statistik_harian", {
	dokumenId: bigint("dokumen_id", { mode: "number" }).notNull().references(() => dokumen.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	tanggal: date({ mode: 'string' }).notNull(),
	jumlahDilihat: int("jumlah_dilihat").default(0).notNull(),
	jumlahDiunduh: int("jumlah_diunduh").default(0).notNull(),
	jumlahDilihatAnonim: int("jumlah_dilihat_anonim").default(0).notNull(),
	jumlahDiunduhAnonim: int("jumlah_diunduh_anonim").default(0).notNull(),
},
(table) => [
	index("idx_dokumen_statistik_tanggal").on(table.tanggal),
]);

export const dokumenTag = mysqlTable("dokumen_tag", {
	dokumenId: bigint("dokumen_id", { mode: "number" }).notNull().references(() => dokumen.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	tagId: bigint("tag_id", { mode: "number" }).notNull().references(() => tag.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_dokumen_tag_tag").on(table.tagId),
]);

export const faq = mysqlTable("faq", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	pertanyaan: varchar({ length: 500 }).notNull(),
	jawaban: text().notNull(),
	kelompok: varchar({ length: 60 }),
	isAktif: tinyint("is_aktif").default(1).notNull(),
	urutan: smallint().notNull(),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	index("idx_faq_kelompok").on(table.kelompok, table.isAktif, table.urutan),
]);

export const halaman = mysqlTable("halaman", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	judul: varchar({ length: 200 }).notNull(),
	slug: varchar({ length: 220 }).notNull(),
	isi: longtext(),
	indukId: bigint("induk_id", { mode: "number" }),
	templat: varchar({ length: 50 }).default('baku').notNull(),
	status: mysqlEnum(['draf','terbit']).default('draf').notNull(),
	isSistem: tinyint("is_sistem").default(0).notNull(),
	urutan: smallint().notNull(),
	metaJudul: varchar("meta_judul", { length: 255 }),
	metaDeskripsi: varchar("meta_deskripsi", { length: 500 }),
	disusunOleh: bigint("disusun_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	index("idx_halaman_status").on(table.status, table.urutan),
	index("idx_halaman_induk").on(table.indukId),
	foreignKey({
			columns: [table.indukId],
			foreignColumns: [table.id],
			name: "fk_halaman_induk"
		}).onUpdate("cascade").onDelete("restrict"),
	unique("uq_halaman_slug").on(table.slug),
]);

export const imporBatch = mysqlTable("impor_batch", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	namaBerkas: varchar("nama_berkas", { length: 255 }).notNull(),
	path: varchar({ length: 500 }).notNull(),
	mode: mysqlEnum(['buat','perbarui']).default('buat').notNull(),
	totalBaris: int("total_baris").default(0).notNull(),
	jumlahBerhasil: int("jumlah_berhasil").default(0).notNull(),
	jumlahGagal: int("jumlah_gagal").default(0).notNull(),
	barisTerakhir: int("baris_terakhir").default(0).notNull(),
	status: mysqlEnum(['pravalidasi','menunggu','berjalan','selesai','gagal','dibatalkan']).default('pravalidasi').notNull(),
	laporan: longtext(),
	olehId: bigint("oleh_id", { mode: "number" }).notNull().references(() => pengguna.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
	selesaiPada: datetime("selesai_pada", { mode: 'string'}),
},
(table) => [
	index("idx_impor_batch_status").on(table.status, table.dibuatPada),
]);

export const izin = mysqlTable("izin", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	kode: varchar({ length: 60 }).notNull(),
	nama: varchar({ length: 120 }).notNull(),
	modul: varchar({ length: 40 }).notNull(),
	deskripsi: varchar({ length: 255 }),
	isBerdampakTinggi: tinyint("is_berdampak_tinggi").default(0).notNull(),
	isSistem: tinyint("is_sistem").default(1).notNull(),
	urutan: smallint().notNull(),
},
(table) => [
	index("idx_izin_modul").on(table.modul, table.urutan),
	unique("uq_izin_kode").on(table.kode),
]);

export const jenisPeraturan = mysqlTable("jenis_peraturan", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	kode: varchar({ length: 30 }).notNull(),
	nama: varchar({ length: 120 }).notNull(),
	bentukSingkat: varchar("bentuk_singkat", { length: 40 }),
	lingkup: mysqlEnum(['internal','eksternal']).default('internal').notNull(),
	tingkatHierarki: tinyint("tingkat_hierarki").default(50).notNull(),
	lingkupPenomoran: mysqlEnum("lingkup_penomoran", ['institut','unit']).default('institut').notNull(),
	polaNomor: varchar("pola_nomor", { length: 100 }),
	deskripsi: varchar({ length: 255 }),
	isAktif: tinyint("is_aktif").default(1).notNull(),
	urutan: smallint().notNull(),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	index("idx_jenis_peraturan_lingkup").on(table.lingkup, table.isAktif, table.urutan),
	unique("uq_jenis_peraturan_kode").on(table.kode),
	unique("uq_jenis_peraturan_nama").on(table.nama),
]);

export const jenisRelasi = mysqlTable("jenis_relasi", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	kode: varchar({ length: 40 }).notNull(),
	nama: varchar({ length: 80 }).notNull(),
	namaKebalikan: varchar("nama_kebalikan", { length: 80 }).notNull(),
	kodeKebalikan: varchar("kode_kebalikan", { length: 40 }),
	isSimetris: tinyint("is_simetris").default(0).notNull(),
	isMengubahStatus: tinyint("is_mengubah_status").default(0).notNull(),
	statusAkibatId: bigint("status_akibat_id", { mode: "number" }).references(() => statusDokumen.id, { onDelete: "set null", onUpdate: "cascade" } ),
	isSistem: tinyint("is_sistem").default(0).notNull(),
	urutan: smallint().notNull(),
},
(table) => [
	unique("uq_jenis_relasi_kode").on(table.kode),
]);

export const kategori = mysqlTable("kategori", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	kode: varchar({ length: 30 }).notNull(),
	nama: varchar({ length: 120 }).notNull(),
	slug: varchar({ length: 140 }).notNull(),
	indukId: bigint("induk_id", { mode: "number" }),
	jalur: varchar({ length: 255 }).default('\'').notNull(),
	kedalaman: tinyint().default(0).notNull(),
	deskripsi: varchar({ length: 255 }),
	ikon: varchar({ length: 60 }),
	jumlahDokumen: int("jumlah_dokumen").default(0).notNull(),
	isAktif: tinyint("is_aktif").default(1).notNull(),
	urutan: smallint().notNull(),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	index("idx_kategori_jalur").on(table.jalur),
	index("idx_kategori_induk").on(table.indukId),
	index("idx_kategori_aktif").on(table.isAktif, table.urutan),
	foreignKey({
			columns: [table.indukId],
			foreignColumns: [table.id],
			name: "fk_kategori_induk"
		}).onUpdate("cascade").onDelete("restrict"),
	unique("uq_kategori_kode").on(table.kode),
	unique("uq_kategori_slug").on(table.slug),
]);

export const kategoriBerita = mysqlTable("kategori_berita", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	nama: varchar({ length: 100 }).notNull(),
	slug: varchar({ length: 120 }).notNull(),
	deskripsi: varchar({ length: 255 }),
	isAktif: tinyint("is_aktif").default(1).notNull(),
	urutan: smallint().notNull(),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	unique("uq_kategori_berita_nama").on(table.nama),
	unique("uq_kategori_berita_slug").on(table.slug),
]);

export const koleksiPengguna = mysqlTable("koleksi_pengguna", {
	penggunaId: bigint("pengguna_id", { mode: "number" }).notNull().references(() => pengguna.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	dokumenId: bigint("dokumen_id", { mode: "number" }).notNull().references(() => dokumen.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	catatan: varchar({ length: 255 }),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_koleksi_dokumen").on(table.dokumenId),
]);

export const layananHukum = mysqlTable("layanan_hukum", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	kode: varchar({ length: 30 }).notNull(),
	nama: varchar({ length: 150 }).notNull(),
	deskripsi: text(),
	slaHari: smallint("sla_hari").default(14).notNull(),
	definisiFormulir: longtext("definisi_formulir"),
	unitPenanggungJawabId: bigint("unit_penanggung_jawab_id", { mode: "number" }).references(() => unitKerja.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	isAktif: tinyint("is_aktif").default(1).notNull(),
	urutan: smallint().notNull(),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	unique("uq_layanan_hukum_kode").on(table.kode),
]);

export const logAktivitas = mysqlTable("log_aktivitas", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	penggunaId: bigint("pengguna_id", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	pelakuNama: varchar("pelaku_nama", { length: 150 }),
	peranSaatItu: varchar("peran_saat_itu", { length: 40 }),
	aksi: varchar({ length: 50 }).notNull(),
	entitas: varchar({ length: 60 }).notNull(),
	entitasId: bigint("entitas_id", { mode: "number" }),
	deskripsi: varchar({ length: 500 }),
	dataLama: longtext("data_lama"),
	dataBaru: longtext("data_baru"),
	ipHash: char("ip_hash", { length: 64 }),
	agenRingkas: varchar("agen_ringkas", { length: 150 }),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_log_aktivitas_entitas").on(table.entitas, table.entitasId, table.dibuatPada),
	index("idx_log_aktivitas_pelaku").on(table.penggunaId, table.dibuatPada),
	index("idx_log_aktivitas_aksi").on(table.aksi, table.dibuatPada),
	index("idx_log_aktivitas_waktu").on(table.dibuatPada),
]);

export const logAutentikasi = mysqlTable("log_autentikasi", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	penggunaId: bigint("pengguna_id", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	emailDicoba: varchar("email_dicoba", { length: 190 }),
	aksi: mysqlEnum(['login_berhasil','login_gagal','logout','terkunci','reset_diminta','reset_berhasil','2fa_gagal','2fa_berhasil']).notNull(),
	keterangan: varchar({ length: 255 }),
	ipHash: char("ip_hash", { length: 64 }).notNull(),
	agenRingkas: varchar("agen_ringkas", { length: 150 }),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_log_autentikasi_email").on(table.emailDicoba, table.dibuatPada),
	index("idx_log_autentikasi_ip").on(table.ipHash, table.dibuatPada),
	index("idx_log_autentikasi_aksi").on(table.aksi, table.dibuatPada),
]);

export const logPencarian = mysqlTable("log_pencarian", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	kataKunci: varchar("kata_kunci", { length: 255 }),
	filter: longtext(),
	jumlahHasil: int("jumlah_hasil").default(0).notNull(),
	penggunaId: bigint("pengguna_id", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	ipHash: char("ip_hash", { length: 64 }),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_log_pencarian_kata").on(table.kataKunci, table.dibuatPada),
	index("idx_log_pencarian_waktu").on(table.dibuatPada),
]);

export const logSinkronisasiJdihn = mysqlTable("log_sinkronisasi_jdihn", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	dokumenId: bigint("dokumen_id", { mode: "number" }).notNull().references(() => dokumen.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	arah: mysqlEnum(['kirim','perbarui','hapus']).default('kirim').notNull(),
	muatan: longtext(),
	kodeRespons: smallint("kode_respons"),
	pesanRespons: text("pesan_respons"),
	status: mysqlEnum(['berhasil','gagal']).notNull(),
	percobaanKe: tinyint("percobaan_ke").default(1).notNull(),
	durasiMs: int("durasi_ms"),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_log_sinkronisasi_dokumen").on(table.dokumenId, table.dibuatPada),
	index("idx_log_sinkronisasi_status").on(table.status, table.dibuatPada),
]);

export const media = mysqlTable("media", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	namaAsli: varchar("nama_asli", { length: 255 }).notNull(),
	namaSimpan: varchar("nama_simpan", { length: 100 }).notNull(),
	path: varchar({ length: 500 }).notNull(),
	disk: varchar({ length: 30 }).default('lokal').notNull(),
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	ukuranBytes: bigint("ukuran_bytes", { mode: "number" }).notNull(),
	lebar: smallint(),
	tinggi: smallint(),
	teksAlternatif: varchar("teks_alternatif", { length: 255 }),
	folder: varchar({ length: 100 }),
	hashSha256: char("hash_sha256", { length: 64 }),
	diunggahOleh: bigint("diunggah_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_media_folder").on(table.folder, table.dibuatPada),
	index("idx_media_hash").on(table.hashSha256),
	unique("uq_media_path").on(table.path),
]);

export const menu = mysqlTable("menu", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	kode: varchar({ length: 40 }).notNull(),
	nama: varchar({ length: 80 }).notNull(),
	lokasi: mysqlEnum(['header','footer','sidebar','kaki_kolom_1','kaki_kolom_2']).default('header').notNull(),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	unique("uq_menu_kode").on(table.kode),
]);

export const menuItem = mysqlTable("menu_item", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	menuId: bigint("menu_id", { mode: "number" }).notNull().references(() => menu.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	indukId: bigint("induk_id", { mode: "number" }),
	label: varchar({ length: 100 }).notNull(),
	tipeTarget: mysqlEnum("tipe_target", ['beranda','halaman','jenis_peraturan','kategori','berita','url','pencarian']).default('url').notNull(),
	targetId: bigint("target_id", { mode: "number" }),
	url: varchar({ length: 500 }),
	ikon: varchar({ length: 60 }),
	targetJendela: mysqlEnum("target_jendela", ['sama','baru']).default('sama').notNull(),
	isAktif: tinyint("is_aktif").default(1).notNull(),
	urutan: smallint().notNull(),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	index("idx_menu_item_susunan").on(table.menuId, table.indukId, table.urutan),
	index("idx_menu_item_aktif").on(table.isAktif),
	foreignKey({
			columns: [table.indukId],
			foreignColumns: [table.id],
			name: "fk_menu_item_induk"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const notifikasi = mysqlTable("notifikasi", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	penggunaId: bigint("pengguna_id", { mode: "number" }).notNull().references(() => pengguna.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	tipe: varchar({ length: 50 }).notNull(),
	judul: varchar({ length: 200 }).notNull(),
	pesan: varchar({ length: 500 }).notNull(),
	tautan: varchar({ length: 500 }),
	entitas: varchar({ length: 60 }),
	entitasId: bigint("entitas_id", { mode: "number" }),
	dibacaPada: datetime("dibaca_pada", { mode: 'string'}),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_notifikasi_penerima").on(table.penggunaId, table.dibacaPada, table.dibuatPada),
]);

export const pengaturan = mysqlTable("pengaturan", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	kunci: varchar({ length: 100 }).notNull(),
	nilai: text(),
	tipe: mysqlEnum(['teks','angka','boolean','json','berkas','teks_panjang']).default('teks').notNull(),
	grup: varchar({ length: 40 }).default('umum').notNull(),
	label: varchar({ length: 150 }).notNull(),
	deskripsi: varchar({ length: 255 }),
	isPublik: tinyint("is_publik").default(0).notNull(),
	isTerenkripsi: tinyint("is_terenkripsi").default(0).notNull(),
	urutan: smallint().notNull(),
	diperbaruiOleh: bigint("diperbarui_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	index("idx_pengaturan_grup").on(table.grup, table.urutan),
	unique("uq_pengaturan_kunci").on(table.kunci),
]);

export const pengguna = mysqlTable("pengguna", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	namaLengkap: varchar("nama_lengkap", { length: 150 }).notNull(),
	email: varchar({ length: 190 }).notNull(),
	nipNidn: varchar("nip_nidn", { length: 30 }),
	kataSandi: varchar("kata_sandi", { length: 255 }).notNull(),
	noTelepon: varchar("no_telepon", { length: 25 }),
	unitKerjaId: bigint("unit_kerja_id", { mode: "number" }).references(() => unitKerja.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	jabatan: varchar({ length: 120 }),
	foto: varchar({ length: 255 }),
	status: mysqlEnum(['menunggu_verifikasi','aktif','nonaktif','ditangguhkan']).default('menunggu_verifikasi').notNull(),
	emailTerverifikasiPada: datetime("email_terverifikasi_pada", { mode: 'string'}),
	is2FaAktif: tinyint("is_2fa_aktif").default(0).notNull(),
	rahasia2Fa: varchar("rahasia_2fa", { length: 255 }),
	kodePemulihan2Fa: longtext("kode_pemulihan_2fa"),
	jumlahGagalLogin: tinyint("jumlah_gagal_login").default(0).notNull(),
	dikunciHingga: datetime("dikunci_hingga", { mode: 'string'}),
	terakhirLoginPada: datetime("terakhir_login_pada", { mode: 'string'}),
	terakhirLoginIp: varchar("terakhir_login_ip", { length: 45 }),
	sumberAkun: mysqlEnum("sumber_akun", ['lokal','sso']).default('lokal').notNull(),
	ssoSubject: varchar("sso_subject", { length: 190 }),
	preferensi: longtext(),
	diverifikasiOleh: bigint("diverifikasi_oleh", { mode: "number" }),
	diverifikasiPada: datetime("diverifikasi_pada", { mode: 'string'}),
	tokenIngat: varchar("token_ingat", { length: 100 }),
	dibuatOleh: bigint("dibuat_oleh", { mode: "number" }),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
	dihapusPada: datetime("dihapus_pada", { mode: 'string'}),
},
(table) => [
	index("idx_pengguna_status_unit").on(table.status, table.unitKerjaId),
	index("idx_pengguna_nama").on(table.namaLengkap),
	index("idx_pengguna_dihapus").on(table.dihapusPada),
	foreignKey({
			columns: [table.dibuatOleh],
			foreignColumns: [table.id],
			name: "fk_pengguna_dibuat_oleh"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.diverifikasiOleh],
			foreignColumns: [table.id],
			name: "fk_pengguna_diverifikasi_oleh"
		}).onUpdate("cascade").onDelete("set null"),
	unique("uq_pengguna_email").on(table.email),
	unique("uq_pengguna_nip").on(table.nipNidn),
	unique("uq_pengguna_sso").on(table.ssoSubject),
]);

export const penggunaIzin = mysqlTable("pengguna_izin", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	penggunaId: bigint("pengguna_id", { mode: "number" }).notNull().references(() => pengguna.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	izinId: bigint("izin_id", { mode: "number" }).notNull().references(() => izin.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	mode: mysqlEnum(['berikan','cabut']).default('berikan').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	berlakuHingga: date("berlaku_hingga", { mode: 'string' }),
	alasan: varchar({ length: 255 }),
	ditetapkanOleh: bigint("ditetapkan_oleh", { mode: "number" }).notNull().references(() => pengguna.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_pengguna_izin_berlaku").on(table.berlakuHingga),
	unique("uq_pengguna_izin").on(table.penggunaId, table.izinId),
]);

export const penggunaPeran = mysqlTable("pengguna_peran", {
	penggunaId: bigint("pengguna_id", { mode: "number" }).notNull().references(() => pengguna.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	peranId: bigint("peran_id", { mode: "number" }).notNull().references(() => peran.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	ditetapkanOleh: bigint("ditetapkan_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_pengguna_peran_peran").on(table.peranId),
]);

export const penggunaUnitAkses = mysqlTable("pengguna_unit_akses", {
	penggunaId: bigint("pengguna_id", { mode: "number" }).notNull().references(() => pengguna.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	unitKerjaId: bigint("unit_kerja_id", { mode: "number" }).notNull().references(() => unitKerja.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	termasukBawahan: tinyint("termasuk_bawahan").default(1).notNull(),
	ditetapkanOleh: bigint("ditetapkan_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_pengguna_unit_akses_unit").on(table.unitKerjaId),
]);

export const peran = mysqlTable("peran", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	kode: varchar({ length: 40 }).notNull(),
	nama: varchar({ length: 80 }).notNull(),
	deskripsi: varchar({ length: 255 }),
	tingkat: tinyint().default(9).notNull(),
	isSistem: tinyint("is_sistem").default(0).notNull(),
	isAnonim: tinyint("is_anonim").default(0).notNull(),
	isWajib2Fa: tinyint("is_wajib_2fa").default(0).notNull(),
	isLingkupUnit: tinyint("is_lingkup_unit").default(0).notNull(),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	unique("uq_peran_kode").on(table.kode),
	unique("uq_peran_nama").on(table.nama),
]);

export const peranIzin = mysqlTable("peran_izin", {
	peranId: bigint("peran_id", { mode: "number" }).notNull().references(() => peran.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	izinId: bigint("izin_id", { mode: "number" }).notNull().references(() => izin.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	diberikanOleh: bigint("diberikan_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_peran_izin_izin").on(table.izinId),
]);

export const permintaanAkses = mysqlTable("permintaan_akses", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	dokumenId: bigint("dokumen_id", { mode: "number" }).notNull().references(() => dokumen.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	penggunaId: bigint("pengguna_id", { mode: "number" }).notNull().references(() => pengguna.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	alasan: text().notNull(),
	status: mysqlEnum(['menunggu','disetujui','ditolak','kedaluwarsa']).default('menunggu').notNull(),
	diputuskanOleh: bigint("diputuskan_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	catatanKeputusan: text("catatan_keputusan"),
	diputuskanPada: datetime("diputuskan_pada", { mode: 'string'}),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	berlakuHingga: date("berlaku_hingga", { mode: 'string' }),
	kunciMenunggu: varchar("kunci_menunggu", { length: 50 }).generatedAlwaysAs(sql`if(\`status\` = 'menunggu',concat(\`dokumen_id\`,'-',\`pengguna_id\`),NULL)`, { mode: "stored" }),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	index("idx_permintaan_akses_status").on(table.status, table.dibuatPada),
	unique("uq_permintaan_akses_menunggu").on(table.kunciMenunggu),
]);

export const permintaanLayanan = mysqlTable("permintaan_layanan", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	nomorTiket: varchar("nomor_tiket", { length: 30 }).notNull(),
	layananHukumId: bigint("layanan_hukum_id", { mode: "number" }).notNull().references(() => layananHukum.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	pemohonId: bigint("pemohon_id", { mode: "number" }).notNull().references(() => pengguna.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	unitKerjaId: bigint("unit_kerja_id", { mode: "number" }).notNull().references(() => unitKerja.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	judul: varchar({ length: 255 }).notNull(),
	uraian: text().notNull(),
	dataFormulir: longtext("data_formulir"),
	status: mysqlEnum(['baru','ditelaah','butuh_info','selesai','ditolak','dibatalkan']).default('baru').notNull(),
	prioritas: mysqlEnum(['rendah','normal','tinggi','segera']).default('normal').notNull(),
	ditugaskanKe: bigint("ditugaskan_ke", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	tenggat: date({ mode: 'string' }),
	hasilTelaah: text("hasil_telaah"),
	dokumenHasilId: bigint("dokumen_hasil_id", { mode: "number" }).references(() => dokumen.id, { onDelete: "set null", onUpdate: "cascade" } ),
	diselesaikanPada: datetime("diselesaikan_pada", { mode: 'string'}),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	index("idx_permintaan_layanan_status").on(table.status, table.tenggat),
	index("idx_permintaan_layanan_pemohon").on(table.pemohonId, table.dibuatPada),
	index("idx_permintaan_layanan_penelaah").on(table.ditugaskanKe, table.status),
	unique("uq_permintaan_layanan_tiket").on(table.nomorTiket),
]);

export const permintaanLayananBerkas = mysqlTable("permintaan_layanan_berkas", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	permintaanLayananId: bigint("permintaan_layanan_id", { mode: "number" }).notNull().references(() => permintaanLayanan.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	jenis: mysqlEnum(['lampiran_pemohon','hasil_telaah','dokumen_pendukung']).default('lampiran_pemohon').notNull(),
	namaAsli: varchar("nama_asli", { length: 255 }).notNull(),
	path: varchar({ length: 500 }).notNull(),
	disk: varchar({ length: 30 }).default('lokal').notNull(),
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	ukuranBytes: bigint("ukuran_bytes", { mode: "number" }).notNull(),
	hashSha256: char("hash_sha256", { length: 64 }).notNull(),
	diunggahOleh: bigint("diunggah_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_pl_berkas_permintaan").on(table.permintaanLayananId, table.jenis),
	unique("uq_permintaan_layanan_berkas_path").on(table.path),
]);

export const permintaanLayananLog = mysqlTable("permintaan_layanan_log", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	permintaanLayananId: bigint("permintaan_layanan_id", { mode: "number" }).notNull().references(() => permintaanLayanan.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	statusDari: varchar("status_dari", { length: 30 }),
	statusKe: varchar("status_ke", { length: 30 }).notNull(),
	aksi: varchar({ length: 50 }).notNull(),
	catatan: text(),
	isTerlihatPemohon: tinyint("is_terlihat_pemohon").default(1).notNull(),
	olehId: bigint("oleh_id", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_pl_log_permintaan").on(table.permintaanLayananId, table.dibuatPada),
]);

export const pesanKontak = mysqlTable("pesan_kontak", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	nama: varchar({ length: 150 }).notNull(),
	email: varchar({ length: 190 }).notNull(),
	noTelepon: varchar("no_telepon", { length: 25 }),
	subjek: varchar({ length: 255 }).notNull(),
	pesan: text().notNull(),
	status: mysqlEnum(['baru','diproses','selesai','spam']).default('baru').notNull(),
	ditanganiOleh: bigint("ditangani_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	catatanPenanganan: text("catatan_penanganan"),
	ditanganiPada: datetime("ditangani_pada", { mode: 'string'}),
	ipHash: char("ip_hash", { length: 64 }).notNull(),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_pesan_kontak_status").on(table.status, table.dibuatPada),
	index("idx_pesan_kontak_ip_waktu").on(table.ipHash, table.dibuatPada),
	index("idx_pesan_kontak_email").on(table.email),
]);

export const statusDokumen = mysqlTable("status_dokumen", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	kode: varchar({ length: 30 }).notNull(),
	nama: varchar({ length: 60 }).notNull(),
	warna: char({ length: 7 }).default('#6B7280').notNull(),
	deskripsi: varchar({ length: 255 }),
	isBerlakuEfektif: tinyint("is_berlaku_efektif").default(0).notNull(),
	isSistem: tinyint("is_sistem").default(0).notNull(),
	urutan: smallint().notNull(),
},
(table) => [
	unique("uq_status_dokumen_kode").on(table.kode),
]);

export const tag = mysqlTable("tag", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	nama: varchar({ length: 80 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	jumlahPakai: int("jumlah_pakai").default(0).notNull(),
	dibuatOleh: bigint("dibuat_oleh", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_tag_populer").on(table.jumlahPakai),
	unique("uq_tag_nama").on(table.nama),
	unique("uq_tag_slug").on(table.slug),
]);

export const tautanTerkait = mysqlTable("tautan_terkait", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	nama: varchar({ length: 150 }).notNull(),
	url: varchar({ length: 500 }).notNull(),
	logo: varchar({ length: 255 }),
	kelompok: mysqlEnum(['jdihn','kementerian','perguruan_tinggi','internal','lainnya']).default('lainnya').notNull(),
	deskripsi: varchar({ length: 255 }),
	isAktif: tinyint("is_aktif").default(1).notNull(),
	urutan: smallint().notNull(),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	index("idx_tautan_terkait_kelompok").on(table.kelompok, table.isAktif, table.urutan),
	unique("uq_tautan_terkait_url").on(table.url),
]);

export const tokenResetSandi = mysqlTable("token_reset_sandi", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	penggunaId: bigint("pengguna_id", { mode: "number" }).notNull().references(() => pengguna.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	tokenHash: char("token_hash", { length: 64 }).notNull(),
	kedaluwarsaPada: datetime("kedaluwarsa_pada", { mode: 'string'}).notNull(),
	dipakaiPada: datetime("dipakai_pada", { mode: 'string'}),
	ipHash: char("ip_hash", { length: 64 }),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_token_reset_kedaluwarsa").on(table.kedaluwarsaPada),
	unique("uq_token_reset_hash").on(table.tokenHash),
]);

export const unduhan = mysqlTable("unduhan", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	dokumenId: bigint("dokumen_id", { mode: "number" }).notNull().references(() => dokumen.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	dokumenBerkasId: bigint("dokumen_berkas_id", { mode: "number" }).references(() => dokumenBerkas.id, { onDelete: "set null", onUpdate: "cascade" } ),
	penggunaId: bigint("pengguna_id", { mode: "number" }).references(() => pengguna.id, { onDelete: "set null", onUpdate: "cascade" } ),
	peranSaatUnduh: varchar("peran_saat_unduh", { length: 30 }).default('pengunjung').notNull(),
	ipHash: char("ip_hash", { length: 64 }).notNull(),
	agenRingkas: varchar("agen_ringkas", { length: 150 }),
	perujuk: varchar({ length: 255 }),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
},
(table) => [
	index("idx_unduhan_dokumen_tanggal").on(table.dokumenId, table.dibuatPada),
	index("idx_unduhan_ip_waktu").on(table.ipHash, table.dibuatPada),
	index("idx_unduhan_pengguna_waktu").on(table.penggunaId, table.dibuatPada),
	index("idx_unduhan_waktu").on(table.dibuatPada),
]);

export const unitKerja = mysqlTable("unit_kerja", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	kode: varchar({ length: 20 }).notNull(),
	nama: varchar({ length: 150 }).notNull(),
	singkatan: varchar({ length: 30 }),
	jenis: mysqlEnum(['institut','senat','rektorat','biro','fakultas','jurusan','prodi','lembaga','upt','satuan','unit','eksternal']).default('unit').notNull(),
	indukId: bigint("induk_id", { mode: "number" }),
	jalur: varchar({ length: 255 }).default('\'').notNull(),
	kedalaman: tinyint().default(0).notNull(),
	kepalaUnit: varchar("kepala_unit", { length: 150 }),
	emailUnit: varchar("email_unit", { length: 150 }),
	isAktif: tinyint("is_aktif").default(1).notNull(),
	urutan: smallint().notNull(),
	dibuatPada: datetime("dibuat_pada", { mode: 'string'}).default(sql`current_timestamp()`).notNull(),
	diperbaruiPada: datetime("diperbarui_pada", { mode: 'string'}),
},
(table) => [
	index("idx_unit_kerja_jalur").on(table.jalur),
	index("idx_unit_kerja_induk").on(table.indukId),
	index("idx_unit_kerja_aktif_jenis").on(table.isAktif, table.jenis),
	index("idx_unit_kerja_nama").on(table.nama),
	foreignKey({
			columns: [table.indukId],
			foreignColumns: [table.id],
			name: "fk_unit_kerja_induk"
		}).onUpdate("cascade").onDelete("restrict"),
	unique("uq_unit_kerja_kode").on(table.kode),
]);
export const vDokumenPublik = mysqlView("v_dokumen_publik", {
	id: bigint({ mode: "number" }).notNull(),
	kodeDokumen: varchar("kode_dokumen", { length: 30 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	judul: varchar({ length: 500 }).notNull(),
	nomor: varchar({ length: 100 }).notNull(),
	nomorLengkap: varchar("nomor_lengkap", { length: 255 }),
	tahun: smallint().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	tanggalPenetapan: date("tanggal_penetapan", { mode: 'string' }).notNull(),
	tingkatAkses: mysqlEnum("tingkat_akses", ['publik','internal','terbatas','rahasia']).default('publik').notNull(),
	abstrak: mediumtext(),
	jumlahDilihat: int("jumlah_dilihat").default(0).notNull(),
	jumlahDiunduh: int("jumlah_diunduh").default(0).notNull(),
	diterbitkanPada: datetime("diterbitkan_pada", { mode: 'string'}),
	isDisorot: tinyint("is_disorot").default(0).notNull(),
	jenisPeraturan: varchar("jenis_peraturan", { length: 120 }).notNull(),
	bentukSingkat: varchar("bentuk_singkat", { length: 40 }),
	unitKerja: varchar("unit_kerja", { length: 150 }).notNull(),
	unitJalur: varchar("unit_jalur", { length: 255 }).default('\'').notNull(),
	statusKeberlakuan: varchar("status_keberlakuan", { length: 60 }).notNull(),
	statusWarna: char("status_warna", { length: 7 }).default('#6B7280').notNull(),
	bidangHukum: varchar("bidang_hukum", { length: 120 }),
}).algorithm("undefined").sqlSecurity("definer").as(sql`select \`d\`.\`id\` AS \`id\`,\`d\`.\`kode_dokumen\` AS \`kode_dokumen\`,\`d\`.\`slug\` AS \`slug\`,\`d\`.\`judul\` AS \`judul\`,\`d\`.\`nomor\` AS \`nomor\`,\`d\`.\`nomor_lengkap\` AS \`nomor_lengkap\`,\`d\`.\`tahun\` AS \`tahun\`,\`d\`.\`tanggal_penetapan\` AS \`tanggal_penetapan\`,\`d\`.\`tingkat_akses\` AS \`tingkat_akses\`,\`d\`.\`abstrak\` AS \`abstrak\`,\`d\`.\`jumlah_dilihat\` AS \`jumlah_dilihat\`,\`d\`.\`jumlah_diunduh\` AS \`jumlah_diunduh\`,\`d\`.\`diterbitkan_pada\` AS \`diterbitkan_pada\`,\`d\`.\`is_disorot\` AS \`is_disorot\`,\`jp\`.\`nama\` AS \`jenis_peraturan\`,\`jp\`.\`bentuk_singkat\` AS \`bentuk_singkat\`,\`uk\`.\`nama\` AS \`unit_kerja\`,\`uk\`.\`jalur\` AS \`unit_jalur\`,\`sd\`.\`nama\` AS \`status_keberlakuan\`,\`sd\`.\`warna\` AS \`status_warna\`,\`bh\`.\`nama\` AS \`bidang_hukum\` from ((((\`jdih_ith__introspeksi\`.\`dokumen\` \`d\` join \`jdih_ith__introspeksi\`.\`jenis_peraturan\` \`jp\` on(\`jp\`.\`id\` = \`d\`.\`jenis_peraturan_id\`)) join \`jdih_ith__introspeksi\`.\`unit_kerja\` \`uk\` on(\`uk\`.\`id\` = \`d\`.\`unit_kerja_id\`)) join \`jdih_ith__introspeksi\`.\`status_dokumen\` \`sd\` on(\`sd\`.\`id\` = \`d\`.\`status_dokumen_id\`)) left join \`jdih_ith__introspeksi\`.\`bidang_hukum\` \`bh\` on(\`bh\`.\`id\` = \`d\`.\`bidang_hukum_id\`)) where \`d\`.\`status_publikasi\` = 'terbit' and \`d\`.\`tingkat_akses\` <> 'rahasia' and \`d\`.\`dihapus_pada\` is null`);

export const vDokumenRelasiDuaArah = mysqlView("v_dokumen_relasi_dua_arah", {
	dokumenId: bigint("dokumen_id", { mode: "number" }).notNull(),
	dokumenLainId: bigint("dokumen_lain_id", { mode: "number" }).notNull(),
	labelRelasi: varchar("label_relasi", { length: 80 }).default('\'').notNull(),
	urutan: smallint().notNull(),
	arah: varchar({ length: 5 }).default('\'').notNull(),
	keterangan: varchar({ length: 500 }),
}).algorithm("undefined").sqlSecurity("definer").as(sql`select \`dr\`.\`dokumen_id\` AS \`dokumen_id\`,\`dr\`.\`dokumen_terkait_id\` AS \`dokumen_lain_id\`,\`jr\`.\`nama\` AS \`label_relasi\`,\`jr\`.\`urutan\` AS \`urutan\`,'aktif' AS \`arah\`,\`dr\`.\`keterangan\` AS \`keterangan\` from (\`jdih_ith__introspeksi\`.\`dokumen_relasi\` \`dr\` join \`jdih_ith__introspeksi\`.\`jenis_relasi\` \`jr\` on(\`jr\`.\`id\` = \`dr\`.\`jenis_relasi_id\`)) union all select \`dr\`.\`dokumen_terkait_id\` AS \`dokumen_id\`,\`dr\`.\`dokumen_id\` AS \`dokumen_lain_id\`,\`jr\`.\`nama_kebalikan\` AS \`label_relasi\`,\`jr\`.\`urutan\` AS \`urutan\`,'pasif' AS \`arah\`,\`dr\`.\`keterangan\` AS \`keterangan\` from (\`jdih_ith__introspeksi\`.\`dokumen_relasi\` \`dr\` join \`jdih_ith__introspeksi\`.\`jenis_relasi\` \`jr\` on(\`jr\`.\`id\` = \`dr\`.\`jenis_relasi_id\`)) where \`jr\`.\`is_simetris\` = 0`);

export const vRekapDokumenUnit = mysqlView("v_rekap_dokumen_unit", {
	unitKerjaId: bigint("unit_kerja_id", { mode: "number" }).notNull(),
	unitKerja: varchar("unit_kerja", { length: 150 }).notNull(),
	jalur: varchar({ length: 255 }).default('\'').notNull(),
	total: bigint({ mode: "number" }).notNull(),
	terbit: decimal({ precision: 23, scale: 0 }),
	draf: decimal({ precision: 23, scale: 0 }),
	menungguVerifikasi: decimal("menunggu_verifikasi", { precision: 23, scale: 0 }),
	perluRevisi: decimal("perlu_revisi", { precision: 23, scale: 0 }),
	publik: decimal({ precision: 23, scale: 0 }),
	totalUnduhan: decimal("total_unduhan", { precision: 32, scale: 0 }),
}).algorithm("undefined").sqlSecurity("definer").as(sql`select \`uk\`.\`id\` AS \`unit_kerja_id\`,\`uk\`.\`nama\` AS \`unit_kerja\`,\`uk\`.\`jalur\` AS \`jalur\`,count(\`d\`.\`id\`) AS \`total\`,sum(\`d\`.\`status_publikasi\` = 'terbit') AS \`terbit\`,sum(\`d\`.\`status_publikasi\` = 'draf') AS \`draf\`,sum(\`d\`.\`status_publikasi\` = 'diajukan') AS \`menunggu_verifikasi\`,sum(\`d\`.\`status_publikasi\` = 'revisi') AS \`perlu_revisi\`,sum(\`d\`.\`tingkat_akses\` = 'publik' and \`d\`.\`status_publikasi\` = 'terbit') AS \`publik\`,sum(\`d\`.\`jumlah_diunduh\`) AS \`total_unduhan\` from (\`jdih_ith__introspeksi\`.\`unit_kerja\` \`uk\` left join \`jdih_ith__introspeksi\`.\`dokumen\` \`d\` on(\`d\`.\`unit_kerja_id\` = \`uk\`.\`id\` and \`d\`.\`dihapus_pada\` is null)) group by \`uk\`.\`id\`,\`uk\`.\`nama\`,\`uk\`.\`jalur\``);