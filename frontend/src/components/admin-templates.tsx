'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, FileUp, Plus, UploadCloud, X, Trash2 } from 'lucide-react';
import Link from '@/components/admin/tautan-panel';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { useSession, csrfHeaders } from '@/lib/sesi';
import { jadikanSlug, rapikanSlugKetik } from '@/lib/slug';
import { LABEL_JENIS_BERKAS, TERIMA_BERKAS } from '@/lib/label-dokumen';
import {
  Badge,
  Button,
  Card,
  ConfirmAction,
  Feedback,
  Field,
  PageTitle,
  SelectField,
  StateMessage,
  TextAreaField,
} from '@/components/ui';
import styles from './admin-templates.module.css';
import { PratinjauFormat } from './pratinjau-format';
import { AntreanPermintaanPenghapusan, FormPermintaanPenghapusan } from './admin-removal-requests';

type Template = {
  id: string;
  createdBy: string;
  slug: string;
  nama: string;
  aktif: boolean | number;
  currentVersionId: string | null;
  nomorVersi: number | null;
  tingkatAkses: 'PUBLIK' | 'INTERNAL' | null;
  status: string | null;
  pendingVersionId: string | null;
  pendingStatus?: 'PENDING_REVIEW' | 'APPROVED' | null;
  pendingNomorVersi: number | null;
  pendingTingkatAkses: 'PUBLIK' | 'INTERNAL' | null;
  mimeType?: string | null;
  pendingMimeType?: string | null;
  pernahTerbit?: boolean | number;
};

export function AdminTemplates() {
  const { csrfToken, pengguna } = useSession();
  const bolehKelola =
    pengguna?.status === 'AKTIF' &&
    pengguna.peran.some((peran) => peran === 'ADMIN' || peran === 'SUPERADMIN') &&
    pengguna.izin.includes('templates.manage');
  const bolehVerifikasi =
    pengguna?.status === 'AKTIF' &&
    pengguna.peran.includes('SUPERADMIN') &&
    pengguna.izin.includes('templates.manage');
  const bolehUbah = (row: Template) =>
    bolehKelola && (bolehVerifikasi || row.createdBy === pengguna?.id);
  const bolehGanti = (row: Template) =>
    bolehUbah(row) && (bolehVerifikasi || row.pendingStatus !== 'APPROVED');
  const bolehHapus = (row: Template) =>
    bolehUbah(row) && (bolehVerifikasi || (!row.aktif && !row.pernahTerbit && row.pendingStatus !== 'APPROVED'));
  const [rows, setRows] = useState<Template[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<Template>();
  const [filter, setFilter] = useState<
    'SEMUA' | 'AKTIF' | 'MENUNGGU_VERIFIKASI' | 'DISETUJUI' | 'NONAKTIF'
  >('SEMUA');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState('');
  const [access, setAccess] = useState<'PUBLIK' | 'INTERNAL'>('PUBLIK');
  const [file, setFile] = useState<File>();
  const [fileKey, setFileKey] = useState(0);
  const editor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const muat = () => { if (document.visibilityState === 'visible') setRefresh((n) => n + 1); };
    const timer = window.setInterval(muat, 30_000);
    window.addEventListener('focus', muat);
    window.addEventListener('jdih:workflow', muat);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', muat); window.removeEventListener('jdih:workflow', muat); };
  }, []);

  useEffect(() => {
    let aktif = true;
    void ambilApi<Template[]>('/admin/letter-templates')
      .then((data) => {
        if (!aktif) return;
        setRows(data);
        setError('');
        setLoaded(true);
      })
      .catch((e) => {
        if (aktif)
          setError(e instanceof GalatApi ? e.message : 'Daftar format tidak dapat dimuat.');
      });
    return () => {
      aktif = false;
    };
  }, [refresh]);

  function reset() {
    setSelected(undefined);
    setName('');
    setSlug('');
    setSlugManual(false);
    setDescription('');
    setAccess('PUBLIK');
    setFile(undefined);
    setFileKey((x) => x + 1);
  }
  function fokusEditor() {
    editor.current?.scrollIntoView?.({ block: 'nearest' });
    editor.current?.focus({ preventScroll: true });
  }
  async function upload() {
    if (!bolehKelola) throw new Error('Anda tidak memiliki izin mengelola format persuratan.');
    if (selected && !bolehGanti(selected)) throw new Error('Format ini tidak dapat Anda ubah.');
    if (!file) throw new Error('Pilih berkas format surat.');
    const data = new FormData();
    data.set('file', file);
    data.set('tingkatAkses', access);
    if (!selected) {
      data.set('nama', name.trim());
      data.set('slug', slug.replace(/-+$/, ''));
      data.set('deskripsi', description);
    }
    await ambilApi(
      selected ? `/admin/letter-templates/${selected.id}/versions` : '/admin/letter-templates',
      {
        method: 'POST',
        headers: csrfHeaders(csrfToken),
        muatan: data,
      },
    );
    setNotice(
      selected
        ? `Versi baru ${selected.nama} diunggah dan menunggu persetujuan Superadmin.`
        : 'Format diunggah dan menunggu persetujuan Superadmin.',
    );
    reset();
    setRefresh((x) => x + 1);
  }
  async function publish(row: Template) {
    if (!bolehVerifikasi || !row.pendingVersionId || row.pendingStatus !== 'APPROVED')
      throw new Error('Setujui format terlebih dahulu sebelum menerbitkan.');
    await ambilApi(`/admin/letter-templates/${row.id}/versions/${row.pendingVersionId}/publish`, {
      method: 'POST',
      headers: csrfHeaders(csrfToken),
      muatan: {},
    });
    setNotice(`Versi ${row.pendingNomorVersi} ${row.nama} berhasil diterbitkan.`);
    setRefresh((value) => value + 1);
  }
  async function remove(row: Template) {
    if (!bolehHapus(row))
      throw new Error('Format yang disetujui atau terbit hanya dapat dihapus Superadmin.');
    await ambilApi(`/admin/letter-templates/${row.id}`, {
      method: 'DELETE',
      headers: csrfHeaders(csrfToken),
      muatan: {},
    });
    setNotice(`${row.nama} berhasil dihapus.`);
    setRows((data) => data.filter((item) => item.id !== row.id));
    if (selected?.id === row.id) reset();
    setRefresh((x) => x + 1);
  }
  const aktif = rows.filter((row) => row.aktif).length;
  const menungguVerifikasi = rows.filter(
    (row) => row.pendingVersionId && row.pendingStatus !== 'APPROVED',
  ).length;
  const disetujui = rows.filter((row) => row.pendingStatus === 'APPROVED').length;
  const nonaktif = rows.filter((row) => !row.aktif && !row.pendingVersionId).length;
  const tampil = rows.filter(
    (row) =>
      filter === 'SEMUA' ||
      (filter === 'AKTIF' && !!row.aktif) ||
      (filter === 'MENUNGGU_VERIFIKASI' &&
        !!row.pendingVersionId &&
        row.pendingStatus !== 'APPROVED') ||
      (filter === 'DISETUJUI' && row.pendingStatus === 'APPROVED') ||
      (filter === 'NONAKTIF' && !row.aktif && !row.pendingVersionId),
  );

  return (
    <div className={`halaman-panel mx-auto w-full ${styles.page}`}>
      <PageTitle
        title="Format Persuratan"
        description="Kelola format surat dan berkas yang digunakan di lingkungan ITH."
      />
      {notice && (
        <div className="mb-4">
          <Feedback value={{ type: 'success', message: notice }} onDismiss={() => setNotice('')} />
        </div>
      )}
      {!bolehKelola && (
        <div className="mb-4">
          <StateMessage title="Akses baca">
            Anda dapat menyaring status dan meninjau daftar format persuratan.
          </StateMessage>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <StateMessage title="Template belum dapat dimuat" kind="error">
            {error}{' '}
            <button
              type="button"
              onClick={() => setRefresh((x) => x + 1)}
              className="ml-2 underline"
            >
              Coba lagi
            </button>
          </StateMessage>
        </div>
      )}
      <div className={styles.layout}>
        <Card className="p-0! sm:p-0!">
          <div className={styles.listHeader}>
            <div>
              <p className={styles.eyebrow}>Pustaka surat</p>
              <h2>
                Daftar format <span>{loaded ? rows.length : '—'}</span>
              </h2>
            </div>
            <Button
              tone="secondary"
              ukuran="kecil"
              disabled={!bolehKelola}
              onClick={() => {
                reset();
                fokusEditor();
              }}
            >
              <Plus className="size-4" aria-hidden /> Tambah format
            </Button>
          </div>
          <div className={styles.tools}>
            <div className={styles.filters} aria-label="Status format">
              {(
                [
                  ['SEMUA', 'Semua', rows.length],
                  ['AKTIF', 'Aktif', aktif],
                  ['MENUNGGU_VERIFIKASI', 'Menunggu persetujuan', menungguVerifikasi],
                  ['DISETUJUI', 'Disetujui', disetujui],
                  ['NONAKTIF', 'Nonaktif', nonaktif],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  type="button"
                  key={id}
                  aria-label={`${label} ${count}`}
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                >
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>
          </div>
          {!loaded && !error ? (
            <p role="status" className="px-5 py-10 text-sm text-slate-500">
              Memuat format persuratan…
            </p>
          ) : tampil.length === 0 ? (
            <div className={styles.empty}>
              <FileText aria-hidden className="size-8 text-slate-300" />
              <h3>{rows.length ? 'Tidak ada format yang cocok' : 'Belum ada format persuratan'}</h3>
              <p>
                {rows.length
                  ? 'Pilih status lainnya untuk melihat format.'
                  : 'Tambahkan format surat pertama melalui formulir unggah.'}
              </p>
            </div>
          ) : (
            <ul className={styles.list}>
              {tampil.map((row) => (
                <li key={row.id} data-selected={selected?.id === row.id || undefined}>
                  <span className={styles.fileIcon} aria-hidden>
                    <FileText className="size-5" />
                  </span>
                  <div className={styles.fileInfo}>
                    <h3>{row.nama}</h3>
                    <div className={styles.meta}>
                      <span>Versi {row.nomorVersi ?? row.pendingNomorVersi ?? '—'}</span>
                      <span aria-hidden>·</span>
                      <span>
                        {(row.tingkatAkses ?? row.pendingTingkatAkses) === 'INTERNAL'
                          ? 'Dosen/Staf'
                          : 'Publik'}
                      </span>
                      {row.aktif ? (
                        <Badge color="green">Aktif</Badge>
                      ) : row.pendingVersionId ? (
                        <Badge color={row.pendingStatus === 'APPROVED' ? 'blue' : 'amber'}>
                          {row.pendingStatus === 'APPROVED'
                            ? 'Disetujui, belum terbit'
                            : 'Menunggu persetujuan'}
                        </Badge>
                      ) : (
                        <Badge color="slate">Nonaktif</Badge>
                      )}
                      {!!row.aktif && row.pendingVersionId && (
                        <Badge color={row.pendingStatus === 'APPROVED' ? 'blue' : 'amber'}>
                          Versi {row.pendingNomorVersi}{' '}
                          {row.pendingStatus === 'APPROVED'
                            ? 'disetujui, belum terbit'
                            : 'menunggu persetujuan'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <Button
                      tone="secondary"
                      ukuran="kecil"
                      disabled={!bolehGanti(row) || (!row.aktif && !row.pendingVersionId && !row.pernahTerbit)}
                      onClick={() => {
                        reset();
                        setSelected(row);
                        setAccess(row.pendingTingkatAkses ?? row.tingkatAkses ?? 'PUBLIK');
                        fokusEditor();
                      }}
                    >
                      <FileUp aria-hidden className="size-3.5" />
                      {row.pendingVersionId && bolehGanti(row) ? 'Unggah perbaikan' : 'Versi baru'}
                    </Button>
                    {(row.pendingVersionId || row.currentVersionId) && (
                      <PratinjauFormat
                        nama={row.nama}
                        canPreview={
                          (row.pendingVersionId ? row.pendingMimeType : row.mimeType) ===
                          'application/pdf'
                        }
                        previewUrl={`/api/v1/admin/letter-templates/${row.id}/versions/${row.pendingVersionId ?? row.currentVersionId}/preview`}
                        downloadUrl={`/api/v1/admin/letter-templates/${row.id}/versions/${row.pendingVersionId ?? row.currentVersionId}/download`}
                      />
                    )}
                    {row.pendingVersionId && row.pendingStatus !== 'APPROVED' && (
                      <Link
                        href="/admin/dokumen/verifikasi"
                        className={`${styles.queueLink} inline-flex min-h-11 items-center text-xs font-semibold text-institusi-700 underline underline-offset-4`}
                      >
                        Antrean Verifikasi
                      </Link>
                    )}
                    {bolehVerifikasi &&
                      row.pendingVersionId &&
                      row.pendingStatus === 'APPROVED' && (
                        <ConfirmAction
                          label="Terbitkan" icon={UploadCloud}
                          ukuran="kecil"
                          title="Terbitkan format persuratan?"
                          description={`${row.nama} versi ${row.pendingNomorVersi} akan tersedia sesuai aksesnya dan menggantikan versi terbit sebelumnya.`}
                          onConfirm={() => publish(row)}
                        />
                      )}
                    {bolehHapus(row) || !bolehUbah(row) ? <ConfirmAction
                      label="Hapus" icon={Trash2}
                      tone="danger"
                      ukuran="kecil"
                      title="Hapus format persuratan?"
                      confirmLabel="Ya, hapus"
                      description={`${row.nama} akan dihapus dari daftar pengelola dan portal. Seluruh versi berkasnya tidak lagi dapat diunduh.`}
                      disabled={!bolehHapus(row)}
                      onConfirm={() => remove(row)}
                    /> : <FormPermintaanPenghapusan sumber="TEMPLATE" resourceId={row.id} judul={row.nama} bisaTarik={!!row.currentVersionId} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.listNote}>Versi lama tetap tersimpan ketika berkas diperbarui.</p>
          <div className="px-4"><AntreanPermintaanPenghapusan sumber="TEMPLATE" /></div>
        </Card>
        <div ref={editor} tabIndex={-1} className={styles.editor}>
          <Card className="p-0! sm:p-0!">
            <div className={styles.editorHeader}>
              <span className={styles.editorIcon} aria-hidden>
                {selected ? <FileUp size={21} /> : <Plus size={21} />}
              </span>
              <div>
                <p className={styles.eyebrow}>{selected ? 'Perbarui berkas' : 'Format baru'}</p>
                <h2>{selected ? `Versi baru: ${selected.nama}` : 'Tambah format persuratan'}</h2>
              </div>
            </div>
            <fieldset disabled={!bolehKelola} className={styles.fields}>
              <p className="text-xs leading-6 text-slate-500">
                Setiap unggahan, termasuk milik Superadmin, menunggu persetujuan. Setelah disetujui,
                Superadmin menerbitkannya melalui tindakan terpisah. Versi terbit tetap tersedia
                sampai penggantinya diterbitkan.
              </p>
              {!selected && (
                <>
                  <Field
                    label="Nama"
                    id="template-name"
                    placeholder="Contoh: Surat Tugas"
                    value={name}
                    maxLength={255}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slugManual) setSlug(jadikanSlug(e.target.value));
                    }}
                  />
                  <details className={styles.details}>
                    <summary>Alamat dan deskripsi</summary>
                    <div className="mt-3 grid gap-3">
                      <Field
                        label="Slug"
                        id="template-slug"
                        value={slug}
                        onChange={(e) => {
                          setSlugManual(true);
                          setSlug(rapikanSlugKetik(e.target.value));
                        }}
                      />
                      {slugManual && (
                        <button
                          type="button"
                          className="text-left text-xs font-semibold text-institusi-700 hover:underline"
                          onClick={() => {
                            setSlugManual(false);
                            setSlug(jadikanSlug(name));
                          }}
                        >
                          Ikuti nama lagi
                        </button>
                      )}
                      <TextAreaField
                        label="Deskripsi (opsional)"
                        id="template-desc"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                  </details>
                </>
              )}
              <SelectField
                label="Akses"
                id="template-access"
                value={access}
                onChange={(e) => setAccess(e.target.value as typeof access)}
              >
                <option value="PUBLIK">Publik</option>
                <option value="INTERNAL">Dosen/Staf aktif</option>
              </SelectField>
              <p className={styles.accessNote}>
                {access === 'PUBLIK'
                  ? 'Dapat diunduh oleh seluruh pengunjung portal.'
                  : 'Hanya dapat diunduh oleh Dosen/Staf yang sudah disetujui.'}
              </p>
              <label htmlFor="template-file" className={styles.upload}>
                <UploadCloud className="size-7" aria-hidden />
                <span className={styles.uploadLabel}>Berkas ({LABEL_JENIS_BERKAS})</span>
                <span className={styles.uploadHint}>Pilih berkas dari perangkat Anda</span>
                <input
                  key={fileKey}
                  id="template-file"
                  type="file"
                  accept={TERIMA_BERKAS}
                  onChange={(e) => setFile(e.target.files?.[0])}
                />
              </label>
              {file && (
                <p className={styles.fileSelected}>
                  <FileText className="size-4 shrink-0" aria-hidden />
                  <span>
                    {file.name}
                    <small>
                      {(file.size / 1024).toLocaleString('id', { maximumFractionDigits: 1 })} KB
                    </small>
                  </span>
                </p>
              )}
              <ConfirmAction
                label={selected ? 'Unggah versi' : 'Buat template'}
                icon={UploadCloud}
                title={
                  selected ? 'Unggah versi untuk disetujui?' : 'Unggah format untuk disetujui?'
                }
                description={`${selected?.nama || name || 'Format surat'} menunggu persetujuan Superadmin. File baru hanya tersedia setelah disetujui dan diterbitkan melalui tindakan terpisah.`}
                disabled={
                  !bolehKelola ||
                  !file ||
                  (!selected && (!name.trim() || !slug.replace(/-+$/, '').trim()))
                }
                onConfirm={upload}
              />
              {selected && (
                <Button tone="secondary" onClick={reset}>
                  <X className="size-4" aria-hidden /> Batal
                </Button>
              )}
            </fieldset>
          </Card>
        </div>
      </div>
    </div>
  );
}
