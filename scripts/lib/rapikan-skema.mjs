/**
 * Merapikan berkas skema hasil `drizzle-kit pull` pada MariaDB.
 *
 * Introspeksi drizzle-kit menghasilkan beberapa kekeliruan yang khas MariaDB.
 * Penyebab dasarnya satu: MariaDB melaporkan metadata kolom dengan bentuk yang
 * berbeda dari MySQL, dan drizzle-kit hanya diuji terhadap MySQL.
 *
 * Empat kekeliruan yang diperbaiki di sini — tiga di antaranya membuat berkasnya
 * tidak dapat dikompilasi sama sekali:
 *
 *  1. NILAI BAKU BERPETIK RANGKAP TIGA  →  TypeScript tidak sah
 *       .default('''id''')                     menjadi  .default('id')
 *     MariaDB mengembalikan COLUMN_DEFAULT beserta tanda petiknya, lalu
 *     drizzle-kit membubuhkan petik sekali lagi.
 *
 *  2. NILAI BAKU BERPETIK TERLOLOS  →  nilainya salah, meskipun sah sebagai kode
 *       .default('\'lokal\'')                  menjadi  .default('lokal')
 *     Tanpa diperbaiki, nilai bakunya adalah teks "'lokal'" lengkap dengan
 *     tanda petik, bukan "lokal".
 *
 *  3. NILAI BAKU "NULL" SEBAGAI TEKS  →  bukan NULL, melainkan teks empat huruf
 *       .default('NULL')                       dihapus seluruhnya
 *     Kolom yang memang tidak memiliki nilai baku dilaporkan MariaDB sebagai
 *     teks "NULL", lalu diterjemahkan drizzle-kit sebagai nilai baku sungguhan.
 *
 *  4. FUNGSI SQL SEBAGAI TEKS  →  tersimpan sebagai teks, bukan dijalankan
 *       .default('current_timestamp()')        menjadi  .default(sql`current_timestamp()`)
 *
 *  Ditambah satu perbaikan impor:
 *
 *  5. PEMBANGUN KOLOM YANG TIDAK DIIMPOR  →  TypeScript tidak sah
 *     `bigint` dipakai 138 kali tetapi tidak tercantum pada daftar impor.
 *     Karena `bigint` juga merupakan kata kunci TypeScript, kekeliruannya
 *     muncul sebagai galat yang menyesatkan, bukan "nama tidak ditemukan".
 *
 * Fungsi di bawah bersifat murni (tidak menyentuh berkas) agar dapat diuji.
 */

/** Seluruh pembangun kolom dan pembantu yang mungkin dipakai berkas terbangkit. */
const PEMBANGUN_DRIZZLE = [
  'mysqlTable',
  'mysqlSchema',
  'mysqlView',
  'mysqlEnum',
  'AnyMySqlColumn',
  'index',
  'uniqueIndex',
  'primaryKey',
  'foreignKey',
  'unique',
  'check',
  'bigint',
  'int',
  'smallint',
  'tinyint',
  'mediumint',
  'decimal',
  'double',
  'float',
  'real',
  'serial',
  'boolean',
  'char',
  'varchar',
  'text',
  'tinytext',
  'mediumtext',
  'longtext',
  'binary',
  'varbinary',
  'json',
  'date',
  'datetime',
  'time',
  'timestamp',
  'year',
];

/**
 * @param {string} isi Berkas schema.ts hasil introspeksi.
 * @returns {{ isi: string, perbaikan: Record<string, number> }}
 */
export function rapikanSkema(isi) {
  const perbaikan = {
    petikRangkapTiga: 0,
    petikTerlolos: 0,
    bakuNullTeks: 0,
    fungsiSql: 0,
    imporDitambahkan: 0,
  };

  let hasil = isi;

  // 1. .default('''nilai''')  →  .default('nilai')
  hasil = hasil.replace(/\.default\('''(.*?)'''\)/g, (_, nilai) => {
    perbaikan.petikRangkapTiga += 1;
    return `.default('${nilai}')`;
  });

  // 2. .default('\'nilai\'')  →  .default('nilai')
  //    Pada teks berkas, urutan karakternya: ' \ ' nilai \ ' '
  hasil = hasil.replace(/\.default\('\\'(.*?)\\''\)/g, (_, nilai) => {
    perbaikan.petikTerlolos += 1;
    return `.default('${nilai}')`;
  });

  // 4. Fungsi SQL — dikerjakan sebelum langkah 3 supaya tidak ikut terhapus.
  //    Dikenali dari tanda kurung pemanggilan fungsi pada akhir nilainya.
  hasil = hasil.replace(/\.default\('([a-z_]+\(\))'\)/gi, (_, fungsi) => {
    perbaikan.fungsiSql += 1;
    return `.default(sql\`${fungsi}\`)`;
  });

  // 3. .default('NULL')  →  dihapus; kolomnya memang tidak bernilai baku.
  hasil = hasil.replace(/\.default\('NULL'\)/g, () => {
    perbaikan.bakuNullTeks += 1;
    return '';
  });

  // 5. Melengkapi daftar impor dari drizzle-orm/mysql-core.
  hasil = lengkapiImpor(hasil, perbaikan);

  return { isi: hasil, perbaikan };
}

/**
 * Menambahkan pembangun kolom yang dipakai berkas tetapi belum tercantum pada
 * pernyataan impor drizzle-orm/mysql-core.
 */
function lengkapiImpor(isi, perbaikan) {
  const polaImpor = /^import \{([^}]*)\} from "drizzle-orm\/mysql-core"/m;
  const cocok = polaImpor.exec(isi);
  if (!cocok) return isi;

  const sudahAda = new Set(
    cocok[1]
      .split(',')
      .map((bagian) => bagian.trim())
      .filter(Boolean),
  );

  // Badan berkas tanpa baris impor, agar pemakaian pada impor tidak terhitung.
  const badan = isi.slice(cocok.index + cocok[0].length);

  const perlu = PEMBANGUN_DRIZZLE.filter((nama) => {
    if (sudahAda.has(nama)) return false;
    // Dipakai sebagai pemanggilan fungsi atau sebagai anotasi tipe.
    return new RegExp(`(?:^|[^\\w.])${nama}\\s*[(<]`, 'm').test(badan);
  });

  if (perlu.length === 0) return isi;

  perbaikan.imporDitambahkan = perlu.length;
  const daftarBaru = [...sudahAda, ...perlu].join(', ');
  return isi.replace(polaImpor, `import { ${daftarBaru} } from "drizzle-orm/mysql-core"`);
}
