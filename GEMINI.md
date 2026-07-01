# Project Context: Antigravity AI Fitness Startup
Technical Stack: Next.js (App Router), Supabase (Auth & Database), Sentry (Observability).

## Architecture Rules
1. All database mutations or API calls must be instrumented with Sentry tracking (`Sentry.captureException`).
2. Adhere to strict TypeScript definitions generated from the Supabase CLI (`npm run gen:types`).
3. Always work in `Agent-Assisted` mode. Generate an Implementation Plan for verification before changing or adding files.

