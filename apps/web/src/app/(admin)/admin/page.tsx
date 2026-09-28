import { KATALOG_PERAN, SEMUA_IZIN, MODUL_IZIN, IZIN_BERDAMPAK_TINGGI } from '@jdih/shared';

/**
 * Dasbor administrasi — kerangka.
 *
 * Isi sebenarnya (kartu angka, antrean kerja, tren 30 hari, kesehatan sistem)
 * dirancang pada docs/06-fitur-dan-menu.md § F.4.3 dan dibangun setelah modul
 * dokumen serta otorisasi tersedia. Untuk sekarang halaman ini membuktikan bahwa
 * rute admin hidup dan paket kontrak bersama terbaca dari sisi peramban.
 */
export default function DasborAdmin() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Dasbor</h1>
      <p className="mt-1 text-sm text-slate-600">
        Kerangka panel administrasi. Modul fungsional ditambahkan bertahap sesuai fase pengembangan
        pada docs/09 Tabel 9.1.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Peran sistem', nilai: KATALOG_PERAN.length },
          { label: 'Kode izin', nilai: SEMUA_IZIN.length },
          { label: 'Izin berdampak tinggi', nilai: IZIN_BERDAMPAK_TINGGI.length },
        ].map((kartu) => (
          <div
            key={kartu.label}
            className="rounded-lg border border-slate-200 bg-white p-5 text-center"
          >
            <p className="text-3xl font-bold text-slate-900">{kartu.nilai}</p>
            <p className="mt-1 text-sm text-slate-600">{kartu.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Peran yang Terdefinisi</h2>
        <p className="mt-1 text-sm text-slate-600">
          Dibaca dari <code>@jdih/shared</code>, yang nilainya diturunkan dari
          <code className="mx-1">database/jdih_ith_seed.sql</code>.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Peran</th>
                <th className="py-2 pr-4 font-medium">Tingkat</th>
                <th className="py-2 pr-4 font-medium">2FA</th>
                <th className="py-2 pr-4 font-medium">Cakupan unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {KATALOG_PERAN.map((peran) => (
                <tr key={peran.kode}>
                  <td className="py-2 pr-4">
                    <span className="font-medium text-slate-900">{peran.nama}</span>
                    <code className="ml-2 text-xs text-slate-400">{peran.kode}</code>
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{peran.tingkat}</td>
                  <td className="py-2 pr-4 text-slate-600">
                    {peran.wajib2fa ? 'Wajib' : 'Opsional'}
                  </td>
                  <td className="py-2 pr-4 text-slate-600">
                    {peran.lingkupUnit ? 'Dibatasi unit kerja' : 'Tanpa batas unit'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Modul Izin</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {MODUL_IZIN.map((modul) => (
            <li
              key={modul}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {modul}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
