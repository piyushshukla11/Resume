# ME — Piyush Shukla

A weather-reactive portfolio and resume built with Next.js App Router, TypeScript, Tailwind CSS, Motion, and Lenis.

## Multi-page architecture

- **`/` (Portfolio Home)**: Weather-reactive retro landing page featuring the pixel celestial simulation, engineering highlights gateway, practical tooling matrix, competitive programming profiles, and milestone timeline.
- **`/work` & `/projects` (Engineering Index)**: Dedicated engineering archive webpage featuring all 9 production builds with interactive category tabs (`Systems & low-level`, `AI & full-stack`, `Game dev & graphics`), real-time keyword search, and direct links to case studies.
- **`/projects/[id]` (Technical Case Studies)**: Dedicated deep-dive webpages for each individual system (e.g. `/projects/polyexecution-studio`, `/projects/voyage`) with problem statements, kernel-level containment specs, architecture stages, code snippets, and verified metrics.
- **`/contact` (Contact & Profile)**: Direct open communication channels and verified profiles.

## Local setup

1. Create `.env.local` if you wish to configure admin curation, GitHub webhooks, or custom handle credentials:
   - `ADMIN_TOKEN`: Bearer token for the owner curation drawer.
   - `GITHUB_WEBHOOK_SECRET`: Webhook signature secret (HMAC SHA-256).
   - `GITHUB_USERNAME`: Defaults to `Piyush-K-Shukla`.
   - `GITHUB_TOKEN`: Optional GitHub personal access token for higher rate limits.
   - `STAGING_ENCRYPTION_KEY`: Random 32+ byte secret for project curation encryption.
   - `KV_REST_API_URL` & `KV_REST_API_TOKEN`: Optional durable KV store (Upstash/Vercel KV).
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev` and open `http://localhost:3000`.

Weather data uses Open-Meteo. The browser asks for location access; if it is declined, the weather endpoint tries IP geolocation and then defaults to Bengaluru. Use the weather menu to preview conditions without changing the stored location.

The competitive profile handles and contact email are optional. Set `NEXT_PUBLIC_LEETCODE_USERNAME`, `NEXT_PUBLIC_CODECHEF_USERNAME`, and `NEXT_PUBLIC_CONTACT_EMAIL` when ready. Competitive problem counts are not fabricated or displayed until a verified stats source is configured.

## GitHub curation

Set `GITHUB_USERNAME` (defaults to `Piyush-K-Shukla`), `GITHUB_TOKEN` (optional, recommended to raise API limits), `GITHUB_WEBHOOK_SECRET`, and `ADMIN_TOKEN`. Set up a GitHub webhook for `push` and `repository` events, targeting `/api/github/sync`, with the same webhook secret. Repository creation/publication events and pushes only enqueue metadata; they never publish it automatically.

Open the owner drawer with **Ctrl/⌘ + Shift + M**. Enter `ADMIN_TOKEN` to review, customize, approve, or permanently ignore repositories. An authenticated `GET /api/github/sync` performs a full public repository poll and can be called by a scheduled job using `Authorization: Bearer <ADMIN_TOKEN>`.

In production, configure durable Upstash/Vercel KV REST credentials (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) and a strong `STAGING_ENCRYPTION_KEY`. Project curation state is encrypted with AES-256-GCM before storage. Production project routes intentionally fail closed if the durable encrypted store is missing. Local development falls back to a permission-restricted JSON file in `data/pipeline.json`.

## Resume export

Use **Resume PDF** or **⌘/Ctrl + K → Export resume as PDF** and choose Save as PDF in the browser print dialog. The page includes a print-specific layout with the main resume content and hides interactive controls.
