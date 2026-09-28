import { HttpException, HttpStatus } from '@nestjs/common';
import { KODE_GALAT, type ButirGalatValidasi, type KodeGalat } from '@jdih/shared';

/**
 * Galat domain Portal JDIH ITH.
 *
 * Seluruh kegagalan yang bermakna bagi pengguna dinyatakan sebagai turunan
 * kelas ini, sehingga penyaring galat global dapat mengubahnya menjadi bentuk
 * tanggapan baku tanpa menebak-nebak. Status HTTP dan kode galat aplikasi
 * disimpan bersamaan: yang pertama untuk peramban dan perantara jaringan, yang
 * kedua untuk kode di sisi peramban yang perlu bertindak berbeda per sebab.
 */
export class GalatAplikasi extends HttpException {
  constructor(
    readonly kode: KodeGalat,
    pesan: string,
    status: HttpStatus,
    readonly butir?: readonly ButirGalatValidasi[],
    readonly rincian?: Readonly<Record<string, unknown>>,
  ) {
    super(pesan, status);
  }
}

/* ─────────────────────────────── Validasi ────────────────────────────────── */

export class GalatValidasi extends GalatAplikasi {
  constructor(butir: readonly ButirGalatValidasi[]) {
    super(
      KODE_GALAT.VALIDASI_GAGAL,
      'Data yang dikirim tidak lolos pemeriksaan.',
      HttpStatus.UNPROCESSABLE_ENTITY,
      butir,
    );
  }
}

/* ───────────────────────── Autentikasi & otorisasi ───────────────────────── */

export class GalatTidakTerautentikasi extends GalatAplikasi {
  constructor(pesan = 'Anda harus masuk terlebih dahulu.') {
    super(KODE_GALAT.TIDAK_TERAUTENTIKASI, pesan, HttpStatus.UNAUTHORIZED);
  }
}

export class GalatAkunTidakAktif extends GalatAplikasi {
  constructor(pesan = 'Akun Anda tidak berstatus aktif. Hubungi pengelola sistem.') {
    super(KODE_GALAT.AKUN_TIDAK_AKTIF, pesan, HttpStatus.FORBIDDEN);
  }
}

export class GalatPerluAktifkan2fa extends GalatAplikasi {
  constructor() {
    super(
      KODE_GALAT.PERLU_AKTIFKAN_2FA,
      'Peran Anda mewajibkan autentikasi dua faktor. Aktifkan terlebih dahulu ' +
        'sebelum membuka panel administrasi.',
      HttpStatus.FORBIDDEN,
    );
  }
}

/** Lapisan 1 — izin fungsional tidak dipegang. */
export class GalatIzinTidakCukup extends GalatAplikasi {
  constructor(izinDiperlukan: readonly string[]) {
    super(
      KODE_GALAT.IZIN_TIDAK_CUKUP,
      'Anda tidak memiliki kewenangan untuk melakukan tindakan ini.',
      HttpStatus.FORBIDDEN,
      undefined,
      { izinDiperlukan },
    );
  }
}

/** Lapisan 2 — objek berada di luar cakupan unit kerja pelaku. */
export class GalatDiLuarCakupanUnit extends GalatAplikasi {
  constructor() {
    super(
      KODE_GALAT.DI_LUAR_CAKUPAN_UNIT,
      'Data ini milik unit kerja di luar cakupan Anda.',
      HttpStatus.FORBIDDEN,
    );
  }
}

/** Lapisan 3 — tingkat akses dokumen tidak mengizinkan. */
export class GalatAksesDokumenDitolak extends GalatAplikasi {
  constructor(pesan = 'Anda tidak berhak mengakses dokumen ini.') {
    super(KODE_GALAT.AKSES_DOKUMEN_DITOLAK, pesan, HttpStatus.FORBIDDEN);
  }
}

/**
 * Lapisan 3 khusus dokumen terbatas — pemohon masih punya jalan keluar, yaitu
 * mengajukan permintaan akses. Dibedakan dari penolakan biasa supaya peramban
 * dapat menampilkan tombol "Minta Akses" alih-alih pesan mati.
 */
export class GalatPerluPermintaanAkses extends GalatAplikasi {
  constructor(dokumenId: number) {
    super(
      KODE_GALAT.PERLU_PERMINTAAN_AKSES,
      'Dokumen ini bertingkat akses terbatas. Ajukan permintaan akses beserta ' +
        'alasan kebutuhan Anda.',
      HttpStatus.FORBIDDEN,
      undefined,
      { dokumenId },
    );
  }
}

/* ──────────────────────────── Keadaan sumber daya ────────────────────────── */

export class GalatTidakDitemukan extends GalatAplikasi {
  constructor(sumberDaya = 'Data') {
    super(KODE_GALAT.TIDAK_DITEMUKAN, `${sumberDaya} tidak ditemukan.`, HttpStatus.NOT_FOUND);
  }
}

export class GalatKonflik extends GalatAplikasi {
  constructor(pesan: string, rincian?: Readonly<Record<string, unknown>>) {
    super(KODE_GALAT.KONFLIK, pesan, HttpStatus.CONFLICT, undefined, rincian);
  }
}

/** Nomor peraturan sudah dipakai — kasus konflik yang paling sering terjadi. */
export class GalatDokumenDuplikat extends GalatKonflik {
  constructor(dokumenId: number, nomor: string, tahun: number) {
    super(
      `Sudah ada dokumen dengan nomor ${nomor} tahun ${tahun} pada jenis dan unit kerja ` +
        `yang sama.`,
      { dokumenId, nomor, tahun },
    );
  }
}

export class GalatTransisiTidakSah extends GalatAplikasi {
  constructor(dari: string, ke: string, diizinkan: readonly string[]) {
    super(
      KODE_GALAT.TRANSISI_TIDAK_SAH,
      `Dokumen berstatus "${dari}" tidak dapat langsung dipindahkan ke "${ke}".`,
      HttpStatus.CONFLICT,
      undefined,
      { dari, ke, diizinkan },
    );
  }
}

/** Pemisahan tugas: penginput tidak boleh menyetujui dokumennya sendiri. */
export class GalatPemisahanTugas extends GalatAplikasi {
  constructor() {
    super(
      KODE_GALAT.PEMISAHAN_TUGAS,
      'Dokumen yang Anda input sendiri harus diverifikasi oleh pemeriksa lain.',
      HttpStatus.FORBIDDEN,
    );
  }
}
