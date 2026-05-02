This is a [Next.js](https://nextjs.org) project backed by Prisma and PostgreSQL.

## Getting Started

First, start PostgreSQL and prepare the database:

```bash
docker compose up -d postgres
npx prisma migrate dev
npx prisma db seed
```

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open the app from the host you are using. If the client runs on a different machine than the server, set `NEXT_PUBLIC_API_BASE_URL` to the server origin, for example `http://192.168.1.20:3000`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

Database notes:

```txt
DATABASE_URL="postgresql://kickcollect:kickcollect@localhost:5432/kickcollect?schema=public"
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"
```

The cards database is created and populated through Prisma migrations and seeds, not by manual SQL tables.

## Docker

The repository includes a PostgreSQL container definition for local development and grading workflows. Use the same credentials as the example `DATABASE_URL` above.
