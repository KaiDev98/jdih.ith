import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { bisaDipratinjau, MIME_OFFICE, validateIncomingFile } from './file-validation.js';

/** Arsip ZIP minimal (tanpa kompresi) berisi entri yang diminta. */
function zip(names: readonly string[]) {
  const crc32 = (bytes: Buffer) => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const name of names) {
    const filename = Buffer.from(name);
    const body = Buffer.from('<?xml version="1.0"?><x/>');
    const crc = crc32(body);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18); local.writeUInt32LE(body.length, 22); local.writeUInt16LE(filename.length, 26);
    locals.push(local, filename, body);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(body.length, 20); central.writeUInt32LE(body.length, 24);
    central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
    centrals.push(central, filename);
    offset += local.length + filename.length + body.length;
  }
  const centralBytes = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(names.length, 8); end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(centralBytes.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, end]);
}

describe('incoming file signature validation', () => {
  let root = '';
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
    root = '';
  });
  async function file(name: string, bytes: Buffer) {
    if (!root) root = await mkdtemp(join(tmpdir(), 'jdih-file-validation-'));
    const path = join(root, name);
    await writeFile(path, bytes);
    return path;
  }

  it('accepts a PDF by signature and normalizes path-like submitted names', async () => {
    const path = await file('upload', Buffer.from('%PDF-1.7\nbody\n'));
    await expect(validateIncomingFile(path, '..\\private\\legal.pdf', 'dokumen', 1000)).resolves.toMatchObject({
      mimeType: 'application/pdf',
      originalName: 'legal.pdf',
    });
  });

  it('rejects extension-only PDF, oversized data and a PDF without .pdf name', async () => {
    const path = await file('fake.pdf', Buffer.from('not a PDF file'));
    await expect(validateIncomingFile(path, 'fake.pdf', 'dokumen', 1000)).rejects.toThrow();
    await expect(validateIncomingFile(path, 'fake.pdf', 'dokumen', 2)).rejects.toThrow();
    const pdf = await file('real-pdf', Buffer.from('%PDF-1.7\nbody\n'));
    await expect(validateIncomingFile(pdf, 'surat.docx', 'dokumen', 1000)).rejects.toThrow(/\.pdf/);
  });

  it('accepts PDF and Office Open XML files in both modules', async () => {
    const pdf = await file('pdf', Buffer.from('%PDF-1.7\nbody\n'));
    await expect(validateIncomingFile(pdf, 'format.pdf', 'template', 1000)).resolves.toMatchObject({
      mimeType: 'application/pdf',
    });
    const kasus = [
      ['docx', 'word/document.xml'],
      ['xlsx', 'xl/workbook.xml'],
      ['pptx', 'ppt/presentation.xml'],
    ] as const;
    for (const [jenis, bagian] of kasus) {
      const path = await file(jenis, zip(['[Content_Types].xml', bagian]));
      for (const modul of ['dokumen', 'template'] as const)
        await expect(validateIncomingFile(path, `Berkas.${jenis.toUpperCase()}`, modul, 10_000)).resolves.toEqual({
          mimeType: MIME_OFFICE[jenis],
          originalName: `Berkas.${jenis.toUpperCase()}`,
          size: expect.any(Number) as number,
        });
    }
  });

  it('requires the extension to match the detected Office type', async () => {
    const xlsx = await file('xlsx', zip(['[Content_Types].xml', 'xl/workbook.xml']));
    await expect(validateIncomingFile(xlsx, 'tabel.docx', 'template', 10_000)).rejects.toThrow(/\.xlsx/);
  });

  it('rejects macro-enabled, incomplete, unknown ZIP and legacy Office files', async () => {
    const makro = await file('makro', zip(['[Content_Types].xml', 'word/document.xml', 'word/vbaProject.bin']));
    await expect(validateIncomingFile(makro, 'surat.docx', 'template', 10_000)).rejects.toThrow(/makro/);
    const tanpaTipe = await file('tanpa-tipe', zip(['word/document.xml']));
    await expect(validateIncomingFile(tanpaTipe, 'surat.docx', 'template', 10_000)).rejects.toThrow();
    const zipBiasa = await file('zip', zip(['[Content_Types].xml', 'isi/apa-saja.txt']));
    await expect(validateIncomingFile(zipBiasa, 'arsip.docx', 'dokumen', 10_000)).rejects.toThrow(/PDF, DOCX/);
    // Format Office lama (OLE/CFB) dapat membawa makro.
    const doc = await file('doc', Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]));
    await expect(validateIncomingFile(doc, 'lama.doc', 'template', 10_000)).rejects.toThrow();
  });

  it('only PDF is previewable inline', () => {
    expect(bisaDipratinjau('application/pdf')).toBe(true);
    for (const mime of Object.values(MIME_OFFICE)) expect(bisaDipratinjau(mime)).toBe(false);
  });
});
