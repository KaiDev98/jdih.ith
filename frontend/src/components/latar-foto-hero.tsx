/**
 * Latar hero: foto gedung rektorat ITH (papan nama dan bendera) di balik
 * lapisan biru institusi. Foto sudah dipotong agar papan nama berada sedikit
 * di kanan tengah; di layar sempit potongan ikut berpusat ke papan nama.
 *
 * `beranda`: lapisan dibuka di kanan tengah, celah antara teks dan lingkaran
 * logo, sehingga gedung tampak jelas; sisi kiri tetap gelap untuk teks. Hero
 * halaman lain memakai lapisan yang lebih rata karena judulnya lebih lebar.
 */
export function LatarFotoHero({ beranda = false }: { beranda?: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- foto sudah dioptimalkan (WebP, dua ukuran) */}
      <img
        src="/gambar/gedung-ith.webp"
        srcSet="/gambar/gedung-ith-1280.webp 1280w, /gambar/gedung-ith.webp 2400w"
        sizes="100vw"
        alt=""
        fetchPriority="high"
        className={`absolute inset-0 size-full object-cover object-[62%_40%] ${beranda ? 'max-lg:scale-105 max-lg:blur-[3px]' : ''}`}
      />
      <div
        className={
          beranda
            ? 'absolute inset-0 bg-[linear-gradient(100deg,rgb(10_25_50/0.95)_0%,rgb(12_31_61/0.88)_34%,rgb(16_44_86/0.56)_58%,rgb(16_44_86/0.44)_72%,rgb(14_37_72/0.66)_100%)] max-lg:bg-[linear-gradient(180deg,rgb(12_30_60/0.74)_0%,rgb(12_30_60/0.9)_38%,rgb(12_30_60/0.92)_100%)]'
            : 'absolute inset-0 bg-[linear-gradient(100deg,rgb(11_27_54/0.93)_0%,rgb(15_40_78/0.84)_48%,rgb(19_56_104/0.6)_100%)] max-lg:bg-[rgb(12_30_60/0.84)]'
        }
      />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-[#13315c]/70 to-transparent" />
    </div>
  );
}
