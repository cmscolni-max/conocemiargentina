import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const OPENAPI_FILE = path.resolve(process.cwd(), 'openapi.yaml');
const BASE_URL = (process.env.STRESS_BASE_URL || '').trim().replace(/\/+$/, '');
const DURATION_SECONDS = Number(process.env.STRESS_DURATION_SECONDS || 30);
const CONCURRENCY = Number(process.env.STRESS_CONCURRENCY || 20);
const MODE = (process.env.STRESS_MODE || 'readonly').trim(); // readonly | full
const AUTH_BEARER = (process.env.STRESS_BEARER || '').trim();
const API_KEY = (process.env.STRESS_API_KEY || '').trim();

if (!BASE_URL) {
  console.error('Missing STRESS_BASE_URL. Example: https://api.explorers-app.com');
  process.exit(1);
}

if (!fs.existsSync(OPENAPI_FILE)) {
  console.error(`openapi.yaml not found at ${OPENAPI_FILE}`);
  process.exit(1);
}

const raw = fs.readFileSync(OPENAPI_FILE, 'utf8');

const writeMethods = new Set(['post', 'put', 'patch', 'delete']);
const pathBlockRegex = /^  (\/[^\n]+):\n((?:    .*\n)+)/gm;
const methodRegex = /^    (get|post|put|patch|delete):\n/gm;

const resolvePath = (p) =>
  p
    .replace(/\{id\}/g, process.env.STRESS_ID || '00000000-0000-0000-0000-000000000001')
    .replace(/\{userId\}/g, process.env.STRESS_USER_ID || '00000000-0000-0000-0000-000000000001');

const endpoints = [];
for (const match of raw.matchAll(pathBlockRegex)) {
  const apiPath = match[1];
  const methodsBlock = match[2];
  for (const methodMatch of methodsBlock.matchAll(methodRegex)) {
    const method = methodMatch[1].toUpperCase();
    if (MODE === 'readonly' && writeMethods.has(method.toLowerCase())) continue;
    endpoints.push({
      method,
      path: resolvePath(apiPath),
    });
  }
}

if (endpoints.length === 0) {
  console.error(`No endpoints resolved. MODE=${MODE}`);
  process.exit(1);
}

const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};
if (AUTH_BEARER) headers.Authorization = `Bearer ${AUTH_BEARER}`;
if (API_KEY) headers.apikey = API_KEY;

const endpointStats = new Map();
const pushResult = (key, ms, ok, status) => {
  const stats = endpointStats.get(key) || { count: 0, errors: 0, statuses: {}, totalMs: 0, maxMs: 0 };
  stats.count += 1;
  stats.totalMs += ms;
  stats.maxMs = Math.max(stats.maxMs, ms);
  if (!ok) stats.errors += 1;
  stats.statuses[status] = (stats.statuses[status] || 0) + 1;
  endpointStats.set(key, stats);
};

const rand = (max) => Math.floor(Math.random() * max);
const pickEndpoint = () => endpoints[rand(endpoints.length)];

const makeRequest = async () => {
  const e = pickEndpoint();
  const key = `${e.method} ${e.path}`;
  const url = `${BASE_URL}${e.path}`;
  const init = {
    method: e.method,
    headers,
  };
  if (writeMethods.has(e.method.toLowerCase())) {
    init.body = '{}';
  }

  const start = performance.now();
  try {
    const res = await fetch(url, init);
    const ms = Math.round(performance.now() - start);
    pushResult(key, ms, res.ok, String(res.status));
  } catch {
    const ms = Math.round(performance.now() - start);
    pushResult(key, ms, false, 'NETWORK_ERROR');
  }
};

const stopAt = Date.now() + (DURATION_SECONDS * 1000);
const workers = Array.from({ length: Math.max(1, CONCURRENCY) }, async () => {
  while (Date.now() < stopAt) {
    await makeRequest();
  }
});

console.log(`Starting stress test: endpoints=${endpoints.length}, mode=${MODE}, concurrency=${CONCURRENCY}, duration=${DURATION_SECONDS}s`);
await Promise.all(workers);

let total = 0;
let totalErrors = 0;
for (const stats of endpointStats.values()) {
  total += stats.count;
  totalErrors += stats.errors;
}

console.log('\n=== Summary ===');
console.log(`Total requests: ${total}`);
console.log(`Total errors: ${totalErrors}`);
console.log(`Error rate: ${total > 0 ? ((totalErrors / total) * 100).toFixed(2) : '0.00'}%`);

const sorted = Array.from(endpointStats.entries())
  .sort((a, b) => (b[1].errors - a[1].errors) || (b[1].maxMs - a[1].maxMs));

console.log('\n=== Top endpoints (errors/latency) ===');
for (const [key, stats] of sorted.slice(0, 20)) {
  const avg = stats.count > 0 ? Math.round(stats.totalMs / stats.count) : 0;
  const statuses = Object.entries(stats.statuses).map(([s, n]) => `${s}:${n}`).join(', ');
  console.log(`${key} | count=${stats.count} errors=${stats.errors} avg=${avg}ms max=${stats.maxMs}ms | ${statuses}`);
}
