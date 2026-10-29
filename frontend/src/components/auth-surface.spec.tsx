import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthSurface } from './auth-surface';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('jalur masuk pada permukaan autentikasi', () => {
  it.each([
    ['staff', 'Dosen / Staf', '/masuk'],
    ['admin', 'Admin', '/masuk/admin'],
    ['superadmin', 'Superadmin', '/masuk/superadmin'],
  ] as const)(
    'menandai jalur %s dan mempertahankan URL login terpisah',
    (audience, label, href) => {
      render(
        <AuthSurface audience={audience}>
          <h1>Masuk</h1>
        </AuthSurface>,
      );
      const nav = within(screen.getByRole('navigation', { name: 'Pilih jalur masuk' }));
      expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
      expect(nav.getByRole('link', { name: label })).toHaveAttribute('href', href);
      expect(nav.getAllByRole('link')).toHaveLength(3);
      expect(
        nav.getAllByRole('link').filter((link) => link.hasAttribute('aria-current')),
      ).toHaveLength(1);
      expect(screen.queryByRole('link', { name: /Kembali ke portal/ })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'JDIH ITH, beranda' })).toHaveAttribute('href', '/');
    },
  );

  it('menyesuaikan tinggi saat keyboard terbuka dan melepas listener setelah ditutup', () => {
    const viewport = new EventTarget();
    Object.assign(viewport, { height: 300, offsetTop: 12 });
    const removeListener = vi.spyOn(viewport, 'removeEventListener');
    vi.stubGlobal('visualViewport', viewport);
    const view = render(
      <AuthSurface audience="staff">
        <h1>Masuk</h1>
      </AuthSurface>,
    );
    const surface = view.container.querySelector('[data-auth-viewport]');
    expect(surface).toHaveStyle({ height: '300px', top: '12px' });
    expect(surface).toHaveAttribute('data-keyboard', 'true');
    expect(surface).toHaveAttribute('data-short', 'false');
    view.unmount();
    expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('mendeteksi keyboard saat layout dan visual viewport sama-sama mengecil, lalu pulih setelah ditutup', () => {
    const viewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0, scale: 1 });
    vi.stubGlobal('innerHeight', 844);
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('visualViewport', viewport);
    const removeFocus = vi.spyOn(document, 'removeEventListener');
    const view = render(
      <AuthSurface audience="staff">
        <label>
          Email
          <input aria-label="Email" />
        </label>
      </AuthSurface>,
    );
    const root = view.container.querySelector('[data-auth-viewport]');
    expect(root).toHaveAttribute('data-keyboard', 'false');
    const input = screen.getByRole('textbox', { name: 'Email' });
    act(() => input.focus());
    act(() => {
      vi.stubGlobal('innerHeight', 400);
      viewport.height = 400;
      window.dispatchEvent(new Event('resize'));
    });
    expect(root).toHaveAttribute('data-keyboard', 'true');
    expect(root).toHaveStyle({ height: '400px' });
    act(() => input.blur());
    expect(document.activeElement).not.toBe(input);
    expect(root).toHaveAttribute('data-keyboard', 'true');
    act(() => {
      viewport.offsetTop = 70;
      viewport.dispatchEvent(new Event('scroll'));
    });
    expect(root).toHaveStyle({ top: '70px' });
    act(() => {
      viewport.height = 844;
      viewport.offsetTop = 0;
      vi.stubGlobal('innerHeight', 844);
      window.dispatchEvent(new Event('resize'));
    });
    expect(root).toHaveAttribute('data-keyboard', 'false');
    expect(root).toHaveStyle({ height: '844px', top: '0px' });
    view.unmount();
    expect(removeFocus).toHaveBeenCalledWith('focusin', expect.any(Function));
    expect(removeFocus).toHaveBeenCalledWith('focusout', expect.any(Function));
    removeFocus.mockRestore();
  });

  it('tidak menganggap pembesaran layar atau rotasi sebagai keyboard', () => {
    const viewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0, scale: 1 });
    vi.stubGlobal('innerHeight', 844);
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('visualViewport', viewport);
    const view = render(
      <AuthSurface audience="staff">
        <input aria-label="Email" />
      </AuthSurface>,
    );
    act(() => screen.getByRole('textbox', { name: 'Email' }).focus());
    act(() => {
      viewport.height = 400;
      viewport.scale = 2;
      viewport.dispatchEvent(new Event('resize'));
    });
    const root = view.container.querySelector('[data-auth-viewport]');
    expect(root).toHaveAttribute('data-keyboard', 'false');
    act(() => {
      viewport.scale = 1;
      viewport.height = 390;
      vi.stubGlobal('innerWidth', 844);
      vi.stubGlobal('innerHeight', 390);
      window.dispatchEvent(new Event('resize'));
    });
    expect(root).toHaveAttribute('data-keyboard', 'false');
  });

  it('memisahkan navigasi pendaftaran dan mengikuti progres formulir', () => {
    const view = render(
      <AuthSurface audience="staff" mode="register" registrationStep={0}>
        <h1>Daftar</h1>
      </AuthSurface>,
    );
    const nav = within(screen.getByRole('navigation', { name: 'Akses akun Dosen/Staf' }));
    expect(nav.getByRole('link', { name: 'Daftar akun' })).toHaveAttribute('aria-current', 'page');
    expect(nav.getAllByRole('link')).toHaveLength(2);
    const guide = screen.getByRole('list', { name: 'Panduan pendaftaran' });
    expect(within(guide).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
    view.rerender(
      <AuthSurface audience="staff" mode="register" registrationStep={2}>
        <h1>Daftar</h1>
      </AuthSurface>,
    );
    expect(within(guide).getAllByRole('listitem')[0]).toHaveAttribute('data-done', 'true');
    expect(within(guide).getAllByRole('listitem')[2]).toHaveAttribute('aria-current', 'step');
  });
});
