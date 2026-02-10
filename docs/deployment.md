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
   - Set `VITE_API_BASE_URL` to your production functions URL.

2. **Supabase**
   - Provision a Supabase project.
   - Apply migrations from `supabase/migrations/`.
   - Deploy edge functions from `supabase/functions/`.
   - Set required environment variables:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
     - `SERVER_SALT`

3. **Routing**
   - Ensure your static host routes all paths to `index.html` so
     `/student` and `/teacher` work on refresh.

4. **Pre-launch checklist**
   - Confirm `VITE_API_BASE_URL` is set to the production functions URL.
   - Verify `SERVER_SALT` is set and never exposed to the client.
   - Run the full test suite (see README).
