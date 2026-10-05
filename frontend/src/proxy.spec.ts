import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { config, kebijakanCsp, proxy } from './proxy';

describe('Content Security Policy for the Next.js app', () => {
  it('creates a strict production policy with a per-request nonce', () => {
    const policy = kebijakanCsp('nonce-acak', 'production');
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self' 'nonce-nonce-acak' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-nonce-acak'");
    expect(policy).toContain("connect-src 'self'");
    expect(policy).toContain("frame-src 'self' blob:");
    expect(policy).toContain("form-action 'self' https://accounts.google.com");
    expect(policy).toContain("frame-ancestors 'self'");
    expect(policy).not.toContain('*');
    expect(policy).not.toContain('unsafe-eval');
    expect(policy).not.toContain('unsafe-inline');
  });

  it('sets matching response and render-request policies with fresh nonces', () => {
    const first = proxy(new NextRequest('https://jdih.ith.ac.id/'));
    const second = proxy(new NextRequest('https://jdih.ith.ac.id/produk-hukum'));
    const firstPolicy = first.headers.get('content-security-policy') ?? '';
    const secondPolicy = second.headers.get('content-security-policy') ?? '';
    const firstNonce = first.headers.get('x-middleware-request-x-nonce');
    const firstRenderPolicy = first.headers.get('x-middleware-request-content-security-policy');

    expect(firstPolicy).toMatch(/script-src[^;]*'nonce-[^']+'/);
    expect(firstNonce).toBeTruthy();
    expect(firstPolicy).toContain(`'nonce-${firstNonce}'`);
    expect(firstRenderPolicy).toBe(firstPolicy);
    expect(secondPolicy).not.toBe(firstPolicy);
    expect(firstPolicy).not.toContain('unsafe-inline');
  });

  it('keeps same-origin API paths outside the page CSP proxy matcher', () => {
    const matcher = config.matcher.at(0);
    const source = typeof matcher === 'string' ? matcher : matcher?.source ?? '';
    expect(source).toContain('api/v1');
    expect(source).toContain('_next/static');
  });
});
