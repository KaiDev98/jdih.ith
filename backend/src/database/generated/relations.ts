import { relations } from "drizzle-orm/relations";
import { pengguna, banner, kategoriBerita, berita, beritaDokumen, dokumen, beritaTag, tag, bidangHukum, imporBatch, jenisPeraturan, statusDokumen, unitKerja, dokumenAkses, dokumenAlur, dokumenBerkas, dokumenKategori, kategori, dokumenRelasi, jenisRelasi, dokumenRiwayat, dokumenStatistikHarian, dokumenTag, halaman, koleksiPengguna, layananHukum, logAktivitas, logAutentikasi, logPencarian, logSinkronisasiJdihn, media, menuItem, menu, notifikasi, pengaturan, izin, penggunaIzin, penggunaPeran, peran, penggunaUnitAkses, peranIzin, permintaanAkses, permintaanLayanan, permintaanLayananBerkas, permintaanLayananLog, pesanKontak, tokenResetSandi, unduhan } from "./schema";

export const bannerRelations = relations(banner, ({one}) => ({
	pengguna: one(pengguna, {
		fields: [banner.dibuatOleh],
		references: [pengguna.id]
	}),
}));

export const penggunaRelations = relations(pengguna, ({one, many}) => ({
	banners: many(banner),
	beritas: many(berita),
	dokumen_dibuatOleh: many(dokumen, {
		relationName: "dokumen_dibuatOleh_pengguna_id"
	}),
	dokumen_diperbaruiOleh: many(dokumen, {
		relationName: "dokumen_diperbaruiOleh_pengguna_id"
	}),
	dokumen_diperiksaOleh: many(dokumen, {
		relationName: "dokumen_diperiksaOleh_pengguna_id"
	}),
	dokumen_diterbitkanOleh: many(dokumen, {
		relationName: "dokumen_diterbitkanOleh_pengguna_id"
	}),
	dokumenAkses: many(dokumenAkses),
	dokumenAlurs: many(dokumenAlur),
	dokumenBerkas: many(dokumenBerkas),
	dokumenRelasis: many(dokumenRelasi),
	dokumenRiwayats: many(dokumenRiwayat),
	halamen: many(halaman),
	imporBatches: many(imporBatch),
	koleksiPenggunas: many(koleksiPengguna),
	logAktivitas: many(logAktivitas),
	logAutentikasis: many(logAutentikasi),
	logPencarians: many(logPencarian),
	media: many(media),
	notifikasis: many(notifikasi),
	pengaturans: many(pengaturan),
	pengguna_dibuatOleh: one(pengguna, {
		fields: [pengguna.dibuatOleh],
		references: [pengguna.id],
		relationName: "pengguna_dibuatOleh_pengguna_id"
	}),
	penggunas_dibuatOleh: many(pengguna, {
		relationName: "pengguna_dibuatOleh_pengguna_id"
	}),
	pengguna_diverifikasiOleh: one(pengguna, {
		fields: [pengguna.diverifikasiOleh],
		references: [pengguna.id],
		relationName: "pengguna_diverifikasiOleh_pengguna_id"
	}),
	penggunas_diverifikasiOleh: many(pengguna, {
		relationName: "pengguna_diverifikasiOleh_pengguna_id"
	}),
	unitKerja: one(unitKerja, {
		fields: [pengguna.unitKerjaId],
		references: [unitKerja.id]
	}),
	penggunaIzins_ditetapkanOleh: many(penggunaIzin, {
		relationName: "penggunaIzin_ditetapkanOleh_pengguna_id"
	}),
	penggunaIzins_penggunaId: many(penggunaIzin, {
		relationName: "penggunaIzin_penggunaId_pengguna_id"
	}),
	penggunaPerans_ditetapkanOleh: many(penggunaPeran, {
		relationName: "penggunaPeran_ditetapkanOleh_pengguna_id"
	}),
	penggunaPerans_penggunaId: many(penggunaPeran, {
		relationName: "penggunaPeran_penggunaId_pengguna_id"
	}),
	penggunaUnitAkses_ditetapkanOleh: many(penggunaUnitAkses, {
		relationName: "penggunaUnitAkses_ditetapkanOleh_pengguna_id"
	}),
	penggunaUnitAkses_penggunaId: many(penggunaUnitAkses, {
		relationName: "penggunaUnitAkses_penggunaId_pengguna_id"
	}),
	peranIzins: many(peranIzin),
	permintaanAkses_diputuskanOleh: many(permintaanAkses, {
		relationName: "permintaanAkses_diputuskanOleh_pengguna_id"
	}),
	permintaanAkses_penggunaId: many(permintaanAkses, {
		relationName: "permintaanAkses_penggunaId_pengguna_id"
	}),
	permintaanLayanans_pemohonId: many(permintaanLayanan, {
		relationName: "permintaanLayanan_pemohonId_pengguna_id"
	}),
	permintaanLayanans_ditugaskanKe: many(permintaanLayanan, {
		relationName: "permintaanLayanan_ditugaskanKe_pengguna_id"
	}),
	permintaanLayananBerkas: many(permintaanLayananBerkas),
	permintaanLayananLogs: many(permintaanLayananLog),
	pesanKontaks: many(pesanKontak),
	tags: many(tag),
	tokenResetSandis: many(tokenResetSandi),
	unduhans: many(unduhan),
}));

export const beritaRelations = relations(berita, ({one, many}) => ({
	kategoriBerita: one(kategoriBerita, {
		fields: [berita.kategoriBeritaId],
		references: [kategoriBerita.id]
	}),
	pengguna: one(pengguna, {
		fields: [berita.penulisId],
		references: [pengguna.id]
	}),
	beritaDokumen: many(beritaDokumen),
	beritaTags: many(beritaTag),
}));

export const kategoriBeritaRelations = relations(kategoriBerita, ({many}) => ({
	beritas: many(berita),
}));

export const beritaDokumenRelations = relations(beritaDokumen, ({one}) => ({
	berita: one(berita, {
		fields: [beritaDokumen.beritaId],
		references: [berita.id]
	}),
	dokuman: one(dokumen, {
		fields: [beritaDokumen.dokumenId],
		references: [dokumen.id]
	}),
}));

export const dokumenRelations = relations(dokumen, ({one, many}) => ({
	beritaDokumen: many(beritaDokumen),
	bidangHukum: one(bidangHukum, {
		fields: [dokumen.bidangHukumId],
		references: [bidangHukum.id]
	}),
	pengguna_dibuatOleh: one(pengguna, {
		fields: [dokumen.dibuatOleh],
		references: [pengguna.id],
		relationName: "dokumen_dibuatOleh_pengguna_id"
	}),
	pengguna_diperbaruiOleh: one(pengguna, {
		fields: [dokumen.diperbaruiOleh],
		references: [pengguna.id],
		relationName: "dokumen_diperbaruiOleh_pengguna_id"
	}),
	pengguna_diperiksaOleh: one(pengguna, {
		fields: [dokumen.diperiksaOleh],
		references: [pengguna.id],
		relationName: "dokumen_diperiksaOleh_pengguna_id"
	}),
	pengguna_diterbitkanOleh: one(pengguna, {
		fields: [dokumen.diterbitkanOleh],
		references: [pengguna.id],
		relationName: "dokumen_diterbitkanOleh_pengguna_id"
	}),
	imporBatch: one(imporBatch, {
		fields: [dokumen.imporBatchId],
		references: [imporBatch.id]
	}),
	jenisPeraturan: one(jenisPeraturan, {
		fields: [dokumen.jenisPeraturanId],
		references: [jenisPeraturan.id]
	}),
	statusDokuman: one(statusDokumen, {
		fields: [dokumen.statusDokumenId],
		references: [statusDokumen.id]
	}),
	unitKerja: one(unitKerja, {
		fields: [dokumen.unitKerjaId],
		references: [unitKerja.id]
	}),
	dokumenAkses: many(dokumenAkses),
	dokumenAlurs_dokumenDasarId: many(dokumenAlur, {
		relationName: "dokumenAlur_dokumenDasarId_dokumen_id"
	}),
	dokumenAlurs_dokumenId: many(dokumenAlur, {
		relationName: "dokumenAlur_dokumenId_dokumen_id"
	}),
	dokumenBerkas: many(dokumenBerkas),
	dokumenKategoris: many(dokumenKategori),
	dokumenRelasis_dokumenId: many(dokumenRelasi, {
		relationName: "dokumenRelasi_dokumenId_dokumen_id"
	}),
	dokumenRelasis_dokumenTerkaitId: many(dokumenRelasi, {
		relationName: "dokumenRelasi_dokumenTerkaitId_dokumen_id"
	}),
	dokumenRiwayats: many(dokumenRiwayat),
	dokumenStatistikHarians: many(dokumenStatistikHarian),
	dokumenTags: many(dokumenTag),
	koleksiPenggunas: many(koleksiPengguna),
	logSinkronisasiJdihns: many(logSinkronisasiJdihn),
	permintaanAkses: many(permintaanAkses),
	permintaanLayanans: many(permintaanLayanan),
	unduhans: many(unduhan),
}));

export const beritaTagRelations = relations(beritaTag, ({one}) => ({
	berita: one(berita, {
		fields: [beritaTag.beritaId],
		references: [berita.id]
	}),
	tag: one(tag, {
		fields: [beritaTag.tagId],
		references: [tag.id]
	}),
}));

export const tagRelations = relations(tag, ({one, many}) => ({
	beritaTags: many(beritaTag),
	dokumenTags: many(dokumenTag),
	pengguna: one(pengguna, {
		fields: [tag.dibuatOleh],
		references: [pengguna.id]
	}),
}));

export const bidangHukumRelations = relations(bidangHukum, ({many}) => ({
	dokumen: many(dokumen),
}));

export const imporBatchRelations = relations(imporBatch, ({one, many}) => ({
	dokumen: many(dokumen),
	pengguna: one(pengguna, {
		fields: [imporBatch.olehId],
		references: [pengguna.id]
	}),
}));

export const jenisPeraturanRelations = relations(jenisPeraturan, ({many}) => ({
	dokumen: many(dokumen),
}));

export const statusDokumenRelations = relations(statusDokumen, ({many}) => ({
	dokumen: many(dokumen),
	jenisRelasis: many(jenisRelasi),
}));

export const unitKerjaRelations = relations(unitKerja, ({one, many}) => ({
	dokumen: many(dokumen),
	layananHukums: many(layananHukum),
	penggunas: many(pengguna),
	penggunaUnitAkses: many(penggunaUnitAkses),
	permintaanLayanans: many(permintaanLayanan),
	unitKerja: one(unitKerja, {
		fields: [unitKerja.indukId],
		references: [unitKerja.id],
		relationName: "unitKerja_indukId_unitKerja_id"
	}),
	unitKerjas: many(unitKerja, {
		relationName: "unitKerja_indukId_unitKerja_id"
	}),
}));

export const dokumenAksesRelations = relations(dokumenAkses, ({one}) => ({
	pengguna: one(pengguna, {
		fields: [dokumenAkses.dibuatOleh],
		references: [pengguna.id]
	}),
	dokuman: one(dokumen, {
		fields: [dokumenAkses.dokumenId],
		references: [dokumen.id]
	}),
}));

export const dokumenAlurRelations = relations(dokumenAlur, ({one}) => ({
	dokuman_dokumenDasarId: one(dokumen, {
		fields: [dokumenAlur.dokumenDasarId],
		references: [dokumen.id],
		relationName: "dokumenAlur_dokumenDasarId_dokumen_id"
	}),
	dokuman_dokumenId: one(dokumen, {
		fields: [dokumenAlur.dokumenId],
		references: [dokumen.id],
		relationName: "dokumenAlur_dokumenId_dokumen_id"
	}),
	pengguna: one(pengguna, {
		fields: [dokumenAlur.olehId],
		references: [pengguna.id]
	}),
}));

export const dokumenBerkasRelations = relations(dokumenBerkas, ({one, many}) => ({
	pengguna: one(pengguna, {
		fields: [dokumenBerkas.dibuatOleh],
		references: [pengguna.id]
	}),
	dokuman: one(dokumen, {
		fields: [dokumenBerkas.dokumenId],
		references: [dokumen.id]
	}),
	unduhans: many(unduhan),
}));

export const dokumenKategoriRelations = relations(dokumenKategori, ({one}) => ({
	dokuman: one(dokumen, {
		fields: [dokumenKategori.dokumenId],
		references: [dokumen.id]
	}),
	kategori: one(kategori, {
		fields: [dokumenKategori.kategoriId],
		references: [kategori.id]
	}),
}));

export const kategoriRelations = relations(kategori, ({one, many}) => ({
	dokumenKategoris: many(dokumenKategori),
	kategori: one(kategori, {
		fields: [kategori.indukId],
		references: [kategori.id],
		relationName: "kategori_indukId_kategori_id"
	}),
	kategoris: many(kategori, {
		relationName: "kategori_indukId_kategori_id"
	}),
}));

export const dokumenRelasiRelations = relations(dokumenRelasi, ({one}) => ({
	pengguna: one(pengguna, {
		fields: [dokumenRelasi.dibuatOleh],
		references: [pengguna.id]
	}),
	dokuman_dokumenId: one(dokumen, {
		fields: [dokumenRelasi.dokumenId],
		references: [dokumen.id],
		relationName: "dokumenRelasi_dokumenId_dokumen_id"
	}),
	jenisRelasi: one(jenisRelasi, {
		fields: [dokumenRelasi.jenisRelasiId],
		references: [jenisRelasi.id]
	}),
	dokuman_dokumenTerkaitId: one(dokumen, {
		fields: [dokumenRelasi.dokumenTerkaitId],
		references: [dokumen.id],
		relationName: "dokumenRelasi_dokumenTerkaitId_dokumen_id"
	}),
}));

export const jenisRelasiRelations = relations(jenisRelasi, ({one, many}) => ({
	dokumenRelasis: many(dokumenRelasi),
	statusDokuman: one(statusDokumen, {
		fields: [jenisRelasi.statusAkibatId],
		references: [statusDokumen.id]
	}),
}));

export const dokumenRiwayatRelations = relations(dokumenRiwayat, ({one}) => ({
	dokuman: one(dokumen, {
		fields: [dokumenRiwayat.dokumenId],
		references: [dokumen.id]
	}),
	pengguna: one(pengguna, {
		fields: [dokumenRiwayat.olehId],
		references: [pengguna.id]
	}),
}));

export const dokumenStatistikHarianRelations = relations(dokumenStatistikHarian, ({one}) => ({
	dokuman: one(dokumen, {
		fields: [dokumenStatistikHarian.dokumenId],
		references: [dokumen.id]
	}),
}));

export const dokumenTagRelations = relations(dokumenTag, ({one}) => ({
	dokuman: one(dokumen, {
		fields: [dokumenTag.dokumenId],
		references: [dokumen.id]
	}),
	tag: one(tag, {
		fields: [dokumenTag.tagId],
		references: [tag.id]
	}),
}));

export const halamanRelations = relations(halaman, ({one, many}) => ({
	halaman: one(halaman, {
		fields: [halaman.indukId],
		references: [halaman.id],
		relationName: "halaman_indukId_halaman_id"
	}),
	halamen: many(halaman, {
		relationName: "halaman_indukId_halaman_id"
	}),
	pengguna: one(pengguna, {
		fields: [halaman.disusunOleh],
		references: [pengguna.id]
	}),
}));

export const koleksiPenggunaRelations = relations(koleksiPengguna, ({one}) => ({
	dokuman: one(dokumen, {
		fields: [koleksiPengguna.dokumenId],
		references: [dokumen.id]
	}),
	pengguna: one(pengguna, {
		fields: [koleksiPengguna.penggunaId],
		references: [pengguna.id]
	}),
}));

export const layananHukumRelations = relations(layananHukum, ({one, many}) => ({
	unitKerja: one(unitKerja, {
		fields: [layananHukum.unitPenanggungJawabId],
		references: [unitKerja.id]
	}),
	permintaanLayanans: many(permintaanLayanan),
}));

export const logAktivitasRelations = relations(logAktivitas, ({one}) => ({
	pengguna: one(pengguna, {
		fields: [logAktivitas.penggunaId],
		references: [pengguna.id]
	}),
}));

export const logAutentikasiRelations = relations(logAutentikasi, ({one}) => ({
	pengguna: one(pengguna, {
		fields: [logAutentikasi.penggunaId],
		references: [pengguna.id]
	}),
}));

export const logPencarianRelations = relations(logPencarian, ({one}) => ({
	pengguna: one(pengguna, {
		fields: [logPencarian.penggunaId],
		references: [pengguna.id]
	}),
}));

export const logSinkronisasiJdihnRelations = relations(logSinkronisasiJdihn, ({one}) => ({
	dokuman: one(dokumen, {
		fields: [logSinkronisasiJdihn.dokumenId],
		references: [dokumen.id]
	}),
}));

export const mediaRelations = relations(media, ({one}) => ({
	pengguna: one(pengguna, {
		fields: [media.diunggahOleh],
		references: [pengguna.id]
	}),
}));

export const menuItemRelations = relations(menuItem, ({one, many}) => ({
	menuItem: one(menuItem, {
		fields: [menuItem.indukId],
		references: [menuItem.id],
		relationName: "menuItem_indukId_menuItem_id"
	}),
	menuItems: many(menuItem, {
		relationName: "menuItem_indukId_menuItem_id"
	}),
	menu: one(menu, {
		fields: [menuItem.menuId],
		references: [menu.id]
	}),
}));

export const menuRelations = relations(menu, ({many}) => ({
	menuItems: many(menuItem),
}));

export const notifikasiRelations = relations(notifikasi, ({one}) => ({
	pengguna: one(pengguna, {
		fields: [notifikasi.penggunaId],
		references: [pengguna.id]
	}),
}));

export const pengaturanRelations = relations(pengaturan, ({one}) => ({
	pengguna: one(pengguna, {
		fields: [pengaturan.diperbaruiOleh],
		references: [pengguna.id]
	}),
}));

export const penggunaIzinRelations = relations(penggunaIzin, ({one}) => ({
	izin: one(izin, {
		fields: [penggunaIzin.izinId],
		references: [izin.id]
	}),
	pengguna_ditetapkanOleh: one(pengguna, {
		fields: [penggunaIzin.ditetapkanOleh],
		references: [pengguna.id],
		relationName: "penggunaIzin_ditetapkanOleh_pengguna_id"
	}),
	pengguna_penggunaId: one(pengguna, {
		fields: [penggunaIzin.penggunaId],
		references: [pengguna.id],
		relationName: "penggunaIzin_penggunaId_pengguna_id"
	}),
}));

export const izinRelations = relations(izin, ({many}) => ({
	penggunaIzins: many(penggunaIzin),
	peranIzins: many(peranIzin),
}));

export const penggunaPeranRelations = relations(penggunaPeran, ({one}) => ({
	pengguna_ditetapkanOleh: one(pengguna, {
		fields: [penggunaPeran.ditetapkanOleh],
		references: [pengguna.id],
		relationName: "penggunaPeran_ditetapkanOleh_pengguna_id"
	}),
	pengguna_penggunaId: one(pengguna, {
		fields: [penggunaPeran.penggunaId],
		references: [pengguna.id],
		relationName: "penggunaPeran_penggunaId_pengguna_id"
	}),
	peran: one(peran, {
		fields: [penggunaPeran.peranId],
		references: [peran.id]
	}),
}));

export const peranRelations = relations(peran, ({many}) => ({
	penggunaPerans: many(penggunaPeran),
	peranIzins: many(peranIzin),
}));

export const penggunaUnitAksesRelations = relations(penggunaUnitAkses, ({one}) => ({
	pengguna_ditetapkanOleh: one(pengguna, {
		fields: [penggunaUnitAkses.ditetapkanOleh],
		references: [pengguna.id],
		relationName: "penggunaUnitAkses_ditetapkanOleh_pengguna_id"
	}),
	pengguna_penggunaId: one(pengguna, {
		fields: [penggunaUnitAkses.penggunaId],
		references: [pengguna.id],
		relationName: "penggunaUnitAkses_penggunaId_pengguna_id"
	}),
	unitKerja: one(unitKerja, {
		fields: [penggunaUnitAkses.unitKerjaId],
		references: [unitKerja.id]
	}),
}));

export const peranIzinRelations = relations(peranIzin, ({one}) => ({
	izin: one(izin, {
		fields: [peranIzin.izinId],
		references: [izin.id]
	}),
	pengguna: one(pengguna, {
		fields: [peranIzin.diberikanOleh],
		references: [pengguna.id]
	}),
	peran: one(peran, {
		fields: [peranIzin.peranId],
		references: [peran.id]
	}),
}));

export const permintaanAksesRelations = relations(permintaanAkses, ({one}) => ({
	dokuman: one(dokumen, {
		fields: [permintaanAkses.dokumenId],
		references: [dokumen.id]
	}),
	pengguna_diputuskanOleh: one(pengguna, {
		fields: [permintaanAkses.diputuskanOleh],
		references: [pengguna.id],
		relationName: "permintaanAkses_diputuskanOleh_pengguna_id"
	}),
	pengguna_penggunaId: one(pengguna, {
		fields: [permintaanAkses.penggunaId],
		references: [pengguna.id],
		relationName: "permintaanAkses_penggunaId_pengguna_id"
	}),
}));

export const permintaanLayananRelations = relations(permintaanLayanan, ({one, many}) => ({
	dokuman: one(dokumen, {
		fields: [permintaanLayanan.dokumenHasilId],
		references: [dokumen.id]
	}),
	layananHukum: one(layananHukum, {
		fields: [permintaanLayanan.layananHukumId],
		references: [layananHukum.id]
	}),
	pengguna_pemohonId: one(pengguna, {
		fields: [permintaanLayanan.pemohonId],
		references: [pengguna.id],
		relationName: "permintaanLayanan_pemohonId_pengguna_id"
	}),
	pengguna_ditugaskanKe: one(pengguna, {
		fields: [permintaanLayanan.ditugaskanKe],
		references: [pengguna.id],
		relationName: "permintaanLayanan_ditugaskanKe_pengguna_id"
	}),
	unitKerja: one(unitKerja, {
		fields: [permintaanLayanan.unitKerjaId],
		references: [unitKerja.id]
	}),
	permintaanLayananBerkas: many(permintaanLayananBerkas),
	permintaanLayananLogs: many(permintaanLayananLog),
}));

export const permintaanLayananBerkasRelations = relations(permintaanLayananBerkas, ({one}) => ({
	pengguna: one(pengguna, {
		fields: [permintaanLayananBerkas.diunggahOleh],
		references: [pengguna.id]
	}),
	permintaanLayanan: one(permintaanLayanan, {
		fields: [permintaanLayananBerkas.permintaanLayananId],
		references: [permintaanLayanan.id]
	}),
}));

export const permintaanLayananLogRelations = relations(permintaanLayananLog, ({one}) => ({
	pengguna: one(pengguna, {
		fields: [permintaanLayananLog.olehId],
		references: [pengguna.id]
	}),
	permintaanLayanan: one(permintaanLayanan, {
		fields: [permintaanLayananLog.permintaanLayananId],
		references: [permintaanLayanan.id]
	}),
}));

export const pesanKontakRelations = relations(pesanKontak, ({one}) => ({
	pengguna: one(pengguna, {
		fields: [pesanKontak.ditanganiOleh],
		references: [pengguna.id]
	}),
}));

export const tokenResetSandiRelations = relations(tokenResetSandi, ({one}) => ({
	pengguna: one(pengguna, {
		fields: [tokenResetSandi.penggunaId],
		references: [pengguna.id]
	}),
}));

export const unduhanRelations = relations(unduhan, ({one}) => ({
	dokumenBerka: one(dokumenBerkas, {
		fields: [unduhan.dokumenBerkasId],
		references: [dokumenBerkas.id]
	}),
	dokuman: one(dokumen, {
		fields: [unduhan.dokumenId],
		references: [dokumen.id]
	}),
	pengguna: one(pengguna, {
		fields: [unduhan.penggunaId],
		references: [pengguna.id]
	}),
}));