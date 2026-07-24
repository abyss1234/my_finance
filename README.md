# My Finance

A simple personal finance app built with Next.js, Prisma, PostgreSQL, and Tailwind CSS.

## Features

- Add, edit, and delete income/expense transactions
- Category-based transaction tracking
- Dashboard summary and analysis charts
- MacroDroid API endpoint for phone notification imports
- Salted password-hash login for the web app
- API key protection for MacroDroid requests

## Tech Stack

- Next.js 16
- React 19
- Prisma 6
- PostgreSQL
- Tailwind CSS
- Chart.js

## Environment Variables

Create `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"

APP_PASSWORD_HASH="generate-with-the-command-below"
APP_SESSION_SECRET="random-long-secret"
MACRODROID_API_KEY="your-phone-api-key"

NEXT_PUBLIC_APP_NAME="Simple Finance"
```

Generate a salted password hash:

```bash
npm run auth:hash-password
```

Copy the generated `APP_PASSWORD_HASH` line into `.env`. When upgrading an existing
`.env` that still has `APP_PASSWORD`, migrate it automatically:

```bash
npm run auth:hash-password -- --update-env
```

Use a different long random value for `APP_SESSION_SECRET`.

For Vercel + Neon:

- `DATABASE_URL` should use the pooled Neon URL, usually with `-pooler`
- `DIRECT_URL` should use the direct Neon URL, without `-pooler`

## Local Setup

```bash
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open:

```text
http://localhost:3000
```

For phone access on the same WiFi:

```bash
npm run dev -- -H 0.0.0.0
```

Then use your laptop WiFi IP, for example:

```text
http://192.168.100.4:3000
```

## MacroDroid API

Endpoint:

```text
POST /api/macrodroid
```

Local WiFi example:

```text
http://192.168.100.4:3000/api/macrodroid
```

Vercel example:

```text
https://your-project.vercel.app/api/macrodroid
```

Required header:

```text
x-api-key: your-phone-api-key
```

Received requests are shown on the protected **Macro Logs** page.

## Vercel Deploy

1. Push the project to GitHub.
2. Import the repo in Vercel.
3. Set the root directory if needed:

```text
project/myfinance_app
```

4. Add all environment variables in Vercel.
5. Deploy.

For an existing Vercel deployment that still uses `APP_PASSWORD`:

1. Add `APP_PASSWORD_HASH` from your local `.env` while temporarily keeping `APP_PASSWORD`.
2. Deploy this updated code and confirm that login works.
3. Remove `APP_PASSWORD` from Vercel because the new code no longer uses it.

Before using the deployed app, run migrations against the production database:

```bash
npx prisma migrate deploy
npx prisma db seed
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run auth:hash-password
```

## Notes

- Do not commit `.env`.
- MacroDroid must send `x-api-key`.
- Web users must log in with the password represented by `APP_PASSWORD_HASH`.
- MacroDroid receipts are stored even when the transaction format is not recognized.
