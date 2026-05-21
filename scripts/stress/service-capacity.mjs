import process from 'node:process';

const BASE = (process.env.STRESS_BASE_URL || '').replace(/\/+$/, '');
const API_KEY = (process.env.STRESS_API_KEY || '').trim();
const BEARER = (process.env.STRESS_BEARER || '').trim();
const STAGE_SECONDS = Number(process.env.STRESS_STAGE_SECONDS || 5);
const RPS_STAGES = String(process.env.STRESS_RPS_STAGES || '10,25,50,100,150,200')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);

if (!BASE || !API_KEY) {
  console.error('Missing STRESS_BASE_URL or STRESS_API_KEY');
  process.exit(1);
}

const services = [
  { key: 'profiles', label: 'Profiles API', path: '/rest/v1/profiles?select=id&limit=1', criticality: 'Alta' },
  { key: 'listings', label: 'Listings API', path: '/rest/v1/listings?select=id&limit=1', criticality: 'Alta' },
  { key: 'reservations', label: 'Reservations API', path: '/rest/v1/reservations?select=id,status&limit=1', criticality: 'Crítica' },
  { key: 'comm_templates', label: 'Communication Templates API', path: '/rest/v1/communication_templates?select=id,event_key&limit=1', criticality: 'Media' },
  { key: 'comm_logs', label: 'Communication Logs API', path: '/rest/v1/communication_logs?select=id,event_key,status&limit=1', criticality: 'Media' },
];

const headers = {
  apikey: API_KEY,
  accept: 'application/json',
};
if (BEARER) headers.authorization = `Bearer ${BEARER}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runStage(url, rps, seconds) {
  const total = Math.max(1, Math.floor(rps * seconds));
  const spacingMs = 1000 / rps;
  const latencies = [];
  let ok = 0;
  let errors = 0;
  const statusCounts = {};

  const workers = Array.from({ length: total }, async (_, i) => {
    const waitMs = Math.floor(i * spacingMs);
    await sleep(waitMs);
    const start = performance.now();
    try {
      const res = await fetch(url, { method: 'GET', headers });
      const ms = performance.now() - start;
      latencies.push(ms);
      statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
      if (res.ok) ok += 1;
      else errors += 1;
    } catch {
      const ms = performance.now() - start;
      latencies.push(ms);
      statusCounts.NETWORK_ERROR = (statusCounts.NETWORK_ERROR || 0) + 1;
      errors += 1;
    }
  });

  await Promise.all(workers);
  latencies.sort((a, b) => a - b);
  const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0;
  const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const errorRate = total > 0 ? (errors / total) * 100 : 100;
  return { total, ok, errors, errorRate, p95, avg, statusCounts };
}

function criticalityImpact(criticality) {
  if (criticality === 'Crítica') return 'Bloquea reservas y operación core';
  if (criticality === 'Alta') return 'Degrada fuertemente experiencia principal';
  return 'Afecta operación secundaria/administrativa';
}

const results = [];
for (const svc of services) {
  const url = `${BASE}${svc.path}`;
  let maxStableRps = 0;
  let breakRps = null;
  let lastStable = null;
  let breakStage = null;

  for (const rps of RPS_STAGES) {
    const stage = await runStage(url, rps, STAGE_SECONDS);
    const broke = stage.errorRate > 3 || stage.p95 > 1200;
    if (broke) {
      breakRps = rps;
      breakStage = stage;
      break;
    }
    maxStableRps = rps;
    lastStable = stage;
  }

  const effectiveCapacity = breakRps ? Math.max(0, breakRps - 1) : maxStableRps;
  const scaleScore = Math.min(700, Math.round((effectiveCapacity / 200) * 700));
  const riskPenalty = svc.criticality === 'Crítica' ? 300 : svc.criticality === 'Alta' ? 180 : 90;
  const score1000 = Math.max(0, Math.min(1000, scaleScore + (1000 - riskPenalty)));

  results.push({
    service: svc.label,
    key: svc.key,
    criticality: svc.criticality,
    impact: criticalityImpact(svc.criticality),
    maxStableRps,
    breakRps: breakRps ?? `>${RPS_STAGES[RPS_STAGES.length - 1]}`,
    effectiveCapacityRps: effectiveCapacity,
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
    rpsStages: RPS_STAGES,
    measuredAt: new Date().toISOString(),
  },
  results,
}, null, 2));
