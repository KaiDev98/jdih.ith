import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DialogGantiPassword } from './dialog-ganti-password';

vi.mock('@/lib/sesi', () => ({
  useSession: () => ({ csrfToken: 'csrf' }),
  csrfHeaders: () => ({}),
}));

function balasan(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

function siapkanApi(
  postStatus = 200,
  postBody: unknown = {
    sukses: true,
    data: { punyaPassword: true, diubahPada: '2026-10-08 05:00:00.000000' },
  },
) {
  const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
    init?.method === 'POST'
      ? balasan(postStatus, postBody)
      : balasan(200, { sukses: true, data: { punyaPassword: true, diubahPada: null } }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const isi = (label: string, nilai: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value: nilai } });

describe('DialogGantiPassword', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('menampilkan pesan validasi dan syarat password saat isian salah', async () => {
    const fetchMock = siapkanApi();
    render(<DialogGantiPassword buka onBukaChange={() => undefined} />);
    await screen.findByLabelText('Password saat ini');
    isi('Password saat ini', 'LamaSekali1');
    isi('Password baru', 'pendek');
    isi('Konfirmasi password baru', 'beda');
    expect(screen.getByText('Minimal 10 karakter').textContent).toContain('(belum)');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan password' }));
    expect(await screen.findByText('Password minimal 10 karakter')).toBeInTheDocument();
    expect(screen.getByText('Konfirmasi password tidak sama')).toBeInTheDocument();
    expect(screen.getByLabelText('Password baru')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('memasang galat "password saat ini salah" dari server pada kolomnya', async () => {
    siapkanApi(422, {
      sukses: false,
      galat: { kode: 'TIDAK_DAPAT_DIPROSES', pesan: 'Password saat ini salah' },
    });
    render(<DialogGantiPassword buka onBukaChange={() => undefined} />);
    await screen.findByLabelText('Password saat ini');
    isi('Password saat ini', 'SalahSekali1');
    isi('Password baru', 'BaruSekali22');
    isi('Konfirmasi password baru', 'BaruSekali22');
    expect(screen.getByText('Minimal 10 karakter').textContent).toContain('(terpenuhi)');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan password' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Password saat ini')).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(screen.getByText('Password saat ini salah')).toBeInTheDocument();
  });

  it('menampilkan keberhasilan setelah password tersimpan', async () => {
    siapkanApi();
    render(<DialogGantiPassword buka onBukaChange={() => undefined} />);
    await screen.findByLabelText('Password saat ini');
    isi('Password saat ini', 'LamaSekali1');
    isi('Password baru', 'BaruSekali22');
    isi('Konfirmasi password baru', 'BaruSekali22');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan password' }));
    expect(await screen.findByText('Password berhasil disimpan')).toBeInTheDocument();
  });
});
