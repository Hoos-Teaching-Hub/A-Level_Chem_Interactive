# Deployment Guide

This guide covers local deployment, a GitHub Pages test deployment, and a
production deployment setup. It is part of the M0 milestone (T7) and should be
kept in sync with `docs/roadmap.md`.

## Local deployment

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the Vite dev server:
   ```sh
   npm run dev
   ```
3. Visit:
   - `http://localhost:5173/student`
   - `http://localhost:5173/teacher`

For edge functions, start Supabase locally and follow the README steps for
`supabase functions serve`.

## GitHub Pages test deployment

This repo includes a GitHub Actions workflow at `.github/workflows/pages.yml`
that builds the app and publishes the `dist` folder to GitHub Pages on pushes
to the `M0` branch or via manual dispatch.

Important details:
- The workflow sets `VITE_BASE_PATH=/A-Level_Chem_Interactive/` so static assets
  load correctly under the repo path on Pages.
- The build can read optional Actions secrets:
  - `VITE_API_BASE_URL` (full functions URL, e.g. `https://<ref>.supabase.co/functions/v1`)
  - `VITE_SUPABASE_URL` (host URL, app appends `/functions/v1`)
- The workflow now fails fast before build when **both** API URL secrets are
  empty, so broken Pages deployments do not publish with missing backend config.
- The `build` job now runs in the `github-pages` environment, so API URL secrets
  can be supplied either as repository secrets or `github-pages` environment secrets.
- The app router uses `basename: import.meta.env.BASE_URL`, so client-side
  routes also resolve correctly under the repo subpath.
- `vite.config.ts` reads `VITE_BASE_PATH` via Vite `loadEnv` (instead of
  `process.env`) so CI TypeScript builds do not require Node global typings.
- If you fork the repo, update the base path in the workflow to match your
  repository name.
- GitHub Pages is **test-only**: it does not run the Supabase edge functions.
  Use it to validate UI flows and layouts.

## Production deployment

Use a production host that supports a backend for the Supabase edge functions.
Recommended flow:

1. **Frontend hosting**
   - Build locally or in CI: `npm run build`.
   - Deploy the `dist` directory to a static host (Netlify, Vercel, Cloudflare,
     or a static bucket + CDN).
   - Set one of:
     - `VITE_API_BASE_URL` to your production functions URL (`.../functions/v1`).
     - `VITE_SUPABASE_URL` to your Supabase host URL (the app will append `/functions/v1`).

2. **Supabase**
   - Provision a Supabase project.
   - Apply migrations from `supabase/migrations/`.
   - Deploy edge functions from `supabase/functions/`.
   - Keep function JWT verification disabled for `join`, `load`, `save`, and
     `teacher` (configured in `supabase/config.toml`) because this app uses
     code/session auth instead of Supabase Auth JWT tokens.
   - Set required environment variables:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
     - `SERVER_SALT`

3. **Routing**
   - Ensure your static host routes all paths to `index.html` so
     `/student` and `/teacher` work on refresh.

4. **Pre-launch checklist**
   - Confirm frontend API env is set (`VITE_API_BASE_URL` or `VITE_SUPABASE_URL`).
   - Verify `SERVER_SALT` is set and never exposed to the client.
   - Run the full test suite (see README).
