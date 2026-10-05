'use client';

import { useEffect, useState } from 'react';
import { skemaTeleponKantor, type KontakKantor } from '@jdih/shared';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { csrfHeaders, useSession } from '@/lib/sesi';
import { Card, ConfirmAction, Field, PageTitle, StateMessage } from '@/components/ui';

/** Admin mengubah nomor telepon kantor yang tampil di footer dan halaman Kontak. */
export function AdminKontak() {
  const { csrfToken } = useSession();
  const [tersimpan, setTersimpan] = useState<string>();
  const [telepon, setTelepon] = useState('');
  const [galatMuat, setGalatMuat] = useState('');

  useEffect(() => {
    ambilApi<KontakKantor>('/public/contact')
      .then((data) => {
        setTersimpan(data.telepon);
        setTelepon(data.telepon);
      })
      .catch((e: unknown) =>
        setGalatMuat(e instanceof GalatApi ? e.message : 'Nomor telepon tidak dapat dimuat.'),
      );
  }, []);

  const cek = skemaTeleponKantor.safeParse(telepon);
  const pesanCek = telepon && !cek.success ? cek.error.issues[0]?.message : undefined;
  const berubah = cek.success && cek.data !== tersimpan;

  async function simpan() {
    const hasil = await ambilApi<KontakKantor>('/admin/contact', {
      method: 'PATCH',
      headers: csrfHeaders(csrfToken),
      muatan: { telepon },
    });
    setTersimpan(hasil.telepon);
    setTelepon(hasil.telepon);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Kontak Kantor"
        description="Nomor telepon ini tampil di footer dan halaman Kontak portal publik."
      />
      {galatMuat && (
        <StateMessage title="Data kontak tidak tersedia" kind="error">
          {galatMuat}
        </StateMessage>
      )}
      <Card>
        <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
          <Field
            label="Nomor telepon / HP"
            id="kontak-telepon"
            type="tel"
            inputMode="tel"
            required
            maxLength={32}
            placeholder="+62 812-3456-7890"
            value={telepon}
            disabled={tersimpan === undefined}
            onChange={(e) => setTelepon(e.target.value)}
          />
          {pesanCek && (
            <p role="alert" className="text-sm text-red-700">
              {pesanCek}
            </p>
          )}
          <div>
            <ConfirmAction
              label="Simpan nomor"
              title="Simpan nomor telepon?"
              description={`Nomor ${cek.success ? cek.data : telepon} akan langsung tampil di portal publik.`}
              disabled={!berubah}
              onConfirm={simpan}
            />
          </div>
        </form>
      </Card>
    </div>
  );
}
