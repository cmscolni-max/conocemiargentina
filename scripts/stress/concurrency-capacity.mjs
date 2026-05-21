import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const BASE = (process.env.STRESS_BASE_URL || '').replace(/\/+$/, '');
const API_KEY = (process.env.STRESS_API_KEY || '').trim();
const BEARER = (process.env.STRESS_BEARER || '').trim();
const STAGE_SECONDS = Number(process.env.STRESS_STAGE_SECONDS || 4);
const REQUEST_TIMEOUT_MS = Number(process.env.STRESS_REQUEST_TIMEOUT_MS || 8000);
const MAX_SERVICES = Number(process.env.STRESS_MAX_SERVICES || 0);
const ONLY_SERVICES = String(process.env.STRESS_ONLY_SERVICES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const CONCURRENCY_STAGES = String(process.env.STRESS_CONCURRENCY_STAGES || '1,5,10,20,35,50,75,100')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);
const SOURCE_FILE = path.resolve(process.cwd(), 'services/cumbreApi.ts');

if (!BASE || !API_KEY) {
  console.error('Missing STRESS_BASE_URL or STRESS_API_KEY');
  process.exit(1);
}
if (!fs.existsSync(SOURCE_FILE)) {
  console.error(`Source file not found: ${SOURCE_FILE}`);
  process.exit(1);
}

const source = fs.readFileSync(SOURCE_FILE, 'utf8');
const tableRegex = /\.from\('([^']+)'\)/g;
const tables = new Set();
for (const m of source.matchAll(tableRegex)) tables.add(m[1]);

// Known storage buckets, not PostgREST tables
const excluded = new Set(['cumbre-media', 'profile-documents']);

const headers = {
  apikey: API_KEY,
  accept: 'application/json',
};
if (BEARER) headers.authorization = `Bearer ${BEARER}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const resolveSelect = (table) => {
  if (table === 'notifications') return 'id,title,type,created_at';
  if (table === 'reservations') return 'id,status,created_at';
  if (table === 'listings') return 'id,title,status';
  if (table === 'profiles') return 'id,full_name,role';
  return 'id';
};

const detectCriticality = (table) => {
  if (table === 'reservations' || table === 'reservation_members') return 'Crítica';
  if (table === 'listings' || table === 'profiles' || table === 'notifications') return 'Alta';
  return 'Media';
};

const impactByCriticality = (criticality) => {
  if (criticality === 'Crítica') return 'Afecta reservas/operación core';
  if (criticality === 'Alta') return 'Afecta experiencia principal';
  return 'Afecta operación secundaria/admin';
};

async function canReadTable(table) {
  const select = resolveSelect(table);
  const url = `${BASE}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=1`;
  try {
    const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (res.status === 404 || res.status === 400) return false;
    return true;
  } catch {
    return false;
  }
}

async function runConcurrencyStage(table, concurrency, seconds) {
  const select = resolveSelect(table);
  const url = `${BASE}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=1`;
  const stopAt = Date.now() + (seconds * 1000);
  const latencies = [];
  let count = 0;
  let errors = 0;
  const statusCounts = {};

  const workers = Array.from({ length: concurrency }, async () => {
    while (Date.now() < stopAt) {
      const start = performance.now();
      try {
        const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        const ms = performance.now() - start;
        latencies.push(ms);
        count += 1;
        if (!res.ok) errors += 1;
        statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
      } catch {
        const ms = performance.now() - start;
        latencies.push(ms);
        count += 1;
        errors += 1;
        statusCounts.NETWORK_ERROR = (statusCounts.NETWORK_ERROR || 0) + 1;
      }
    }
  });

  await Promise.all(workers);
  latencies.sort((a, b) => a - b);
  const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0;
  const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const errorRate = count > 0 ? (errors / count) * 100 : 100;
  return { count, errors, errorRate, p95, avg, statusCounts };
}

const candidateTables = Array.from(tables)
  .filter((t) => !excluded.has(t))
  .filter((t) => ONLY_SERVICES.length === 0 || ONLY_SERVICES.includes(t))
  .sort();
const readableTables = [];
for (const table of candidateTables) {
  // small delay to avoid immediate burst on probe
  await sleep(20);
  if (await canReadTable(table)) readableTables.push(table);
}

const tablesToTest = MAX_SERVICES > 0 ? readableTables.slice(0, MAX_SERVICES) : readableTables;
const results = [];
for (const table of tablesToTest) {
  let maxStableConcurrency = 0;
  let breakConcurrency = null;
  let lastStable = null;
  let breakStage = null;

  for (const c of CONCURRENCY_STAGES) {
    const stage = await runConcurrencyStage(table, c, STAGE_SECONDS);
    const broke = stage.errorRate > 3 || stage.p95 > 1200;
    if (broke) {
      breakConcurrency = c;
      breakStage = stage;
      break;
    }
    maxStableConcurrency = c;
    lastStable = stage;
  }

  const criticality = detectCriticality(table);
  const baseScore = Math.min(700, Math.round((maxStableConcurrency / 100) * 700));
  const riskBonus = criticality === 'Crítica' ? 120 : criticality === 'Alta' ? 220 : 320;
  const score1000 = Math.max(0, Math.min(1000, baseScore + riskBonus));

  results.push({
    service: table,
    criticality,
    impact: impactByCriticality(criticality),
    maxStableConcurrentCalls: maxStableConcurrency,
    breakAtConcurrentCalls: breakConcurrency ?? `>${CONCURRENCY_STAGES[CONCURRENCY_STAGES.length - 1]}`,
    stableP95Ms: lastStable ? Math.round(lastStable.p95) : null,
    stableErrorRate: lastStable ? Number(lastStable.errorRate.toFixed(2)) : null,
    breakP95Ms: breakStage ? Math.round(breakStage.p95) : null,
    breakErrorRate: breakStage ? Number(breakStage.errorRate.toFixed(2)) : null,
    score1000,
  });
}

console.log(JSON.stringify({
  meta: {
    base: BASE,
    stageSeconds: STAGE_SECONDS,
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
    concurrencyStages: CONCURRENCY_STAGES,
    discoveredTables: candidateTables.length,
    filteredServices: ONLY_SERVICES,
    testedServices: readableTables.length,
    testedInRun: tablesToTest.length,
    measuredAt: new Date().toISOString(),
  },
  results,
}, null, 2));
