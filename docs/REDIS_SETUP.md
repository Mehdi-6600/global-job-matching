# Redis / Upstash setup (rate limits)

## Why

Without a shared Redis, each Vercel serverless instance uses its own in-memory limiter.
Attackers can spread load across instances and weaken rate limits.

## Required (pick one pair)

### Option A — Upstash (recommended)
