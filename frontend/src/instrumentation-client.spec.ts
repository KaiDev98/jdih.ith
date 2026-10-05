import { afterEach, describe, expect, it, vi } from 'vitest';

const { config } = vi.hoisted(() => ({ config: vi.fn() }));

vi.mock('zod', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zod')>();
  return { ...actual, z: { ...actual.z, config } };
});

describe('early client instrumentation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('configures the public Zod API in Next client startup before hydration', async () => {
    vi.resetModules();
    await import('./instrumentation-client');

    expect(config).toHaveBeenCalledWith({ jitless: true });
  });
});
