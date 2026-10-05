import { open, stat } from 'node:fs/promises';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

export type JenisBerkasMasuk = 'dokumen' | 'template';
export interface ValidatedFile {
  mimeType: string;
  originalName: string;
  size: number;
}

const MIME_PDF = 'application/pdf';
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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
  const handle = await open(path, 'r');
  try {
    const header = Buffer.alloc(8);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (bytesRead < 4) throw new BadRequestException('Signature berkas tidak dikenal');
    if (header.subarray(0, 5).toString('ascii') === '%PDF-') {
      if (kind === 'template') throw new BadRequestException('Format Persuratan V1 wajib DOCX');
      const safeName = safeOriginalName(originalName);
      if (!/\.pdf$/i.test(safeName)) throw new BadRequestException('Nama file PDF harus berekstensi .pdf');
      return { mimeType: MIME_PDF, originalName: safeName, size: info.size };
    }
    if (kind !== 'template' || header.readUInt32LE(0) !== 0x04034b50)
      throw new BadRequestException('Produk Hukum V1 hanya menerima PDF');

    const tailSize = Math.min(info.size, 65_557);
    const tail = Buffer.alloc(tailSize);
    await handle.read(tail, 0, tailSize, info.size - tailSize);
    const eocd = findEndOfCentralDirectory(tail);
    if (eocd < 0) throw new BadRequestException('DOCX bukan arsip Office yang sah');
    const disk = tail.readUInt16LE(eocd + 4);
    const centralDisk = tail.readUInt16LE(eocd + 6);
    const entries = tail.readUInt16LE(eocd + 10);
    const centralSize = tail.readUInt32LE(eocd + 12);
    const centralOffset = tail.readUInt32LE(eocd + 16);
    if (disk !== 0 || centralDisk !== 0 || entries === 0xffff || centralOffset + centralSize > info.size)
      throw new BadRequestException('DOCX multi-disk/ZIP64 tidak didukung');

    const required = new Set(['[Content_Types].xml', 'word/document.xml']);
    let offset = centralOffset;
    const fixed = Buffer.alloc(46);
    for (let i = 0; i < entries && offset < centralOffset + centralSize; i += 1) {
      const read = await handle.read(fixed, 0, fixed.length, offset);
      if (read.bytesRead !== fixed.length || fixed.readUInt32LE(0) !== 0x02014b50)
        throw new BadRequestException('Central directory DOCX tidak sah');
      const flags = fixed.readUInt16LE(8);
      const nameLength = fixed.readUInt16LE(28);
      const extraLength = fixed.readUInt16LE(30);
      const commentLength = fixed.readUInt16LE(32);
      if (flags & 1) throw new BadRequestException('DOCX terenkripsi tidak didukung');
      const name = Buffer.alloc(nameLength);
      await handle.read(name, 0, nameLength, offset + fixed.length);
      required.delete(name.toString('utf8'));
      offset += fixed.length + nameLength + extraLength + commentLength;
    }
    if (required.size) throw new BadRequestException('Isi DOCX tidak lengkap');
    if (!/\.docx$/i.test(safeOriginalName(originalName)))
      throw new BadRequestException('Nama file harus berekstensi .docx');
    return { mimeType: MIME_DOCX, originalName: safeOriginalName(originalName), size: info.size };
  } finally {
    await handle.close();
  }
}

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
