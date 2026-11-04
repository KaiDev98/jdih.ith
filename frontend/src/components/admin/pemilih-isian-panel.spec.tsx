import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState, type FormEvent } from 'react';
import { Building2 } from 'lucide-react';
import { PemilihIsianPanel } from './pemilih-isian-panel';
afterEach(cleanup);
const options = [
  { value: '1', label: 'Bagian Hukum' },
  { value: '2', label: 'Laboratorium', disabled: true },
  { value: '3', label: 'Perpustakaan' },
];
describe('pemilih isian panel', () => {
  it('memilih dengan keyboard, melewati unit nonaktif dan mengembalikan fokus tanpa mengirim form', async () => {
    const changed = vi.fn();
    const submit = vi.fn((event: FormEvent) => event.preventDefault());
    function Form() {
      const [value, setValue] = useState('1');
      return (
        <form onSubmit={submit}>
          <PemilihIsianPanel
            id="unit"
            label="Unit kerja"
            name="unitKerjaId"
            value={value}
            opsi={options}
            ikon={Building2}
            onValueChange={(next) => {
              changed(next);
              setValue(next);
            }}
          />
        </form>
      );
    }
    render(<Form />);
    const trigger = screen.getByLabelText('Unit kerja');
    expect(trigger).toHaveAccessibleName('Unit kerja Bagian Hukum');
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const first = await screen.findByRole('menuitemradio', { name: 'Bagian Hukum' });
    await waitFor(() => expect(first).toHaveFocus());
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    const last = screen.getByRole('menuitemradio', { name: 'Perpustakaan' });
    await waitFor(() => expect(last).toHaveFocus());
    fireEvent.keyDown(last, { key: 'Enter' });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveTextContent('Perpustakaan');
    expect(new FormData(trigger.closest('form')!).get('unitKerjaId')).toBe('3');
    expect(changed).toHaveBeenCalledExactlyOnceWith('3');
    expect(submit).not.toHaveBeenCalled();
  });
  it('Escape membatalkan tanpa perubahan, dan pilihan nonaktif tidak memicu callback', async () => {
    const change = vi.fn();
    render(
      <PemilihIsianPanel label="Jenis dokumen" value="1" opsi={options} onValueChange={change} />,
    );
    const trigger = screen.getByLabelText('Jenis dokumen');
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const blocked = await screen.findByRole('menuitemradio', { name: 'Laboratorium' });
    expect(blocked).toHaveAttribute('data-disabled');
    fireEvent.click(blocked);
    expect(change).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    expect(trigger).toHaveTextContent('Bagian Hukum');
  });
  it('bidang terkunci tetap dapat dibaca tanpa membuka menu', () => {
    render(
      <PemilihIsianPanel
        label="Jenis SOP"
        value="1"
        opsi={options}
        onValueChange={vi.fn()}
        disabled
      />,
    );
    const trigger = screen.getByLabelText('Jenis SOP');
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
