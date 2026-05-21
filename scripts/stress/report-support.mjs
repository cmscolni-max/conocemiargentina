import fs from 'node:fs';
import process from 'node:process';

const file = process.argv[2];
const target = Number(process.argv[3] || process.env.STRESS_TARGET_CONCURRENCY || 6000);

if (!file) {
  console.error('Usage: node scripts/stress/report-support.mjs <json_file> [target_concurrency]');
  process.exit(1);
}

const raw = fs.readFileSync(file, 'utf8');
const jsonStart = raw.indexOf('{');
if (jsonStart < 0) {
  console.error('Invalid input: JSON payload not found in file.');
  process.exit(1);
}
const payload = JSON.parse(raw.slice(jsonStart));
const results = Array.isArray(payload.results) ? payload.results : [];

const supports = (row) => {
  if (typeof row.breakAtConcurrentCalls === 'string' && row.breakAtConcurrentCalls.startsWith('>')) {
    const upper = Number(row.breakAtConcurrentCalls.slice(1));
    return Number.isFinite(upper) && upper >= target;
  }
  const breakAt = Number(row.breakAtConcurrentCalls);
  return Number.isFinite(breakAt) && breakAt > target;
};

const ordered = [...results].sort((a, b) => a.service.localeCompare(b.service));
const supportedCount = ordered.filter(supports).length;

console.log(`Target concurrency: ${target}`);
console.log(`Services tested: ${ordered.length}`);
console.log(`Services supporting target: ${supportedCount}`);
console.log('');
console.log('| Service | Max Stable | Break At | Supports Target |');
console.log('|---|---:|---:|---|');
for (const row of ordered) {
  const breakAt = String(row.breakAtConcurrentCalls);
  const ok = supports(row) ? 'YES' : 'NO';
  console.log(`| ${row.service} | ${row.maxStableConcurrentCalls ?? '-'} | ${breakAt} | ${ok} |`);
}
