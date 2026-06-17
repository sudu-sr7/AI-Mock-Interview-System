#!/usr/bin/env node
/**
 * analyzeMemory.js
 *
 * Reads backend/logs/memory-profile.log and prints a human-readable summary.
 *
 * Usage (from project root or backend/):
 *   node src/profiling/analyzeMemory.js
 *   node src/profiling/analyzeMemory.js --tail 50    # last 50 entries
 *   node src/profiling/analyzeMemory.js --route "/api/interview/reply"
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const LOG_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../logs/memory-profile.log"
);

// ─── Parse args ───────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const tail   = args.includes("--tail")   ? parseInt(args[args.indexOf("--tail")   + 1]) : null;
const filter = args.includes("--route")  ? args[args.indexOf("--route")  + 1]           : null;

// ─── Load log ─────────────────────────────────────────────────────────────────
if (!fs.existsSync(LOG_FILE)) {
  console.error("No log file found at:", LOG_FILE);
  console.error("Start the server and make some requests first.");
  process.exit(1);
}

const rawLines = fs.readFileSync(LOG_FILE, "utf8").trim().split("\n");
let entries = rawLines.map((line) => {
  try { return JSON.parse(line); }
  catch { return null; }
}).filter(Boolean);

if (tail)   entries = entries.slice(-tail);
if (filter) entries = entries.filter((e) => e.route === filter || e.type === "periodic");

const requests = entries.filter((e) => e.type === "request");
const snapshots = entries.filter((e) => e.type === "periodic");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function maxBy(arr, fn) {
  return arr.reduce((best, cur) => (fn(cur) > fn(best) ? cur : best), arr[0]);
}
function avg(arr) {
  if (!arr.length) return 0;
  return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
}
function hr() { console.log("─".repeat(65)); }

// ─── Print Report ─────────────────────────────────────────────────────────────
console.log("\n\x1b[36m══════════════════════════════════════════════════════════════\x1b[0m");
console.log(" JustGuide Interview Agent — Memory Profile Report");
console.log("\x1b[36m══════════════════════════════════════════════════════════════\x1b[0m\n");

console.log(`Log file : ${LOG_FILE}`);
console.log(`Entries  : ${entries.length} total  (${requests.length} requests, ${snapshots.length} snapshots)`);
if (filter) console.log(`Filter   : ${filter}`);
console.log();

// ── 1. Request summary ────────────────────────────────────────────────────────
if (requests.length) {
  hr();
  console.log(" REQUEST MEMORY DELTAS");
  hr();

  // Group by route
  const byRoute = {};
  for (const r of requests) {
    if (!byRoute[r.route]) byRoute[r.route] = [];
    byRoute[r.route].push(r);
  }

  for (const [route, reqs] of Object.entries(byRoute)) {
    const deltas = reqs.map((r) => r.deltaHeapMB);
    const maxReq = maxBy(reqs, (r) => r.deltaHeapMB);
    console.log(`\n  \x1b[33m${route}\x1b[0m  (${reqs.length} calls)`);
    console.log(`    avg delta : ${avg(deltas)} MB`);
    console.log(`    max delta : ${maxReq.deltaHeapMB.toFixed(2)} MB  (${maxReq.timestamp})`);
    console.log(`    heap range: ${Math.min(...reqs.map(r => parseFloat(r.after.heapUsedMB))).toFixed(2)} – ` +
                `${Math.max(...reqs.map(r => parseFloat(r.after.heapUsedMB))).toFixed(2)} MB`);
  }
  console.log();
}

// ── 2. Periodic snapshots ─────────────────────────────────────────────────────
if (snapshots.length) {
  hr();
  console.log(" PERIODIC SNAPSHOTS (heap used over time)");
  hr();

  for (const s of snapshots) {
    const drift    = s.driftMB >= 0 ? `+${s.driftMB}` : `${s.driftMB}`;
    const driftCol = s.driftMB > 50 ? "\x1b[31m" : s.driftMB > 20 ? "\x1b[33m" : "\x1b[32m";
    console.log(
      `  ${s.timestamp}  heap: ${s.heapUsedMB}/${s.heapTotalMB} MB  ` +
      `rss: ${s.rssMB} MB  ${driftCol}drift: ${drift} MB\x1b[0m  ` +
      `reqs: ${s.requestCount}`
    );
  }
  console.log();
}

// ── 3. Leak signal ────────────────────────────────────────────────────────────
if (snapshots.length >= 3) {
  hr();
  console.log(" LEAK SIGNAL");
  hr();

  const first = snapshots[0];
  const last  = snapshots[snapshots.length - 1];
  const totalDrift = last.driftMB;
  const reqSpan    = last.requestCount - (first.requestCount || 0);

  if (totalDrift > 50) {
    console.log(`  \x1b[31m⚠ Possible leak: heap drifted +${totalDrift} MB over ${reqSpan} requests.\x1b[0m`);
    console.log("  Consider: heap snapshot with --inspect, check Mongoose connections, large closures.");
  } else if (totalDrift > 20) {
    console.log(`  \x1b[33m⚠ Moderate growth: heap drifted +${totalDrift} MB over ${reqSpan} requests.\x1b[0m`);
    console.log("  Monitor further; may be normal GC lag or Mongoose model caching.");
  } else {
    console.log(`  \x1b[32m✓ Heap drift: +${totalDrift} MB over ${reqSpan} requests — looks healthy.\x1b[0m`);
  }
  console.log();
}

// ── 4. High-water marks ───────────────────────────────────────────────────────
if (snapshots.length) {
  const peak = maxBy(snapshots, (s) => parseFloat(s.heapUsedMB));
  hr();
  console.log(" HIGH-WATER MARKS");
  hr();
  console.log(`  Peak heap used : ${peak.highWaterHeapMB} MB  (seen at ${peak.timestamp})`);
  console.log(`  Peak RSS       : ${peak.highWaterRssMB} MB`);
  console.log();
}

// ── 5. Per-route averages (from last snapshot) ────────────────────────────────
const lastSnap = snapshots[snapshots.length - 1];
if (lastSnap?.routeSummary && Object.keys(lastSnap.routeSummary).length) {
  hr();
  console.log(" ROUTE AVERAGES (from last snapshot)");
  hr();

  for (const [route, info] of Object.entries(lastSnap.routeSummary)) {
    const avgDelta = (info.totalDeltaMB / info.count).toFixed(2);
    console.log(
      `  ${route.padEnd(40)}  calls: ${String(info.count).padStart(4)}  ` +
      `avg Δ: ${avgDelta} MB  max Δ: ${info.maxDeltaMB.toFixed(2)} MB`
    );
  }
  console.log();
}

hr();
console.log(" Done.");
hr();
console.log();
