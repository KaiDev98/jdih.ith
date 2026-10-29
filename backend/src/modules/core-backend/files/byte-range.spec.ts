import { describe, expect, it } from 'vitest';
import { PassThrough } from 'node:stream';
import type { Response } from 'express';
import { parseByteRange, streamFileResponse } from './byte-range.js';

describe('single HTTP byte ranges', () => {
  it.each([
    ['bytes=0-9', { start: 0, end: 9 }], ['bytes=90-', { start: 90, end: 99 }],
    ['bytes=-10', { start: 90, end: 99 }], ['bytes=-200', { start: 0, end: 99 }],
    ['bytes=90-999', { start: 90, end: 99 }], [undefined, undefined], ['items=0-1', undefined],
  ])('parses %s', (header, result) => expect(parseByteRange(header, 100)).toEqual(result));
  it.each(['bytes=100-', 'bytes=10-9', 'bytes=-0', 'bytes=-', 'bytes=0-1,5-9', 'bytes=a-b', 'bytes=9007199254740992-'])
    ('rejects unsatisfiable or unsupported %s', header => expect(parseByteRange(header, 100)).toBe(false));
  it('rejects ranges on an empty file', () => expect(parseByteRange('bytes=0-', 0)).toBe(false));

  it('closes the source stream when the client disconnects', async () => {
    const source = new PassThrough();
    const destination = Object.assign(new PassThrough(), { status: () => undefined, setHeader: () => undefined });
    const closed = new Promise<void>(done => source.once('close', done));
    streamFileResponse({ stream: source, size: 100, mimeType: 'application/pdf', originalName: 'document.pdf' }, destination as unknown as Response, 'inline');
    destination.destroy();
    await closed;
    expect(source.destroyed).toBe(true);
  });
});
