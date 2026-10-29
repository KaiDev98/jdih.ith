import { open, stat } from 'node:fs/promises';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

export type JenisBerkasMasuk = 'dokumen' | 'template';
export interface ValidatedFile {
  mimeType: string;
  originalName: string;
  size: number;
}

/**
 * Daftar putih jenis berkas, sama untuk Produk Hukum dan Format Persuratan:
 * PDF dan dokumen Office Open XML (Word, Excel, PowerPoint) tanpa makro.
 * Jenis dikenali dari isi berkas, lalu ekstensi nama berkas wajib cocok.
 * Format Office lama (.doc/.xls/.ppt) dan varian bermakro (.docm dst.) ditolak
 * karena dapat membawa makro.
 */
export const MIME_PDF = 'application/pdf';
export const MIME_OFFICE = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
} as const;
/** Bagian utama yang menandai setiap jenis dokumen Office Open XML. */
const BAGIAN_UTAMA_OFFICE: Record<keyof typeof MIME_OFFICE, string> = {
  docx: 'word/document.xml',
  xlsx: 'xl/workbook.xml',
  pptx: 'ppt/presentation.xml',
};
const LABEL_MODUL: Record<JenisBerkasMasuk, string> = {
  dokumen: 'Produk Hukum',
  template: 'Format Persuratan',
};
const JENIS_DITERIMA = 'PDF, DOCX, XLSX, atau PPTX';

/** Validate content signatures rather than trusting a browser MIME or extension. */
export async function validateIncomingFile(
  path: string,
  originalName: string,
  kind: JenisBerkasMasuk,
  maxSize: number,
): Promise<ValidatedFile> {
  const info = await stat(path);
  if (!info.isFile() || info.size < 8) throw new BadRequestException('Berkas kosong/tidak sah');
  if (info.size > maxSize) throw new PayloadTooLargeException('Ukuran berkas melampaui batas');
  const safeName = safeOriginalName(originalName);
  const ekstensi = /\.([a-z0-9]+)$/i.exec(safeName)?.[1]?.toLowerCase() ?? '';
  const handle = await open(path, 'r');
  try {
    const header = Buffer.alloc(8);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (bytesRead < 4) throw new BadRequestException('Signature berkas tidak dikenal');
    if (header.subarray(0, 5).toString('ascii') === '%PDF-') {
      if (ekstensi !== 'pdf') throw new BadRequestException('Nama file PDF harus berekstensi .pdf');
      return { mimeType: MIME_PDF, originalName: safeName, size: info.size };
    }
    if (header.readUInt32LE(0) !== 0x04034b50)
      throw new BadRequestException(`${LABEL_MODUL[kind]} hanya menerima ${JENIS_DITERIMA}`);

    const tailSize = Math.min(info.size, 65_557);
    const tail = Buffer.alloc(tailSize);
    await handle.read(tail, 0, tailSize, info.size - tailSize);
    const eocd = findEndOfCentralDirectory(tail);
    if (eocd < 0) throw new BadRequestException('Berkas Office bukan arsip yang sah');
    const disk = tail.readUInt16LE(eocd + 4);
    const centralDisk = tail.readUInt16LE(eocd + 6);
    const entries = tail.readUInt16LE(eocd + 10);
    const centralSize = tail.readUInt32LE(eocd + 12);
    const centralOffset = tail.readUInt32LE(eocd + 16);
    if (disk !== 0 || centralDisk !== 0 || entries === 0xffff || centralOffset + centralSize > info.size)
      throw new BadRequestException('Arsip Office multi-disk/ZIP64 tidak didukung');

    const names = new Set<string>();
    let offset = centralOffset;
    const fixed = Buffer.alloc(46);
    for (let i = 0; i < entries && offset < centralOffset + centralSize; i += 1) {
      const read = await handle.read(fixed, 0, fixed.length, offset);
      if (read.bytesRead !== fixed.length || fixed.readUInt32LE(0) !== 0x02014b50)
        throw new BadRequestException('Central directory berkas Office tidak sah');
      const flags = fixed.readUInt16LE(8);
      const nameLength = fixed.readUInt16LE(28);
      const extraLength = fixed.readUInt16LE(30);
      const commentLength = fixed.readUInt16LE(32);
      if (flags & 1) throw new BadRequestException('Berkas Office terenkripsi tidak didukung');
      const name = Buffer.alloc(nameLength);
      await handle.read(name, 0, nameLength, offset + fixed.length);
      names.add(name.toString('utf8'));
      offset += fixed.length + nameLength + extraLength + commentLength;
    }
    if (!names.has('[Content_Types].xml')) throw new BadRequestException('Isi berkas Office tidak lengkap');
    if ([...names].some((n) => /(^|\/)vbaProject\.bin$/i.test(n)))
      throw new BadRequestException('Berkas Office bermakro tidak diterima');
    const jenis = (Object.keys(BAGIAN_UTAMA_OFFICE) as (keyof typeof MIME_OFFICE)[]).find((k) =>
      names.has(BAGIAN_UTAMA_OFFICE[k]),
    );
    if (!jenis) throw new BadRequestException(`${LABEL_MODUL[kind]} hanya menerima ${JENIS_DITERIMA}`);
    if (ekstensi !== jenis)
      throw new BadRequestException(`Nama file harus berekstensi .${jenis} sesuai isinya`);
    return { mimeType: MIME_OFFICE[jenis], originalName: safeName, size: info.size };
  } finally {
    await handle.close();
  }
}

/** Hanya PDF yang aman dan berguna ditampilkan langsung di peramban. */
export const bisaDipratinjau = (mimeType: string) => mimeType === MIME_PDF;

export function safeOriginalName(name: string) {
  const base = name.replaceAll('\\', '/').split('/').pop() ?? 'berkas';
  const safe = [...base].map((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 || /["<>:|?*]/.test(character) ? '_' : character;
  }).join('').trim();
  return (safe || 'berkas').slice(0, 255);
}

function findEndOfCentralDirectory(tail: Buffer) {
  for (let i = tail.length - 22; i >= Math.max(0, tail.length - 65_557); i -= 1) {
    if (tail.readUInt32LE(i) === 0x06054b50) {
      const commentLength = tail.readUInt16LE(i + 20);
      if (i + 22 + commentLength === tail.length) return i;
    }
  }
  return -1;
}
