import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmAction } from './ui';

describe('ConfirmAction', () => {
  it('meminta konfirmasi, menampilkan status proses, dan memberi feedback sukses', async () => {
    const action = vi.fn(async () => undefined);
    render(<ConfirmAction label="Terbitkan" title="Konfirmasi publikasi" description="Periksa dampak hukum." onConfirm={action} />);
    fireEvent.click(screen.getByRole('button', { name: 'Terbitkan' }));
    expect(screen.getByRole('dialog', { name: 'Konfirmasi publikasi' })).toBeInTheDocument();
    expect(screen.getByText('Periksa dampak hukum.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(await screen.findByRole('status')).toHaveTextContent('Perubahan berhasil disimpan.');
  });
});
