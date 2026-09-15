/*
 * KELVIN LIVE — COMPLETE BACKEND
 * Node 20+ / Render
 *
 * Responsibilities:
 * - HTTP/static web server
 * - Two-device WebRTC signaling
 * - Call-room lifecycle
 * - Consent/authorization records
 * - Image generation engine (OpenAI-compatible)
 * - Generic video generation engine
 * - Talking-avatar engine
 * - Avatar replacement engine
 * - Image editing engine
 * - Job creation + polling
 * - Local gallery metadata/storage
 * - Recording upload endpoint
 * - Engine health/status
 *
 * IMPORTANT:
 * This server does NOT pretend to be a system camera for WhatsApp/FaceTime.
 * A real external-app camera bridge requires a native Android/iOS media layer.
 * The server provides the signaling, AI jobs, storage and API contracts needed
 * by that native layer.
 *
 * Node 20+ is recommended because fetch() is built in.
 */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const WEB_DIR = path.join(__dirname, "web");
const DATA_DIR = path.join(__dirname, "data");
const GALLERY_DIR = path.join(DATA_DIR, "gallery");
const RECORDINGS_DIR = path.join(DATA_DIR, "recordings");
const DB_FILE = path.join(DATA_DIR, "kelvinlive.json");

const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 35 * 1024 * 1024);
const JOB_TIMEOUT_MS = Number(process.env.JOB_TIMEOUT_MS || 20 * 60 * 1000);

for (const dir of [DATA_DIR, GALLERY_DIR, RECORDINGS_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const DEFAULT_DB = {
  users: [],
  consents: [],
  gallery: [],
  jobs: [],
  recordings: []
};

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return structuredClone(DEFAULT_DB);
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return { ...structuredClone(DEFAULT_DB), ...parsed };
  } catch (err) {
    console.error("DB load error:", err.message);
    return structuredClone(DEFAULT_DB);
  }
}

let db = loadDB();

function saveDB() {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function id(prefix = "klv") {
  return `${prefix}_${crypto.randomBytes(9).toString("hex")}`;
}

function now() {
  return new Date().toISOString();
}

function clean(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function safeFileName(name) {
  return clean(name, 120).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) throw new Error("Invalid data URL");
  const mime = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const raw = match[3];
  const buffer = isBase64
    ? Buffer.from(raw, "base64")
    : Buffer.from(decodeURIComponent(raw), "utf8");
  return { mime, buffer };
}

function extensionForMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  if (m.includes("webp")) return ".webp";
  if (m.includes("gif")) return ".gif";
  if (m.includes("mp4")) return ".mp4";
  if (m.includes("webm")) return ".webm";
  if (m.includes("mov")) return ".mov";
  if (m.includes("mpeg")) return ".mp3";
  if (m.includes("wav")) return ".wav";
  return ".bin";
}

function publicAssetUrl(filePath) {
  return `/media/${path.basename(path.dirname(filePath))}/${path.basename(filePath)}`;
}

/* -----------------------------
   HTTP helpers
----------------------------- */

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  });
  res.end(body);
}

function sendText(res, status, text, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*"
  });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    req.on("data", chunk => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJSON(req) {
  const raw = await readBody(req);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) return sendJSON(res, 404, { ok: false, error: "File not found" });
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon"
    }[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-cache" });
    res.end(data);
  });
}

function safeWebPath(requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const normalized = path.normalize(decoded).replace(/^[/\\]+/, "");
  const root = path.resolve(WEB_DIR);
  const candidate = path.resolve(path.join(root, normalized));
  if (candidate !== root && !candidate.startsWith(root + path.sep)) return null;
  return candidate;
}

/* -----------------------------
   Engine configuration
----------------------------- */

const ENGINE = {
  image: {
    provider: process.env.IMAGE_PROVIDER || (process.env.OPENAI_API_KEY ? "openai" : "custom"),
    url: process.env.IMAGE_API_URL || "",
    key: process.env.IMAGE_API_KEY || "",
    model: process.env.IMAGE_MODEL || "gpt-image-2"
  },
  video: {
    provider: process.env.VIDEO_PROVIDER || "custom",
    url: process.env.VIDEO_API_URL || "",
    key: process.env.VIDEO_API_KEY || "",
    model: process.env.VIDEO_MODEL || ""
  },
  talkingAvatar: {
    provider: process.env.TALKING_AVATAR_PROVIDER || "custom",
    url: process.env.TALKING_AVATAR_API_URL || "",
    key: process.env.TALKING_AVATAR_API_KEY || "",
    model: process.env.TALKING_AVATAR_MODEL || ""
  },
  avatarReplace: {
    provider: process.env.AVATAR_REPLACE_PROVIDER || "custom",
    url: process.env.AVATAR_REPLACE_API_URL || "",
    key: process.env.AVATAR_REPLACE_API_KEY || "",
    model: process.env.AVATAR_REPLACE_MODEL || ""
  },
  imageEdit: {
    provider: process.env.IMAGE_EDIT_PROVIDER || "custom",
    url: process.env.IMAGE_EDIT_API_URL || "",
    key: process.env.IMAGE_EDIT_API_KEY || "",
    model: process.env.IMAGE_EDIT_MODEL || ""
  }
};

function engineStatus(e) {
  return {
    provider: e.provider,
    configured: e.provider === "openai"
      ? Boolean(process.env.OPENAI_API_KEY)
      : Boolean(e.url),
    model: e.model || null
  };
}

function engineSummary() {
  return {
    image: engineStatus(ENGINE.image),
    video: engineStatus(ENGINE.video),
    talkingAvatar: engineStatus(ENGINE.talkingAvatar),
    avatarReplace: engineStatus(ENGINE.avatarReplace),
    imageEdit: engineStatus(ENGINE.imageEdit)
  };
}

function requireEngineConfigured(engine, name) {
  const configured = engine.provider === "openai"
    ? Boolean(process.env.OPENAI_API_KEY)
    : Boolean(engine.url);

  if (!configured) {
    throw new Error(`${name} engine is not configured. Set the corresponding API environment variables.`);
  }
}

/* -----------------------------
   External AI engine adapters
----------------------------- */

async function fetchWithTimeout(url, options = {}, timeout = 120000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function openAIImageGenerate({ prompt, size = "1024x1024", quality = "auto", user }) {
  requireEngineConfigured(ENGINE.image, "Image");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");

  const payload = {
    model: ENGINE.image.model,
    prompt,
    size,
    quality
  };
  if (user) payload.user = clean(user, 200);

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    },
    180000
  );

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!response.ok) {
    throw new Error(data?.error?.message || `Image API error ${response.status}`);
  }

  const item = data?.data?.[0];
  if (!item) throw new Error("Image provider returned no image");

  if (item.b64_json) {
    const buffer = Buffer.from(item.b64_json, "base64");
    const file = path.join(GALLERY_DIR, `${id("image")}.png`);
    fs.writeFileSync(file, buffer);
    return { url: publicAssetUrl(file), mime: "image/png", provider: "openai" };
  }

  if (item.url) {
    return { url: item.url, mime: "image/*", provider: "openai" };
  }

  throw new Error("Image provider returned an unsupported result");
}

/*
 * Generic engine contract.
 *
 * Your video/avatar provider receives:
 * {
 *   model, prompt, image, sourceVideo, targetAvatar,
 *   duration, user, consentId
 * }
 *
 * It may return:
 * { url: "...", status: "completed" }
 *
 * OR:
 * { id: "...", status: "processing", statusUrl: "https://..." }
 *
 * If statusUrl is supplied, Kelvin Live polls it until completed/failed.
 */

async function customEngineSubmit(engine, payload) {
  requireEngineConfigured(engine, "AI");
  const headers = {
    "Content-Type": "application/json"
  };
  if (engine.key) headers.Authorization = `Bearer ${engine.key}`;

  const response = await fetchWithTimeout(
    engine.url,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...payload,
        model: payload.model || engine.model || undefined
      })
    },
    180000
  );

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || `Engine error ${response.status}`);
  }

  return data;
}

async function customEnginePoll(engine, statusUrl, providerJobId) {
  const headers = {};
  if (engine.key) headers.Authorization = `Bearer ${engine.key}`;

  const response = await fetchWithTimeout(statusUrl, { headers }, 120000);
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || `Engine polling error ${response.status}`);
  }

  return data;
}

function providerResult(data) {
  const status = String(data?.status || "").toLowerCase();

  const url =
    data?.url ||
    data?.video_url ||
    data?.videoUrl ||
    data?.image_url ||
    data?.imageUrl ||
    data?.output?.url ||
    (Array.isArray(data?.output) ? data.output[0] : null);

  const statusUrl =
    data?.statusUrl ||
    data?.status_url ||
    data?.poll_url ||
    data?.pollUrl;

  const providerId =
    data?.id ||
    data?.job_id ||
    data?.jobId;

  if (url) {
    return { done: true, url, providerId, status };
  }

  if (statusUrl || providerId || ["queued", "processing", "pending", "running"].includes(status)) {
    return { done: false, statusUrl, providerId, status };
  }

  return { done: false, statusUrl: null, providerId, status: status || "processing" };
}

/* -----------------------------
   Job system
----------------------------- */

function createJob(type, input) {
  const job = {
    id: id("job"),
    type,
    status: "queued",
    progress: 0,
    createdAt: now(),
    updatedAt: now(),
    input,
    output: null,
    error: null
  };
  db.jobs.unshift(job);
  db.jobs = db.jobs.slice(0, 500);
  saveDB();
  return job;
}

function updateJob(job, patch) {
  Object.assign(job, patch, { updatedAt: now() });
  saveDB();
}

async function runProviderJob(job, engine, payload) {
  try {
    updateJob(job, { status: "processing", progress: 10 });

    const first = await customEngineSubmit(engine, payload);
    const result = providerResult(first);

    if (result.done) {
      updateJob(job, {
        status: "completed",
        progress: 100,
        output: { ...result, providerResponse: first }
      });
      return;
    }

    let statusUrl = result.statusUrl;
    let providerId = result.providerId;

    if (!statusUrl && engine.url && providerId) {
      const base = engine.url.endsWith("/") ? engine.url.slice(0, -1) : engine.url;
      statusUrl = `${base}/${encodeURIComponent(providerId)}`;
    }

    const deadline = Date.now() + JOB_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 3000));

      if (!statusUrl) {
        updateJob(job, {
          status: "completed",
          progress: 100,
          output: { ...result, providerResponse: first }
        });
        return;
      }

      const poll = await customEnginePoll(engine, statusUrl, providerId);
      const p = providerResult(poll);

      const pollStatus = String(poll?.status || "").toLowerCase();
      if (pollStatus === "failed" || pollStatus === "error" || pollStatus === "cancelled") {
        throw new Error(poll?.error?.message || poll?.error || "Provider job failed");
      }

      const progress = Number(poll?.progress);
      updateJob(job, {
        progress: Number.isFinite(progress) ? Math.max(10, Math.min(99, progress)) : Math.min(95, job.progress + 10),
        provider: { id: providerId, statusUrl }
      });

      if (p.done) {
        updateJob(job, {
          status: "completed",
          progress: 100,
          output: { ...p, providerResponse: poll }
        });
        return;
      }
    }

    throw new Error("AI engine job timed out");
  } catch (err) {
    console.error(`Job ${job.id} failed:`, err.message);
    updateJob(job, {
      status: "failed",
      progress: 0,
      error: err.message
    });
  }
}

/* -----------------------------
   Consent / authorization
----------------------------- */

function consentRequired(body) {
  return {
    consentId: clean(body.consentId, 200),
    authorized: body.authorized === true,
    subject: clean(body.subject, 200),
    purpose: clean(body.purpose || "Kelvin Live avatar/media generation", 500),
    createdAt: now()
  };
}

function verifyConsent(body) {
  const c = consentRequired(body);
  if (!c.authorized) throw new Error("Explicit authorization is required for face/avatar processing.");

  const existing = db.consents.find(x => x.consentId === c.consentId);
  if (existing && existing.authorized) return existing;

  if (!c.consentId) {
    c.consentId = id("consent");
  }

  db.consents.unshift(c);
  db.consents = db.consents.slice(0, 1000);
  saveDB();
  return c;
}

/* -----------------------------
   Gallery
----------------------------- */

function addGalleryItem(item) {
  const record = {
    id: id("media"),
    createdAt: now(),
    ...item
  };
  db.gallery.unshift(record);
  db.gallery = db.gallery.slice(0, 1000);
  saveDB();
  return record;
}

/* -----------------------------
   Call rooms
----------------------------- */

const rooms = new Map();

function createRoom() {
  let code;
  do {
    code = `KLV-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  } while (rooms.has(code));

  rooms.set(code, new Set());
  return code;
}

function addToRoom(code, socket) {
  if (!rooms.has(code)) rooms.set(code, new Set());
  rooms.get(code).add(socket);
  socket.roomCode = code;
}

function removeFromRoom(socket) {
  const code = socket.roomCode;
  if (!code || !rooms.has(code)) return;

  const room = rooms.get(code);
  room.delete(socket);

  if (room.size === 0) rooms.delete(code);
  socket.roomCode = null;
}

function broadcastToRoom(code, sender, message) {
  const room = rooms.get(code);
  if (!room) return;

  const payload = JSON.stringify(message);
  for (const client of room) {
    if (client !== sender && client.readyState === 1) client.send(payload);
  }
}

/* -----------------------------
   HTTP API
----------------------------- */

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
      });
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const requestPath = url.pathname;

    /* health */
    if (requestPath === "/health") {
      return sendJSON(res, 200, {
        ok: true,
        service: "kelvinlive-server",
        version: "2.0.0",
        time: now(),
        rooms: rooms.size,
        engines: engineSummary()
      });
    }

    /* engine status */
    if (requestPath === "/api/engines/status" && req.method === "GET") {
      return sendJSON(res, 200, { ok: true, engines: engineSummary() });
    }

    /* create call */
    if (requestPath === "/api/call/create" && req.method === "POST") {
      const code = createRoom();
      return sendJSON(res, 200, {
        ok: true,
        code,
        maxParticipants: 2
      });
    }

    /* check call */
    if (requestPath.startsWith("/api/call/") && req.method === "GET") {
      const code = requestPath.split("/").pop().toUpperCase();
      const room = rooms.get(code);
      return sendJSON(res, 200, {
        ok: true,
        exists: Boolean(room),
        code,
        participants: room ? room.size : 0
      });
    }

    /* save explicit consent */
    if (requestPath === "/api/consent" && req.method === "POST") {
      const body = await readJSON(req);
      const consent = verifyConsent(body);
      return sendJSON(res, 200, { ok: true, consent });
    }

    /* list gallery */
    if (requestPath === "/api/gallery" && req.method === "GET") {
      return sendJSON(res, 200, {
        ok: true,
        items: db.gallery.slice(0, 200)
      });
    }

    /* delete gallery record */
    if (requestPath.startsWith("/api/gallery/") && req.method === "DELETE") {
      const mediaId = requestPath.split("/").pop();
      const before = db.gallery.length;
      db.gallery = db.gallery.filter(x => x.id !== mediaId);
      saveDB();
      return sendJSON(res, 200, {
        ok: true,
        deleted: before !== db.gallery.length
      });
    }

    /* image generation */
    if (requestPath === "/api/engines/image/generate" && req.method === "POST") {
      const body = await readJSON(req);
      const prompt = clean(body.prompt, 10000);
      if (!prompt) return sendJSON(res, 400, { ok: false, error: "Prompt is required" });

      if (ENGINE.image.provider === "openai") {
        const result = await openAIImageGenerate({
          prompt,
          size: body.size || "1024x1024",
          quality: body.quality || "auto",
          user: body.userId
        });

        const media = addGalleryItem({
          type: "image",
          source: "ai-image",
          prompt,
          url: result.url,
          mime: result.mime,
          provider: result.provider
        });

        return sendJSON(res, 200, { ok: true, status: "completed", media });
      }

      const job = createJob("image", { prompt });
      runProviderJob(job, ENGINE.image, {
        prompt,
        userId: body.userId,
        consentId: body.consentId
      });
      return sendJSON(res, 202, { ok: true, jobId: job.id, status: job.status });
    }

    /* image editing / regeneration */
    if (requestPath === "/api/engines/image/edit" && req.method === "POST") {
      const body = await readJSON(req);
      const prompt = clean(body.prompt, 10000);
      if (!prompt || !body.image) {
        return sendJSON(res, 400, { ok: false, error: "image and prompt are required" });
      }

      verifyConsent(body);

      const job = createJob("image-edit", {
        prompt,
        image: body.image,
        mask: body.mask || null
      });

      runProviderJob(job, ENGINE.imageEdit, {
        prompt,
        image: body.image,
        mask: body.mask || null,
        consentId: body.consentId
      });

      return sendJSON(res, 202, { ok: true, jobId: job.id, status: job.status });
    }

    /* generic AI video */
    if (requestPath === "/api/engines/video/generate" && req.method === "POST") {
      const body = await readJSON(req);
      const prompt = clean(body.prompt, 10000);
      if (!prompt) return sendJSON(res, 400, { ok: false, error: "Prompt is required" });

      if (body.image || body.avatarImage) verifyConsent(body);

      const job = createJob("video", {
        prompt,
        image: body.image || null,
        duration: body.duration || 5
      });

      runProviderJob(job, ENGINE.video, {
        prompt,
        image: body.image || null,
        duration: body.duration || 5,
        userId: body.userId,
        consentId: body.consentId
      });

      return sendJSON(res, 202, { ok: true, jobId: job.id, status: job.status });
    }

    /* talking avatar */
    if (requestPath === "/api/engines/avatar/talking" && req.method === "POST") {
      const body = await readJSON(req);

      if (!body.image) {
        return sendJSON(res, 400, { ok: false, error: "Avatar image is required" });
      }

      verifyConsent(body);

      const job = createJob("talking-avatar", {
        image: body.image,
        text: clean(body.text, 5000),
        audio: body.audio || null
      });

      runProviderJob(job, ENGINE.talkingAvatar, {
        image: body.image,
        text: clean(body.text, 5000),
        audio: body.audio || null,
        consentId: body.consentId,
        userId: body.userId
      });

      return sendJSON(res, 202, { ok: true, jobId: job.id, status: job.status });
    }

    /* avatar replacement */
    if (requestPath === "/api/engines/avatar/replace" && req.method === "POST") {
      const body = await readJSON(req);

      if (!body.sourceVideo || !body.targetAvatar) {
        return sendJSON(res, 400, {
          ok: false,
          error: "sourceVideo and targetAvatar are required"
        });
      }

      verifyConsent(body);

      const job = createJob("avatar-replace", {
        sourceVideo: body.sourceVideo,
        targetAvatar: body.targetAvatar,
        prompt: clean(body.prompt, 5000)
      });

      runProviderJob(job, ENGINE.avatarReplace, {
        sourceVideo: body.sourceVideo,
        targetAvatar: body.targetAvatar,
        prompt: clean(body.prompt, 5000),
        consentId: body.consentId,
        userId: body.userId
      });

      return sendJSON(res, 202, { ok: true, jobId: job.id, status: job.status });
    }

    /* live-avatar session metadata */
    if (requestPath === "/api/avatar/session" && req.method === "POST") {
      const body = await readJSON(req);
      verifyConsent(body);

      const session = {
        id: id("avatar_session"),
        roomCode: clean(body.roomCode, 100),
        avatarId: clean(body.avatarId, 300),
        mode: clean(body.mode || "live"),
        tracking: {
          face: true,
          mouth: true,
          eyes: true,
          headPose: true,
          expressions: true
        },
        createdAt: now()
      };

      return sendJSON(res, 200, { ok: true, session });
    }

    /*
     * Upload browser recording / generated media.
     * Client sends {dataUrl, type, filename, ...}
     */
    if (requestPath === "/api/media/upload" && req.method === "POST") {
      const body = await readJSON(req);
      if (!body.dataUrl) return sendJSON(res, 400, { ok: false, error: "dataUrl is required" });

      const parsed = parseDataUrl(body.dataUrl);
      if (parsed.buffer.length > MAX_BODY_BYTES) {
        return sendJSON(res, 413, { ok: false, error: "Media is too large" });
      }

      const category = body.type === "video" ? "recordings" : "gallery";
      const directory = category === "recordings" ? RECORDINGS_DIR : GALLERY_DIR;
      const file = path.join(directory, `${id(category === "recordings" ? "recording" : "media")}${extensionForMime(parsed.mime)}`);
      fs.writeFileSync(file, parsed.buffer);

      const urlPath = `/media/${category}/${path.basename(file)}`;

      const record = addGalleryItem({
        type: body.type || "media",
        source: body.source || "upload",
        name: safeFileName(body.filename || path.basename(file)),
        url: urlPath,
        mime: parsed.mime,
        size: parsed.buffer.length
      });

      if (category === "recordings") {
        db.recordings.unshift({
          id: id("recording"),
          mediaId: record.id,
          url: urlPath,
          createdAt: now()
        });
        saveDB();
      }

      return sendJSON(res, 200, { ok: true, media: record });
    }

    /* jobs */
    if (requestPath.startsWith("/api/jobs/") && req.method === "GET") {
      const jobId = requestPath.split("/").pop();
      const job = db.jobs.find(x => x.id === jobId);
      if (!job) return sendJSON(res, 404, { ok: false, error: "Job not found" });

      return sendJSON(res, 200, { ok: true, job });
    }

    /* media */
    if (requestPath.startsWith("/media/") && req.method === "GET") {
      const parts = requestPath.split("/").filter(Boolean);
      if (parts.length !== 3) return sendJSON(res, 404, { ok: false, error: "Media not found" });

      const folder = parts[1];
      const file = safeFileName(parts[2]);
      const allowed = folder === "gallery" ? GALLERY_DIR : folder === "recordings" ? RECORDINGS_DIR : null;
      if (!allowed) return sendJSON(res, 404, { ok: false, error: "Media not found" });

      const filePath = path.join(allowed, file);
      if (!fs.existsSync(filePath)) return sendJSON(res, 404, { ok: false, error: "Media not found" });

      const ext = path.extname(filePath).toLowerCase();
      const mime = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg"
      }[ext] || "application/octet-stream";

      res.writeHead(200, {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable"
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    /* main app */
    if (requestPath === "/" || requestPath === "/index.html" || requestPath === "/app" || requestPath === "/app/") {
      const indexPath = path.join(WEB_DIR, "index.html");
      if (fs.existsSync(indexPath)) return sendFile(res, indexPath);
      return sendJSON(res, 404, { ok: false, error: "Kelvin Live index.html not found" });
    }

    /* static */
    const filePath = safeWebPath(requestPath);
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return sendFile(res, filePath);
    }

    return sendJSON(res, 404, { ok: false, error: "Kelvin Live endpoint not found" });
  } catch (err) {
    console.error("HTTP error:", err);
    return sendJSON(res, 500, { ok: false, error: err.message || "Server error" });
  }
});

/* -----------------------------
   WebSocket WebRTC signaling
----------------------------- */

const wss = new WebSocketServer({ server });

wss.on("connection", socket => {
  socket.roomCode = null;

  socket.send(JSON.stringify({
    type: "connected",
    service: "kelvinlive",
    version: "2.0.0"
  }));

  socket.on("message", raw => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid message" }));
      return;
    }

    if (message.type === "join-room") {
      const code = clean(message.code, 100).toUpperCase();

      if (!/^KLV-[A-Z0-9]+$/.test(code)) {
        socket.send(JSON.stringify({ type: "error", message: "Invalid call code" }));
        return;
      }

      if (!rooms.has(code)) rooms.set(code, new Set());
      const room = rooms.get(code);

      if (socket.roomCode && socket.roomCode !== code) removeFromRoom(socket);

      if (room.size >= 2 && !room.has(socket)) {
        socket.send(JSON.stringify({ type: "room-full", code }));
        return;
      }

      const wasEmpty = room.size === 0;
      addToRoom(code, socket);

      socket.send(JSON.stringify({
        type: "joined-room",
        code,
        participants: room.size,
        role: wasEmpty ? "initiator" : "receiver"
      }));

      if (room.size === 2) {
        for (const client of room) {
          client.send(JSON.stringify({
            type: "peer-ready",
            code,
            initiator: client !== socket
          }));
        }
      }
      return;
    }

    const signalingTypes = [
      "offer",
      "answer",
      "ice-candidate",
      "avatar-state",
      "media-state"
    ];

    if (signalingTypes.includes(message.type)) {
      if (!socket.roomCode) return;

      broadcastToRoom(socket.roomCode, socket, {
        ...message,
        code: socket.roomCode
      });
      return;
    }

    if (message.type === "leave-room") {
      const code = socket.roomCode;
      if (code) {
        broadcastToRoom(code, socket, { type: "peer-left" });
        removeFromRoom(socket);
      }
      return;
    }
  });

  socket.on("close", () => {
    const code = socket.roomCode;
    if (code) broadcastToRoom(code, socket, { type: "peer-left" });
    removeFromRoom(socket);
  });

  socket.on("error", err => {
    console.error("WebSocket error:", err.message);
    removeFromRoom(socket);
  });
});

/* -----------------------------
   Periodic cleanup
----------------------------- */

setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [code, room] of rooms) {
    if (room.size === 0) rooms.delete(code);
  }

  db.jobs = db.jobs.filter(job => {
    const t = Date.parse(job.createdAt || 0);
    return Number.isFinite(t) ? t > cutoff : true;
  });

  saveDB();
}, 30 * 60 * 1000);

/* -----------------------------
   Start
----------------------------- */

server.listen(PORT, HOST, () => {
  console.log(`Kelvin Live server listening on ${HOST}:${PORT}`);
  console.log("Engine status:", JSON.stringify(engineSummary(), null, 2));
});
