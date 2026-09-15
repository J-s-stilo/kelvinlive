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

/*
 * Kelvin Live camera interface
 */
function sendAppInterface(res) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>Kelvin Live</title>

  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      min-height: 100%;
      font-family: Arial, sans-serif;
      background: #ffffff;
      color: #111827;
    }

    body {
      min-height: 100vh;
    }

    .safe {
      min-height: 100vh;
      background: #ffffff;
    }

    .container {
      min-height: 100vh;
      width: 100%;
      padding: 18px 22px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .center {
      flex: 1;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .logoCircle {
      width: 104px;
      height: 104px;
      border-radius: 32px;
      background: #111827;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 28px;
    }

    .logoK {
      color: #ffffff;
      font-size: 54px;
      font-weight: 800;
    }

    .title {
      color: #111827;
      font-size: 34px;
      font-weight: 800;
      margin: 0;
    }

    .subtitle {
      margin-top: 12px;
      color: #667085;
      font-size: 17px;
      line-height: 25px;
      max-width: 310px;
    }

    .button {
      margin-top: 34px;
      min-width: 220px;
      height: 58px;
      border: 0;
      border-radius: 29px;
      background: #111827;
      color: #ffffff;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 17px;
      font-weight: 700;
    }

    .button:active {
      opacity: 0.8;
      transform: scale(0.98);
    }

    .arrow {
      font-size: 23px;
      margin-left: 10px;
    }

    .cameraScreen {
      flex: 1;
      width: 100%;
      display: flex;
      flex-direction: column;
    }

    .cameraHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .cameraTitle {
      color: #111827;
      font-size: 24px;
      font-weight: 800;
      margin: 0;
    }

    .cameraSubtitle {
      color: #667085;
      font-size: 14px;
      margin-top: 3px;
    }

    .liveBadge {
      display: flex;
      align-items: center;
      padding: 8px 13px;
      border-radius: 20px;
      background: #f2f4f7;
    }

    .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #111827;
      margin-right: 7px;
    }

    .liveText {
      color: #111827;
      font-weight: 800;
      font-size: 12px;
      letter-spacing: 1px;
    }

    .cameraFrame {
      flex: 1;
      width: 100%;
      min-height: 300px;
      max-height: 620px;
      border-radius: 24px;
      overflow: hidden;
      background: #111827;
      position: relative;
    }

    #cameraVideo {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      transform: scaleX(-1);
      background: #111827;
    }

    .cameraMessage {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      pointer-events: none;
      padding: 20px;
    }

    .cameraAreaText {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
    }

    .testText {
      color: #d0d5dd;
      font-size: 15px;
      margin-top: 10px;
    }

    .errorText {
      color: #ffffff;
      font-size: 15px;
      margin-top: 10px;
      max-width: 280px;
      line-height: 22px;
    }

    .secondaryButton {
      margin-top: 18px;
      align-self: center;
      border: 1px solid #d0d5dd;
      border-radius: 24px;
      padding: 12px 28px;
      background: #ffffff;
      color: #111827;
      font-weight: 700;
      cursor: pointer;
      font-size: 15px;
    }

    .secondaryButton:active {
      transform: scale(0.98);
    }

    .footer {
      text-align: center;
      color: #98a2b3;
      font-size: 12px;
      margin-top: 15px;
    }

    @media (max-width: 600px) {
      .container {
        padding: 18px 16px 20px;
      }

      .cameraHeader {
        gap: 10px;
      }

      .cameraTitle {
        font-size: 21px;
      }
    }
  </style>
</head>

<body>

<div class="safe">

  <div class="container">

    <div id="startScreen" class="center">

      <div class="logoCircle">
        <div class="logoK">K</div>
      </div>

      <h1 class="title">
        Kelvin Live
      </h1>

      <div class="subtitle">
        Real-time avatar video technology
      </div>

      <button
        id="startCamera"
        class="button"
        type="button"
      >
        Start Camera
        <span class="arrow">→</span>
      </button>

    </div>

    <div
      id="cameraScreen"
      class="cameraScreen"
      style="display:none;"
    >

      <div class="cameraHeader">

        <div>
          <div class="cameraTitle">
            Kelvin Live
          </div>

          <div class="cameraSubtitle">
            Camera Preview
          </div>
        </div>

        <div class="liveBadge">

          <div class="dot"></div>

          <div class="liveText">
            LIVE
          </div>

        </div>

      </div>

      <div class="cameraFrame">

        <video
          id="cameraVideo"
          autoplay
          playsinline
          muted
        ></video>

        <div
          id="cameraMessage"
          class="cameraMessage"
        >
          <div class="cameraAreaText">
            Camera area
          </div>

          <div class="testText">
            Starting camera...
          </div>
        </div>

      </div>

      <button
        id="stopCamera"
        class="secondaryButton"
        type="button"
      >
        Stop Camera
      </button>

    </div>

    <div
      id="footer"
      class="footer"
    >
      Kelvin Live • Camera Test
    </div>

  </div>

</div>

<script>
  let cameraStream = null;

  async function startCamera() {

    const startScreen =
      document.getElementById('startScreen');

    const cameraScreen =
      document.getElementById('cameraScreen');

    const footer =
      document.getElementById('footer');

    const video =
      document.getElementById('cameraVideo');

    const message =
      document.getElementById('cameraMessage');

    startScreen.style.display = 'none';
    cameraScreen.style.display = 'flex';
    footer.style.display = 'none';

    message.style.display = 'flex';

    try {

      if (!navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia) {

        throw new Error(
          'Camera access is not supported by this browser.'
        );
      }

      cameraStream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user'
          },
          audio: false
        });

      video.srcObject = cameraStream;

      message.style.display = 'none';

      await video.play();

    } catch (error) {

      console.error(
        'Kelvin Live camera error:',
        error
      );

      message.style.display = 'flex';

      message.innerHTML = \`
        <div class="cameraAreaText">
          Camera unavailable
        </div>

        <div class="errorText">
          Please allow camera permission
          in your browser and try again.
        </div>
      \`;
    }
  }

  function stopCamera() {

    if (cameraStream) {

      cameraStream
        .getTracks()
        .forEach(function(track) {
          track.stop();
        });

      cameraStream = null;
    }

    const video =
      document.getElementById('cameraVideo');

    video.srcObject = null;

    document.getElementById(
      'cameraScreen'
    ).style.display = 'none';

    document.getElementById(
      'startScreen'
    ).style.display = 'flex';

    document.getElementById(
      'footer'
    ).style.display = 'block';
  }

  function initializeKelvinLiveApp() {

    const startButton =
      document.getElementById('startCamera');

    const stopButton =
      document.getElementById('stopCamera');

    if (startButton) {
      startButton.addEventListener(
        'click',
        startCamera
      );
    }

    if (stopButton) {
      stopButton.addEventListener(
        'click',
        stopCamera
      );
    }
  }

  document.addEventListener(
    'DOMContentLoaded',
    initializeKelvinLiveApp
  );
</script>

</body>
</html>`;

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
  });

  res.end(html);
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

  /*
   * Open the second Kelvin Live interface.
   */
  if (
    req.url === '/app' ||
    req.url === '/app/' ||
    req.url.startsWith('/app?')
  ) {
    return sendAppInterface(res);
  }

  let requestPath =
    decodeURIComponent(
      req.url.split('?')[0]
    );

  if (requestPath === '/') {
    requestPath = '/index.html';
  }

  const requestedFile =
    path.join(
      DIST_DIR,
      requestPath
    );

  const safePath =
    path.normalize(requestedFile);

  const normalizedDist =
    path.normalize(DIST_DIR);

  if (
    safePath !== normalizedDist &&
    !safePath.startsWith(
      normalizedDist + path.sep
    )
  ) {

    res.writeHead(403, {
      'Content-Type':
        'text/plain; charset=utf-8',
    });

    return res.end('Forbidden');
  }

  fs.stat(
    safePath,
    (error, stats) => {

      if (!error && stats.isFile()) {
        return sendFile(
          res,
          safePath
        );
      }

      const indexFile =
        path.join(
          DIST_DIR,
          'index.html'
        );

      fs.access(
        indexFile,
        fs.constants.F_OK,
        (indexError) => {

          if (!indexError) {
            return sendFile(
              res,
              indexFile
            );
          }

          res.writeHead(404, {
            'Content-Type':
              'text/plain; charset=utf-8',
          });

          res.end(
            'Kelvin Live web build not found.'
          );
        }
      );
    }
  );
});

/*
 * WebSocket signaling server
 * for future WebRTC functionality.
 */
const wss =
  new WebSocketServer({
    server,
  });

wss.on(
  'connection',
  (socket) => {

    socket.send(
      JSON.stringify({
        type: 'connected',
        service: 'kelvinlive',
      })
    );

    socket.on(
      'message',
      (raw) => {

        let message;

        try {
          message =
            JSON.parse(
              raw.toString()
            );
        } catch {
          return;
        }

        wss.clients.forEach(
          (client) => {

            if (
              client !== socket &&
              client.readyState === 1
            ) {
              client.send(
                JSON.stringify(message)
              );
            }

          }
        );
      }
    );
  }
);

server.listen(
  PORT,
  () => {
    console.log(
      `Kelvin Live server listening on port ${PORT}`
    );
  }
);
