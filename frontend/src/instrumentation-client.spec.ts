import { afterEach, describe, expect, it, vi } from 'vitest';

const { config, setNonce } = vi.hoisted(() => ({ config: vi.fn(), setNonce: vi.fn() }));
vi.mock('get-nonce', () => ({ setNonce }));

vi.mock('zod', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zod')>();
  return { ...actual, config };
});

describe('early client instrumentation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    config.mockClear();
    setNonce.mockClear();
  });

  it('configures the public Zod API in Next client startup before hydration', async () => {
    vi.resetModules();
    await import('./instrumentation-client');

    expect(config).toHaveBeenCalledWith({ jitless: true });
    // Impor ulang zod dan paket shared dari nol bisa lambat saat mesin sibuk.
  }, 30_000);
  it('configures Radix style injection with the document nonce before public dialogs mount', async () => {
    const script = document.createElement('script');
    script.nonce = 'nonce-document-test';
    document.head.append(script);
    try {
      vi.resetModules();
      await import('./instrumentation-client');
      expect(setNonce).toHaveBeenCalledWith('nonce-document-test');
    } finally { script.remove(); }
  });
});
