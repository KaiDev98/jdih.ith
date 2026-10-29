import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormDaftarEmail } from './form-daftar-email';

const state = vi.hoisted(() => ({ api: vi.fn(), reload: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: state.replace }) }));
vi.mock('@/lib/sesi', () => ({ useSession: () => ({ muatUlang: state.reload }) }));
vi.mock('@/lib/api-client', async (original) => ({
  ...(await original<object>()),
  ambilApi: state.api,
}));
beforeEach(() => {
  state.api
    .mockReset()
    .mockImplementation((path: string) =>
      Promise.resolve(path === '/public/units' ? [{ id: '7', nama: 'Laboratorium' }] : {}),
    );
  state.reload.mockReset().mockResolvedValue(undefined);
  state.replace.mockReset();
});
afterEach(cleanup);

async function pilihUnit(label: string) {
  fireEvent.keyDown(screen.getByLabelText('Unit kerja', { exact: true }), { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('menuitemradio', { name: label }));
  await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
}

async function fill() {
  fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Pengguna Kampus' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'pengguna@gmail.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));
  await screen.findByLabelText('Unit kerja', { exact: true });
  await pilihUnit('Laboratorium');
  fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));
  await screen.findByLabelText('Password', { exact: true });
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), {
    target: { value: 'PasswordKuat123' },
  });
  fireEvent.change(screen.getByLabelText('Konfirmasi password'), {
    target: { value: 'PasswordKuat123' },
  });
}
describe('pendaftaran email biasa', () => {
  it('menyaring isian tidak lengkap sebelum membuka konfirmasi atau mengirim API', async () => {
    render(<FormDaftarEmail />);
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));
    await screen.findByText('Periksa isian formulir dan pilih unit kerja atau isi nama unit Anda.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(state.api.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
  });
  it('menerima Gmail pribadi, mewajibkan konfirmasi, mengunci klik ganda dan menampilkan hasil pending', async () => {
    let complete!: () => void;
    state.api.mockImplementation((path: string) =>
      path === '/public/units'
        ? Promise.resolve([{ id: '7', nama: 'Laboratorium' }])
        : new Promise<void>((resolve) => {
            complete = resolve;
          }),
    );
    render(<FormDaftarEmail />);
    await fill();
    fireEvent.click(screen.getByRole('button', { name: /^Daftar akun$/ }));
    const confirmation = within(
      await screen.findByRole('dialog', { name: 'Kirim pendaftaran akun?' }),
    );
    expect(confirmation.getByText('Pengguna Kampus')).toBeInTheDocument();
    expect(confirmation.getByText('pengguna@gmail.com')).toBeInTheDocument();
    expect(confirmation.getByText('Laboratorium')).toBeInTheDocument();
    expect(confirmation.queryByText('PasswordKuat123')).not.toBeInTheDocument();
    expect(state.api.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
    const submit = screen.getByRole('button', { name: 'Ya, daftar akun' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(await screen.findByRole('button', { name: 'Mengirim…' })).toBeDisabled();
    expect(state.api.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(
      1,
    );
    expect(state.api).toHaveBeenCalledWith(
      '/auth/register/email',
      expect.objectContaining({
        muatan: expect.objectContaining({ email: 'pengguna@gmail.com', unitKerjaId: '7' }),
      }),
    );
    complete();
    await screen.findByText('Pendaftaran berhasil');
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith('/akun'));
    expect(state.reload).toHaveBeenCalledOnce();
  });
  it('usulan unit manual tidak mengirim unit master sekaligus', async () => {
    render(<FormDaftarEmail />);
    await fill();
    fireEvent.click(screen.getByRole('button', { name: 'Langkah sebelumnya' }));
    await screen.findByLabelText('Unit kerja', { exact: true });
    await pilihUnit('Unit belum tercantum / lainnya');
    fireEvent.change(screen.getByLabelText('Nama unit kerja'), { target: { value: 'Unit lain' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));
    await screen.findByLabelText('Password', { exact: true });
    fireEvent.click(screen.getByRole('button', { name: 'Langkah sebelumnya' }));
    expect(await screen.findByLabelText('Unit kerja', { exact: true })).toHaveValue('manual');
    expect(screen.getByLabelText('Nama unit kerja')).toHaveValue('Unit lain');
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));
    await screen.findByLabelText('Password', { exact: true });
    fireEvent.click(screen.getByRole('button', { name: /^Daftar akun$/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ya, daftar akun' }));
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith('/akun'));
    const body = state.api.mock.calls.find(([, options]) => options?.method === 'POST')?.[1].muatan;
    expect(body.unitManual).toBe('Unit lain');
    expect(body.unitKerjaId).toBeUndefined();
  });
  it('mencegah perpindahan tanpa unit dan mempertahankan data saat kembali', async () => {
    const onStepChange = vi.fn();
    render(<FormDaftarEmail onStepChange={onStepChange} />);
    expect(onStepChange).toHaveBeenLastCalledWith(0);
    fireEvent.change(screen.getByLabelText('Nama lengkap'), { target: { value: 'Dosen Kampus' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'dosen@gmail.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));
    await screen.findByLabelText('Unit kerja', { exact: true });
    expect(onStepChange).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));
    await screen.findByText('Pilih unit kerja atau usulkan unit Anda.');
    expect(screen.getByLabelText('Unit kerja', { exact: true })).toHaveFocus();
    expect(screen.getByLabelText('Unit kerja', { exact: true })).toHaveAttribute(
      'aria-describedby',
      'galat-unit-kerja',
    );
    expect(screen.queryByLabelText('Password', { exact: true })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Langkah sebelumnya' }));
    expect(await screen.findByLabelText('Nama lengkap')).toHaveValue('Dosen Kampus');
    expect(screen.getByLabelText('Email')).toHaveValue('dosen@gmail.com');
    expect(onStepChange).toHaveBeenLastCalledWith(0);
  });
  it('mempertahankan pilihan saat menu ditutup dan membersihkan usulan ketika kembali ke unit master', async () => {
    render(<FormDaftarEmail />);
    await fill();
    fireEvent.click(screen.getByRole('button', { name: 'Langkah sebelumnya' }));
    const trigger = await screen.findByLabelText('Unit kerja', { exact: true });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    const menu = await screen.findByRole('menu', { name: 'Pilihan unit kerja' });
    expect(screen.getByRole('menuitemradio', { name: 'Laboratorium' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveValue('7');
    await pilihUnit('Unit belum tercantum / lainnya');
    fireEvent.change(screen.getByLabelText('Nama unit kerja'), {
      target: { value: 'Unit usulan' },
    });
    await pilihUnit('Laboratorium');
    expect(screen.queryByLabelText('Nama unit kerja')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lanjutkan' }));
    await screen.findByLabelText('Password', { exact: true });
    fireEvent.click(screen.getByRole('button', { name: /^Daftar akun$/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ya, daftar akun' }));
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith('/akun'));
    const body = state.api.mock.calls.find(([, options]) => options?.method === 'POST')?.[1].muatan;
    expect(body.unitKerjaId).toBe('7');
    expect(body.unitManual).toBeUndefined();
  });
});
