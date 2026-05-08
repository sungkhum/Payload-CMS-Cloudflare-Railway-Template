# Deploy and Host Boxcar — Payload CMS + Cloudflare R2 on Railway

Boxcar is a production-ready blog template combining Payload CMS, Next.js 16, and Cloudflare R2 for media storage. Deploy a fully self-hosted, code-owned headless blog with a polished admin, scheduled publishing, draft workflows, and SEO baked in — without wiring up infrastructure yourself.

## About Hosting Boxcar — Payload CMS + Cloudflare R2

Hosting Boxcar on Railway provisions three pieces: a Next.js web service running the Payload admin and public blog, a separate cron service that processes scheduled-publish jobs every 30 minutes, and a managed PostgreSQL database for content. Migrations run automatically before each deploy via the `preDeployCommand` hook, and Railway pings `/healthz` to confirm the app is healthy. Cloudflare R2 handles media uploads through Payload's S3-compatible storage plugin — you supply bucket credentials via environment variables. Push to `main` and Railway redeploys both services in lockstep.

## Common Use Cases

- Personal or company blog with full code-level control over the admin and frontend
- Editorial publication with draft, autosave, and scheduled-publish workflows for multi-author teams
- Migration target for a WordPress site — every collection ships with `legacy.wpId` / `legacy.wpUrl` fields and a stub WP-import script

## Dependencies for Boxcar — Payload CMS + Cloudflare R2 Hosting

- A Cloudflare account with R2 enabled (for media uploads). The template runs without R2 — uploads just fall back to local storage — but production setups should wire it up.
- A GitHub fork or copy of the template repo, so Railway can auto-deploy on push.

### Deployment Dependencies

- [Payload CMS documentation](https://payloadcms.com/docs)
- [Cloudflare R2 documentation](https://developers.cloudflare.com/r2/)
- [Next.js 16 documentation](https://nextjs.org/docs)
- [Railway documentation](https://docs.railway.com)

### Implementation Details

Scheduled publishing is implemented entirely on Payload's `publishedAt` field plus a custom job. When an editor sets a future `publishedAt` and clicks **Schedule Post**, a `beforeChange` hook demotes the post to `draft` so it stays hidden, and an `afterChange` hook enqueues a `publishScheduledPost` job with `waitUntil = publishedAt`. The Cron service runs `pnpm jobs:run` every 30 minutes; when the post's time arrives, the handler flips `_status` back to `published`. The handler is idempotent — it re-checks `publishedAt` before flipping, so reschedules and manual publishes don't double-fire.

## Why Deploy Boxcar — Payload CMS + Cloudflare R2 on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying Boxcar — Payload CMS + Cloudflare R2 on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
