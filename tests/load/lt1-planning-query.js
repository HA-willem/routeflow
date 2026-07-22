// LT-1 (38_Schaalbaarheid.md § 6, NFR-504): planning-query p95 < 300 ms bij
// 5.000 objecten in één tenant. NFR-504 specificeert "DB-benchmark" als
// testmethode — dit script gaat daarom rechtstreeks via PostgREST (dezelfde
// query als app/(app)/planning/page.tsx: jobs gefilterd op company_id +
// scheduled_date, de geïndexeerde hot path, idx_jobs_company_scheduled_date,
// 009_jobs.sql) i.p.v. via de Next.js-pagina (die ook rendertijd zou meten,
// een ander budget).
//
// Vereist representatieve seed-data (5.000 objecten/dienstafspraken/beurten
// in één bedrijf) — nog niet aanwezig; dit script is een skeleton, geen
// uitgevoerde meting (PRD § 19 A-30).

import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = __ENV.SUPABASE_SERVICE_ROLE_KEY;
const COMPANY_ID = __ENV.LOAD_TEST_COMPANY_ID;
const SCHEDULED_DATE = __ENV.LOAD_TEST_DATE || new Date().toISOString().slice(0, 10);

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    // NFR-504.
    http_req_duration: ['p(95)<300'],
  },
};

export default function planningQueryLoadTest() {
  if (!SERVICE_ROLE_KEY || !COMPANY_ID) {
    throw new Error(
      'Zet SUPABASE_SERVICE_ROLE_KEY en LOAD_TEST_COMPANY_ID (een bedrijf met representatieve seed-data).',
    );
  }

  const url =
    `${BASE_URL}/rest/v1/jobs` +
    `?company_id=eq.${COMPANY_ID}&scheduled_date=eq.${SCHEDULED_DATE}&select=*&order=sequence`;

  const res = http.get(url, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  check(res, { 'status is 200': (r) => r.status === 200 });
}
