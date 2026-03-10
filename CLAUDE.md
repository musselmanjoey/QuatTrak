# QuatTrak — Claude Code Instructions

## Database Script Runner

For quick database queries, inserts, migrations, or test data — use the script runner:

```bash
# Test connection
node scripts/db-run.js

# Run a script
node scripts/db-run.js scripts/my-script.js
```

**How it works:** `scripts/db-run.js` parses `.env.local` manually (no dotenv needed), creates a pg Pool, and passes `{ pool, query }` to the script module.

**Script format:**
```js
module.exports = async ({ pool, query }) => {
  const result = await query('SELECT * FROM players WHERE id = $1', [12]);
  console.log(result.rows);
};
```

**Why this pattern:** On Windows, `source .env.local && psql` is unreliable (psql hangs with piped input, env var sourcing is flaky in bash). This Node-based runner works consistently and reuses the project's existing `pg` dependency.

**For one-off queries**, use inline node:
```bash
node scripts/db-run.js  # just prints "Connected: <timestamp>"
```

**For backend tests:** `node scripts/db-run.js scripts/test-tournament-backend.js`

## Key Conventions

- No Tailwind — custom CSS in `styles/global.css` with CSS variables
- No ORM — raw SQL via `lib/db.ts` singleton (`db.query()`, `db.withTransaction()`)
- API routes: NextRequest/NextResponse, try/catch, service layer calls
- Client components: `'use client'`, useState/useEffect, fetch from `/api/*`
- Manual SQL migrations in `database/migrations/` (run via `node scripts/db-run.js` or direct psql)
- Port 3010 for local dev (`npm run dev` uses port-manager.js)
