import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ambilApi } from '@/lib/api-client';
import { FormPemulihanPassword } from './form-pemulihan-password';
vi.mock('@/lib/api-client', () => ({ ambilApi: vi.fn() }));
const token = 'a'.repeat(43);
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
  vi.mocked(ambilApi).mockResolvedValue({ tersedia: true });
});
afterEach(() => {
  cleanup();
});
describe('pemulihan password Dosen/Staf', () => {
  it('meminta email dengan konfirmasi, pesan generik, dan tanpa pilihan Admin', async () => {
    vi.mocked(ambilApi)
      .mockResolvedValueOnce({ tersedia: true })
      .mockResolvedValueOnce({ pesan: 'Jika email terdaftar, tautan pemulihan akan dikirim.' });
    render(<FormPemulihanPassword mode="request" />);
    const submit = await screen.findByRole('button', { name: /Kirim tautan pemulihan/ });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Email terdaftar'), {
      target: { value: 'staf@example.test' },
    });
    fireEvent.click(submit);
    await screen.findByRole('dialog');
    expect(ambilApi).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Kirim permintaan' }));
    await screen.findByText('Permintaan diterima');
    expect(ambilApi).toHaveBeenLastCalledWith(
      '/auth/password-recovery',
      expect.objectContaining({ method: 'POST', muatan: { email: 'staf@example.test' } }),
    );
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Kembali ke login/ })).toHaveAttribute(
      'href',
      '/masuk',
    );
  });
  it('SMTP tidak tersedia tidak berpura-pura mengirim email', async () => {
    vi.mocked(ambilApi).mockResolvedValue({ tersedia: false });
    render(<FormPemulihanPassword mode="request" />);
    await screen.findByText(/Pemulihan password belum tersedia/);
    expect(screen.getByRole('button', { name: /Kirim tautan/ })).toBeDisabled();
    expect(ambilApi).toHaveBeenCalledTimes(1);
  });
  it('tautan tanpa token tidak menampilkan formulir password', async () => {
    render(<FormPemulihanPassword mode="reset" />);
    await screen.findByText(/Tautan pemulihan tidak valid/);
    expect(screen.queryByLabelText('Password baru')).not.toBeInTheDocument();
    expect(ambilApi).not.toHaveBeenCalled();
  });
  it('token dari fragmen URL dikirim lewat POST dan dihapus setelah berhasil', async () => {
    window.history.replaceState(null, '', `/atur-ulang-password#token=${token}`);
    vi.mocked(ambilApi).mockResolvedValue({ diatur: true });
    render(<FormPemulihanPassword mode="reset" />);
    const password = await screen.findByLabelText('Password baru');
    fireEvent.change(password, { target: { value: 'PasswordBaru123' } });
    fireEvent.change(screen.getByLabelText('Konfirmasi password baru'), {
      target: { value: 'PasswordBaru123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Simpan password baru/ }));
    await screen.findByRole('dialog');
    expect(ambilApi).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Simpan password' }));
    await screen.findByText('Password berhasil diubah');
    expect(ambilApi).toHaveBeenLastCalledWith(
      '/auth/password-recovery/confirm',
      expect.objectContaining({
        muatan: { token, passwordBaru: 'PasswordBaru123', konfirmasiPassword: 'PasswordBaru123' },
      }),
    );
    expect(window.location.hash).toBe('');
    expect(screen.getByRole('link', { name: /Masuk dengan password baru/ })).toHaveAttribute(
      'href',
      '/masuk',
    );
  });
  it('konfirmasi tidak sama tidak mengirim permintaan dan galat server tetap ditampilkan', async () => {
    window.history.replaceState(null, '', `/atur-ulang-password#token=${token}`);
    vi.mocked(ambilApi).mockRejectedValue(new Error('Tautan sudah kedaluwarsa.'));
    render(<FormPemulihanPassword mode="reset" />);
    fireEvent.change(await screen.findByLabelText('Password baru'), {
      target: { value: 'PasswordBaru123' },
    });
    const confirmation = screen.getByLabelText('Konfirmasi password baru');
    fireEvent.change(confirmation, { target: { value: 'berbeda' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan password baru/ }));
    await screen.findByText('Konfirmasi password tidak sama');
    expect(ambilApi).not.toHaveBeenCalled();
    fireEvent.change(confirmation, { target: { value: 'PasswordBaru123' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan password baru/ }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan password' }));
    await screen.findByText('Tautan sudah kedaluwarsa.');
    expect(screen.queryByText('Password berhasil diubah')).not.toBeInTheDocument();
  });
});
