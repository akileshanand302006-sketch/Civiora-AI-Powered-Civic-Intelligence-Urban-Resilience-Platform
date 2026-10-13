// ============================================================
// Civiora Multi-Port Developer Bridge (Port 5174 -> 5173)
// Transparently handles stale browser tabs or multi-tab development
// ============================================================

const http = require('http');
const net = require('net');

const SOURCE_PORT = 5174;
const TARGET_PORT = 5173;

function startBridge() {
  const server = http.createServer((req, res) => {
    const options = {
      hostname: 'localhost',
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${TARGET_PORT}`,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end(`Civiora Port Bridge: Waiting for web server on port ${TARGET_PORT}... (${err.message})`);
    });

    req.pipe(proxyReq, { end: true });
  });

  server.on('upgrade', (req, socket, head) => {
    const targetSocket = net.connect(TARGET_PORT, 'localhost', () => {
      targetSocket.write(
        `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
        Object.entries(req.headers)
          .map(([k, v]) => `${k}: ${v}\r\n`)
          .join('') +
        '\r\n'
      );
      if (head && head.length) {
        targetSocket.write(head);
      }
      targetSocket.pipe(socket);
      socket.pipe(targetSocket);
    });

    targetSocket.on('error', () => {
      socket.destroy();
    });
  });

  server.listen(SOURCE_PORT, '0.0.0.0', () => {
    console.log(`⚡ [Civiora Bridge] Active: Forwarding http://localhost:${SOURCE_PORT} -> http://localhost:${TARGET_PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`ℹ️ [Civiora Bridge] Port ${SOURCE_PORT} is already bound, skipping bridge.`);
    } else {
      console.warn(`⚠️ [Civiora Bridge] Note: ${err.message}`);
    }
  });
}

startBridge();
