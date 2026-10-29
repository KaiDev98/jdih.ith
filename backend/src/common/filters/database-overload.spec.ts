import { describe, expect, it, vi } from 'vitest';
import { SemuaGalatFilter } from './semua-galat.filter.js';
describe('respons saat database sibuk', () => {
  it.each([new Error('Queue limit reached.'), Object.assign(new Error('private driver message'), { code: 'ECONNREFUSED' })])('mengembalikan 503 dan Retry-After tanpa membocorkan driver', error => {
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
    const host = { switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({ method: 'GET', path: '/api/v1/public/home' }) }) };
    new SemuaGalatFilter().catch(error, host as never);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '1');
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(error.message);
  });
});
