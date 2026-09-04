# Global Job Matching

International job marketplace built with **Next.js 15**, **Prisma 6**, **PostgreSQL (Neon)**, and **NextAuth 5**.

## Features

- Job seeker & employer roles
- Job search, applications, saved jobs, alerts
- Plan limits with effective plan / expiration
- Crypto payment submission + admin confirmation
- AI resume builder & career-risk analysis (with fallbacks)
- i18n (en / fa / ar / es / fr / hi) with English fallback for missing keys

## Stack

- Next.js App Router
- TypeScript
- Prisma + PostgreSQL
- NextAuth (JWT)
- Vercel deployment
- Optional: Upstash Redis rate limits, Resend email, Vercel Blob

## Setup

1. Clone the repo
2. Copy `.env.example` → `.env` and fill:
   - `DATABASE_URL`
   - `AUTH_SECRET` / `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL`
   - Optional: `RESEND_API_KEY`, Redis/KV, crypto wallet addresses, AI keys
3. Install & generate:

```bash
npm install
npx prisma generate
