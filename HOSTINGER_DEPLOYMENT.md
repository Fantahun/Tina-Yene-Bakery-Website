# Hostinger Deployment Runbook

Build locally, upload a ZIP, run one Node process. Nothing is installed or
compiled on the server.

**Target plan:** 3 GB RAM · 2 CPU · 600k inodes · **120 max processes**

---

## Why the old deployment ran out of processes

Hostinger's "Max Processes" counts every **process and thread** in your account's
cgroup, not the number of apps. That is why the number climbed while CPU and RAM
sat idle: these were threads blocked on I/O, waiting on the network. Cheap in
CPU, expensive in the one quota that was being hit.

Four things drove it, now all fixed:

| # | Cause | Fix |
|---|-------|-----|
| 1 | `lib/prisma.ts` only cached the client when `NODE_ENV !== "production"`, so in production every module context created a **new `PrismaClient`** — and each one spawns a separate native query-engine **process** with its own pool. | Always cache on `globalThis`. |
| 2 | `connection_limit=10` per client. A few leaked clients exhausted the database's connection ceiling; further queries then **blocked waiting for a free slot until timeout** — the "API calls don't respond even though I'm the only user" symptom. | Local MySQL + `connection_limit=5`, plus `pool_timeout` so exhaustion fails fast and visibly instead of hanging. |
| 3 | Remote MySQL (Aiven, cross-region, TLS). Every query paid a full network round trip, holding its connection and threads open ~10× longer than necessary. | Move to Hostinger's local MySQL. |
| 4 | `lib/email.ts` built a **new SMTP transport per email**, and read `SMTP_SECURE` — a variable that does not exist in `.env` — so `secure` was `false` while connecting to port **465** (implicit TLS). The plaintext handshake **hung until socket timeout**, pinning a request thread every time. | Pooled module-level transport; `secure` derived from the port; explicit timeouts. |

Cause 4 was an independent live bug. Combined with a database that is
intermittently unreachable from the server, it alone could produce hanging API
calls.

`next.config.mjs` previously set `experimental.workerThreads:false` / `cpus:1`
against this problem. Those only ever limited **build-time** workers and had no
effect on runtime process count, so they were removed.

**Expected steady state after these changes: ~8–14 processes** against your 120
limit.

---

## What ships

`pnpm build:hostinger` produces `tina-bakery-hostinger.zip`:

- **41.6 MB zipped / 78.3 MB unpacked / 2,279 files** (trivial against the 600k inode quota)
- Next.js **standalone** output: `server.js` plus only the traced runtime deps
- No dev dependencies, no `pnpm install`, no `next build` on the server
- The **Linux** Prisma engine (`libquery_engine-debian-openssl-3.0.x.so.node`)

Three details the script guards, because each is a silent killer:

- **The Linux engine.** You build on Windows; the default engine is a `.dll.node`
  that cannot load on Linux. `prisma/schema.prisma` declares
  `binaryTargets = ["native", "debian-openssl-3.0.x"]`, and the script *verifies*
  the `.so.node` is in the package — Next's tracer omits it intermittently, so
  the script copies it manually when needed. A package missing it starts fine and
  then fails on the first query.
- **`.env` leakage.** Next copies the build-time `.env` into standalone output.
  That file has development secrets and `localhost:3001` URLs; shipping it would
  leak credentials and break NextAuth. The script deletes it and ships
  `.env.production.template` instead.
- **A boot smoke test.** After assembling the package the script starts it and
  requests a database-free page, failing the build unless it gets a 2xx. This is
  not ceremony: it caught two real breakages during setup that would each have
  produced a dead site on Hostinger.

### pnpm requires a hoisted layout

`pnpm-workspace.yaml` sets `nodeLinker: hoisted`. **Do not remove this.**

Next's standalone tracer cannot work with pnpm's default symlinked
`node_modules`: it follows the links into the `.pnpm` store and never writes the
top-level entries Node's CommonJS resolver needs. The packaged server then dies
on boot with `MODULE_NOT_FOUND` for transitive dependencies — `styled-jsx`, then
`@swc/helpers`, and so on — that are physically present but unreachable.

The flat layout also made the package dramatically smaller (11,205 → 2,279 files),
because the traced tree no longer duplicates the store.

That same file previously had unfilled placeholder values under `allowBuilds`
(`'prisma': set this to true or false`), which silently **skipped Prisma's
postinstall** — so the query engines were never downloaded. Now set to `true`.

---

## Local development and pre-deployment testing

Local MySQL is already set up and loaded with a copy of the Aiven production data
(19 products, 4 categories, 30 sizes, 15 orders). `.env` points at it:

```
DATA_BASE_URL=mysql://root:YOUR_LOCAL_PASSWORD@127.0.0.1:3306/tina_yene_bakery_db?connection_limit=5&pool_timeout=10&connect_timeout=10
```

The Aiven URL is kept commented in `.env` for re-running the migration dump.

### Run in dev mode (hot reload)

```bash
pnpm dev          # http://localhost:3000
```

### Run the actual deployment package

This is the closest simulation of Hostinger short of uploading:

```bash
pnpm build:hostinger
cp .env dist-hostinger/.env      # test only; never ship this file
cd dist-hostinger
PORT=3100 NODE_ENV=production node server.js
rm .env                          # remove it again when done
```

The package ships **both** the Windows and Linux Prisma engines. Prisma loads only
the one matching the current platform, so this costs ~7 MB and buys the ability to
run the exact artifact locally. Use `pnpm build:hostinger --linux-only` to strip
the Windows engine for a minimal upload.

### Verified local results

Measured on the built package against local MySQL:

| Check | Dev mode | Production package |
|-------|----------|--------------------|
| Home page | 8.5 s | **0.27 s** |
| Shop / product / API routes | 0.7–9.8 s | **0.01–0.05 s** |
| node processes | 3 | **1** |
| node threads | 62 | **23** |
| MySQL connections | — | **5** (= `connection_limit`, stable) |

After 60 concurrent requests the process count, thread count, and connection
count were **unchanged** — nothing accumulated. 15 repeat page loads produced
**3 total MySQL queries**, confirming the `unstable_cache` layer is doing its job.

---

## Environment variables: panel vs `.env`

**Use Hostinger's environment-variable panel. Do not upload a `.env` file.**
Secrets stay off the filesystem and survive redeploys.

There is one exception that matters, because it fails *silently*:

| Kind | Resolved | Panel works? |
|------|----------|--------------|
| Server-side (`DATA_BASE_URL`, `NEXTAUTH_SECRET`, `STRIPE_SECRET_KEY`, `EMAIL_*`, `ADMIN_*`, `REVALIDATE_SECRET`) | **Runtime** | Yes |
| `NEXT_PUBLIC_MAINTENANCE_MODE`, `NEXT_PUBLIC_COMING_SOON` — read server-side in `proxy.ts` | **Runtime** | Yes |
| `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SITE_URL` — server-side use only | **Runtime** | Yes |
| **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`**, **`NEXT_PUBLIC_COMING_SOON_TARGET_DATE`** — used in client components | **Build time** | **No** |

`NEXT_PUBLIC_*` values consumed by client components are **inlined into the
JavaScript bundle when the build runs**. They are literal strings in
`.next/static/chunks/*.js` by the time the server starts, so the panel value is
never consulted.

Verified in this project: the test key `pk_test_51Q2TBn...` is embedded in
`.next/static/chunks/`.

**Consequence for ZIP uploads:** whichever Stripe publishable key is in your local
`.env` at build time is the key your live site uses. Setting the live key in
Hostinger's panel will not change it. Checkout runs in test mode with no error.

**Before any production build:** put the **live** `pk_live_...` key in `.env`,
build, and confirm:

```bash
grep -rl "pk_live_" .next/static | head -1   # should match
grep -rl "pk_test_" .next/static | head -1   # should be empty
```

With GitHub deployment, Hostinger injects panel variables into the build
environment, so the build-time keys are picked up correctly there.

---

## Option A — Deploy from GitHub (try this first)

The four root-cause fixes live in the application code, so they apply no matter
how the app is deployed. Deploying from GitHub is the cleaner test of whether they
were sufficient, and you keep push-to-deploy plus automatic env-var injection.

`package.json` `start` runs `scripts/start-server.mjs`, which detects the
standalone build and launches `.next/standalone/server.js`, copying `.next/static`
and `public/` beside it first. It falls back to `next start` if no standalone
output exists, so both deployment paths work from the same repo.

1. hPanel → **Website → Node.js app**, connect the GitHub repo and branch
2. Node version **22.x**, build command `npm run build`, start command `npm start`
3. Add every variable from the table above in the env panel — including
   `DATA_BASE_URL` pointing at **Hostinger's local MySQL**
4. Deploy, then watch **Max Processes** for a day

Expect a spike **during** the build (`npm install` + `next build` are genuinely
heavy). That is transient. What matters is the **steady state afterwards**: a flat
~8–14, not a sustained plateau.

If the plateau returns, switch to Option B — the ZIP pipeline moves the build off
the server entirely.

---

## Option B — Build locally, upload a ZIP

## Step 1 — Create the database on Hostinger

hPanel → **Databases → MySQL Databases**. Create a database and user, and grant
all privileges. Record the exact name and username (Hostinger prefixes both,
e.g. `u123456789_yene`).

You do **not** need a shadow database. That is only for `prisma migrate dev`
during development; production uses `migrate deploy`, which never touches it.

## Step 2 — Migrate your data from Aiven

Run locally, on a network that can reach Aiven (your current network cannot —
that is why the connection times out, not because the instance is down).

```bash
# 1. Dump the current production database
mysqldump \
  --host=fantahun-mysql-2deb396d-fantahun731-68e1.c.aivencloud.com \
  --port=14309 --user=avnadmin --password \
  --ssl-mode=REQUIRED \
  --single-transaction --no-tablespaces \
  --set-gtid-purged=OFF \
  fantahug_Tina_yene_bakery_Test > yene-backup.sql
```

Upload `yene-backup.sql` to the server (File Manager or SFTP), then over SSH:

```bash
# 2. Import into Hostinger MySQL
mysql -u DB_USER -p DB_NAME < ~/yene-backup.sql

# 3. Verify the data actually arrived — do not skip this
mysql -u DB_USER -p DB_NAME -e "
  SELECT 'products', COUNT(*) FROM Product
  UNION ALL SELECT 'categories', COUNT(*) FROM Category
  UNION ALL SELECT 'orders', COUNT(*) FROM \`Order\`;"
```

If the counts look right, delete `yene-backup.sql` from the server — it contains
your full customer and order history in plaintext.

## Step 3 — Build the package locally

```bash
pnpm install
pnpm build:hostinger
```

Produces `tina-bakery-hostinger.zip`. The build needs **no database connection**
(see "Rendering model" below) and refuses to produce a ZIP unless the packaged
server boots and serves a request.

## Step 4 — Upload and extract

1. hPanel → **File Manager**, go to your app directory (e.g. `domains/yenebakery.com/public_html`)
2. Upload `tina-bakery-hostinger.zip`
3. **Extract** it there
4. Delete the ZIP afterwards to reclaim space

## Step 5 — Create `.env` on the server

Copy `.env.production.template` to `.env` and fill in real values. The critical
lines:

```bash
NODE_ENV=production
PORT=3000

# LOCAL MySQL over 127.0.0.1 — not a remote host.
# connection_limit=5 is deliberate: one pooled client against a local database is
# plenty, and it keeps process/thread count far below the plan quota.
# pool_timeout makes exhaustion fail fast instead of hanging a request.
DATA_BASE_URL="mysql://DB_USER:DB_PASSWORD@127.0.0.1:3306/DB_NAME?connection_limit=5&pool_timeout=10&connect_timeout=10"

# MUST be the real domain. Leaving these as localhost breaks NextAuth callbacks
# and makes server-side fetches hang — another source of stuck processes.
NEXT_PUBLIC_BASE_URL="https://yenebakery.com"
NEXTAUTH_URL="https://yenebakery.com"
NEXTAUTH_SECRET="<openssl rand -base64 32>"

EMAIL_PORT=465   # implicit TLS; the code now sets `secure` from this
```

Then `chmod 600 .env`.

## Step 6 — Apply migrations

```bash
cd ~/domains/yenebakery.com/public_html
npx prisma migrate deploy
```

(Skip if you imported a dump that already contains the full schema.)

## Step 7 — Start the app

hPanel → **Node.js** app:

- **Node version:** 22.x
- **Application root:** your app directory
- **Startup file:** `server.js`
- **Start command:** `node server.js`

Do **not** use `npm start`/`next start` — the standalone bundle has no Next CLI.

## Step 8 — Verify

```bash
curl -I https://yenebakery.com
curl -s https://yenebakery.com/api/categories | head
```

Then confirm the actual fix, rather than trusting it:

```bash
# Total processes AND threads in your account — this is what the quota counts.
ps -eLf | wc -l

# Prisma query engines. Should be exactly 1. More than one means a client is
# still leaking somewhere.
ps aux | grep -c '[q]uery-engine'

# Open DB connections; should sit at or below connection_limit.
mysql -u DB_USER -p DB_NAME -e "SHOW STATUS LIKE 'Threads_connected';"
```

Watch **Max Processes** in hPanel over the first day. Expect a flat ~8–14.

---

## Rendering model (changed)

Previously all eight public pages used `revalidate = 86400` (ISR), which
**prerenders at build time and therefore requires a live database during the
build**. Since production MySQL is now bound to the server's localhost, your
build machine cannot reach it — the build would fail permanently.

Only three pages actually query the database. Those now render on demand:

| Page | Before | After |
|------|--------|-------|
| `/`, `/shop`, `/shop/[slug]` | ISR, needed DB at build | `force-dynamic` + `unstable_cache` (24 h) |
| `/about`, `/custom-cakes`, `/privacy`, `/terms`, `/coming-soon` | ISR | unchanged — static, no DB |

The caching is deliberate. Plain on-demand rendering would query MySQL on *every*
request, adding load at exactly the moments you want the server quiet. Wrapping
each query in `unstable_cache` means **one query per 24 h window**, not one per
visitor — you keep near-ISR performance with a database-independent build.

`generateStaticParams` was removed from `/shop/[slug]` for the same reason:
enumerating slugs required a build-time database connection.

### Cache invalidation

Every admin mutation purges the storefront caches automatically. Handlers are
wrapped centrally by `withCacheInvalidation` in `lib/cache-invalidation.ts`, so
**admin endpoints added in future are covered without anyone wiring them up** -
per-route calls were the alternative and they rot silently, surfacing only as
"my edit did not appear".

The wrapper purges on any successful `POST`/`PUT`/`PATCH`/`DELETE`. Reads and
failed writes (401/500) leave the cache alone, since nothing changed.

`NEXT_PUBLIC_ISR_REVALIDATE_SECONDS` sets the upper bound on cache freshness and
can be changed from Hostinger's environment panel without rebuilding. It only
matters for writes that bypass the admin API (direct SQL, for example) - admin
edits appear immediately regardless.

When you add a **new cached query**, add its tag to `ALL_STOREFRONT_TAGS` in
`lib/cache-invalidation.ts` so it gets purged too.

---

## Redeploying

```bash
pnpm build:hostinger
```

Upload, extract over the old files, restart the Node app in hPanel. **Your `.env`
is not in the ZIP, so it is never overwritten.**

---

## Troubleshooting

**App won't start / 503**
Check the Node app logs in hPanel. Most common cause is `.env` missing or
`DATA_BASE_URL` malformed.

**`PrismaClientInitializationError: Query engine binary could not be found`**
The Linux engine didn't ship. Verify:
```bash
find . -name "libquery_engine-*.so.node"
```
If absent, rebuild — the script checks for this. If Hostinger runs a different
distro, add its target to `binaryTargets` in `prisma/schema.prisma` and rebuild
(e.g. `debian-openssl-1.1.x` for older images).

**Max Processes climbing again**
```bash
ps aux | grep '[q]uery-engine'    # more than 1 means a leaked Prisma client
ps -eLf --sort=-etime | head -30  # long-lived threads = something is blocking
```
A rising count with idle CPU almost always means blocked I/O: an unreachable
database, or SMTP hanging on a bad port/host.

**Emails not sending / requests hang on checkout**
Verify `EMAIL_HOST` resolves from the server and port 465 is open:
```bash
node -e "require('net').createConnection({host:process.env.EMAIL_HOST,port:465,timeout:5000})
  .on('connect',()=>{console.log('OK');process.exit(0)})
  .on('timeout',()=>{console.log('TIMEOUT');process.exit(1)})"
```
If Hostinger blocks outbound 465, switch to their SMTP relay and set
`EMAIL_PORT=587` — the code derives `secure` from the port automatically.

**Stripe webhooks failing**
`STRIPE_WEBHOOK_SECRET` must match the endpoint registered for the live domain,
and the endpoint URL must be `https://yenebakery.com/api/webhooks/stripe`.

---

## If process pressure returns

The changes above address the causes present in the code. If you later add
genuinely long-running work (large report generation, bulk email), the structural
fix is a **VPS** rather than shared hosting — a VPS has no process quota, only
real CPU and RAM limits, and your current usage of both is minimal. That is a
cost decision, not an urgent one; the shared plan should be comfortable now.
