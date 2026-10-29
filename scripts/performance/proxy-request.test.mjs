import http from 'node:http';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { forwardRequest } from './proxy-request.mjs';

async function scenario(method, { destroyTwice = false, status = 200 } = {}) {
  let calls = 0, disconnects = 0;
  const observations = [];
  const upstream = http.createServer((req, res) => {
    calls++;
    req.resume();
    if (calls === 2 || (destroyTwice && calls === 3)) { disconnects++; req.socket.destroy(); return; }
    res.writeHead(status); res.end('ok');
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
  const proxy = http.createServer((req, res) => forwardRequest(req, res, {
    host: '127.0.0.1', port: upstream.address().port, path: '/', method: req.method,
    headers: { ...req.headers, connection: 'keep-alive' }, agent,
  }, row => observations.push(row)));
  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
  const get = method => new Promise((resolve, reject) => {
    const request = http.request({ host: '127.0.0.1', port: proxy.address().port, method, agent: false }, res => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    });
    request.on('error', reject); request.end();
  });
  try {
    assert.equal(await get('GET'), status);
    const response = await get(method);
    return { response, calls, disconnects, observations };
  } finally {
    agent.destroy();
    proxy.closeAllConnections(); upstream.closeAllConnections();
    await Promise.all([new Promise(resolve => proxy.close(resolve)), new Promise(resolve => upstream.close(resolve))]);
  }
}
test('stale reused read connection is retried once on a fresh socket', async () => {
  const r = await scenario('GET');
  assert.equal(r.response, 200); assert.equal(r.calls, 3);
  assert.deepEqual(r.observations, [{ code: 'ECONNRESET', reusedSocket: true, replay: true }]);
});
test('a write request is never replayed', async () => {
  const r = await scenario('POST');
  assert.equal(r.response, 503); assert.equal(r.calls, 2);
  assert.equal(r.observations[0].replay, false);
});
test('retry is bounded if the fresh connection also fails', async () => {
  const r = await scenario('GET', { destroyTwice: true });
  assert.equal(r.response, 503); assert.equal(r.calls, 3);
  assert.equal(r.observations.length, 2); assert.equal(r.observations[1].replay, false);
});
