/**
 * Section hero untuk halaman publik selain beranda. Gaya sama dengan hero
 * beranda (gradien institusi dan lingkaran dekoratif) tetapi lebih ringkas,
 * supaya isi halaman tetap terlihat tanpa menggulir jauh.
 */
export function HeroHalaman({
  label,
  judul,
  deskripsi,
  children,
}: {
  /** Teks kecil di atas judul, mis. nama jenis dokumen. */
  label?: string;
  judul: string;
  deskripsi?: React.ReactNode;
  /** Isi tambahan di bawah deskripsi, mis. tautan kembali. */
  children?: React.ReactNode;
}) {
  return (
    <section className="hero-beranda relative overflow-hidden text-white">
      <div
        aria-hidden
        className="absolute -top-40 -right-24 size-[28rem] rounded-full border-[48px] border-white/5"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {label && (
          <p className="text-sm font-semibold tracking-[0.16em] text-white/90 uppercase">{label}</p>
        )}
        <h1 className="mt-3 max-w-4xl text-3xl leading-tight font-bold tracking-tight [overflow-wrap:anywhere] sm:text-4xl lg:text-5xl">
          {judul}
        </h1>
        {deskripsi && <p className="mt-4 max-w-2xl text-lg leading-8 text-white">{deskripsi}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
