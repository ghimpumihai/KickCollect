This is a [Next.js](https://nextjs.org) project backed by Prisma and PostgreSQL.

## Supabase Setup

Create a `.env` file in the project root with your Supabase Postgres URLs:

```bash
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
AUTH_SECRET="replace-me-for-shared-environments"
AUTH_SESSION_IDLE_MINUTES="15"
```

- `DATABASE_URL` is used by the app runtime.
- `DIRECT_URL` is used by Prisma migrate/seed to avoid pooler limitations.

Then run:

```bash
npm run db:migrate
npm run db:seed
```

## Getting Started

First, start PostgreSQL and prepare the database:

```bash
docker compose up -d postgres
npm run db:migrate
npm run db:seed
```

Then run the development server:

```bash
npm run dev
```

`npm run dev` starts Next.js on `0.0.0.0` over HTTP so the app can be opened easily from another device on the same LAN.

If you need the secure development variant, run:

```bash
npm run dev:https
```

Register a user from `/auth` before opening `/collection` or `/card/[id]`. These routes and the `/api/cards*` endpoints are protected by a signed HTTP-only session cookie with inactivity expiry.

Optional environment variables:

```bash
AUTH_SECRET="replace-me-for-shared-environments"
AUTH_SESSION_IDLE_MINUTES="15"
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

The cards database is created and populated through Prisma migrations and seeds, not by manual SQL tables.

## Docker

The repository includes a PostgreSQL container definition for local development and grading workflows. Use the same credentials as the example `DATABASE_URL` above.
