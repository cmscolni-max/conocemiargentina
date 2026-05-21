# Explorer/Cumbre - Runbook objetivo 6000 concurrencia

## 1) Lo que tenés que hacer vos (Supabase/infra)

1. En Supabase SQL Editor, ejecutar en este orden:
   - `supabase/migrations/055_service_performance_indexes.sql` (si no lo corriste en producción)
   - `supabase/migrations/056_critical_services_capacity_indexes.sql` (si no lo corriste en producción)
   - `supabase/migrations/057_remaining_services_capacity_indexes.sql`
2. En Supabase Project Settings:
   - subir tier/compute (CPU/RAM) para producción,
   - habilitar connection pooling (Supavisor),
   - si está disponible en tu plan: crear Read Replica.
3. En Cloudflare/WAF:
   - activar rate limits para tráfico público (ejemplo inicial: `120 req/min` por IP),
   - activar caché de endpoints públicos (TTL 60s + stale-while-revalidate 300s).

## 2) Lo que corro yo (stress y reporte)

### Test completo de servicios testeables hasta 6000

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null
cd /Users/carlosscolni/Cumbre/CUMBRE

STRESS_BASE_URL=https://ntzedzxuiyhymaldbgxy.supabase.co \
STRESS_API_KEY=<TU_ANON_O_PUBLISHABLE_KEY> \
STRESS_STAGE_SECONDS=5 \
STRESS_REQUEST_TIMEOUT_MS=8000 \
STRESS_CONCURRENCY_STAGES=100,200,300,500,700,1000,1500,2000,3000,4000,5000,6000 \
npm run stress:concurrency > /tmp/explorer_stress_all_6000.json
```

### Reporte final (tabla YES/NO contra 6000)

```bash
cd /Users/carlosscolni/Cumbre/CUMBRE
npm run stress:report /tmp/explorer_stress_all_6000.json 6000
```

## 3) Criterio de aceptación para lanzamiento

- `reservations`, `reservation_members`, `profiles`, `notifications` deben marcar `YES` en 6000.
- Error rate por etapa < 1%.
- p95 < 800ms en servicios críticos.

Si alguno no cumple, iterar:
1. ajustar índice faltante,
2. reducir payload/joins en consulta,
3. mover lecturas públicas a caché Edge/CDN.
