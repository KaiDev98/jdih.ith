import http from 'node:http';

/** Replay only bodyless reads rejected by a stale reused socket, once on a new socket. */
export function forwardRequest(req, res, options, onError = () => undefined) {
  let upstream;
  const bodylessRead = ['GET', 'HEAD'].includes(req.method) && !req.headers['transfer-encoding'] &&
    (!req.headers['content-length'] || req.headers['content-length'] === '0');
  function attempt(retry = false) {
    upstream = http.request({ ...options, ...(retry ? { agent: false } : {}) }, incoming => {
      res.writeHead(incoming.statusCode, incoming.headers);
      incoming.on('error', () => res.destroy());
      incoming.pipe(res);
    });
    const request = upstream;
    request.setTimeout(30000, () => request.destroy(new Error('Upstream timeout')));
    request.on('error', error => {
      if (req.aborted || res.destroyed) return;
      const replay = !retry && bodylessRead && request.reusedSocket && error.code === 'ECONNRESET' &&
        !res.headersSent && !res.destroyed;
      onError({ code: error.code ?? 'UNKNOWN', reusedSocket: request.reusedSocket, replay });
      if (replay) attempt(true);
      else if (!res.destroyed) { if (!res.headersSent) res.writeHead(503); res.end(); }
    });
    if (retry) request.end();
    else req.pipe(request);
  }
  req.on('aborted', () => upstream?.destroy());
  res.on('close', () => { if (!res.writableEnded) upstream?.destroy(); });
  attempt();
}
