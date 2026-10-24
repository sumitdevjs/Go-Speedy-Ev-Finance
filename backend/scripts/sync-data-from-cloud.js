const { createClient } = require('@supabase/supabase-js');

// Cloud Supabase (Source)
const cloudUrl = process.env.SOURCE_SUPABASE_URL || process.env.SUPABASE_URL;
const cloudKey = process.env.SOURCE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const cloudClient = createClient(cloudUrl, cloudKey);

// Target EC2 Self-Hosted Supabase via SSH tunnel or direct IP
const targetUrl = process.env.TARGET_SUPABASE_URL || 'http://127.0.0.1:8000';
const targetKey = process.env.TARGET_SERVICE_ROLE_KEY;
const targetClient = createClient(targetUrl, targetKey);

const TABLES = [
  'head_offices',
  'branches',
  'users',
  'ev_models',
  'old_evs',
  'tenants',
  'payments',
  'bookings',
  'transfers',
  'penalties',
  'audit_logs'
];

async function migrate() {
  for (const table of TABLES) {
    try {
      const { data, error } = await cloudClient.from(table).select('*');
      if (error || !data || data.length === 0) continue;

      const chunkSize = 50;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await targetClient.from(table).upsert(chunk);
      }
    } catch {}
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
