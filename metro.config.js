const http = require('node:http');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const enhanceMiddleware = config.server.enhanceMiddleware;
const authRoutes = new Map([
  ['/v1/auth/web/exchange', 'POST'],
  ['/v1/auth/web/session', 'GET'],
  ['/v1/auth/web/logout', 'POST'],
]);

config.server.enhanceMiddleware = (middleware, server) => {
  const metro = enhanceMiddleware ? enhanceMiddleware(middleware, server) : middleware;
  return (request, response, next) => {
    const method = authRoutes.get(request.url);
    if (!method || method !== request.method) return metro(request, response, next);

    const headers = {};
    for (const name of ['content-type', 'content-length', 'cookie', 'origin']) {
      if (request.headers[name] !== undefined) headers[name] = request.headers[name];
    }
    const port = Number(process.env.BUGMAP_WEB_AUTH_LOCAL_PORT ?? '3000');
    const unavailable = () => {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      response.writeHead(502, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      response.end(JSON.stringify({ error: 'Auth server unavailable' }));
    };

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      unavailable();
      return;
    }
    const upstream = http.request({
      hostname: '127.0.0.1', port, method, path: request.url, headers, timeout: 15000,
    }, incoming => {
      response.writeHead(incoming.statusCode ?? 502, incoming.headers);
      incoming.on('error', unavailable);
      incoming.pipe(response);
    });
    upstream.on('error', unavailable);
    upstream.on('timeout', () => upstream.destroy(new Error('Auth request timed out')));
    response.on('close', () => {
      if (!response.writableEnded) upstream.destroy();
    });
    request.pipe(upstream);
  };
};

module.exports = config;
