'use client';

import { useEffect, useState } from 'react';
import { ambilApiBerdaftar, GalatApi } from '@/lib/api-client';
import { formatWaktuAudit, LABEL_AKSI, LABEL_MODUL } from '@/lib/label-audit';
import { Button, Card, PageTitle, SelectField, StateMessage } from '@/components/ui';

type AuditRow = {
  id: string;
  actor: string | null;
  module: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
};

/** Modul yang benar-benar dicatat backend. */
const MODUL = [
  'documents',
  'workflow',
  'legal-relations',
  'identity',
  'letter-templates',
  'master',
  'settings',
];
const PER_HALAMAN = 30;

export function AdminAudit() {
  const [rows, setRows] = useState<readonly AuditRow[]>([]);
  const [modul, setModul] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [total, setTotal] = useState(0);
  const [galat, setGalat] = useState('');
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;
    void ambilApiBerdaftar<AuditRow>('/admin/audit', {
      kueri: { halaman, perHalaman: PER_HALAMAN, module: modul || undefined },
    })
      .then((r) => {
        if (!aktif) return;
        setRows(r.data);
        setTotal(r.meta.totalButir);
        setGalat('');
      })
      .catch((e: unknown) => {
        if (aktif)
          setGalat(e instanceof GalatApi ? e.message : 'Riwayat audit tidak dapat dimuat.');
      })
      .finally(() => {
        if (aktif) setMemuat(false);
      });
    return () => {
      aktif = false;
    };
  }, [modul, halaman]);

  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        title="Audit"
        description="Riwayat tindakan di panel admin: siapa melakukan apa dan kapan."
      />
      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <SelectField
            className="w-full sm:max-w-sm"
            label="Tampilkan modul"
            id="audit-module"
            value={modul}
            onChange={(e) => {
              setMemuat(true);
              setHalaman(1);
              setModul(e.target.value);
            }}
          >
            <option value="">Semua modul</option>
            {MODUL.map((m) => (
              <option key={m} value={m}>
                {LABEL_MODUL[m] ?? m}
              </option>
            ))}
          </SelectField>
          <p className="text-sm text-slate-600">{total} catatan</p>
        </div>
        {galat && (
          <StateMessage title="Audit gagal dimuat" kind="error">
            {galat}
          </StateMessage>
        )}
        {memuat && <StateMessage title="Memuat riwayat audit…" />}
        {!memuat && !galat && !rows.length && <StateMessage title="Belum ada catatan audit" />}
        {!memuat && !galat && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b text-slate-600">
                  <th className="py-3">Waktu</th>
                  <th>Pelaku</th>
                  <th>Tindakan</th>
                  <th>Modul</th>
                  <th>Objek</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 whitespace-nowrap text-slate-600">
                      {formatWaktuAudit(r.createdAt)}
                    </td>
                    <td className="font-medium">{r.actor ?? 'Sistem'}</td>
                    <td>{LABEL_AKSI[r.action] ?? r.action}</td>
                    <td className="text-slate-600">{LABEL_MODUL[r.module] ?? r.module}</td>
                    <td className="text-slate-600">
                      {r.entityType}
                      {r.entityId ? ` #${r.entityId}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between">
          <Button
            tone="secondary"
            disabled={halaman <= 1 || memuat}
            onClick={() => {
              setMemuat(true);
              setHalaman((p) => p - 1);
            }}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-slate-600">
            Halaman {halaman} dari {totalHalaman}
          </span>
          <Button
            tone="secondary"
            disabled={halaman >= totalHalaman || memuat}
            onClick={() => {
              setMemuat(true);
              setHalaman((p) => p + 1);
            }}
          >
            Berikutnya
          </Button>
        </div>
      </Card>
    </div>
  );
}
