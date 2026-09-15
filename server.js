const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
      });

      return res.end('Not found');
    }

    const extension = path.extname(filePath).toLowerCase();

    res.writeHead(200, {
      'Content-Type':
        MIME_TYPES[extension] || 'application/octet-stream',
    });

    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
    });

    return res.end(
      JSON.stringify({
        ok: true,
        service: 'kelvinlive-server',
      })
    );
  }

  // Serve the Expo web build.
  let requestPath = decodeURIComponent(
    req.url.split('?')[0]
  );

  if (requestPath === '/') {
    requestPath = '/index.html';
  }

  const requestedFile = path.join(
    DIST_DIR,
    requestPath
  );

  // Prevent paths from escaping the dist directory.
  const safePath = path.normalize(requestedFile);
  const normalizedDist = path.normalize(DIST_DIR);

  if (
    safePath !== normalizedDist &&
    !safePath.startsWith(normalizedDist + path.sep)
  ) {
    res.writeHead(403, {
      'Content-Type': 'text/plain; charset=utf-8',
    });

    return res.end('Forbidden');
  }

  fs.stat(safePath, (error, stats) => {
    if (!error && stats.isFile()) {
      return sendFile(res, safePath);
    }

    // Expo Web uses index.html for the main application.
    const indexFile = path.join(
      DIST_DIR,
      'index.html'
    );

    fs.access(
      indexFile,
      fs.constants.F_OK,
      (indexError) => {
        if (!indexError) {
          return sendFile(res, indexFile);
        }

        res.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8',
        });

        res.end(
          'Kelvin Live web build not found.'
        );
      }
    );
  });
});

// WebSocket signaling server for future WebRTC calling.
const wss = new WebSocketServer({ server });

wss.on('connection', (socket) => {
  socket.send(
    JSON.stringify({
      type: 'connected',
      service: 'kelvinlive',
    })
  );

  socket.on('message', (raw) => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // Relay signaling messages to other connected clients.
    wss.clients.forEach((client) => {
      if (
        client !== socket &&
        client.readyState === 1
      ) {
        client.send(
          JSON.stringify(message)
        );
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(
    `Kelvin Live server listening on port ${PORT}`
  );
});
