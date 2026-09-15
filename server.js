const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const WEB_DIR = path.join(__dirname, "web");

const rooms = new Map();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp"
};

function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      return sendJSON(res, 404, {
        ok: false,
        error: "File not found"
      });
    }

    const ext = path.extname(filePath).toLowerCase();

    res.writeHead(200, {
      "Content-Type":
        MIME_TYPES[ext] || "application/octet-stream"
    });

    res.end(data);
  });
}

function safeWebPath(requestPath) {
  const cleanPath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(WEB_DIR, cleanPath);

  const webRoot = path.resolve(WEB_DIR);
  const resolved = path.resolve(filePath);

  if (
    resolved !== webRoot &&
    !resolved.startsWith(webRoot + path.sep)
  ) {
    return null;
  }

  return resolved;
}

function createRoom() {
  let code;

  do {
    code =
      "KLV-" +
      crypto
        .randomBytes(3)
        .toString("hex")
        .toUpperCase();
  } while (rooms.has(code));

  rooms.set(code, new Set());

  return code;
}

function addToRoom(code, socket) {
  if (!rooms.has(code)) {
    rooms.set(code, new Set());
  }

  rooms.get(code).add(socket);
  socket.roomCode = code;
}

function removeFromRoom(socket) {
  const code = socket.roomCode;

  if (!code || !rooms.has(code)) {
    return;
  }

  const room = rooms.get(code);

  room.delete(socket);

  if (room.size === 0) {
    rooms.delete(code);
  }

  socket.roomCode = null;
}

function broadcastToRoom(code, sender, message) {
  const room = rooms.get(code);

  if (!room) {
    return;
  }

  const payload = JSON.stringify(message);

  room.forEach(client => {
    if (
      client !== sender &&
      client.readyState === 1
    ) {
      client.send(payload);
    }
  });
}

const server = http.createServer((req, res) => {
  const requestPath =
    decodeURIComponent(
      req.url.split("?")[0]
    );

  /* =========================
     HEALTH
  ========================= */

  if (requestPath === "/health") {
    return sendJSON(res, 200, {
      ok: true,
      service: "kelvinlive-server",
      rooms: rooms.size
    });
  }

  /* =========================
     CREATE CALL
  ========================= */

  if (
    requestPath === "/api/call/create" &&
    req.method === "POST"
  ) {
    const code = createRoom();

    return sendJSON(res, 200, {
      ok: true,
      code
    });
  }

  /* =========================
     CHECK CALL
  ========================= */

  if (
    requestPath.startsWith("/api/call/") &&
    req.method === "GET"
  ) {
    const code = requestPath
      .split("/")
      .pop()
      .toUpperCase();

    return sendJSON(res, 200, {
      ok: true,
      exists: rooms.has(code),
      code
    });
  }

  /* =========================
     MAIN APP
  ========================= */

  if (
    requestPath === "/" ||
    requestPath === "/index.html"
  ) {
    const indexPath =
      path.join(WEB_DIR, "index.html");

    if (fs.existsSync(indexPath)) {
      return sendFile(res, indexPath);
    }

    return sendJSON(res, 404, {
      ok: false,
      error: "Kelvin Live index.html not found"
    });
  }

  /*
   * Keep /app working.
   *
   * It points to the same main
   * Kelvin Live interface instead
   * of the old camera-only page.
   */

  if (
    requestPath === "/app" ||
    requestPath === "/app/"
  ) {
    const indexPath =
      path.join(WEB_DIR, "index.html");

    if (fs.existsSync(indexPath)) {
      return sendFile(res, indexPath);
    }

    return sendJSON(res, 404, {
      ok: false,
      error: "Kelvin Live app not found"
    });
  }

  /* =========================
     STATIC WEB FILES
  ========================= */

  const filePath =
    safeWebPath(requestPath);

  if (
    filePath &&
    fs.existsSync(filePath) &&
    fs.statSync(filePath).isFile()
  ) {
    return sendFile(res, filePath);
  }

  return sendJSON(res, 404, {
    ok: false,
    error: "Kelvin Live page not found"
  });
});


/* =========================
   WEBSOCKET SERVER
========================= */

const wss =
  new WebSocketServer({
    server
  });

wss.on("connection", socket => {
  socket.roomCode = null;

  socket.send(
    JSON.stringify({
      type: "connected",
      service: "kelvinlive"
    })
  );

  socket.on("message", raw => {
    let message;

    try {
      message =
        JSON.parse(raw.toString());
    } catch {
      socket.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message"
        })
      );

      return;
    }

    /*
     * CREATE / JOIN ROOM
     */

    if (
      message.type === "join-room"
    ) {
      const code =
        String(message.code || "")
          .trim()
          .toUpperCase();

      if (!code) {
        socket.send(
          JSON.stringify({
            type: "error",
            message: "Call code is required"
          })
        );

        return;
      }

      if (!rooms.has(code)) {
        rooms.set(code, new Set());
      }

      const room = rooms.get(code);

      if (room.size >= 2) {
        socket.send(
          JSON.stringify({
            type: "room-full",
            code
          })
        );

        return;
      }

      addToRoom(code, socket);

      socket.send(
        JSON.stringify({
          type: "joined-room",
          code,
          participants: room.size
        })
      );

      if (room.size === 2) {
        room.forEach(client => {
          if (client.readyState === 1) {
            client.send(
              JSON.stringify({
                type: "peer-ready",
                code
              })
            );
          }
        });
      }

      return;
    }

    /*
     * WEBRTC SIGNALING
     *
     * offer
     * answer
     * ice-candidate
     */

    const signalingTypes = [
      "offer",
      "answer",
      "ice-candidate"
    ];

    if (
      signalingTypes.includes(
        message.type
      )
    ) {
      if (!socket.roomCode) {
        return;
      }

      broadcastToRoom(
        socket.roomCode,
        socket,
        {
          ...message,
          code: socket.roomCode
        }
      );

      return;
    }

    /*
     * LEAVE CALL
     */

    if (
      message.type === "leave-room"
    ) {
      const code = socket.roomCode;

      if (code) {
        broadcastToRoom(
          code,
          socket,
          {
            type: "peer-left"
          }
        );

        removeFromRoom(socket);
      }

      return;
    }
  });

  socket.on("close", () => {
    const code = socket.roomCode;

    if (code) {
      broadcastToRoom(
        code,
        socket,
        {
          type: "peer-left"
        }
      );

      removeFromRoom(socket);
    }
  });

  socket.on("error", () => {
    removeFromRoom(socket);
  });
});


/* =========================
   START
========================= */

server.listen(PORT, () => {
  console.log(
    `Kelvin Live server listening on ${PORT}`
  );
});
