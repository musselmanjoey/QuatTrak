/**
 * Database script runner — reads .env.local and executes a SQL/JS script.
 *
 * Usage:
 *   node scripts/db-run.js <script-file.js>
 *
 * The script file receives `pool` (pg Pool) and `query` (shorthand) as globals.
 * Example script:
 *   module.exports = async ({ pool, query }) => {
 *     await query("INSERT INTO players (name) VALUES ($1)", ['TestPlayer']);
 *     const r = await query("SELECT * FROM players");
 *     console.log(r.rows);
 *   };
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Parse .env.local manually (no dotenv dependency needed)
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('No .env.local found');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

async function main() {
  loadEnv();

  const connStr = process.env.DATABASE_PUBLIC_URL;
  if (!connStr) {
    console.error('DATABASE_PUBLIC_URL not found in .env.local');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: connStr });
  const query = (text, params) => pool.query(text, params || []);

  const scriptPath = process.argv[2];
  if (!scriptPath) {
    // No script file — run SQL from stdin or just test connection
    const r = await query('SELECT NOW() as now');
    console.log('Connected:', r.rows[0].now);
    await pool.end();
    return;
  }

  try {
    const script = require(path.resolve(scriptPath));
    await script({ pool, query });
    console.log('\nDone.');
  } catch (err) {
    console.error('Script error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
