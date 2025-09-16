import crypto from 'crypto';

// Simple SSE event bus with global broadcast and per-pipeline ring buffers

const HEARTBEAT_MS = Number(process.env.SSE_HEARTBEAT_MS || 20000);
const GLOBAL_HISTORY_LIMIT = Number(process.env.SSE_GLOBAL_HISTORY || 200);
const PIPELINE_HISTORY_LIMIT = Number(process.env.SSE_PIPELINE_HISTORY || 100);

// Connected clients for global scope
const globalClients = new Set();

// Global rolling history (for quick replay on connect)
const globalHistory = [];

// Per-pipeline history keyed by requestId (fallback to incidentId if requestId missing)
const pipelineHistoryByKey = new Map(); // key -> array

// Recent event keys to avoid duplicate emits (server-side dedupe)
const recentEventKeys = new Set();
const RECENT_KEYS_LIMIT = 2000;

let nextEventId = 1;

function makeKey(requestId, stage) {
  return `${requestId || 'unknown'}::${stage}`;
}

function bufferPush(buffer, limit, item) {
  buffer.push(item);
  if (buffer.length > limit) buffer.shift();
}

function writeSse(res, event) {
  // id is useful for Last-Event-ID replay
  res.write(`id: ${event.eventId}\n`);
  res.write(`event: agent_event\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function addToPipelineHistory(key, event) {
  if (!key) return;
  if (!pipelineHistoryByKey.has(key)) pipelineHistoryByKey.set(key, []);
  const arr = pipelineHistoryByKey.get(key);
  bufferPush(arr, PIPELINE_HISTORY_LIMIT, event);
}

function addToGlobalHistory(event) {
  bufferPush(globalHistory, GLOBAL_HISTORY_LIMIT, event);
}

function pruneRecentKeys() {
  if (recentEventKeys.size <= RECENT_KEYS_LIMIT) return;
  // crude prune: clear half
  let count = 0;
  for (const k of recentEventKeys) {
    recentEventKeys.delete(k);
    count++;
    if (count >= RECENT_KEYS_LIMIT / 2) break;
  }
}

export function emitStage({
  stage,
  status = 'done',
  incidentId,
  requestId,
  message = '',
  meta = {}
}) {
  try {
    const eventId = nextEventId++;
    const ts = new Date().toISOString();
    const tenantKey = meta?.tenantKey;
    const subscriptionId = meta?.subscriptionId;
    const event = {
      eventId,
      stage,
      status,
      incidentId,
      requestId,
      tenantKey,
      subscriptionId,
      ts,
      message: String(message || ''),
      meta
    };

    // Server-side dedupe by (requestId + stage) in the last window
    if (requestId && stage) {
      const key = makeKey(requestId, stage);
      if (recentEventKeys.has(key)) {
        return; // skip duplicate
      }
      recentEventKeys.add(key);
      pruneRecentKeys();
    }

    // Add to histories
    addToGlobalHistory(event);
    const pipelineKey = requestId || incidentId || null;
    if (pipelineKey) addToPipelineHistory(pipelineKey, event);

    // Broadcast to all global clients
    for (const client of globalClients) {
      try {
        writeSse(client.res, event);
      } catch (_) {
        // ignore
      }
    }
  } catch (e) {
    console.error('[SSE] emitStage error:', e.message);
  }
}

export function sseHandler(req, res) {
  // Global stream; optionally filter by requestId or incidentId in the client
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const client = { res };
  globalClients.add(client);

  // Replay recent history
  const historyParam = Number(req.query?.history || 50);
  const historyCount = Math.max(0, Math.min(historyParam, GLOBAL_HISTORY_LIMIT));
  const start = Math.max(0, globalHistory.length - historyCount);
  for (let i = start; i < globalHistory.length; i++) {
    writeSse(res, globalHistory[i]);
  }

  // Heartbeat
  const hb = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch (_) {}
  }, HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(hb);
    globalClients.delete(client);
  });
}

export function getPipelineHistory(key) {
  return pipelineHistoryByKey.get(key) || [];
}


