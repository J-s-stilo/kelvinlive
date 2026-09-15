const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, "dist");

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
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

function sendHTML(res, html) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8"
  });

  res.end(html);
}

/* =========================
   LANDING PAGE
========================= */

function sendLandingPage(res) {
  sendHTML(res, `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
        content="width=device-width, initial-scale=1.0">

  <title>Kelvin Live</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: #050505;
      color: white;
      font-family: Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .container {
      width: 100%;
      max-width: 430px;
      padding: 30px 22px;
      text-align: center;
    }

    .logo {
      width: 88px;
      height: 88px;
      margin: 0 auto 24px;
      border-radius: 24px;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      font-weight: 800;
    }

    h1 {
      margin: 0;
      font-size: 34px;
    }

    p {
      color: #aaa;
      margin: 12px 0 30px;
      line-height: 1.5;
    }

    button {
      width: 100%;
      border: 0;
      border-radius: 16px;
      padding: 17px;
      font-size: 17px;
      font-weight: bold;
      color: white;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      cursor: pointer;
    }

    button:active {
      transform: scale(.98);
    }
  </style>
</head>

<body>

  <div class="container">

    <div class="logo">K</div>

    <h1>Kelvin Live</h1>

    <p>
      Connect. Create. Go Live.
    </p>

    <button onclick="window.location.href='/app'">
      Get Started
    </button>

  </div>

</body>
</html>
  `);
}

/* =========================
   APP / CAMERA PAGE
========================= */

function sendAppPage(res) {
  sendHTML(res, `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">

  <meta name="viewport"
        content="width=device-width,
                 initial-scale=1.0,
                 maximum-scale=1.0,
                 user-scalable=no">

  <title>Kelvin Live</title>

  <style>

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: #050505;
      color: white;
      font-family: Arial, sans-serif;
    }

    .app {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      padding: 22px 18px 35px;
    }

    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .small-logo {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 25px;
      font-weight: 800;
    }

    .brand-title {
      font-size: 20px;
      font-weight: bold;
    }

    .brand-sub {
      color: #888;
      font-size: 13px;
      margin-top: 3px;
    }

    .back {
      border: 0;
      background: #171717;
      color: white;
      padding: 10px 14px;
      border-radius: 12px;
      cursor: pointer;
    }

    .camera-card {
      background: #111;
      border: 1px solid #222;
      border-radius: 22px;
      overflow: hidden;
    }

    .camera-header {
      padding: 17px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .camera-title {
      font-size: 18px;
      font-weight: bold;
    }

    .live {
      background: #ef4444;
      color: white;
      border-radius: 20px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: bold;
      display: none;
    }

    .video-wrap {
      width: 100%;
      aspect-ratio: 9 / 16;
      max-height: 65vh;
      background: #000;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: none;
    }

    .placeholder {
      color: #777;
      text-align: center;
      padding: 30px;
    }

    .controls {
      padding: 17px;
      display: grid;
      gap: 11px;
    }

    .control {
      width: 100%;
      border: 0;
      border-radius: 14px;
      padding: 15px;
      font-size: 15px;
      font-weight: bold;
      cursor: pointer;
      color: white;
      background: #222;
    }

    .start {
      background: linear-gradient(135deg, #7c3aed, #2563eb);
    }

    .stop {
      background: #7f1d1d;
      display: none;
    }

    .switch {
      display: none;
    }

    .status {
      text-align: center;
      color: #777;
      font-size: 13px;
      padding: 4px 10px 8px;
    }

  </style>
</head>

<body>

<div class="app">

  <div class="top">

    <div class="brand">

      <div class="small-logo">K</div>

      <div>
        <div class="brand-title">
          Kelvin Live
        </div>

        <div class="brand-sub">
          Camera
        </div>
      </div>

    </div>

    <button class="back"
            onclick="window.location.href='/'">
      Back
    </button>

  </div>


  <div class="camera-card">

    <div class="camera-header">

      <div class="camera-title">
        Camera Preview
      </div>

      <div id="liveBadge"
           class="live">
        LIVE
      </div>

    </div>


    <div class="video-wrap">

      <video id="video"
             autoplay
             playsinline>
      </video>

      <div id="placeholder"
           class="placeholder">

        Camera area<br><br>

        Start your camera to begin.

      </div>

    </div>


    <div class="status"
         id="status">
      Camera is off
    </div>


    <div class="controls">

      <button id="startButton"
              class="control start"
              onclick="startCamera()">
        Start Camera
      </button>

      <button id="switchButton"
              class="control switch"
              onclick="switchCamera()">
        Switch Camera
      </button>

      <button id="stopButton"
              class="control stop"
              onclick="stopCamera()">
        Stop Camera
      </button>

    </div>

  </div>

</div>


<script>

let cameraStream = null;

let facingMode = "user";


async function startCamera() {

  const video =
    document.getElementById("video");

  const placeholder =
    document.getElementById("placeholder");

  const startButton =
    document.getElementById("startButton");

  const stopButton =
    document.getElementById("stopButton");

  const switchButton =
    document.getElementById("switchButton");

  const liveBadge =
    document.getElementById("liveBadge");

  const status =
    document.getElementById("status");


  try {

    if (cameraStream) {
      stopCamera();
    }


    status.textContent =
      "Requesting camera permission...";


    cameraStream =
      await navigator.mediaDevices.getUserMedia({

        video: {
          facingMode: {
            ideal: facingMode
          }
        },

        audio: false

      });


    video.srcObject =
      cameraStream;


    video.style.display =
      "block";

    placeholder.style.display =
      "none";

    startButton.style.display =
      "none";

    stopButton.style.display =
      "block";

    switchButton.style.display =
      "block";

    liveBadge.style.display =
      "block";


    status.textContent =
      facingMode === "user"
        ? "Front camera active"
        : "Back camera active";

  }

  catch (error) {

    console.error(error);

    status.textContent =
      "Camera permission was denied or unavailable.";

    cameraStream = null;

  }

}


async function switchCamera() {

  facingMode =
    facingMode === "user"
      ? "environment"
      : "user";


  await startCamera();

}


function stopCamera() {

  const video =
    document.getElementById("video");

  const placeholder =
    document.getElementById("placeholder");

  const startButton =
    document.getElementById("startButton");

  const stopButton =
    document.getElementById("stopButton");

  const switchButton =
    document.getElementById("switchButton");

  const liveBadge =
    document.getElementById("liveBadge");

  const status =
    document.getElementById("status");


  if (cameraStream) {

    cameraStream
      .getTracks()
      .forEach(track => track.stop());

    cameraStream = null;

  }


  video.srcObject = null;

  video.style.display =
    "none";

  placeholder.style.display =
    "block";

  startButton.style.display =
    "block";

  stopButton.style.display =
    "none";

  switchButton.style.display =
    "none";

  liveBadge.style.display =
    "none";

  status.textContent =
    "Camera is off";

}

</script>

</body>
</html>
  `);
}


/* =========================
   STATIC FILE SERVER
========================= */

function sendFile(res, filePath) {

  fs.readFile(filePath, (error, data) => {

    if (error) {

      res.writeHead(404, {
        "Content-Type":
          "text/plain; charset=utf-8"
      });

      return res.end("Not found");
    }


    const extension =
      path.extname(filePath).toLowerCase();


    res.writeHead(200, {
      "Content-Type":
        MIME_TYPES[extension] ||
        "application/octet-stream"
    });


    res.end(data);

  });

}


/* =========================
   HTTP SERVER
========================= */

const server =
  http.createServer((req, res) => {

    const requestPath =
      decodeURIComponent(
        req.url.split("?")[0]
      );


    /* Health check */

    if (requestPath === "/health") {

      res.writeHead(200, {
        "Content-Type":
          "application/json"
      });

      return res.end(
        JSON.stringify({
          ok: true,
          service: "kelvinlive-server"
        })
      );

    }


    /* Kelvin Live app */

    if (
      requestPath === "/app" ||
      requestPath === "/app/"
    ) {

      return sendAppPage(res);

    }


    /* Root landing page */

    if (requestPath === "/") {

      /*
       * If an Expo build exists,
       * serve it.
       *
       * Otherwise use our working
       * Kelvin Live landing page.
       */

      const expoIndex =
        path.join(
          DIST_DIR,
          "index.html"
        );


      if (fs.existsSync(expoIndex)) {

        return sendFile(
          res,
          expoIndex
        );

      }


      return sendLandingPage(res);

    }


    /* Static files from dist */

    if (fs.existsSync(DIST_DIR)) {

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
          "Content-Type":
            "text/plain; charset=utf-8"
        });

        return res.end("Forbidden");

      }


      if (fs.existsSync(safePath)) {

        const stats =
          fs.statSync(safePath);


        if (stats.isFile()) {

          return sendFile(
            res,
            safePath
          );

        }

      }

    }


    res.writeHead(404, {
      "Content-Type":
        "text/plain; charset=utf-8"
    });

    res.end("Kelvin Live page not found.");

  });


/* =========================
   WEBSOCKET SIGNALING
========================= */

const wss =
  new WebSocketServer({
    server
  });


wss.on("connection", socket => {

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
        JSON.parse(
          raw.toString()
        );

    }

    catch {

      return;

    }


    wss.clients.forEach(client => {

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


/* =========================
   START SERVER
========================= */

server.listen(PORT, () => {

  console.log(
    `Kelvin Live server listening on port ${PORT}`
  );

});
