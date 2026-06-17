/**
 * memoryProfiler.js
 *
 * Lightweight, always-on memory profiler for the JustGuide Interview backend.
 *
 * What it tracks:
 *  - Heap used / heap total / RSS / external / array buffers per request
 *  - Per-route memory delta (before → after handler)
 *  - Rolling baseline so you can spot gradual leaks over many requests
 *  - High-water marks (peak heap seen since server start)
 *  - Periodic snapshots (every SNAPSHOT_INTERVAL ms, written to a log file)
 *  - Request count and uptime so you can correlate leaks with traffic
 *
 * Usage:
 *   import { memoryProfilerMiddleware, startPeriodicSnapshot } from "./profiling/memoryProfiler.js";
 *   app.use(memoryProfilerMiddleware);
 *   startPeriodicSnapshot();            // call once after server starts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── Config ───────────────────────────────────────────────────────────────────
const SNAPSHOT_INTERVAL = 60_000;          // log memory every 60 s
const LOG_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../logs"
);
const LOG_FILE = path.join(LOG_DIR, "memory-profile.log");

// Alert thresholds (in MB)
const HEAP_WARN_MB  = 300;   // warn if heap used exceeds this
const HEAP_ALERT_MB = 500;   // error-level alert
const DELTA_WARN_MB = 20;    // warn if a single request grows heap by this much

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function snapshot(label = "") {
  const m = process.memoryUsage();
  return {
    label,
    timestamp: new Date().toISOString(),
    heapUsedMB:      toMB(m.heapUsed),
    heapTotalMB:     toMB(m.heapTotal),
    rssMB:           toMB(m.rss),
    externalMB:      toMB(m.external),
    arrayBuffersMB:  toMB(m.arrayBuffers),
    // raw bytes for arithmetic
    _heapUsed:       m.heapUsed,
    _rss:            m.rss,
  };
}

function writeLog(entry) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    // Never crash the server because of logging
    console.error("[MemoryProfiler] Failed to write log:", err.message);
  }
}

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  requestCount: 0,
  startedAt: Date.now(),
  highWaterHeapMB: 0,       // peak heapUsed in MB since start
  highWaterRssMB:  0,
  baseline: null,           // first snapshot taken (for long-term drift)
};

// ─── Per-route summary (kept in-memory, readable via /debug/memory) ───────────
const routeSummary = {};   // { "POST /api/interview/reply": { count, totalDeltaMB, maxDeltaMB } }

function recordRoute(route, deltaMB) {
  if (!routeSummary[route]) {
    routeSummary[route] = { count: 0, totalDeltaMB: 0, maxDeltaMB: 0 };
  }
  const r = routeSummary[route];
  r.count++;
  r.totalDeltaMB += deltaMB;
  r.maxDeltaMB = Math.max(r.maxDeltaMB, deltaMB);
}

// ─── Express Middleware ────────────────────────────────────────────────────────
export function memoryProfilerMiddleware(req, res, next) {
  const before = snapshot(`before ${req.method} ${req.path}`);
  state.requestCount++;

  // Use res.on("finish") so we capture memory after the response is sent
  res.on("finish", () => {
    const after = snapshot(`after ${req.method} ${req.path}`);

    const deltaMB = (
      (after._heapUsed - before._heapUsed) / 1024 / 1024
    ).toFixed(2);

    const route = `${req.method} ${req.route?.path || req.path}`;

    recordRoute(route, parseFloat(deltaMB));

    // Update high-water marks
    const heapNow = parseFloat(after.heapUsedMB);
    const rssNow  = parseFloat(after.rssMB);
    if (heapNow > state.highWaterHeapMB) state.highWaterHeapMB = heapNow;
    if (rssNow  > state.highWaterRssMB)  state.highWaterRssMB  = rssNow;

    // Set baseline once
    if (!state.baseline) state.baseline = after;

    // ── Console output (always visible in terminal) ──────────────────────────
    const driftMB = (heapNow - parseFloat(state.baseline.heapUsedMB)).toFixed(2);

    const colorCode =
      heapNow >= HEAP_ALERT_MB ? "\x1b[31m" :   // red
      heapNow >= HEAP_WARN_MB  ? "\x1b[33m" :   // yellow
                                  "\x1b[32m";    // green

    console.log(
      `${colorCode}[MEM]\x1b[0m ${route} | ` +
      `heap: ${after.heapUsedMB} MB | ` +
      `Δ: ${deltaMB >= 0 ? "+" : ""}${deltaMB} MB | ` +
      `drift: ${driftMB >= 0 ? "+" : ""}${driftMB} MB | ` +
      `rss: ${after.rssMB} MB`
    );

    if (parseFloat(deltaMB) > DELTA_WARN_MB) {
      console.warn(
        `\x1b[33m[MEM WARN]\x1b[0m Request to ${route} grew heap by ${deltaMB} MB`
      );
    }

    if (heapNow >= HEAP_ALERT_MB) {
      console.error(
        `\x1b[31m[MEM ALERT]\x1b[0m Heap usage critical: ${heapNow} MB`
      );
    }

    // ── Structured log ───────────────────────────────────────────────────────
    writeLog({
      type:         "request",
      route,
      statusCode:   res.statusCode,
      before:       { heapUsedMB: before.heapUsedMB, rssMB: before.rssMB },
      after:        { heapUsedMB: after.heapUsedMB,  rssMB: after.rssMB },
      deltaHeapMB:  parseFloat(deltaMB),
      driftMB:      parseFloat(driftMB),
      requestCount: state.requestCount,
      timestamp:    after.timestamp,
    });
  });

  next();
}

// ─── Periodic Snapshot ────────────────────────────────────────────────────────
export function startPeriodicSnapshot() {
  setInterval(() => {
    const s = snapshot("periodic");
    const uptime = ((Date.now() - state.startedAt) / 1000 / 60).toFixed(1);
    const driftMB = state.baseline
      ? (parseFloat(s.heapUsedMB) - parseFloat(state.baseline.heapUsedMB)).toFixed(2)
      : "0.00";

    console.log(
      `\x1b[36m[MEM SNAPSHOT]\x1b[0m ` +
      `heap: ${s.heapUsedMB}/${s.heapTotalMB} MB | ` +
      `rss: ${s.rssMB} MB | ` +
      `ext: ${s.externalMB} MB | ` +
      `peak: ${state.highWaterHeapMB} MB | ` +
      `drift: ${driftMB} MB | ` +
      `uptime: ${uptime} min | ` +
      `requests: ${state.requestCount}`
    );

    writeLog({
      type:           "periodic",
      ...s,
      driftMB:        parseFloat(driftMB),
      highWaterHeapMB: state.highWaterHeapMB,
      highWaterRssMB:  state.highWaterRssMB,
      uptimeMinutes:  parseFloat(uptime),
      requestCount:   state.requestCount,
      routeSummary:   { ...routeSummary },
    });
  }, SNAPSHOT_INTERVAL);
}

// ─── Debug endpoint helper ─────────────────────────────────────────────────────
export function getMemoryReport() {
  const s = snapshot("report");
  const uptime = ((Date.now() - state.startedAt) / 1000 / 60).toFixed(1);
  const driftMB = state.baseline
    ? (parseFloat(s.heapUsedMB) - parseFloat(state.baseline.heapUsedMB)).toFixed(2)
    : "0.00";

  return {
    current: {
      heapUsedMB:     s.heapUsedMB,
      heapTotalMB:    s.heapTotalMB,
      rssMB:          s.rssMB,
      externalMB:     s.externalMB,
      arrayBuffersMB: s.arrayBuffersMB,
    },
    highWater: {
      heapMB: state.highWaterHeapMB,
      rssMB:  state.highWaterRssMB,
    },
    baseline: state.baseline
      ? { heapUsedMB: state.baseline.heapUsedMB, rssMB: state.baseline.rssMB }
      : null,
    driftMB:      parseFloat(driftMB),
    uptimeMinutes: parseFloat(uptime),
    requestCount:  state.requestCount,
    routeSummary,
    thresholds: {
      heapWarnMB:  HEAP_WARN_MB,
      heapAlertMB: HEAP_ALERT_MB,
      deltaWarnMB: DELTA_WARN_MB,
    },
    logFile: LOG_FILE,
    timestamp: s.timestamp,
  };
}


export function forceGCAndReport(label = "post-session") {
  const before = snapshot(`${label}:before-gc`);

  if (global.gc) {
    global.gc();
    const after = snapshot(`${label}:after-gc`);
    const freedMB = ((before._heapUsed - after._heapUsed) / 1024 / 1024).toFixed(2);

    console.log(
      `\x1b[35m[GC FORCED]\x1b[0m ${label} | ` +
      `before: ${before.heapUsedMB} MB | ` +
      `after: ${after.heapUsedMB} MB | ` +
      `freed: ${freedMB} MB`
    );

    writeLog({
      type:      "gc-forced",
      label,
      beforeMB:  parseFloat(before.heapUsedMB),
      afterMB:   parseFloat(after.heapUsedMB),
      freedMB:   parseFloat(freedMB),
      timestamp: after.timestamp,
    });

    return parseFloat(freedMB);
  } else {
    console.warn("[GC] Start server with --expose-gc to enable forced GC");
    return null;
  }
}
