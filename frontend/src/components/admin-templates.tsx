'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, FileUp, Plus, UploadCloud, X } from 'lucide-react';
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

type Template = {
  id: string;
  slug: string;
  nama: string;
  aktif: boolean | number;
  currentVersionId: string | null;
  nomorVersi: number | null;
  tingkatAkses: 'PUBLIK' | 'INTERNAL';
  status: string | null;
};

export function AdminTemplates() {
  const { csrfToken, pengguna } = useSession();
  const bolehKelola =
    pengguna?.status === 'AKTIF' &&
    pengguna.peran.some((peran) => peran === 'ADMIN' || peran === 'SUPERADMIN') &&
    pengguna.izin.includes('templates.manage');
  const [rows, setRows] = useState<Template[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<Template>();
  const [filter, setFilter] = useState<'SEMUA' | 'AKTIF' | 'ARSIP'>('SEMUA');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState('');
  const [access, setAccess] = useState<'PUBLIK' | 'INTERNAL'>('PUBLIK');
  const [file, setFile] = useState<File>();
  const [fileKey, setFileKey] = useState(0);
  const editor = useRef<HTMLDivElement>(null);

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
        ? `Versi baru ${selected.nama} berhasil diaktifkan.`
        : 'Format persuratan berhasil ditambahkan.',
    );
    reset();
    setRefresh((x) => x + 1);
  }
  async function archive(row: Template) {
    await ambilApi(`/admin/letter-templates/${row.id}/archive`, {
      method: 'POST',
      headers: csrfHeaders(csrfToken),
      muatan: {},
    });
    setNotice(`${row.nama} berhasil diarsipkan.`);
    if (selected?.id === row.id) reset();
    setRefresh((x) => x + 1);
  }
  const aktif = rows.filter((row) => row.aktif).length;
  const tampil = rows.filter(
    (row) => filter === 'SEMUA' || (filter === 'AKTIF' ? !!row.aktif : !row.aktif),
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
                  ['ARSIP', 'Arsip', rows.length - aktif],
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
                      <span>Versi {row.nomorVersi ?? '—'}</span>
                      <span aria-hidden>·</span>
                      <span>{row.tingkatAkses === 'INTERNAL' ? 'Dosen/Staf' : 'Publik'}</span>
                      <Badge color={row.aktif ? 'green' : 'slate'}>
                        {row.aktif ? 'Aktif' : 'Arsip'}
                      </Badge>
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <Button
                      tone="secondary"
                      ukuran="kecil"
                      disabled={!bolehKelola || !row.aktif}
                      onClick={() => {
                        reset();
                        setSelected(row);
                        setAccess(row.tingkatAkses);
                        fokusEditor();
                      }}
                    >
                      <FileUp aria-hidden className="size-3.5" /> Versi baru
                    </Button>
                    {!!row.aktif && (
                      <ConfirmAction
                        label="Arsipkan"
                        tone="danger"
                        ukuran="kecil"
                        title="Arsipkan template?"
                        description={`${row.nama} tidak lagi tersedia untuk diunduh. Riwayat versinya tetap disimpan.`}
                        disabled={!bolehKelola}
                        onConfirm={() => archive(row)}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.listNote}>Versi lama tetap tersimpan ketika berkas diperbarui.</p>
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
                {selected
                  ? 'Berkas baru langsung aktif. Versi sebelumnya disimpan sebagai arsip.'
                  : 'Siapkan berkas surat yang siap diisi dan digunakan.'}
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
                title={selected ? 'Unggah dan aktifkan versi baru?' : 'Buat template?'}
                description={
                  selected
                    ? `Berkas baru untuk ${selected.nama} langsung aktif; versi sebelumnya diarsipkan.`
                    : `${name || 'Format surat'} akan tersedia sesuai akses yang dipilih.`
                }
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
