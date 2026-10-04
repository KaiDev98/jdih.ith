import { describe, expect, it } from 'vitest';
import { contentDisposition } from './file-headers.js';

describe('safe file response headers', () => {
  it('uses inline/download disposition and blocks filename header injection', () => {
    const inline = contentDisposition('Keputusan\r\nX-Evil: true.pdf', 'inline');
    expect(inline.startsWith('inline;')).toBe(true);
    expect(inline).not.toContain('\r');
    expect(inline).not.toContain('\n');
    expect(contentDisposition('Formulir.docx', 'attachment')).toContain('attachment;');
  });
});
