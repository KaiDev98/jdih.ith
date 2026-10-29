'use client';

import Link from '@/components/admin/tautan-panel';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileSignature, Globe2, Tag } from 'lucide-react';
import { ambilApi, ambilApiBerdaftar, GalatApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import {
  Card,
  CardHeader,
  ConfirmAction,
  DaftarKerangka,
  PageTitle,
  StateMessage,
  kelasTautanSekunder,
  kelasTautanUtama,
} from '@/components/ui';
import { LencanaTahap, TabelDokumen, type BarisDokumen } from './admin-daftar-dokumen';

/**
 * Tempat tersendiri untuk SOP Permohonan SK, terpisah dari unggahan produk
 * hukum biasa. Dokumen di sini ditandai berperuntukan PERMOHONAN_SK; setelah
 * terbit, dokumen tampil di /permohonan-sk sesuai akses Publik/Dosen-Staf.
 * Persetujuan sekaligus menerbitkan khusus SOP ini; dokumen biasa tetap beralur terpisah.
 */
export function AdminSopPermohonanSk() {
  const { pengguna, csrfToken } = useSession();
  const izin = pengguna?.izin ?? [];
  const superadmin = pengguna?.peran.includes('SUPERADMIN') ?? false;
  const bolehBuat = superadmin && izin.includes('documents.create');
  const bolehUbah = superadmin && izin.includes('documents.edit');
  const [rows, setRows] = useState<readonly BarisDokumen[]>();
  const [error, setError] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [total, setTotal] = useState(0);
  const [muatUlang, setMuatUlang] = useState(0);

  useEffect(() => {
    if (!superadmin) return;
    let berlaku = true;
    ambilApiBerdaftar<BarisDokumen>('/admin/documents', {
      kueri: { halaman, perHalaman: 20, peruntukan: 'PERMOHONAN_SK' },
    })
      .then((r) => {
        if (!berlaku) return;
        setRows(r.data);
        setTotal(r.meta.totalButir);
        setError('');
      })
      .catch((e: unknown) => {
        if (berlaku) setError(e instanceof GalatApi ? e.message : 'Daftar tidak dapat dimuat.');
      });
    return () => {
      berlaku = false;
    };
  }, [muatUlang, superadmin, halaman]);

  // Aksi "Lepas" berlaku untuk dokumen, jadi cukup di satu baris per dokumen.
  const barisPertama = useMemo(() => {
    const terlihat = new Set<string>();
    return new Set(
      (rows ?? [])
        .filter((r) => (terlihat.has(r.id) ? false : (terlihat.add(r.id), true)))
        .map((r) => r.versionId),
    );
  }, [rows]);

  async function ubahPeruntukan(id: string, peruntukan: 'PERMOHONAN_SK' | null) {
    await ambilApi(`/admin/documents/${id}`, {
      method: 'PATCH',
      headers: csrfHeaders(csrfToken),
      muatan: { peruntukan },
    });
    setMuatUlang((x) => x + 1);
  }

  if (!superadmin) return null;

  return (
    <div className="halaman-panel mx-auto w-full">
      <PageTitle
        title="SOP Permohonan SK"
        description="Prosedur pengajuan Surat Keputusan yang tampil di halaman khusus portal, terpisah dari daftar produk hukum biasa."
        action={
          <>
            <a
              href="/permohonan-sk"
              target="_blank"
              rel="noopener noreferrer"
              className={kelasTautanSekunder}
            >
              <ExternalLink aria-hidden className="size-4" />
              Lihat di portal
            </a>
            <Link href="/admin/dokumen/pengajuan" className={kelasTautanSekunder}>
              Draf dan pengajuan SOP
            </Link>
            {
              <Link
                disabled={!bolehBuat}
                href="/admin/sop-permohonan-sk/baru"
                className={kelasTautanUtama}
              >
                <FileSignature aria-hidden className="size-4" />
                Unggah dokumen baru
              </Link>
            }
          </>
        }
      />

      {error && (
        <div className="mb-6">
          <StateMessage title="Daftar gagal dimuat" kind="error">
            {error}
          </StateMessage>
        </div>
      )}

      <div className="grid gap-6">
        <Card className="rounded-none! border-y-0! border-l-2! border-r-0! border-l-institusi-400! bg-institusi-50/50! px-4! py-3! shadow-none!">
          <div className="flex flex-wrap items-center gap-3">
            <Globe2 aria-hidden className="size-5 text-gigi-700" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">SOP Publik dan Dosen/Staf</h2>
              <p className="mt-1 text-xs text-slate-500">
                Setelah disetujui, SOP langsung terbit sesuai akses yang dipilih.
              </p>
            </div>
          </div>
        </Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-tinta">
            Register prosedur SK
          </h2>
          <span className="text-xs text-slate-500">{total} versi dokumen</span>
        </div>
        {!rows && <DaftarKerangka baris={4} label="Memuat SOP" />}
        {rows?.length === 0 && (
          <StateMessage title="Belum ada SOP terverifikasi">
            Unggah SOP baru untuk memulai.
          </StateMessage>
        )}
        {rows && rows.length > 0 && (
          <Card className="overflow-hidden p-0 sm:p-0">
            <div className="px-5 pt-5">
              <CardHeader
                title="Dokumen SOP terverifikasi"
                description="Draf dan pengajuan yang belum diverifikasi tersedia di menu Draf dan Pengajuan serta Antrean Verifikasi."
              />
            </div>
            {
              <div className="border-t border-sekat">
                <TabelDokumen
                  rows={rows}
                  aksi={(r) =>
                    barisPertama.has(r.versionId) ? (
                      <ConfirmAction
                        disabled={!bolehUbah}
                        label="Lepas"
                        tone="secondary"
                        ukuran="kecil"
                        title="Lepas dari halaman SOP Permohonan SK?"
                        description={`"${r.judul}" tetap ada sebagai SOP biasa di daftar produk hukum, tetapi tidak lagi tampil di halaman SOP Permohonan SK.`}
                        confirmLabel="Ya, lepas"
                        onConfirm={() => ubahPeruntukan(r.id, null)}
                      />
                    ) : null
                  }
                />
              </div>
            }
          </Card>
        )}

        {total > 20 && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>
              Halaman {halaman} dari {Math.ceil(total / 20)}
            </span>
            <div className="flex gap-2">
              <button
                className="min-h-11 rounded-lg border border-sekat bg-white px-4 disabled:opacity-40"
                disabled={halaman <= 1}
                onClick={() => setHalaman((v) => v - 1)}
              >
                Sebelumnya
              </button>
              <button
                className="min-h-11 rounded-lg border border-sekat bg-white px-4 disabled:opacity-40"
                disabled={halaman * 20 >= total}
                onClick={() => setHalaman((v) => v + 1)}
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
        {superadmin && (
          <fieldset disabled={!bolehUbah} className="min-w-0">
            <TandaiSopLama onTandai={(id) => ubahPeruntukan(id, 'PERMOHONAN_SK')} />
          </fieldset>
        )}
      </div>
    </div>
  );
}

/**
 * Menjadikan SOP yang sudah diunggah lewat menu biasa sebagai SOP Permohonan
 * SK, tanpa mengunggah ulang. Hanya dokumen berjenis SOP yang ditawarkan.
 */
function TandaiSopLama({ onTandai }: { onTandai: (id: string) => Promise<void> }) {
  const [terbuka, setTerbuka] = useState(false);
  const [halaman, setHalaman] = useState(1);
  const [hasil, setHasil] = useState<readonly BarisDokumen[]>();
  const [totalHalaman, setTotalHalaman] = useState(0);
  const [pilihan, setPilihan] = useState('');
  const [galat, setGalat] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!terbuka) return;
    let aktif = true;
    ambilApiBerdaftar<BarisDokumen>('/admin/documents', {
      kueri: { halaman, perHalaman: 20, kelompok: 'SOP' },
    })
      .then((r) => {
        if (aktif) {
          setHasil(r.data);
          setTotalHalaman(r.meta.totalHalaman);
          setGalat('');
        }
      })
      .catch(() => {
        if (aktif) setGalat('Daftar SOP belum dapat dimuat.');
      });
    return () => {
      aktif = false;
    };
  }, [terbuka, halaman, refresh]);
  const calon = (hasil ?? []).filter(
    (row, index, items) => items.findIndex((item) => item.id === row.id) === index,
  );
  const dipilih = calon.find((row) => row.id === pilihan);
  return (
    <details
      className="rounded-xl border border-sekat bg-white p-5"
      onToggle={(event) => setTerbuka(event.currentTarget.open)}
    >
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-tinta">
        <Tag size={16} aria-hidden />
        Gunakan SOP yang sudah ada
      </summary>
      <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500">
        Pilih SOP biasa yang sudah diverifikasi untuk ditampilkan pada halaman SOP Permohonan SK.
      </p>
      {galat ? (
        <StateMessage title="Daftar belum tersedia" kind="error">
          {galat}
          <button type="button" className="ml-2 underline" onClick={() => setRefresh((n) => n + 1)}>
            Coba lagi
          </button>
        </StateMessage>
      ) : !hasil ? (
        <p role="status" className="mt-4 text-sm text-slate-500">
          Memuat SOP…
        </p>
      ) : (
        <>
          <label className="mt-4 block max-w-2xl text-xs font-medium text-slate-600">
            Pilih SOP
            <select
              value={pilihan}
              onChange={(event) => setPilihan(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-sekat bg-white px-3 text-sm text-tinta"
            >
              <option value="">
                {calon.length ? 'Pilih dokumen SOP' : 'Belum ada SOP yang dapat dipilih'}
              </option>
              {calon.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.judul} · No. {row.nomor ?? '—'}
                </option>
              ))}
            </select>
          </label>
          {totalHalaman > 1 && (
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
              <button
                type="button"
                disabled={halaman <= 1}
                className="min-h-11 underline disabled:opacity-40"
                onClick={() => {
                  setHalaman((p) => p - 1);
                  setPilihan('');
                  setHasil(undefined);
                }}
              >
                Sebelumnya
              </button>
              <span>
                Halaman {halaman} dari {totalHalaman}
              </span>
              <button
                type="button"
                disabled={halaman >= totalHalaman}
                className="min-h-11 underline disabled:opacity-40"
                onClick={() => {
                  setHalaman((p) => p + 1);
                  setPilihan('');
                  setHasil(undefined);
                }}
              >
                Berikutnya
              </button>
            </div>
          )}
          {dipilih && (
            <div className="mt-4">
              <ConfirmAction
                label="Tandai sebagai SOP Permohonan SK"
                title="Jadikan SOP Permohonan SK?"
                description={dipilih.judul + ' akan tampil sesuai aksesnya setelah diterbitkan.'}
                confirmLabel="Ya, tandai"
                onConfirm={async () => {
                  await onTandai(dipilih.id);
                  setPilihan('');
                  setHasil(undefined);
                  setRefresh((n) => n + 1);
                }}
              />
            </div>
          )}
        </>
      )}
    </details>
  );
}
