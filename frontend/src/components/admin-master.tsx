'use client';

import { useEffect, useState } from 'react';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { useSession, csrfHeaders } from '@/lib/sesi';
import { superadminAktif } from '@/lib/panel';
import {
  Badge,
  Button,
  Card,
  ConfirmAction,
  Field,
  PageTitle,
  StateMessage,
} from '@/components/ui';

type Table = 'jenis_dokumen' | 'kategori';
type Row = {
  id: string;
  kode?: string;
  nama: string;
  urutan?: number;
  aktif?: boolean;
  parentId?: string | null;
};
const labels: Record<Table, string> = { jenis_dokumen: 'Jenis Dokumen', kategori: 'Kategori SOP' };
const deskripsi: Record<Table, string> = {
  jenis_dokumen:
    'Jenis produk hukum yang tampil di portal dan dapat dipilih saat mengupload dokumen.',
  kategori:
    'Setiap kategori tampil sebagai sub-menu SOP di portal publik dan menjadi pilihan unit kerja saat mendaftar atau menambah Admin. Menonaktifkan kategori juga menyembunyikan unitnya.',
};
const satuan: Record<Table, string> = { jenis_dokumen: 'jenis', kategori: 'kategori' };

/**
 * Data master: daftar di kiri, formulir tambah/ubah di kanan (menempel saat
 * digulir) agar halaman tidak memanjang ke bawah dan formulir selalu terlihat.
 */
export function AdminMaster({ table }: { table: Table }) {
  const { csrfToken, pengguna } = useSession();
  const bolehKelola = superadminAktif(pengguna) && !!pengguna?.izin.includes('master.manage');
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row>();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [order, setOrder] = useState('0');
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    void ambilApi<Row[]>(`/admin/master/${table}`)
      .then(setRows)
      .catch((e) => setError(e instanceof GalatApi ? e.message : 'Master tidak dapat dimuat.'));
  }, [table, refresh]);
  function edit(row?: Row) {
    setSelected(row);
    setCode(row?.kode ?? '');
    setName(row?.nama ?? '');
    setOrder(String(row?.urutan ?? 0));
  }
  async function save() {
    const body =
      table === 'jenis_dokumen'
        ? { kode: code, nama: name, urutan: Number(order) }
        : { kode: code, nama: name };
    await ambilApi(`/admin/master/${table}${selected ? `/${selected.id}` : ''}`, {
      method: selected ? 'PATCH' : 'POST',
      headers: csrfHeaders(csrfToken),
      muatan: body,
    });
    edit();
    setRefresh((x) => x + 1);
  }
  async function status(row: Row) {
    await ambilApi(`/admin/master/${table}/${row.id}/status`, {
      method: 'PATCH',
      headers: csrfHeaders(csrfToken),
      muatan: { aktif: !row.aktif },
    });
    setRefresh((x) => x + 1);
  }
  return (
    <fieldset disabled={!bolehKelola} className="halaman-panel mx-auto min-w-0 w-full">
      <PageTitle title={labels[table]} description={deskripsi[table]} />
      {error && (
        <div className="mb-4">
          <StateMessage title="Data master tidak tersedia" kind="error">
            {error}
          </StateMessage>
        </div>
      )}
      <div className="formulir-panel grid grid-cols-[minmax(0,1fr)] items-start gap-5 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <Card className="p-0! sm:p-0!">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-slate-900">Daftar {satuan[table]}</h2>
            <span className="text-xs text-slate-500 tabular-nums">{rows.length} item</span>
          </div>
          <ul className="divide-y divide-slate-100 md:hidden">
            {rows.map((row) => (
              <li
                key={row.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 ${selected?.id === row.id ? 'bg-institusi-50/60' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{row.nama}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700">
                      {row.kode ?? '—'}
                    </span>
                    {row.aktif !== undefined && (
                      <Badge color={row.aktif ? 'green' : 'slate'}>
                        {row.aktif ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button tone="secondary" ukuran="kecil" onClick={() => edit(row)}>
                    Ubah
                  </Button>
                  <ConfirmAction
                    label={row.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                    tone="secondary"
                    ukuran="kecil"
                    title={row.aktif ? `Nonaktifkan ${row.nama}?` : `Aktifkan kembali ${row.nama}?`}
                    description={
                      row.aktif
                        ? 'Tidak lagi tersedia sebagai pilihan untuk dokumen baru. Dokumen lama tidak berubah, dan dapat diaktifkan kembali kapan saja.'
                        : 'Kembali tersedia sebagai pilihan untuk dokumen baru.'
                    }
                    onConfirm={() => status(row)}
                  />
                </div>
              </li>
            ))}
          </ul>
          {rows.length === 0 && (
            <p className="px-4 py-5 text-sm text-slate-600 md:hidden">Belum ada data.</p>
          )}
          <div className="hidden overflow-x-auto px-4 sm:px-5 md:block">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th>Kode</th>
                  <th>Nama</th>
                  {table === 'jenis_dokumen' && <th className="text-right">Urutan</th>}
                  <th>Status</th>
                  <th className="sr-only">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={selected?.id === row.id ? 'bg-institusi-50/60' : undefined}
                  >
                    <td>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700">
                        {row.kode ?? '—'}
                      </span>
                    </td>
                    <td className="font-medium text-slate-900">{row.nama}</td>
                    {table === 'jenis_dokumen' && (
                      <td className="text-right text-slate-600 tabular-nums">
                        {row.urutan ?? '—'}
                      </td>
                    )}
                    <td>
                      {row.aktif === undefined ? (
                        '—'
                      ) : (
                        <Badge color={row.aktif ? 'green' : 'slate'}>
                          {row.aktif ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Button tone="secondary" ukuran="kecil" onClick={() => edit(row)}>
                          Ubah
                        </Button>
                        <ConfirmAction
                          label={row.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                          tone="secondary"
                          ukuran="kecil"
                          title={
                            row.aktif ? `Nonaktifkan ${row.nama}?` : `Aktifkan kembali ${row.nama}?`
                          }
                          description={
                            row.aktif
                              ? 'Tidak lagi tersedia sebagai pilihan untuk dokumen baru. Dokumen lama tidak berubah, dan dapat diaktifkan kembali kapan saja.'
                              : 'Kembali tersedia sebagai pilihan untuk dokumen baru.'
                          }
                          onConfirm={() => status(row)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="py-5 text-sm text-slate-600">Belum ada data.</p>}
          </div>
        </Card>

        <Card className="lg:sticky lg:top-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {selected ? `Ubah: ${selected.nama}` : `Tambah ${satuan[table]}`}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {selected
              ? 'Simpan untuk menerapkan perubahan, atau batalkan.'
              : 'Kode dipakai di alamat halaman portal; nama tampil ke pengunjung.'}
          </p>
          <form className="mt-4 grid gap-3" onSubmit={(e) => e.preventDefault()}>
            <Field
              label="Kode"
              id="master-code"
              required
              maxLength={40}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Field
              label="Nama"
              id="master-name"
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {table === 'jenis_dokumen' && (
              <Field
                label="Urutan"
                id="master-order"
                type="number"
                min={0}
                value={order}
                onChange={(e) => setOrder(e.target.value)}
              />
            )}
            <div className="mt-1 grid gap-2">
              <ConfirmAction
                label={selected ? 'Simpan perubahan' : 'Tambah'}
                title={selected ? 'Simpan perubahan master?' : 'Tambah master?'}
                description="Pastikan kode dan nama sudah benar sebelum menyimpan."
                disabled={!name.trim() || !code.trim()}
                onConfirm={save}
              />
              {selected && (
                <Button type="button" tone="secondary" onClick={() => edit()}>
                  Batal
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </fieldset>
  );
}
