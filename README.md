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
