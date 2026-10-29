import type { Response } from 'express';
import { pipeline } from 'node:stream';
import type { AliranBerkas, RentangByte } from '../storage/storage.service.js';
import { contentDisposition } from './file-headers.js';

/** Single byte range only; no multipart buffering or filesystem paths. */
export function parseByteRange(header: string | undefined, size: number): RentangByte | undefined | false {
  if (!header?.startsWith('bytes=')) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size <= 0) return false;
  const first = match[1] ? Number(match[1]) : undefined;
  const last = match[2] ? Number(match[2]) : undefined;
  if ((first !== undefined && !Number.isSafeInteger(first)) ||
      (last !== undefined && !Number.isSafeInteger(last))) return false;
  if (first === undefined) return !last ? false : { start: Math.max(0, size - last), end: size - 1 };
  if (first >= size || (last !== undefined && last < first)) return false;
  return { start: first, end: Math.min(last ?? size - 1, size - 1) };
}

export function streamFileResponse(
  file: AliranBerkas & { mimeType: string; originalName: string }, res: Response,
  disposition: 'inline' | 'attachment', range?: RentangByte,
) {
  res.status(range ? 206 : 200);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', String(range ? range.end - range.start + 1 : file.size));
  if (range) res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${file.size}`);
  res.setHeader('Content-Disposition', contentDisposition(file.originalName, disposition));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  // pipeline destroys the source when a tab closes or a download is cancelled.
  pipeline(file.stream, res, () => undefined);
}

export function requestedRange(header: string | undefined, ifRange: string | undefined, size: number, res: Response) {
  // Without a matching validator, If-Range must fall back to the full response.
  const range = parseByteRange(ifRange ? undefined : header, size);
  if (range === false) {
    res.status(416).set({ 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store' }).end();
  }
  return range;
}
