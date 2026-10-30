'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, FileSignature, FileText, LoaderCircle } from 'lucide-react';
import type {
  HasilCariAnonim,
  HasilCariAuthorized,
  ItemTemplateAuthorized,
  ItemTemplatePublik,
} from '@jdih/shared';
import { ambilApiBerdaftar, type HasilBerdaftar } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';
import { ToolbarBerkas } from './daftar-berkas-publik';
import { TandaStatus } from './tanda-status';
import { UnduhTemplate } from './unduh-template';
import { StateMessage } from './ui';
import styles from './koleksi-berkas.module.css';

type Berkas = HasilCariAnonim | HasilCariAuthorized | ItemTemplatePublik | ItemTemplateAuthorized;
type Jenis = 'format' | 'sk';

function KartuBerkas({ item }: { item: Berkas }) {
  if ('nama' in item)
    return (
      <li className={styles.format}>
        <div className={styles.formatHeader}>
          <FileText size={22} strokeWidth={1.4} aria-hidden />
          <span>Format surat</span>
        </div>
        <h3 className="line-clamp-3" title={item.nama}>
          {item.nama}
        </h3>
        <div className={styles.formatFooter}>
          <span>
            {'tingkatAkses' in item && item.tingkatAkses === 'INTERNAL'
              ? 'Khusus Dosen/Staf aktif'
              : 'Siap digunakan'}
          </span>
          <UnduhTemplate slug={item.slug} nama={item.nama} />
        </div>
      </li>
    );
  return (
    <li className={styles.procedureItem}>
      <Link
        href={`/produk-hukum/${item.slug}?asal=permohonan-sk`}
        className={styles.procedure}
        aria-labelledby={`judul-sop-${item.id}`}
      >
        <div className={styles.procedureHeader}>
          <span className={styles.procedureIcon} aria-hidden>
            <FileSignature size={22} strokeWidth={1.5} />
          </span>
          <TandaStatus status={item.statusHukum} />
        </div>
        <div className={styles.procedureContent}>
          <h3 id={`judul-sop-${item.id}`} title={item.judul} className="line-clamp-3">
            {item.judul}
          </h3>
          <div className={styles.procedureMeta}>
            <span className="line-clamp-1" title={item.nomor}>
              No. {item.nomor}
            </span>
            {item.tahun && <span>Tahun {item.tahun}</span>}
          </div>
          {'tingkatAkses' in item && item.tingkatAkses === 'internal' && (
            <p className={styles.procedureAccess}>Khusus Dosen/Staf aktif</p>
          )}
        </div>
        <span className={styles.procedureLink}>
          Buka dokumen <ArrowRight size={16} aria-hidden />
        </span>
      </Link>
    </li>
  );
}

export function KoleksiBerkas({
  jenis,
  initial,
  halaman = 1,
  galatAwal = '',
}: {
  jenis: Jenis;
  initial?: HasilBerdaftar<Berkas>;
  halaman?: number;
  galatAwal?: string;
}) {
  const session = useSession();
  const sessionKey =
    session.state === 'loading'
      ? null
      : `${session.state}:${session.pengguna?.id ?? ''}:${session.pengguna?.status ?? ''}`;
  const lastSession = useRef<string | null>(null);
  const [data, setData] = useState<readonly Berkas[]>(initial?.data ?? []);
  const [meta, setMeta] = useState(initial?.meta);
  const [page, setPage] = useState(halaman);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(galatAwal);
  const area = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const path = jenis === 'format' ? '/format-persuratan' : '/permohonan-sk';

  const load = useCallback(
    async (nextPage: number, reset = false) => {
      if (inFlight.current && !reset) return;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      const id = ++generation.current;
      inFlight.current = true;
      setBusy(true);
      setError('');
      if (reset) {
        setData([]);
        setMeta(undefined);
        setPage(1);
        if (area.current) area.current.scrollTop = 0;
      }
      try {
        const result = await ambilApiBerdaftar<Berkas>(
          jenis === 'format' ? '/letter-templates' : '/public/documents/permohonan-sk',
          {
            cache: 'no-store',
            signal: controller.signal,
            kueri: { halaman: nextPage, perHalaman: 12 },
          },
        );
        if (generation.current !== id) return;
        setData((old) =>
          reset
            ? result.data
            : [...old, ...result.data.filter((item) => !old.some((x) => x.id === item.id))],
        );
        setMeta(result.meta);
        setPage(nextPage);
      } catch (cause) {
        if (controller.signal.aborted || generation.current !== id) return;
        setError(
          cause instanceof Error ? cause.message : 'Berkas belum dapat dimuat. Silakan coba lagi.',
        );
      } finally {
        if (generation.current === id) {
          inFlight.current = false;
          setBusy(false);
        }
      }
    },
    [jenis],
  );

  useEffect(
    () => () => {
      generation.current++;
      request.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (sessionKey === null) return;
    const previous = lastSession.current;
    lastSession.current = sessionKey;
    if (previous !== null && previous !== sessionKey) void load(1, true);
  }, [sessionKey, load]);

  const more = !!meta && page < meta.totalHalaman;
  useEffect(() => {
    if (!more || busy || error || !sentinel.current || typeof IntersectionObserver === 'undefined')
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void load(page + 1);
      },
      { root: area.current, rootMargin: '0px 0px 100px 0px' },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [more, busy, error, page, load]);

  return (
    <section
      aria-label={jenis === 'format' ? 'Koleksi format persuratan' : 'Koleksi SOP Permohonan SK'}
    >
      <ToolbarBerkas
        judul={jenis === 'format' ? 'Pustaka Format Surat' : 'Prosedur Permohonan SK'}
        total={meta?.totalButir ?? 0}
      />
      <p className={styles.scrollHint}>Gulir di dalam daftar untuk melihat berkas lainnya.</p>
      <div
        ref={area}
        data-gulir-dokumen
        data-jenis={jenis}
        className={styles.collectionScroll}
        tabIndex={0}
        role="region"
        aria-label={jenis === 'format' ? 'Daftar format persuratan' : 'Daftar SOP Permohonan SK'}
        aria-busy={busy}
      >
        {data.length > 0 && (
          <ul
            aria-label={
              jenis === 'format' ? 'Daftar format persuratan' : 'Daftar SOP Permohonan SK'
            }
            className={jenis === 'format' ? styles.formats : styles.procedures}
          >
            {data.map((item) => (
              <KartuBerkas key={item.id} item={item} />
            ))}
          </ul>
        )}
        {!data.length && !busy && !error && (
          <StateMessage
            title={
              jenis === 'format' ? 'Belum ada format yang tersedia' : 'Belum ada SOP yang tersedia'
            }
          >
            Berkas akan tampil setelah diterbitkan.
          </StateMessage>
        )}
        {error && (
          <div className={styles.collectionFeedback} role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void load(data.length ? page + 1 : 1, !data.length)}
            >
              Coba lagi
            </button>
          </div>
        )}
        {busy && (
          <p role="status" className={styles.collectionFeedback}>
            <LoaderCircle size={17} className="animate-spin" aria-hidden />
            Memuat berkas…
          </p>
        )}
        {more && !busy && !error && (
          <div className={styles.collectionFeedback}>
            <button type="button" onClick={() => void load(page + 1)}>
              Muat berkas berikutnya <ArrowRight size={15} aria-hidden />
            </button>
          </div>
        )}
        <div ref={sentinel} aria-hidden className={styles.sentinel} />
      </div>
      <div className={styles.collectionSummary} aria-live="polite">
        <span>
          Menampilkan {data.length} dari {meta?.totalButir ?? 0} berkas
        </span>
        {halaman > 1 && (
          <Link href={path}>
            Lihat dari awal <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}
