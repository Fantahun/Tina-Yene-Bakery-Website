# Tina Yene Bakery Website

## Quick Start

```powershell
pnpm install
pnpm run dev
```

## Environment Setup

Create a `.env` file with your database connection strings.

You can also use environment-specific files if needed:
- `.env.local` (local development overrides)
- `.env.development` / `.env.development.local`
- `.env.test` / `.env.test.local`
- `.env.production` / `.env.production.local`

Use this template for the required variables:

```bash
# Stripe API keys for payment processing
STRIPE_SECRET_KEY="sk_test_your_secret_key"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_publishable_key"

# Environment choice for development and production (development or production)
NODE_ENV="development"

# Basic authentication for admin user creation requests
ADMIN_USERNAME="your_admin_username"
ADMIN_PASSWORD="your_admin_password"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Database connection details
DATA_BASE_HOST="127.0.0.1"
DATA_BASE_PORT="3306"
DATA_BASE_USER="db_user"
DATA_BASE_PASSWORD="db_password"
DATA_BASE_NAME="db_name"

# Prisma database url and shadow database url for migrations
SHADOW_DATA_BASE_URL="mysql://db_user:db_password@127.0.0.1:3306/db_shadow"
DATA_BASE_URL="mysql://db_user:db_password@127.0.0.1:3306/db_name"

NEXTAUTH_SECRET="replace_with_long_random_secret"
NEXTAUTH_URL="http://localhost:3000"
```

## Prisma: First-Time Setup

```powershell
pnpm exec prisma generate
```

```powershell
pnpm prisma migrate dev --name init
```

## Prisma: Schema Changes

1. Update `prisma/schema.prisma`.
2. Create a migration.

```powershell
pnpm prisma migrate dev --name your_change_name
```

3. Regenerate the Prisma client if needed.

```powershell
pnpm exec prisma generate
```

## Prisma: Useful Commands

```powershell
pnpm prisma studio
```

```powershell
pnpm prisma migrate reset
```

## Admin Smoke Check

```powershell
node scripts/order-status-smoke.mjs
```

## Lint

```powershell
pnpm -s lint
```

## Seed Orders (Dev)

```powershell
pnpm run seed:orders
```

## Reports Module

Available reports:
- Orders (search, status, fulfillment, date range)
- Product Sales (quantity and revenue by product)
- Fulfillment (pickup vs delivery performance)

Exports are available as CSV from the report tabs.

```powershell
pnpm run smoke:reports
```

## Temporary Public Hold Modes

Use these flags when you want to temporarily gate user-facing routes before or during release work.

1. Set mode flags in your active env file:
   - `NEXT_PUBLIC_COMING_SOON=true`
   - `NEXT_PUBLIC_MAINTENANCE_MODE=true`
2. (Optional for coming soon) Set `NEXT_PUBLIC_COMING_SOON_TARGET_DATE="2026-06-01T10:00:00Z"` to control the countdown.
3. Deploy/restart the app.
4. Visit any route (such as `/`, `/shop`, `/contact`) and it will render the active hold page.

Precedence:
- If both flags are true, `maintenance` has higher priority and `/maintenance` is shown.
- If only coming-soon is true, `/coming-soon` is shown.
- If both are false, the full website is shown.

Notes:
- Internal/static paths are excluded from rewrite (`/_next`, files like images, favicon, robots, sitemap).
- API routes (`/api/*`) stay reachable so backend integrations keep working.
- Admin routes (`/yeneAdmin/*`) remain accessible during both modes.

To restore the full website, set both mode flags to `false` (or remove them) and restart.
