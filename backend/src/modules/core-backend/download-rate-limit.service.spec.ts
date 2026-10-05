import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { KonfigurasiApp } from '../../config/configuration.js';
import { DownloadRateLimitService } from './download-rate-limit.service.js';

function limiter(anonymous = 2, authenticated = 3) {
  const config = new ConfigService({
    pembatasanLaju: { batasUnduhAnonim: anonymous, batasUnduhPengguna: authenticated },
  }) as unknown as ConfigService<KonfigurasiApp, true>;
  return new DownloadRateLimitService(config);
}

describe('download rate limit', () => {
  afterEach(() => vi.useRealTimers());

  it('allows requests within the anonymous IP limit and returns 429 after it', () => {
    const service = limiter(2);
    service.consume({ ip: '203.0.113.10' });
    service.consume({ ip: '203.0.113.10' });
    expect(() => service.consume({ ip: '203.0.113.10' })).toThrow(HttpException);
    expect(() => service.consume({ ip: '203.0.113.11' })).not.toThrow();
  });

  it('limits authenticated users by server-derived user identity across client IPs', () => {
    const service = limiter(5, 1);
    service.consume({ penggunaId: 'verified-user', ip: '203.0.113.10' });
    expect(() => service.consume({ penggunaId: 'verified-user', ip: '203.0.113.11' })).toThrow(
      HttpException,
    );
    expect(() => service.consume({ penggunaId: 'another-user', ip: '203.0.113.10' })).not.toThrow();
  });

  it('starts a fresh fixed window after one hour', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T00:00:00.000Z'));
    const service = limiter(1);
    service.consume({ ip: '203.0.113.10' });
    expect(() => service.consume({ ip: '203.0.113.10' })).toThrow(HttpException);
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(() => service.consume({ ip: '203.0.113.10' })).not.toThrow();
  });
});
