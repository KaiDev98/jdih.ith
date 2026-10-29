import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ErrorPage from '@/app/error';

describe('fallback halaman', () => {
  it('menawarkan pemulihan tanpa membocorkan pesan galat atau stack', () => {
    const retry = vi.fn();
    const error = new Error('PRIVATE_DATABASE_PASSWORD do not expose');
    render(<ErrorPage error={error} retry={retry} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Halaman belum dapat dimuat');
    expect(screen.queryByText(/PRIVATE_DATABASE_PASSWORD/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Beranda' })).toHaveAttribute('href', '/');
  });
});
