14:34:09.422 Running build in Washington, D.C., USA (East) – iad1
14:34:09.423 Build machine configuration: 2 cores, 8 GB
14:34:09.558 Cloning github.com/Mehdi-6600/global-job-matching (Branch: main, Commit: 8d0dae3)
14:34:09.888 Cloning completed: 330.000ms
14:34:11.700 Restored build cache from previous deployment (3RxtETBwPH1EAHzNsGLircYtXbs8)
14:34:11.927 Running "vercel build"
14:34:11.995 Vercel CLI 59.3.0
14:34:12.672 Installing dependencies...
14:34:17.068 
14:34:17.069 > global-job-matching@0.1.0 postinstall
14:34:17.069 > prisma generate
14:34:17.069 
14:34:18.063 Prisma schema loaded from prisma/schema.prisma
14:34:18.366 
14:34:18.367 ✔ Generated Prisma Client (v6.19.3) to ./node_modules/@prisma/client in 144ms
14:34:18.367 
14:34:18.367 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
14:34:18.367 
14:34:18.368 Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate
14:34:18.368 
14:34:18.422 
14:34:18.422 up to date in 6s
14:34:18.422 
14:34:18.422 175 packages are looking for funding
14:34:18.423   run `npm fund` for details
14:34:18.424 npm warn allow-scripts 6 packages have install scripts not yet covered by allowScripts:
14:34:18.424 npm warn allow-scripts   @prisma/client@6.19.3 (postinstall: node scripts/postinstall.js)
14:34:18.424 npm warn allow-scripts   @prisma/engines@6.19.3 (postinstall: node scripts/postinstall.js)
14:34:18.424 npm warn allow-scripts   esbuild@0.28.2 (postinstall: node install.js)
14:34:18.424 npm warn allow-scripts   prisma@6.19.3 (preinstall: node scripts/preinstall-entry.js)
14:34:18.425 npm warn allow-scripts   sharp@0.33.5 (install: node install/check)
14:34:18.425 npm warn allow-scripts   unrs-resolver@1.12.2 (postinstall: node postinstall.js)
14:34:18.425 npm warn allow-scripts
14:34:18.425 npm warn allow-scripts Run `npm approve-scripts --allow-scripts-pending` to review, or `npm approve-scripts <pkg>` to allow.
14:34:18.458 Detected Next.js version: 15.1.11
14:34:18.459 Running "npx prisma db push --accept-data-loss && npx prisma db seed && next build"
14:34:19.437 Prisma schema loaded from prisma/schema.prisma
14:34:19.439 Datasource "db": PostgreSQL database "neondb", schema "public" at "ep-soft-cell-axxqoj8b-pooler.c-4.us-east-2.aws.neon.tech"
14:34:20.236 
14:34:20.236 The database is already in sync with the Prisma schema.
14:34:20.236 
14:34:20.236 Running generate... (Use --skip-generate to skip the generators)
14:34:20.322 Running generate... - Prisma Client
14:34:20.441 ✔ Generated Prisma Client (v6.19.3) to ./node_modules/@prisma/client in 117ms
14:34:20.442 ┌─────────────────────────────────────────────────────────┐
14:34:20.442 │  Update available 6.19.3 -> 7.9.1                       │
14:34:20.442 │                                                         │
14:34:20.442 │  This is a major update - please follow the guide at    │
14:34:20.442 │  https://pris.ly/d/major-version-upgrade                │
14:34:20.442 │                                                         │
14:34:20.442 │  Run the following to update                            │
14:34:20.442 │    npm i --save-dev prisma@latest                       │
14:34:20.442 │    npm i @prisma/client@latest                          │
14:34:20.442 └─────────────────────────────────────────────────────────┘
14:34:20.442 
14:34:21.343 
14:34:22.002    ▲ Next.js 15.1.11
14:34:22.002 
14:34:22.020    Creating an optimized production build ...
14:34:25.519 Failed to compile.
14:34:25.520 
14:34:25.521 src/app/api/jobs/[id]/page.tsx
14:34:25.521 You cannot have two parallel pages that resolve to the same path. Please check /api/jobs/[id]/page and /api/jobs/[id]/route. Refer to the route group docs for more information: https://nextjs.org/docs/app/building-your-application/routing/route-groups
14:34:25.521 
14:34:25.534 
14:34:25.534 > Build failed because of webpack errors
14:34:25.561 Error: Command "npx prisma db push --accept-data-loss && npx prisma db seed && next build" exited with 1
