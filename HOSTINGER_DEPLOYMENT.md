# Hostinger Deployment Runbook

**Target plan:** 3 GB RAM · 2 CPU · 600k inodes · **120 max processes**

Two deployment paths, both verified working:

| | Build locally, upload a ZIP | Build on Hostinger (GitHub or source ZIP) |
|---|---|---|
| Where the build runs | Your machine | The server |
| Deploy-time load | None | Large transient spike, every deploy |
| `NEXT_PUBLIC_*` from the panel | **No** - compiled in at build time | **Yes** - the build reads the panel |
| Cross-platform packaging risk | Real; the build script guards it | None - built where it runs |
| Failed deploy | Previous version keeps serving | Site can be left broken mid-build |

Start with **[building on Hostinger](#building-on-hostinger-from-github-or-an-uploaded-source-zip)** -
it is simpler, and environment variables behave the way you would expect. The ZIP
path exists for keeping the build off a constrained host, and most of this
document is the hard-won detail that makes it reliable.

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

Locally the built package runs as **1 node process / 23 threads**, flat under
concurrent load. **On Hostinger the deployed site sits nearer ~77 of 120.**

That gap is not fully explained. Likely contributors, in order of confidence:

1. The quota counts the whole account cgroup, not just your app — Hostinger's own
   supervisor, PHP-FPM workers, cron, and the SSH session all land in the same
   number. Local measurements only ever counted `node`.
2. The Node app manager appears to run **two server instances** (the runtime log
   prints `▲ Next.js` and `✓ Ready` twice per start), which doubles the app's own
   share.
3. Genuine per-request threads under real traffic, which idle local tests do not
   produce.

77 is comfortable against 120 and has stayed flat rather than climbing, which is
the important distinction: a **plateau is capacity, a climb is a leak**. Confirm
which you have with the commands in "Verify after deploying" — `query-engine`
must be exactly 1.

---

## What ships

`pnpm build:hostinger` produces a timestamped ZIP:

- **~79 MB zipped / ~161 MB unpacked / ~2,296 files** (trivial against the 600k inode quota)
- Next.js **standalone** output: `server.js` plus only the traced runtime deps
- No dev dependencies, no `pnpm install`, no `next build` on the server
- **Both** Linux Prisma engines (`debian-openssl-3.0.x` and `debian-openssl-1.1.x`)
  plus the Windows one, so the package also runs locally

Four things the script guards, each a silent killer that reached production once:

- **The Prisma engines.** You build on Windows; the default engine is a
  `.dll.node` that cannot load on Linux. Hostinger reported **OpenSSL 1.1.x** at
  runtime while an earlier package shipped only 3.0.x, and every query failed
  with "could not locate the Query Engine". Both Debian variants now ship, and
  the script verifies both survive the server's `npm install`.
- **Prisma module resolution.** Turbopack copies `@prisma/client` into
  `.next/node_modules/@prisma/client-<hash>/` with **bare specifiers**
  (`require('.prisma/client/default')`, `require('@prisma/client/runtime/library.js')`).
  Those resolve by walking *up* the directory tree — which works locally and
  fails on the server. The generated client is now inlined into that directory
  and the specifiers rewritten to relative paths, so nothing outside the folder
  matters. The build proves it by **deleting `node_modules/.prisma` and
  `node_modules/@prisma` and re-requiring the module**.
- **`.env` leakage.** Next copies the build-time `.env` into standalone output.
  That file has development secrets and localhost URLs; shipping it would leak
  credentials and break NextAuth. The script deletes it and ships
  `.env.production.template` instead.
- **The archive format.** `Compress-Archive` and .NET's `ZipFile` write
  **backslash** entry names, which are invalid per the ZIP spec and unpack on
  Linux as single files with `\` in the name rather than directories — the server
  then dies with `Cannot find module 'next'`. `tar -a -c -f out.zip` silently
  writes a TAR stream instead. The archive is now written by
  `scripts/lib/zip-writer.mjs` and the entry names are asserted before release.

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

This applies to **server** code too, not just the browser bundle - a server
action reading `process.env.NEXT_PUBLIC_BASE_URL` gets the literal string that
was compiled in. That is how `http://localhost:3001` reached production and
redirected paying customers to their own machine after checkout: the value was
baked into a server chunk, where no panel setting or restart could reach it.

### `.env.production` supplies build-time values

`next build` loads `.env.production` ahead of `.env`, so production values win at
build time while `.env` keeps serving `pnpm dev`. Copy
`.env.production.example` to `.env.production` and fill it in; the file is
gitignored, and the build refuses to run without it.

Three guards enforce this, each verified:

| Guard | Fails when |
|-------|-----------|
| `.env.production` must exist | missing → tells you to copy the example |
| `NEXT_PUBLIC_BASE_URL` must be non-local | `http://localhost:3001` → refuses to build |
| Development URL must not appear in the output | `.env` was read instead → names the offending chunk |

The third checks the **compiled output**, not the configuration - it is the only
one that proves the right values actually landed. Note it looks for *your* dev
URL specifically: libraries embed their own local defaults (NextAuth compiles in
`http://localhost:3000/api/auth` as a placeholder it replaces at runtime), so a
blanket localhost search reports false positives.

**Stripe keys:** whichever publishable key is in `.env.production` at build time
is the key your live site uses. The build warns on a `pk_test_` key; replace it
with `pk_live_...` and rebuild before taking real payments. Confirm with:

```bash
grep -rl "pk_live_" .next/static | head -1   # should match
grep -rl "pk_test_" .next/static | head -1   # should be empty
```

With GitHub deployment, Hostinger injects panel variables into the build
environment, so the build-time keys are picked up correctly there.

---

## Deploying: build locally, upload a ZIP

The live site was deployed this way and takes orders end to end. It keeps the
build off the shared host entirely, at the cost of the packaging work described
below - everything here exists because building on Windows and running on Linux
went wrong in a specific way at least once.

**[Building on Hostinger](#building-on-hostinger-from-github-or-an-uploaded-source-zip)**
is also verified and is the simpler default; use this path when you want no
deploy-time load on the server.

### Build

```bash
pnpm install
pnpm build:hostinger          # or: node scripts/build-hostinger-package.mjs
```

Produces `tina-bakery-hostinger-DD-MM-YYYY-HH_MM.zip` in the project root. The
timestamp means successive builds do not overwrite each other, so the artifact on
Hostinger can always be traced back to when it was made.

The build refuses to emit a ZIP unless it has verified all of the following, each
of which corresponds to a failure that actually reached production during setup:

| Check | Failure it prevents |
|-------|---------------------|
| ZIP has a `PK` signature and forward-slash entry names | Backslash paths unpack on Linux as files with `\` in the name → `Cannot find module 'next'`, 503 |
| Extracted archive contains `node_modules/next` as a real directory | Same as above, verified after extraction rather than assumed |
| `npm install` is run on the extracted copy, then re-checked | Hostinger runs `npm install` even with build command "None"; it pruned the whole bundled `node_modules` |
| Generated Prisma client + both Linux engines survive that install | Reinstalling `@prisma/client` replaces the generated client with a stub → "did not initialize yet" |
| The Turbopack copy of `@prisma/client` loads **with `node_modules/.prisma` and `node_modules/@prisma` deleted** | Bare specifiers resolved upward locally but not on the server → "Failed to load external module" |
| Extracted archive boots and serves a static page | Catches over-aggressive trimming |
| Extracted archive serves a **database-backed** route | A static page passes while Prisma is broken |
| `server.js` loads via `require()`, not just `node server.js` | Hostinger's LiteSpeed loader `require()`s the entry file, which rejects top-level await → `ERR_REQUIRE_ASYNC_MODULE` on every request |

**Never wrap `server.js`.** It ships exactly as Next emits it. An attempt to
prepend a launcher that set `UV_THREADPOOL_SIZE` before `await import`-ing the
real server took the site down: `node server.js` ran fine locally, but
Hostinger's loader uses `require()`, and `require()` cannot load an ESM graph
containing top-level await. If you ever need `UV_THREADPOOL_SIZE`, set it in the
environment panel — the process manager exports it before Node starts, which is
the only point where it has any effect anyway.

Flags: `--skip-build` reuses the existing `.next`; `--linux-only` strips the
Windows engine to save ~15 MB (at the cost of not being able to run the package
locally).

### Hostinger settings

hPanel → **Website → Node.js app** (or **Deploy from source files**):

| Setting | Value |
|---------|-------|
| Framework preset | **Other** — do *not* pick Next.js; that makes Hostinger try to build, and the build fails on an already-built package |
| Root directory | `./` |
| Node version | **22.x** |
| Package manager | npm (irrelevant — nothing is installed from your lockfile) |
| **Build command** | **None** — the app is already built |
| **Entry file** | `server.js` |
| Output directory | *(leave empty)* — `server.js` sits at the ZIP root |

### Deploy

1. Upload the ZIP in the deployment dialog and apply the settings above
2. **First deployment:** add every environment variable (see the table earlier).
   Nothing works without at least `DATA_BASE_URL` and `NEXTAUTH_SECRET`.
3. **Redeploying:** upload the new ZIP only. Environment variables persist —
   add new ones if the release introduced any.
4. Wait for **Completed**, then load the site

### If it fails

Read `.builds/current/nodejs/console.log` in File Manager — the runtime error is
there, and `stderr.log` is often empty because Next logs to stdout. Every failure
during setup was diagnosed from that file. The deployment "Build logs" panel only
shows the install step and is rarely the useful one.

---

## One-time setup — Create the database on Hostinger

hPanel → **Databases → MySQL Databases**. Create a database and user, and grant
all privileges. Record the exact name and username (Hostinger prefixes both,
e.g. `u123456789_yene`).

You do **not** need a shadow database. That is only for `prisma migrate dev`
during development; production uses `migrate deploy`, which never touches it.

## One-time setup — Migrate your data from Aiven

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

## Verify after deploying

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
`lib/cache-invalidation.ts` so it gets purged too. `/api/revalidate` imports the
same constant, so the manual control below stays in sync automatically.

### Manual purge from the admin panel

**Admin → Settings → Public Page Revalidation** forces a refresh without a
deploy or a restart.

- **Page Target** — `All public pages`, `Home page`, `Shop listing`,
  `Single product page`, or an individual static page
- **Product Slug** — only used when the target is `Single product page`
  (e.g. `yene-signature-vanilla`)

Visitors keep seeing the current cached page until the fresh one is ready, so
this is safe to run on a live site.

Normal admin edits already purge the caches automatically, so this is for the
cases where that cannot see the change:

- Someone edited MySQL directly, or restored a dump, bypassing the admin API
- An image was replaced at the same URL, so the page is stale but no row changed
- `NEXT_PUBLIC_ISR_REVALIDATE_SECONDS` was raised and you want the old window
  cleared now rather than waiting it out
- A deploy left a warm cache and you want a clean slate

Prefer the narrowest target that covers the change: `All public pages` re-renders
everything on next visit, which is a burst of work on a shared host. `Home page`
or `Shop listing` is usually enough.

The same purge is available server-to-server for scripts and automation:

```bash
curl -X POST https://yenebakery.com/api/revalidate \
  -H "Content-Type: application/json" \
  -H "x-revalidate-secret: $REVALIDATE_SECRET" \
  -d '{"target":"all"}'

# Single product
curl -X POST https://yenebakery.com/api/revalidate \
  -H "Content-Type: application/json" \
  -H "x-revalidate-secret: $REVALIDATE_SECRET" \
  -d '{"target":"product","slug":"yene-signature-vanilla"}'
```

Browser requests require an authenticated admin session; the header is the
alternative for automation. The response lists the paths and tags it purged, so
you can confirm it did what you expected.

---

## Redeploying

```bash
pnpm build:hostinger
```

Upload, extract over the old files, restart the Node app in hPanel. **Your `.env`
is not in the ZIP, so it is never overwritten.**

---

## Troubleshooting

**"Server action not found" / 404 on POST after a deploy**
Server action IDs are hashed per build, so a page from an older build cannot
invoke an action on a newer one.

A stale browser tab causes this harmlessly - a hard refresh fixes it, and it is
expected for anyone holding a tab open across a deploy.

What is *not* harmless is a **cached page** carrying stale action IDs. The
checkout pages were prerendered as static HTML and served with
`Cache-Control: s-maxage=31536000`, so shared caches could hold them - and the
action IDs inside them - for a year. Every redeploy then broke checkout for
anyone served the cached copy, and refreshing did not help because the stale HTML
lived upstream of the browser.

`app/checkout/layout.tsx` sets `dynamic = "force-dynamic"` for the whole segment
(the pages are client components, which cannot export route config themselves).
Checkout now returns `Cache-Control: private, no-cache, no-store`.

If you add a page that calls a server action, make sure it is not prerendered:

```bash
node -e "console.log(Object.keys(require('./dist-hostinger/.next/prerender-manifest.json').routes))"
```

Static pages with no server actions (`/terms`, `/about`) should stay cached.

**Checkout redirects to `localhost` after payment**
`NEXT_PUBLIC_BASE_URL` was wrong **at build time**. Fix it in `.env.production`
and rebuild - the hosting panel cannot correct this (see "Environment variables"
above for why).

`NEXTAUTH_URL` is a separate, runtime variable and does belong in the panel; set
it to the same origin or admin login redirects break in the same way.

**An admin change is not showing on the public site**
Admin writes purge the caches automatically, so this normally means the change
did not go through the admin API — a direct SQL edit, a restored dump, or an
image swapped at the same URL. Use **Admin → Settings → Public Page
Revalidation** to force a refresh (see "Manual purge from the admin panel").

If a normal admin edit did not appear, that is a bug rather than a cache-timing
issue: check that the route's mutating handlers are exported through
`withCacheInvalidation`.

**`PANIC: timer has gone away` / `PrismaClientRustPanicError`**
This should be impossible now - it was the reason for moving to Prisma 7.

Prisma 5 and 6 run queries through a native Rust engine that starts its own Tokio
runtime with a thread pool. Hostinger's shared plan caps **threads** at 120 across
the whole account cgroup, shared with PHP-FPM, cron and the panel's supervisor.
When the engine could not get a thread it aborted with this panic - and the crash
is unrecoverable, so every later query failed until the process restarted. That is
why the site returned 500s continuously rather than intermittently.

It is not a version bug: the same panic is reported on Hostinger with the same
120-process limit on Prisma 6.19
([prisma#29336](https://github.com/prisma/prisma/issues/29336)), and on Debian
generally ([prisma#25884](https://github.com/prisma/prisma/issues/25884)).

Prisma 7 has **no engine**: queries are compiled in JavaScript and run through the
`@prisma/adapter-mariadb` driver. No engine means no Tokio runtime and no thread to
fail to allocate.

If this ever reappears, something has reintroduced the native engine. Check that
`prisma/schema.prisma` has no `binaryTargets` (the build fails if it does) and that
`lib/prisma.ts` still passes an `adapter` to `PrismaClient`.

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

## Building on Hostinger instead

### Building on Hostinger (from GitHub or an uploaded source ZIP)

**Verified working.** Both paths behave the same once configured, and the whole
class of cross-platform packaging bugs above disappears - the build happens where
it runs, so no engine mismatch, no path separators, no module-resolution
surprises. Vercel builds from the same commands.

**Settings** (these exact values produced a successful build)

| Setting | Value |
|---------|-------|
| Framework preset | **Other** |
| Root directory | `./` |
| Node version | **22.x** |
| Package manager | **pnpm** |
| **Build command** | `pnpm run build` |
| Output directory | `.next` |
| **Entry file** | `.next/standalone/server.js` |

If the source ZIP extracts into a wrapper folder, set Root directory to that
folder - it must be the one containing `package.json`.

`pnpm run build` runs `prisma generate && next build && node scripts/prepare-standalone.mjs`:

- `prisma generate` is **required** and easy to miss - there is no `postinstall`
  hook any more (Prisma 7's schema broke the old one), so without it the build
  fails with `Module not found: Can't resolve '@prisma/client'`.
- `prepare-standalone.mjs` copies `.next/static` and `public/` into
  `.next/standalone/`, which `next build` deliberately omits. Without it the site
  renders HTML with no CSS, JS or images. It also deletes the `.env` files Next
  copies into the output, so the hosting panel's variables are not shadowed.

---

#### Watch: Hostinger can silently switch back to npm

The package manager selection has been observed **reverting to npm** - after an
environment-variable change, and at other times without an obvious trigger.

It matters because the repo ships a `pnpm-lock.yaml` and no `package-lock.json`.
npm ignores the pnpm lockfile and resolves everything fresh, so the build may pull
different patch versions than the ones that were tested. It usually still works,
which is exactly what makes it easy to miss.

**Check the build log every deploy.** A pnpm build opens with:

```
Lockfile is up to date, resolution step is skipped
...
Done in 8.3s using pnpm v10.32.1
```

If it says `npm install` instead, set Package manager back to **pnpm** and
redeploy.

#### Watch: an environment-variable change may not take effect

Editing a variable triggers a rebuild, but the **new value does not always reach
the build**. The rebuild succeeds and the old value is still compiled in, which is
particularly damaging for `NEXT_PUBLIC_*` - those are inlined, so a stale value
survives until the next successful build.

After changing any variable, verify the running site reflects it. If it does not:

1. **Delete** the variable in the panel
2. **Re-add** it with the correct value
3. Rebuild

Editing in place has been unreliable; removing and re-adding has worked.

---

**Environment variables.** On this path the panel's values *are* used at build
time, so `NEXT_PUBLIC_*` works from the panel here - unlike the prebuilt-ZIP flow,
where they are already compiled in and the panel cannot reach them. Set:

```
NEXT_PUBLIC_BASE_URL=https://yenebakery.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
DATA_BASE_URL=mysql://user:pass@127.0.0.1:3306/db?connection_limit=5&pool_timeout=10&connect_timeout=10
NEXTAUTH_URL=https://yenebakery.com
NEXTAUTH_SECRET=...
```

**A source ZIP may carry `.env` files that a Git deploy will not.** Both `.env`
and `.env.production` are gitignored, so a GitHub deploy never sees them - but a
ZIP made from the project folder includes them unless they are excluded. The build
log names what it loaded:

```
▲ Next.js 16.1.6 (Turbopack)
- Environments: .env.production, .env      ← both were in the upload
```

Next's precedence is `process.env` (the panel) → `.env.production` → `.env`, so
panel values still win **where they are set**. The risk is a variable that is
*only* in the file: it silently supplies a value the panel never approved. If
`.env.production` still points at a previous test domain, that is what gets
compiled in.

Those files also put real credentials on the server's filesystem. Prefer zipping
without them, or delete them after extracting and rebuild.

**What to expect**

- A large, transient process/CPU spike during install + build - that is the
  build, not a leak. Judge the plan by the steady state afterwards.
- `next build` evaluates route modules, so `DATA_BASE_URL` should be set before
  the first build even though the pages render on demand.
- If a build is killed part-way the site can be left broken, whereas a bad ZIP
  upload leaves the previous version serving until you replace it.

### Uploading a pre-built package and building again on the server

Not useful — `next build` regenerates `.next` from source, so the shipped build is
discarded. If you want a server-side build, send source; if you want a local
build, send the ZIP.

---

## If process pressure returns

The changes above address the causes present in the code. If you later add
genuinely long-running work (large report generation, bulk email), the structural
fix is a **VPS** rather than shared hosting — a VPS has no process quota, only
real CPU and RAM limits, and your current usage of both is minimal. That is a
cost decision, not an urgent one; the shared plan should be comfortable now.
