# My Finance

A simple personal finance app built with Next.js, Prisma, PostgreSQL, and Tailwind CSS.

## Features

- Add, edit, and delete income/expense transactions
- Category-based transaction tracking
- Dashboard summary and analysis charts
- MacroDroid API endpoint for phone notification imports
- Simple password login for the web app
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

APP_PASSWORD="your-login-password"
APP_SESSION_SECRET="random-long-secret"
MACRODROID_API_KEY="your-phone-api-key"

NEXT_PUBLIC_APP_NAME="Simple Finance"
```

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

Example JSON body:

```json
{
  "app": "TNG eWallet",
  "title": "Transfer Successful.",
  "text": "RM 0.10 has been successfully transferred to KATHERINE TIONG WEI NI.",
  "time": "1782909512135"
}
```

## Vercel Deploy

1. Push the project to GitHub.
2. Import the repo in Vercel.
3. Set the root directory if needed:

```text
project/myfinance_app
```

4. Add all environment variables in Vercel.
5. Deploy.

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
```

## Notes

- Do not commit `.env`.
- MacroDroid must send `x-api-key`.
- Web users must login with `APP_PASSWORD`.
- Unmatched MacroDroid messages are captured for debugging and can be improved later.
