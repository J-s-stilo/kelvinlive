const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, service: 'kelvinlive-server' }));
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Kelvin Live server is running.');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'connected', service: 'kelvinlive' }));

  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // Basic signaling relay for future WebRTC calling.
    // A production deployment should add authentication,
    // room membership and authorization before relaying messages.
    wss.clients.forEach((client) => {
      if (client !== socket && client.readyState === 1) {
        client.send(JSON.stringify(message));
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Kelvin Live server listening on port ${PORT}`);
});
