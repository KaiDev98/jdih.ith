import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DasborAdmin from './page';

vi.mock('@/lib/sesi', () => ({ useSession: () => ({ pengguna: { izin: ['users.read','documents.read_admin','documents.create','templates.manage'] } }) }));

describe('DasborAdmin', () => {
  it('merender pintasan sesuai izin dan menyatakan batas agregasi API', () => {
    render(<DasborAdmin />);
    expect(screen.getByRole('heading', { level: 1, name: 'Dasbor' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Buka modul/ })).toHaveLength(4);
    expect(screen.getAllByText(/tidak menampilkan angka perkiraan/)).toHaveLength(2);
    expect(screen.getByText(/belum menyediakan agregasi dashboard/)).toBeInTheDocument();
  });
});
