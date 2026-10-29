import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmAction } from './ui';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

describe('ConfirmAction', () => {
  it('konfirmasi di atas dialog tinjauan tetap dapat dibatalkan tanpa menutup tinjauan', async () => {
    const action = vi.fn();
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Tinjau akun</DialogTitle>
          <DialogDescription>Periksa pendaftar.</DialogDescription>
          <ConfirmAction
            label="Setujui"
            title="Setujui akun?"
            description="Akun akan diaktifkan."
            onConfirm={action}
          />
        </DialogContent>
      </Dialog>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Setujui' }));
    expect(screen.getByRole('dialog', { name: 'Setujui akun?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Tinjau akun' })).toBeInTheDocument(),
    );
    expect(action).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Setujui' })).toHaveFocus());
  });
  it('merender dialog di portal, memusatkan fokus pada Batal dan mengembalikan fokus setelah dibatalkan', async () => {
    const action = vi.fn();
    const { container } = render(
      <ConfirmAction
        label="Ajukan"
        title="Ajukan dokumen?"
        description="Kirim untuk diperiksa."
        onConfirm={action}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Ajukan' });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Ajukan dokumen?' });
    expect(container.contains(dialog)).toBe(false);
    expect(screen.getByRole('button', { name: 'Batal' })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(action).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
  it('menahan penutupan dan klik berulang selama permintaan diproses', async () => {
    let finish: () => void = () => {};
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <ConfirmAction
        label="Simpan"
        title="Simpan perubahan?"
        description="Periksa data."
        onConfirm={action}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    expect(screen.getByRole('button', { name: 'Memproses…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tutup' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(action).toHaveBeenCalledOnce();
    await act(async () => finish());
    expect(await screen.findByRole('status')).toHaveTextContent('Perubahan berhasil disimpan.');
  });
  it('meminta konfirmasi, menampilkan status proses, dan memberi feedback sukses', async () => {
    const action = vi.fn(async () => undefined);
    render(
      <ConfirmAction
        label="Terbitkan"
        title="Konfirmasi publikasi"
        description="Periksa dampak hukum."
        onConfirm={action}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Terbitkan' }));
    expect(screen.getByRole('dialog', { name: 'Konfirmasi publikasi' })).toBeInTheDocument();
    expect(screen.getByText('Periksa dampak hukum.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(await screen.findByRole('status')).toHaveTextContent('Perubahan berhasil disimpan.');
  });

  it('menampilkan galat di dalam dialog yang tetap terbuka', async () => {
    const action = vi.fn(() => Promise.reject(new Error('Transisi workflow tidak sah')));
    render(
      <ConfirmAction
        label="Setujui"
        title="Setujui dokumen?"
        description="Periksa ulang."
        onConfirm={action}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Setujui' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, lanjutkan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Setujui dokumen?' });
    await waitFor(() => expect(dialog.querySelector('[role="alert"]')).not.toBeNull());
    expect(dialog).toHaveTextContent('Transisi workflow tidak sah');
  });

  it('memuat isian tambahan dan menahan konfirmasi sampai diisi', () => {
    const { rerender } = render(
      <ConfirmAction
        label="Nonaktifkan"
        title="Nonaktifkan akun?"
        description="Sesi dicabut."
        confirmDisabled
        onConfirm={vi.fn()}
      >
        <textarea aria-label="Alasan" />
      </ConfirmAction>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Nonaktifkan' }));
    expect(screen.getByRole('textbox', { name: 'Alasan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ya, lanjutkan' })).toBeDisabled();
    rerender(
      <ConfirmAction
        label="Nonaktifkan"
        title="Nonaktifkan akun?"
        description="Sesi dicabut."
        onConfirm={vi.fn()}
      >
        <textarea aria-label="Alasan" />
      </ConfirmAction>,
    );
    expect(screen.getByRole('button', { name: 'Ya, lanjutkan' })).toBeEnabled();
  });
});
