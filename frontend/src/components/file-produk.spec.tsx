import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileProduk } from './file-produk';

describe('FileProduk preview dialog', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps keyboard focus inside the preview and restores it after Escape', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['fixture']) })));
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:pdf-fixture'),
      revokeObjectURL: vi.fn(),
    });

    render(<FileProduk slug="test-document" fileId="1" nama="document.pdf" />);
    const trigger = screen.getByRole('button', { name: 'Preview' });
    fireEvent.click(trigger);

    const close = await screen.findByRole('button', { name: 'Tutup pratinjau' });
    await screen.findByTitle('Pratinjau PDF document.pdf');
    expect(close).toHaveFocus();

    trigger.focus();
    expect(close).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
