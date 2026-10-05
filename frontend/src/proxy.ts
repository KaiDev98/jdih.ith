import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type LingkunganCsp = 'development' | 'production' | 'test';

/**
 * Strict CSP for rendered pages. Next.js reads this request header while
 * rendering and applies the nonce to its hydration/bootstrap scripts.
 */
export function kebijakanCsp(nonce: string, lingkungan: LingkunganCsp): string {
  const pengembangan = lingkungan === 'development';
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${pengembangan ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    'img-src \'self\' data: blob:',
    "font-src 'self' data:",
    `connect-src 'self'${pengembangan ? ' ws: wss:' : ''}`,
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'self'",
  ];
  return directives.join('; ');
}

export function proxy(request: NextRequest) {
  const nonce = randomBytes(18).toString('base64');
  const kebijakan = kebijakanCsp(nonce, process.env.NODE_ENV as LingkunganCsp);
  const headersPermintaan = new Headers(request.headers);
  headersPermintaan.set('x-nonce', nonce);
  headersPermintaan.set('Content-Security-Policy', kebijakan);

  const response = NextResponse.next({ request: { headers: headersPermintaan } });
  response.headers.set('Content-Security-Policy', kebijakan);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api/v1|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
