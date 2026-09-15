'use strict';

/*
 * Kelvin Live backend
 *
 * Node 20+
 * - HTTP API + static frontend
 * - WebSocket signaling for calls
 * - AI generation job system
 * - Persistent JSON metadata + local media files for development
 * - OpenAI image generation
 * - Generic HTTP adapters for video / talking-avatar / face replacement / image edit
 * - Backward-compatible /api/engines/* and /api/ai/* routes
 *
 * IMPORTANT:
 * This server does not fake AI generation. If an engine is not configured,
 * the API returns a clear error instead of pretending a job succeeded.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 10000);
const HOST = process.env.HOST || '0.0.0.0';

const WEB_DIR = path.resolve(
  process.env.WEB_DIR || path.join(__dirname, 'web')
);

const DATA_DIR = path.resolve(
  process.env.DATA_DIR || path.join(__dirname, 'data')
);

const GALLERY_DIR = path.resolve(
  process.env.GALLERY_DIR || path.join(DATA_DIR, 'gallery')
);

const RECORDINGS_DIR = path.resolve(
  process.env.RECORDINGS_DIR || path.join(DATA_DIR, 'recordings')
);

const DB_FILE = path.resolve(
  process.env.DB_FILE || path.join(DATA_DIR, 'db.json')
);

const MAX_BODY_BYTES = Number(
  process.env.MAX_BODY_BYTES || 35 * 1024 * 1024
);

const JOB_TIMEOUT_MS = Number(
  process.env.JOB_TIMEOUT_MS || 10 * 60 * 1000
);

const PROVIDER_TIMEOUT_MS = Number(
  process.env.PROVIDER_TIMEOUT_MS || 90 * 1000
);

const JOB_POLL_MS = Number(
  process.env.JOB_POLL_MS || 3000
);

for (const dir of [
  DATA_DIR,
  GALLERY_DIR,
  RECORDINGS_DIR
]) {
  fs.mkdirSync(dir, { recursive: true });
}

/* -------------------------------------------------------
   DATABASE
------------------------------------------------------- */

const DEFAULT_DB = {
  users: [],
  sessions: [],
  consents: [],
  gallery: [],
  jobs: [],
  recordings: [],
  avatars: []
};

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(DEFAULT_DB, null, 2)
      );
      return structuredClone(DEFAULT_DB);
    }

    const parsed = JSON.parse(
      fs.readFileSync(DB_FILE, 'utf8')
    );

    return {
      ...structuredClone(DEFAULT_DB),
      ...parsed
    };
  } catch (error) {
    console.error('DB load error:', error);

    return structuredClone(DEFAULT_DB);
  }
}

let db = loadDB();

let saveTimer = null;

function saveDB() {
  clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    try {
      const tmp = `${DB_FILE}.tmp`;

      fs.writeFileSync(
        tmp,
        JSON.stringify(db, null, 2)
      );

      fs.renameSync(tmp, DB_FILE);
    } catch (error) {
      console.error('DB save error:', error);
    }
  }, 100);
}

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function id(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID()}`;
}

function now() {
  return new Date().toISOString();
}

function clean(value, max = 5000) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, max);
}

function safeFileName(name) {
  return clean(name, 200)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
}

function extensionForMime(mime) {
  const m = String(mime || '').toLowerCase();

  if (m.includes('png')) return '.png';
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif')) return '.gif';
  if (m.includes('mp4')) return '.mp4';
  if (m.includes('webm')) return '.webm';
  if (m.includes('quicktime')) return '.mov';
  if (m.includes('mpeg')) return '.mp3';
  if (m.includes('wav')) return '.wav';

  return '.bin';
}

function parseDataUrl(dataUrl) {
  const value = clean(dataUrl, MAX_BODY_BYTES);

  const match = value.match(
    /^data:([^;,]+)?(?:;[^,]+)*;base64,(.+)$/s
  );

  if (!match) {
    throw new Error('Invalid data URL');
  }

  const mime = match[1] || 'application/octet-stream';
  const data = Buffer.from(match[2], 'base64');

  return {
    mime,
    data
  };
}

function publicAssetUrl(type, filename) {
  const safe = safeFileName(filename);

  return `/media/${type}/${encodeURIComponent(safe)}`;
}

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);

  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  });

  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });

  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    req.on('data', chunk => {
      total += chunk.length;

      if (total > MAX_BODY_BYTES) {
        reject(
          Object.assign(
            new Error('Request body too large'),
            { statusCode: 413 }
          )
        );

        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', reject);
  });
}

async function readJSON(req) {
  const body = await readBody(req);

  if (!body.length) {
    return {};
  }

  try {
    return JSON.parse(body.toString('utf8'));
  } catch {
    const error = new Error('Invalid JSON body');
    error.statusCode = 400;
    throw error;
  }
}

function sendFile(res, filePath, contentType) {
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

function contentTypeForFile(file) {
  const ext = path.extname(file).toLowerCase();

  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav'
  };

  return map[ext] || 'application/octet-stream';
}

function safeWebPath(urlPath) {
  const decoded = decodeURIComponent(urlPath);

  const relative = decoded
    .replace(/^\/+/, '')
    .replace(/\0/g, '');

  const target = path.resolve(WEB_DIR, relative);

  if (
    target !== WEB_DIR &&
    !target.startsWith(`${WEB_DIR}${path.sep}`)
  ) {
    return null;
  }

  return target;
}

/* -------------------------------------------------------
   AUTH
------------------------------------------------------- */

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto
    .scryptSync(String(password), salt, 64)
    .toString('hex');

  return {
    salt,
    hash
  };
}

function verifyPassword(password, storedHash, salt) {
  try {
    const derived = crypto
      .scryptSync(String(password), salt, 64)
      .toString('hex');

    return crypto.timingSafeEqual(
      Buffer.from(derived, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch {
    return false;
  }
}

function createSession(userId) {
  const token = crypto.randomBytes(48).toString('hex');

  db.sessions.push({
    id: id('session'),
    token,
    userId,
    createdAt: now(),
    expiresAt: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString()
  });

  saveDB();

  return token;
}

function getUserFromRequest(req) {
  const auth = req.headers.authorization || '';

  if (!auth.startsWith('Bearer ')) {
    return null;
  }

  const token = auth.slice(7).trim();

  const session = db.sessions.find(
    s =>
      s.token === token &&
      new Date(s.expiresAt).getTime() > Date.now()
  );

  if (!session) {
    return null;
  }

  return db.users.find(
    user => user.id === session.userId
  ) || null;
}

function publicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    createdAt: user.createdAt
  };
}

/* -------------------------------------------------------
   ENGINE CONFIGURATION
------------------------------------------------------- */

const ENGINES = {
  image: {
    provider:
      process.env.IMAGE_PROVIDER ||
      (process.env.OPENAI_API_KEY ? 'openai' : 'custom'),

    url:
      process.env.IMAGE_API_URL ||
      '',

    key:
      process.env.IMAGE_API_KEY ||
      process.env.OPENAI_API_KEY ||
      '',

    model:
      process.env.IMAGE_MODEL ||
      'gpt-image-2'
  },

  video: {
    provider:
      process.env.VIDEO_PROVIDER || 'custom',

    url:
      process.env.VIDEO_API_URL ||
      '',

    key:
      process.env.VIDEO_API_KEY ||
      '',

    model:
      process.env.VIDEO_MODEL ||
      ''
  },

  talkingAvatar: {
    provider:
      process.env.TALKING_AVATAR_PROVIDER ||
      'custom',

    url:
      process.env.TALKING_AVATAR_API_URL ||
      '',

    key:
      process.env.TALKING_AVATAR_API_KEY ||
      '',

    model:
      process.env.TALKING_AVATAR_MODEL ||
      ''
  },

  avatarReplace: {
    provider:
      process.env.AVATAR_REPLACE_PROVIDER ||
      'custom',

    url:
      process.env.AVATAR_REPLACE_API_URL ||
      '',

    key:
      process.env.AVATAR_REPLACE_API_KEY ||
      '',

    model:
      process.env.AVATAR_REPLACE_MODEL ||
      ''
  },

  imageEdit: {
    provider:
      process.env.IMAGE_EDIT_PROVIDER ||
      process.env.IMAGE_PROVIDER ||
      'custom',

    url:
      process.env.IMAGE_EDIT_API_URL ||
      process.env.IMAGE_API_URL ||
      '',

    key:
      process.env.IMAGE_EDIT_API_KEY ||
      process.env.IMAGE_API_KEY ||
      process.env.OPENAI_API_KEY ||
      '',

    model:
      process.env.IMAGE_EDIT_MODEL ||
      process.env.IMAGE_MODEL ||
      'gpt-image-2'
  }
};

function engineStatus(engine) {
  const config = ENGINES[engine];

  if (!config) {
    return {
      engine,
      configured: false
    };
  }

  const configured =
    engine === 'image'
      ? Boolean(config.key)
      : Boolean(config.url && config.key);

  return {
    engine,
    provider: config.provider,
    model: config.model,
    configured,
    hasKey: Boolean(config.key),
    hasUrl: Boolean(config.url)
  };
}

function engineSummary() {
  return {
    image: engineStatus('image'),
    video: engineStatus('video'),
    talkingAvatar: engineStatus('talkingAvatar'),
    avatarReplace: engineStatus('avatarReplace'),
    imageEdit: engineStatus('imageEdit')
  };
}

function requireEngineConfigured(engine) {
  const status = engineStatus(engine);

  if (!status.configured) {
    const error = new Error(
      `${engine} engine is not configured`
    );

    error.statusCode = 503;
    error.code = 'ENGINE_NOT_CONFIGURED';

    throw error;
  }
}

/* -------------------------------------------------------
   HTTP PROVIDER
------------------------------------------------------- */

async function fetchWithTimeout(
  url,
  options = {},
  timeout = PROVIDER_TIMEOUT_MS
) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeout
  );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

async function parseProviderResponse(response) {
  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = {
      raw: text
    };
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      data?.error ||
      `Provider returned HTTP ${response.status}`;

    const error = new Error(String(message));

    error.statusCode = 502;
    error.providerStatus = response.status;
    error.providerResponse = data;

    throw error;
  }

  return data;
}

/* -------------------------------------------------------
   LOCAL MEDIA STORAGE
------------------------------------------------------- */

function saveBufferToGallery(
  buffer,
  mime,
  metadata = {}
) {
  const filename =
    `${Date.now()}-${crypto.randomUUID()}` +
    extensionForMime(mime);

  const filePath =
    path.join(GALLERY_DIR, filename);

  fs.writeFileSync(filePath, buffer);

  const item = {
    id: id('gallery'),
    type: metadata.type || (
      String(mime).startsWith('video/')
        ? 'video'
        : 'image'
    ),
    mime,
    filename,
    url: publicAssetUrl('gallery', filename),
    prompt: metadata.prompt || '',
    title: metadata.title || '',
    source: metadata.source || 'generated',
    userId: metadata.userId || null,
    createdAt: now(),
    metadata: metadata.metadata || {}
  };

  db.gallery.unshift(item);
  saveDB();

  return item;
}

async function downloadToGallery(
  url,
  metadata = {}
) {
  const response = await fetchWithTimeout(
    url,
    {},
    PROVIDER_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(
      `Could not download generated media: HTTP ${response.status}`
    );
  }

  const arrayBuffer =
    await response.arrayBuffer();

  const buffer =
    Buffer.from(arrayBuffer);

  const mime =
    response.headers.get('content-type') ||
    metadata.mime ||
    'application/octet-stream';

  return saveBufferToGallery(
    buffer,
    mime,
    metadata
  );
}

/* -------------------------------------------------------
   OPENAI IMAGE GENERATION
------------------------------------------------------- */

async function openAIImageGenerate({
  prompt,
  size = '1024x1024',
  quality = 'auto',
  userId = null
}) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error(
      'OPENAI_API_KEY is not configured'
    );

    error.statusCode = 503;
    throw error;
  }

  const response = await fetchWithTimeout(
    'https://api.openai.com/v1/images/generations',
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization:
          `Bearer ${process.env.OPENAI_API_KEY}`
      },

      body: JSON.stringify({
        model:
          ENGINES.image.model ||
          'gpt-image-2',

        prompt: clean(prompt, 10000),

        size,

        quality
      })
    }
  );

  const data =
    await parseProviderResponse(response);

  const item =
    Array.isArray(data.data)
      ? data.data[0]
      : null;

  if (!item) {
    throw new Error(
      'Image provider returned no image'
    );
  }

  if (item.b64_json) {
    const buffer =
      Buffer.from(item.b64_json, 'base64');

    return saveBufferToGallery(
      buffer,
      'image/png',
      {
        type: 'image',
        prompt,
        source: 'openai',
        userId
      }
    );
  }

  if (item.url) {
    return await downloadToGallery(
      item.url,
      {
        type: 'image',
        prompt,
        source: 'openai',
        userId
      }
    );
  }

  throw new Error(
    'Image provider returned an unsupported result'
  );
}

/* -------------------------------------------------------
   CUSTOM ENGINE
------------------------------------------------------- */

async function customEngineSubmit(
  engine,
  payload
) {
  const config = ENGINES[engine];

  requireEngineConfigured(engine);

  const headers = {
    'Content-Type': 'application/json'
  };

  if (config.key) {
    headers.Authorization =
      `Bearer ${config.key}`;
  }

  const response =
    await fetchWithTimeout(
      config.url,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          ...payload
        })
      }
    );

  return parseProviderResponse(response);
}

function extractProviderJobId(data) {
  return (
    data?.id ||
    data?.job_id ||
    data?.jobId ||
    data?.task_id ||
    data?.taskId ||
    null
  );
}

function extractProviderStatus(data) {
  return String(
    data?.status ||
    data?.state ||
    data?.job?.status ||
    ''
  ).toLowerCase();
}

function providerResult(data) {
  if (!data) {
    return null;
  }

  const candidates = [
    data.url,
    data.output_url,
    data.outputUrl,
    data.result_url,
    data.resultUrl,
    data.video_url,
    data.videoUrl,
    data.image_url,
    data.imageUrl,
    data?.output?.url,
    data?.result?.url,
    data?.data?.url,
    data?.data?.[0]?.url,
    data?.output?.[0]?.url,
    data?.result?.[0]?.url
  ];

  const url =
    candidates.find(
      value =>
        typeof value === 'string' &&
        /^https?:\/\//i.test(value)
    );

  if (url) {
    return {
      url
    };
  }

  const b64Candidates = [
    data.b64_json,
    data.base64,
    data?.output?.b64_json,
    data?.result?.b64_json
  ];

  const base64 =
    b64Candidates.find(
      value =>
        typeof value === 'string' &&
        value.length > 20
    );

  if (base64) {
    return {
      base64
    };
  }

  return null;
}

async function customEnginePoll(
  engine,
  providerJobId
) {
  const config = ENGINES[engine];

  const base =
    config.url.replace(/\/+$/, '');

  const candidates = [
    `${base}/${encodeURIComponent(providerJobId)}`,
    `${base}?id=${encodeURIComponent(providerJobId)}`,
    `${base}/status/${encodeURIComponent(providerJobId)}`
  ];

  let lastError = null;

  for (const url of candidates) {
    try {
      const headers = {};

      if (config.key) {
        headers.Authorization =
          `Bearer ${config.key}`;
      }

      const response =
        await fetchWithTimeout(
          url,
          {
            method: 'GET',
            headers
          }
        );

      if (response.ok) {
        return parseProviderResponse(response);
      }

      lastError =
        new Error(
          `Provider polling returned HTTP ${response.status}`
        );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ||
    new Error('Unable to poll provider job');
}

/* -------------------------------------------------------
   JOB SYSTEM
------------------------------------------------------- */

function createJob({
  engine,
  type,
  userId = null,
  input = {}
}) {
  const job = {
    id: id('job'),
    engine,
    type,
    userId,
    status: 'queued',
    progress: 0,
    input,
    output: null,
    error: null,
    createdAt: now(),
    startedAt: null,
    completedAt: null
  };

  db.jobs.unshift(job);
  saveDB();

  return job;
}

function updateJob(job, patch) {
  Object.assign(job, patch);
  saveDB();

  return job;
}

async function materializeProviderResult(
  result,
  job
) {
  if (!result) {
    return null;
  }

  if (result.url) {
    return await downloadToGallery(
      result.url,
      {
        userId: job.userId,
        type:
          job.type === 'video' ||
          job.type === 'talking-avatar' ||
          job.type === 'avatar-replace'
            ? 'video'
            : 'image',
        prompt:
          job.input.prompt ||
          '',
        title:
          job.input.title ||
          '',
        source:
          `${job.engine}-provider`,
        metadata: {
          jobId: job.id
        }
      }
    );
  }

  if (result.base64) {
    const buffer =
      Buffer.from(result.base64, 'base64');

    const mime =
      job.type === 'video' ||
      job.type === 'talking-avatar' ||
      job.type === 'avatar-replace'
        ? 'video/mp4'
        : 'image/png';

    return saveBufferToGallery(
      buffer,
      mime,
      {
        userId: job.userId,
        type:
          job.type === 'video' ||
          job.type === 'talking-avatar' ||
          job.type === 'avatar-replace'
            ? 'video'
            : 'image',
        prompt:
          job.input.prompt ||
          '',
        source:
          `${job.engine}-provider`,
        metadata: {
          jobId: job.id
        }
      }
    );
  }

  return null;
}

async function runProviderJob(
  job,
  submitPayload
) {
  updateJob(job, {
    status: 'processing',
    progress: 5,
    startedAt: now()
  });

  const started =
    Date.now();

  try {
    if (
      job.engine === 'image' &&
      ENGINES.image.provider === 'openai'
    ) {
      const galleryItem =
        await openAIImageGenerate({
          prompt:
            submitPayload.prompt,

          size:
            submitPayload.size ||
            '1024x1024',

          quality:
            submitPayload.quality ||
            'auto',

          userId:
            job.userId
        });

      updateJob(job, {
        status: 'completed',
        progress: 100,
        output: galleryItem,
        completedAt: now()
      });

      return job;
    }

    requireEngineConfigured(job.engine);

    const submitted =
      await customEngineSubmit(
        job.engine,
        submitPayload
      );

    const immediate =
      providerResult(submitted);

    if (immediate) {
      const galleryItem =
        await materializeProviderResult(
          immediate,
          job
        );

      updateJob(job, {
        status: 'completed',
        progress: 100,
        output:
          galleryItem ||
          immediate,
        completedAt: now()
      });

      return job;
    }

    const providerJobId =
      extractProviderJobId(submitted);

    if (!providerJobId) {
      throw new Error(
        'Provider did not return a job ID or generated result'
      );
    }

    updateJob(job, {
      providerJobId,
      progress: 15
    });

    while (
      Date.now() - started <
      JOB_TIMEOUT_MS
    ) {
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            JOB_POLL_MS
          )
      );

      const polled =
        await customEnginePoll(
          job.engine,
          providerJobId
        );

      const status =
        extractProviderStatus(polled);

      const result =
        providerResult(polled);

      if (result) {
        const galleryItem =
          await materializeProviderResult(
            result,
            job
          );

        updateJob(job, {
          status: 'completed',
          progress: 100,
          output:
            galleryItem ||
            result,
          completedAt: now()
        });

        return job;
      }

      if (
        [
          'failed',
          'error',
          'cancelled',
          'canceled'
        ].includes(status)
      ) {
        throw new Error(
          polled?.error?.message ||
          polled?.message ||
          'Provider generation failed'
        );
      }

      updateJob(job, {
        status: 'processing',
        progress: Math.min(
          95,
          Math.max(
            20,
            Number(polled?.progress || 0)
          )
        )
      });
    }

    throw new Error(
      'Generation timed out'
    );
  } catch (error) {
    updateJob(job, {
      status: 'failed',
      progress: 0,
      error: {
        message:
          error.message ||
          'Generation failed',
        code:
          error.code ||
          'GENERATION_FAILED'
      },
      completedAt: now()
    });

    console.error(
      `Job ${job.id} failed:`,
      error
    );

    return job;
  }
}

/* -------------------------------------------------------
   CONSENT
------------------------------------------------------- */

function consentRequired(body) {
  return Boolean(
    body?.image ||
    body?.imageDataUrl ||
    body?.avatarImage ||
    body?.avatarImageDataUrl ||
    body?.sourceVideo ||
    body?.sourceVideoDataUrl ||
    body?.faceImage ||
    body?.faceImageDataUrl
  );
}

function verifyConsent(body, userId) {
  if (!consentRequired(body)) {
    return true;
  }

  if (body.authorized !== true) {
    const error = new Error(
      'Authorization is required before processing another person’s image or video'
    );

    error.statusCode = 403;
    error.code = 'CONSENT_REQUIRED';

    throw error;
  }

  db.consents.unshift({
    id: id('consent'),
    userId,
    authorized: true,
    purpose:
      clean(body.purpose, 500) ||
      'AI media generation',
    createdAt: now()
  });

  saveDB();

  return true;
}

/* -------------------------------------------------------
   GALLERY
------------------------------------------------------- */

function addGalleryItem(item) {
  const record = {
    id: id('gallery'),
    ...item,
    createdAt:
      item.createdAt ||
      now()
  };

  db.gallery.unshift(record);

  saveDB();

  return record;
}

/* -------------------------------------------------------
   AVATARS
------------------------------------------------------- */

function addAvatar({
  userId,
  name,
  imageUrl,
  imageDataUrl,
  authorized
}) {
  if (authorized !== true) {
    const error = new Error(
      'Avatar authorization is required'
    );

    error.statusCode = 403;

    throw error;
  }

  let storedUrl =
    imageUrl || null;

  if (imageDataUrl) {
    const parsed =
      parseDataUrl(imageDataUrl);

    const filename =
      `${Date.now()}-${crypto.randomUUID()}` +
      extensionForMime(parsed.mime);

    fs.writeFileSync(
      path.join(GALLERY_DIR, filename),
      parsed.data
    );

    storedUrl =
      publicAssetUrl(
        'gallery',
        filename
      );
  }

  const avatar = {
    id: id('avatar'),
    userId,
    name:
      clean(name, 200) ||
      'My Avatar',
    imageUrl: storedUrl,
    authorized: true,
    createdAt: now()
  };

  db.avatars.unshift(avatar);

  saveDB();

  return avatar;
}

/* -------------------------------------------------------
   CALL ROOMS
------------------------------------------------------- */

const rooms = new Map();

function createRoom() {
  let code;

  do {
    code =
      Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase();
  } while (rooms.has(code));

  rooms.set(code, {
    code,
    clients: new Set(),
    createdAt: now()
  });

  return rooms.get(code);
}

function getRoom(code) {
  return rooms.get(
    clean(code, 20).toUpperCase()
  );
}

function addToRoom(room, ws) {
  if (!room) {
    return false;
  }

  if (room.clients.size >= 2) {
    return false;
  }

  room.clients.add(ws);

  ws.roomCode =
    room.code;

  return true;
}

function removeFromRoom(ws) {
  const code =
    ws.roomCode;

  if (!code) {
    return;
  }

  const room =
    rooms.get(code);

  if (!room) {
    return;
  }

  room.clients.delete(ws);

  for (const client of room.clients) {
    if (
      client.readyState === WebSocket.OPEN
    ) {
      client.send(
        JSON.stringify({
          type: 'peer-left'
        })
      );
    }
  }

  if (!room.clients.size) {
    rooms.delete(code);
  }

  ws.roomCode = null;
}

function broadcastToRoom(
  room,
  message,
  except = null
) {
  const payload =
    JSON.stringify(message);

  for (const client of room.clients) {
    if (
      client !== except &&
      client.readyState === WebSocket.OPEN
    ) {
      client.send(payload);
    }
  }
}

/* -------------------------------------------------------
   HTTP ROUTES
------------------------------------------------------- */

async function handleRequest(req, res) {
  const parsed =
    new URL(
      req.url,
      `http://${req.headers.host || 'localhost'}`
    );

  const pathname =
    parsed.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization',
      'Access-Control-Allow-Methods':
        'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    });

    res.end();

    return;
  }

  try {
    /* ---------------- HEALTH ---------------- */

    if (
      req.method === 'GET' &&
      pathname === '/health'
    ) {
      sendJSON(res, 200, {
        ok: true,
        service: 'kelvin-live',
        time: now(),
        node: process.version,
        engines: engineSummary()
      });

      return;
    }

    if (
      req.method === 'GET' &&
      pathname === '/api/engines/status'
    ) {
      sendJSON(res, 200, {
        ok: true,
        engines: engineSummary()
      });

      return;
    }

    if (
      req.method === 'GET' &&
      pathname === '/api/ai/status'
    ) {
      sendJSON(res, 200, {
        ok: true,
        engines: engineSummary()
      });

      return;
    }

    /* ---------------- AUTH ---------------- */

    if (
      req.method === 'POST' &&
      pathname === '/api/auth/register'
    ) {
      const body =
        await readJSON(req);

      const name =
        clean(body.name, 100);

      const email =
        clean(body.email, 250)
          .toLowerCase();

      const password =
        String(body.password || '');

      if (!email || !password) {
        sendJSON(res, 400, {
          ok: false,
          error:
            'Email and password are required'
        });

        return;
      }

      if (password.length < 6) {
        sendJSON(res, 400, {
          ok: false,
          error:
            'Password must contain at least 6 characters'
        });

        return;
      }

      if (
        db.users.some(
          user =>
            user.email === email
        )
      ) {
        sendJSON(res, 409, {
          ok: false,
          error:
            'An account with this email already exists'
        });

        return;
      }

      const credentials =
        hashPassword(password);

      const user = {
        id: id('user'),
        name:
          name ||
          email.split('@')[0],
        email,
        passwordHash:
          credentials.hash,
        passwordSalt:
          credentials.salt,
        createdAt: now()
      };

      db.users.push(user);

      const token =
        createSession(user.id);

      saveDB();

      sendJSON(res, 201, {
        ok: true,
        token,
        user:
          publicUser(user)
      });

      return;
    }

    if (
      req.method === 'POST' &&
      pathname === '/api/auth/login'
    ) {
      const body =
        await readJSON(req);

      const email =
        clean(body.email, 250)
          .toLowerCase();

      const password =
        String(body.password || '');

      const user =
        db.users.find(
          item =>
            item.email === email
        );

      if (
        !user ||
        !verifyPassword(
          password,
          user.passwordHash,
          user.passwordSalt
        )
      ) {
        sendJSON(res, 401, {
          ok: false,
          error:
            'Invalid email or password'
        });

        return;
      }

      const token =
        createSession(user.id);

      sendJSON(res, 200, {
        ok: true,
        token,
        user:
          publicUser(user)
      });

      return;
    }

    if (
      req.method === 'GET' &&
      pathname === '/api/auth/me'
    ) {
      const user =
        getUserFromRequest(req);

      if (!user) {
        sendJSON(res, 401, {
          ok: false,
          error: 'Not authenticated'
        });

        return;
      }

      sendJSON(res, 200, {
        ok: true,
        user:
          publicUser(user)
      });

      return;
    }

    if (
      req.method === 'POST' &&
      pathname === '/api/auth/logout'
    ) {
      const auth =
        req.headers.authorization || '';

      if (auth.startsWith('Bearer ')) {
        const token =
          auth.slice(7).trim();

        db.sessions =
          db.sessions.filter(
            s =>
              s.token !== token
          );

        saveDB();
      }

      sendJSON(res, 200, {
        ok: true
      });

      return;
    }

    /* ---------------- CALL ---------------- */

    if (
      req.method === 'POST' &&
      pathname === '/api/call/create'
    ) {
      const room =
        createRoom();

      sendJSON(res, 201, {
        ok: true,
        code: room.code,
        room: room.code
      });

      return;
    }

    const callMatch =
      pathname.match(
        /^\/api\/call\/([^/]+)$/
      );

    if (
      req.method === 'GET' &&
      callMatch
    ) {
      const room =
        getRoom(
          callMatch[1]
        );

      if (!room) {
        sendJSON(res, 404, {
          ok: false,
          error: 'Call room not found'
        });

        return;
      }

      sendJSON(res, 200, {
        ok: true,
        code: room.code,
        participants:
          room.clients.size
      });

      return;
    }

    /* ---------------- CONSENT ---------------- */

    if (
      req.method === 'POST' &&
      pathname === '/api/consent'
    ) {
      const user =
        getUserFromRequest(req);

      const body =
        await readJSON(req);

      const record = {
        id: id('consent'),
        userId:
          user?.id ||
          body.userId ||
          null,
        authorized:
          body.authorized === true,
        purpose:
          clean(
            body.purpose,
            500
          ),
        createdAt: now()
      };

      db.consents.unshift(record);

      saveDB();

      sendJSON(res, 201, {
        ok: true,
        consent: record
      });

      return;
    }

    /* ---------------- GALLERY ---------------- */

    if (
      req.method === 'GET' &&
      pathname === '/api/gallery'
    ) {
      const user =
        getUserFromRequest(req);

      const items =
        db.gallery.filter(
          item =>
            !item.userId ||
            !user ||
            item.userId === user.id
        );

      sendJSON(res, 200, {
        ok: true,
        gallery: items
      });

      return;
    }

    const galleryDelete =
      pathname.match(
        /^\/api\/gallery\/([^/]+)$/
      );

    if (
      req.method === 'DELETE' &&
      galleryDelete
    ) {
      const galleryId =
        galleryDelete[1];

      const index =
        db.gallery.findIndex(
          item =>
            item.id === galleryId
        );

      if (index === -1) {
        sendJSON(res, 404, {
          ok: false,
          error:
            'Gallery item not found'
        });

        return;
      }

      const item =
        db.gallery[index];

      const filePath =
        path.join(
          GALLERY_DIR,
          safeFileName(item.filename)
        );

      try {
        fs.unlinkSync(filePath);
      } catch {}

      db.gallery.splice(index, 1);

      saveDB();

      sendJSON(res, 200, {
        ok: true
      });

      return;
    }

    /* ---------------- AVATARS ---------------- */

    if (
      req.method === 'GET' &&
      pathname === '/api/avatars'
    ) {
      const user =
        getUserFromRequest(req);

      const avatars =
        db.avatars.filter(
          avatar =>
            !avatar.userId ||
            !user ||
            avatar.userId === user.id
        );

      sendJSON(res, 200, {
        ok: true,
        avatars
      });

      return;
    }

    if (
      req.method === 'POST' &&
      pathname === '/api/avatars'
    ) {
      const user =
        getUserFromRequest(req);

      const body =
        await readJSON(req);

      const avatar =
        addAvatar({
          userId:
            user?.id ||
            body.userId ||
            null,

          name:
            body.name,

          imageUrl:
            body.imageUrl,

          imageDataUrl:
            body.imageDataUrl,

          authorized:
            body.authorized
        });

      sendJSON(res, 201, {
        ok: true,
        avatar
      });

      return;
    }

    /* ---------------- MEDIA UPLOAD ---------------- */

    if (
      req.method === 'POST' &&
      pathname === '/api/media/upload'
    ) {
      const body =
        await readJSON(req);

      if (!body.dataUrl) {
        sendJSON(res, 400, {
          ok: false,
          error:
            'dataUrl is required'
        });

        return;
      }

      const parsed =
        parseDataUrl(
          body.dataUrl
        );

      const user =
        getUserFromRequest(req);

      const item =
        saveBufferToGallery(
          parsed.data,
          parsed.mime,
          {
            userId:
              user?.id ||
              body.userId ||
              null,

            type:
              body.type ||
              (
                parsed.mime.startsWith('video/')
                  ? 'video'
                  : 'image'
              ),

            title:
              clean(body.title, 300),

            source: 'upload'
          }
        );

      sendJSON(res, 201, {
        ok: true,
        item
      });

      return;
    }

    /* ---------------- IMAGE GENERATION ---------------- */

    if (
      req.method === 'POST' &&
      (
        pathname ===
          '/api/engines/image/generate' ||
        pathname ===
          '/api/ai/image'
      )
    ) {
      const body =
        await readJSON(req);

      const prompt =
        clean(body.prompt, 10000);

      if (!prompt) {
        sendJSON(res, 400, {
          ok: false,
          error:
            'Image prompt is required'
        });

        return;
      }

      const user =
        getUserFromRequest(req);

      const job =
        createJob({
          engine: 'image',
          type: 'image',
          userId:
            user?.id ||
            body.userId ||
            null,
          input: {
            prompt,
            size:
              body.size ||
              '1024x1024',
            quality:
              body.quality ||
              'auto'
          }
        });

      runProviderJob(
        job,
        {
          prompt,
          size:
            body.size ||
            '1024x1024',
          quality:
            body.quality ||
            'auto'
        }
      );

      sendJSON(res, 202, {
        ok: true,
        job
      });

      return;
    }

    /* ---------------- IMAGE EDIT ---------------- */

    if (
      req.method === 'POST' &&
      (
        pathname ===
          '/api/engines/image/edit' ||
        pathname ===
          '/api/ai/image-edit'
      )
    ) {
      const body =
        await readJSON(req);

      const user =
        getUserFromRequest(req);

      verifyConsent(
        body,
        user?.id ||
          body.userId ||
          null
      );

      const source =
        body.imageDataUrl ||
        body.image ||
        body.sourceImage;

      if (!source) {
        sendJSON(res, 400, {
          ok: false,
          error:
            'Source image is required'
        });

        return;
      }

      const job =
        createJob({
          engine: 'imageEdit',
          type: 'image-edit',
          userId:
            user?.id ||
            body.userId ||
            null,
          input: {
            prompt:
              clean(body.prompt, 10000)
          }
        });

      runProviderJob(
        job,
        {
          prompt:
            clean(body.prompt, 10000),

          image:
            source,

          imageDataUrl:
            body.imageDataUrl ||
            null
        }
      );

      sendJSON(res, 202, {
        ok: true,
        job
      });

      return;
    }

    /* ---------------- VIDEO GENERATION ---------------- */

    if (
      req.method === 'POST' &&
      (
        pathname ===
          '/api/engines/video/generate' ||
        pathname ===
          '/api/ai/video'
      )
    ) {
      const body =
        await readJSON(req);

      const user =
        getUserFromRequest(req);

      verifyConsent(
        body,
        user?.id ||
          body.userId ||
          null
      );

      const job =
        createJob({
          engine: 'video',
          type: 'video',
          userId:
            user?.id ||
            body.userId ||
            null,
          input: {
            prompt:
              clean(body.prompt, 10000)
          }
        });

      runProviderJob(
        job,
        {
          prompt:
            clean(body.prompt, 10000),

          image:
            body.image ||
            body.imageDataUrl ||
            null,

          duration:
            body.duration ||
            null,

          aspectRatio:
            body.aspectRatio ||
            null
        }
      );

      sendJSON(res, 202, {
        ok: true,
        job
      });

      return;
    }

    /* ---------------- TALKING AVATAR ---------------- */

    if (
      req.method === 'POST' &&
      (
        pathname ===
          '/api/engines/avatar/talking' ||
        pathname ===
          '/api/ai/talking-avatar'
      )
    ) {
      const body =
        await readJSON(req);

      const user =
        getUserFromRequest(req);

      verifyConsent(
        body,
        user?.id ||
          body.userId ||
          null
      );

      const avatarImage =
        body.avatarImage ||
        body.avatarImageDataUrl ||
        body.image ||
        body.imageDataUrl;

      if (!avatarImage) {
        sendJSON(res, 400, {
          ok: false,
          error:
            'Avatar image is required'
        });

        return;
      }

      const job =
        createJob({
          engine: 'talkingAvatar',
          type: 'talking-avatar',
          userId:
            user?.id ||
            body.userId ||
            null,
          input: {
            prompt:
              clean(body.prompt, 10000)
          }
        });

      runProviderJob(
        job,
        {
          avatarImage,

          audio:
            body.audio ||
            body.audioDataUrl ||
            null,

          text:
            clean(body.text, 10000),

          prompt:
            clean(body.prompt, 10000)
        }
      );

      sendJSON(res, 202, {
        ok: true,
        job
      });

      return;
    }

    /* ---------------- AVATAR REPLACEMENT ---------------- */

    if (
      req.method === 'POST' &&
      (
        pathname ===
          '/api/engines/avatar/replace' ||
        pathname ===
          '/api/ai/replace'
      )
    ) {
      const body =
        await readJSON(req);

      const user =
        getUserFromRequest(req);

      verifyConsent(
        body,
        user?.id ||
          body.userId ||
          null
      );

      const sourceVideo =
        body.sourceVideo ||
        body.sourceVideoDataUrl ||
        body.video ||
        body.videoDataUrl;

      const avatarImage =
        body.avatarImage ||
        body.avatarImageDataUrl ||
        body.faceImage ||
        body.faceImageDataUrl;

      if (!sourceVideo) {
        sendJSON(res, 400, {
          ok: false,
          error:
            'Source video is required'
        });

        return;
      }

      if (!avatarImage) {
        sendJSON(res, 400, {
          ok: false,
          error:
            'Avatar image is required'
        });

        return;
      }

      const job =
        createJob({
          engine: 'avatarReplace',
          type: 'avatar-replace',
          userId:
            user?.id ||
            body.userId ||
            null,
          input: {}
        });

      runProviderJob(
        job,
        {
          sourceVideo,
          avatarImage,

          prompt:
            clean(body.prompt, 10000)
        }
      );

      sendJSON(res, 202, {
        ok: true,
        job
      });

      return;
    }

    /* ---------------- AVATAR SESSION ---------------- */

    if (
      req.method === 'POST' &&
      pathname === '/api/avatar/session'
    ) {
      const user =
        getUserFromRequest(req);

      const body =
        await readJSON(req);

      const session = {
        id: id('avatar_session'),
        userId:
          user?.id ||
          body.userId ||
          null,

        avatarId:
          body.avatarId ||
          null,

        avatarImage:
          body.avatarImage ||
          null,

        createdAt: now(),

        status: 'ready'
      };

      sendJSON(res, 201, {
        ok: true,
        session
      });

      return;
    }

    /* ---------------- JOB STATUS ---------------- */

    const jobMatch =
      pathname.match(
        /^\/api\/jobs\/([^/]+)$/
      );

    if (
      req.method === 'GET' &&
      jobMatch
    ) {
      const job =
        db.jobs.find(
          item =>
            item.id === jobMatch[1]
        );

      if (!job) {
        sendJSON(res, 404, {
          ok: false,
          error: 'Job not found'
        });

        return;
      }

      sendJSON(res, 200, {
        ok: true,
        job
      });

      return;
    }

    /* ---------------- MEDIA FILES ---------------- */

    const mediaMatch =
      pathname.match(
        /^\/media\/(gallery|recordings)\/(.+)$/
      );

    if (
      req.method === 'GET' &&
      mediaMatch
    ) {
      const type =
        mediaMatch[1];

      const filename =
        safeFileName(
          decodeURIComponent(
            mediaMatch[2]
          )
        );

      const directory =
        type === 'gallery'
          ? GALLERY_DIR
          : RECORDINGS_DIR;

      const filePath =
        path.resolve(
          directory,
          filename
        );

      if (
        !filePath.startsWith(
          `${directory}${path.sep}`
        )
      ) {
        sendText(
          res,
          403,
          'Forbidden'
        );

        return;
      }

      sendFile(
        res,
        filePath,
        contentTypeForFile(
          filePath
        )
      );

      return;
    }

    /* ---------------- STATIC APP ---------------- */

    let filePath;

    if (
      pathname === '/' ||
      pathname === '/index.html' ||
      pathname === '/app'
    ) {
      filePath =
        path.join(
          WEB_DIR,
          'index.html'
        );
    } else {
      filePath =
        safeWebPath(pathname);
    }

    if (
      filePath &&
      fs.existsSync(filePath) &&
      fs.statSync(filePath).isFile()
    ) {
      sendFile(
        res,
        filePath,
        contentTypeForFile(filePath)
      );

      return;
    }

    sendText(
      res,
      404,
      'Not found'
    );
  } catch (error) {
    console.error(
      'Request error:',
      error
    );

    sendJSON(
      res,
      error.statusCode || 500,
      {
        ok: false,
        error:
          error.message ||
          'Internal server error',

        code:
          error.code ||
          'INTERNAL_ERROR'
      }
    );
  }
}

/* -------------------------------------------------------
   WEBSOCKET SIGNALING
------------------------------------------------------- */

const server =
  http.createServer(
    handleRequest
  );

const wss =
  new WebSocket.Server({
    server,
    path: '/ws'
  });

wss.on(
  'connection',
  ws => {
    ws.id =
      id('ws');

    ws.roomCode = null;

    ws.on(
      'message',
      raw => {
        let message;

        try {
          message =
            JSON.parse(
              raw.toString()
            );
        } catch {
          return;
        }

        const type =
          message.type;

        if (
          type === 'join-room' ||
          type === 'join'
        ) {
          const code =
            clean(
              message.code ||
              message.roomCode,
              20
            ).toUpperCase();

          if (!code) {
            ws.send(
              JSON.stringify({
                type: 'error',
                error:
                  'Room code is required'
              })
            );

            return;
          }

          let room =
            getRoom(code);

          if (!room) {
            room = {
              code,
              clients: new Set(),
              createdAt: now()
            };

            rooms.set(
              code,
              room
            );
          }

          if (
            room.clients.size >= 2
          ) {
            ws.send(
              JSON.stringify({
                type: 'room-full'
              })
            );

            return;
          }

          addToRoom(
            room,
            ws
          );

          ws.send(
            JSON.stringify({
              type: 'joined-room',
              code,
              participants:
                room.clients.size
            })
          );

          if (
            room.clients.size === 2
          ) {
            const clients =
              [...room.clients];

            clients[0].send(
              JSON.stringify({
                type: 'peer-joined',
                initiator: true
              })
            );

            clients[1].send(
              JSON.stringify({
                type: 'peer-joined',
                initiator: false
              })
            );
          }

          return;
        }

        const room =
          ws.roomCode
            ? rooms.get(
                ws.roomCode
              )
            : null;

        if (!room) {
          ws.send(
            JSON.stringify({
              type: 'error',
              error:
                'Not connected to a room'
            })
          );

          return;
        }

        if (
          [
            'offer',
            'answer',
            'ice-candidate',
            'avatar-state',
            'media-state'
          ].includes(type)
        ) {
          broadcastToRoom(
            room,
            {
              ...message,
              from: ws.id
            },
            ws
          );

          return;
        }

        if (
          type === 'leave-room' ||
          type === 'leave'
        ) {
          removeFromRoom(ws);

          return;
        }
      }
    );

    ws.on(
      'close',
      () => {
        removeFromRoom(ws);
      }
    );

    ws.on(
      'error',
      error => {
        console.error(
          'WebSocket error:',
          error.message
        );
      }
    );
  }
);

/* -------------------------------------------------------
   CLEANUP
------------------------------------------------------- */

setInterval(
  () => {
    const cutoff =
      Date.now() -
      24 * 60 * 60 * 1000;

    db.jobs =
      db.jobs.filter(
        job => {
          const time =
            new Date(
              job.createdAt
            ).getTime();

          return time > cutoff;
        }
      );

    db.sessions =
      db.sessions.filter(
        session =>
          new Date(
            session.expiresAt
          ).getTime() >
          Date.now()
      );

    saveDB();
  },
  60 * 60 * 1000
);

/* -------------------------------------------------------
   START
------------------------------------------------------- */

server.listen(
  PORT,
  HOST,
  () => {
    console.log('');
    console.log(
      '========================================'
    );
    console.log(
      '        KELVIN LIVE SERVER'
    );
    console.log(
      '========================================'
    );
    console.log(
      `HTTP: http://${HOST}:${PORT}`
    );
    console.log(
      `WebSocket: ws://${HOST}:${PORT}/ws`
    );
    console.log(
      `Web directory: ${WEB_DIR}`
    );
    console.log(
      `Gallery directory: ${GALLERY_DIR}`
    );
    console.log(
      '----------------------------------------'
    );
    console.log(
      'AI ENGINE STATUS'
    );
    console.log(
      JSON.stringify(
        engineSummary(),
        null,
        2
      )
    );
    console.log(
      '========================================'
    );
    console.log('');
  }
);

process.on(
  'SIGTERM',
  () => {
    console.log(
      'SIGTERM received. Shutting down...'
    );

    for (const ws of wss.clients) {
      try {
        ws.close();
      } catch {}
    }

    server.close(
      () => process.exit(0)
    );
  }
);

process.on(
  'SIGINT',
  () => {
    console.log(
      'SIGINT received. Shutting down...'
    );

    server.close(
      () => process.exit(0)
    );
  }
);
