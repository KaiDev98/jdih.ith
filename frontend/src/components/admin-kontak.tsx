'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BATAS_BUTIR_KONTAK,
  skemaSimpanButirKontak,
  type ButirKontak,
  type JenisKontak,
  type KontakKantor,
} from '@jdih/shared';
import { Mail, Phone } from 'lucide-react';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import {
  Button,
  Card,
  ConfirmAction,
  Field,
  PageTitle,
  SelectField,
  StateMessage,
} from '@/components/ui';

const NAMA_JENIS: Record<JenisKontak, string> = { TELEPON: 'Telepon', SUREL: 'Email' };

type Draf = { jenis: JenisKontak; label: string; nilai: string };
const drafKosong: Draf = { jenis: 'TELEPON', label: '', nilai: '' };

/** Pesan galat validasi pertama untuk draf, atau undefined bila valid. */
function periksa(draf: Draf) {
  if (!draf.nilai.trim()) return undefined;
  const hasil = skemaSimpanButirKontak.safeParse(draf);
  return hasil.success ? undefined : hasil.error.issues[0]?.message;
}

/**
 * Admin mengelola kontak kantor (telepon dan email) yang tampil di footer dan
 * halaman Kontak: menambah, mengubah, dan menghapus butir.
 */
export function AdminKontak() {
  const { csrfToken } = useSession();
  const [butir, setButir] = useState<ButirKontak[]>();
  const [galatMuat, setGalatMuat] = useState('');
  const [baru, setBaru] = useState<Draf>(drafKosong);
  const [sunting, setSunting] = useState<{ id: string; draf: Draf }>();

  const muat = useCallback(() => {
    ambilApi<KontakKantor>('/public/contact')
      .then((data) => {
        setButir(data.butir);
        setGalatMuat('');
      })
      .catch((e: unknown) =>
        setGalatMuat(e instanceof GalatApi ? e.message : 'Daftar kontak tidak dapat dimuat.'),
      );
  }, []);
  useEffect(muat, [muat]);

  async function simpan(metode: 'POST' | 'PATCH', jalur: string, draf: Draf) {
    await ambilApi(jalur, {
      method: metode,
      headers: csrfHeaders(csrfToken),
      muatan: { jenis: draf.jenis, label: draf.label || null, nilai: draf.nilai },
    });
    muat();
  }

  async function hapus(id: string) {
    await ambilApi(`/admin/contact/items/${id}`, {
      method: 'DELETE',
      headers: csrfHeaders(csrfToken),
    });
    muat();
  }

  const penuh = (butir?.length ?? 0) >= BATAS_BUTIR_KONTAK;
  const galatBaru = periksa(baru);

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Kontak Kantor"
        description="Telepon dan email ini tampil di footer dan halaman Kontak portal publik."
      />
      {galatMuat && (
        <StateMessage title="Daftar kontak tidak tersedia" kind="error">
          {galatMuat}
        </StateMessage>
      )}

      <Card className="mb-5">
        <h2 className="font-semibold">Daftar kontak</h2>
        {butir === undefined && !galatMuat ? (
          <p className="mt-4 text-sm text-slate-600">Memuat…</p>
        ) : butir?.length ? (
          <ul className="mt-4 divide-y divide-slate-200">
            {butir.map((item) =>
              sunting?.id === item.id ? (
                <li key={item.id} className="py-4">
                  <FormButir
                    awalan={`sunting-${item.id}`}
                    draf={sunting.draf}
                    onUbah={(draf) => setSunting({ id: item.id, draf })}
                  />
                  <div className="mt-3 flex flex-wrap items-start gap-2">
                    <ConfirmAction
                      label="Simpan perubahan"
                      title="Simpan perubahan kontak?"
                      description="Kontak yang diubah langsung tampil di portal publik."
                      disabled={!sunting.draf.nilai.trim() || Boolean(periksa(sunting.draf))}
                      onConfirm={async () => {
                        await simpan('PATCH', `/admin/contact/items/${item.id}`, sunting.draf);
                        setSunting(undefined);
                      }}
                    />
                    <Button type="button" tone="secondary" onClick={() => setSunting(undefined)}>
                      Batal
                    </Button>
                  </div>
                </li>
              ) : (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-lg bg-institusi-50 text-institusi-700"
                    >
                      {item.jenis === 'TELEPON' ? (
                        <Phone className="size-4" />
                      ) : (
                        <Mail className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500">
                        {NAMA_JENIS[item.jenis]}
                        {item.label ? ` · ${item.label}` : ''}
                      </p>
                      <p className="font-medium [overflow-wrap:anywhere]">{item.nilai}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <Button
                      type="button"
                      tone="secondary"
                      onClick={() =>
                        setSunting({
                          id: item.id,
                          draf: { jenis: item.jenis, label: item.label ?? '', nilai: item.nilai },
                        })
                      }
                    >
                      Ubah
                    </Button>
                    <ConfirmAction
                      label="Hapus"
                      tone="danger"
                      title="Hapus kontak ini?"
                      description={`${NAMA_JENIS[item.jenis]} ${item.nilai} tidak akan tampil lagi di portal publik.`}
                      confirmLabel="Ya, hapus"
                      onConfirm={() => hapus(item.id)}
                    />
                  </div>
                </li>
              ),
            )}
          </ul>
        ) : (
          !galatMuat && (
            <p className="mt-4 text-sm text-slate-600">
              Belum ada kontak. Tambahkan telepon atau email di bawah.
            </p>
          )
        )}
      </Card>

      <Card>
        <h2 className="font-semibold">Tambah kontak</h2>
        {penuh ? (
          <p className="mt-3 text-sm text-slate-600">
            Kontak sudah {BATAS_BUTIR_KONTAK} butir. Hapus salah satu untuk menambah yang baru.
          </p>
        ) : (
          <form className="mt-4 grid gap-3" onSubmit={(e) => e.preventDefault()}>
            <FormButir awalan="kontak-baru" draf={baru} onUbah={setBaru} />
            {galatBaru && (
              <p role="alert" className="text-sm text-red-700">
                {galatBaru}
              </p>
            )}
            <div>
              <ConfirmAction
                label="Tambah kontak"
                title="Tambah kontak ini?"
                description={`${NAMA_JENIS[baru.jenis]} ${baru.nilai} akan langsung tampil di portal publik.`}
                disabled={!baru.nilai.trim() || Boolean(galatBaru)}
                onConfirm={async () => {
                  await simpan('POST', '/admin/contact/items', baru);
                  setBaru(drafKosong);
                }}
              />
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

/** Kolom jenis, label, dan nilai untuk satu butir kontak. */
function FormButir({
  awalan,
  draf,
  onUbah,
}: {
  awalan: string;
  draf: Draf;
  onUbah: (draf: Draf) => void;
}) {
  const telepon = draf.jenis === 'TELEPON';
  return (
    <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <SelectField
        label="Jenis"
        id={`${awalan}-jenis`}
        value={draf.jenis}
        onChange={(e) => onUbah({ ...draf, jenis: e.target.value as JenisKontak })}
      >
        <option value="TELEPON">Telepon</option>
        <option value="SUREL">Email</option>
      </SelectField>
      <Field
        label={telepon ? 'Nomor telepon / HP' : 'Alamat email'}
        id={`${awalan}-nilai`}
        type={telepon ? 'tel' : 'email'}
        inputMode={telepon ? 'tel' : 'email'}
        maxLength={telepon ? 32 : 254}
        placeholder={telepon ? '+62 812-3456-7890' : 'nama@ith.ac.id'}
        value={draf.nilai}
        onChange={(e) => onUbah({ ...draf, nilai: e.target.value })}
      />
      <Field
        className="sm:col-span-2"
        label="Label (opsional)"
        id={`${awalan}-label`}
        maxLength={100}
        placeholder={telepon ? 'mis. WhatsApp Sub Bagian Umum' : 'mis. Email JDIH'}
        value={draf.label}
        onChange={(e) => onUbah({ ...draf, label: e.target.value })}
      />
    </div>
  );
}
