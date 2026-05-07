# Boxcar

A Payload v3 + Next.js blog boilerplate, ready to deploy on **Railway** with **PostgreSQL** and **Cloudflare R2** for media. Clone it, fill in a `.env`, push to Railway — you have a blog.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/boxcar-payload-cms-cloudflare-r2?referralCode=6EnXto&utm_medium=integration&utm_source=template&utm_campaign=generic)

**Stack**

- Payload 3.84 + Next.js 16 (single app: admin at `/admin`, public site at `/`)
- PostgreSQL 16 (Railway in production, Docker locally)
- Cloudflare R2 for media (S3-compatible, via `@payloadcms/storage-s3`)
- Sharp for image processing
- Plugins: SEO, Redirects
- Optional WordPress → Payload migration script

## Local development

```bash
# 1. Start Postgres
docker compose up -d

# 2. Install deps
pnpm install

# 3. Copy env template and fill in values
cp .env.example .env

# 4. Bring up Payload + Next.js (admin at http://localhost:3125/admin)
pnpm dev
```

On first boot, visit [http://localhost:3125/admin](http://localhost:3125/admin) to create the first admin user.

`.env.example` ships with a working local Postgres URI from `docker-compose.yml`. R2 vars are blank — until you fill them in, image uploads through the admin will fail (everything else works).

### Useful scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run Next.js + Payload in dev mode |
| `pnpm devsafe` | Wipes `.next` first (use after dependency changes) |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm generate:types` | Regenerate `src/payload-types.ts` from the config |
| `pnpm generate:importmap` | Regenerate the admin import map |
| `pnpm payload <cmd>` | Pass-through to the Payload CLI |
| `pnpm migrate:wp` | Run the optional WordPress → Payload migration (stub) |

## Cloudflare R2 setup

1. Create a bucket: Cloudflare dashboard → R2 → **Create bucket** → name it (e.g. `boxcar-media`).
2. Make it public OR connect a custom domain (Settings → Public access → Custom domain). Recommended: `media.your-domain.com`.
3. Create an API token: R2 → **Manage API Tokens** → "Object Read & Write" scoped to the bucket.
4. Fill `.env`:
   ```env
   R2_BUCKET=boxcar-media
   R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=<token id>
   R2_SECRET_ACCESS_KEY=<secret>
   R2_PUBLIC_URL=https://media.your-domain.com
   ```
5. Add a CORS policy on the bucket so the admin can upload from a browser (Settings → CORS):
   ```json
   [
     {
       "AllowedOrigins": ["https://your-domain.com", "http://localhost:3125"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

## Railway deployment

Prereqs: Railway CLI authenticated (`railway whoami`).

```bash
# 1. Create the project + add a Postgres service
railway init --name boxcar
railway add --database postgres

# 2. Add the app service (deploys this directory via the Dockerfile)
railway up --detach

# 3. Wire env vars on the app service
railway variables \
  --set "PAYLOAD_SECRET=$(openssl rand -base64 32)" \
  --set "DATABASE_URI=\${{ Postgres.DATABASE_URL }}" \
  --set "NEXT_PUBLIC_SERVER_URL=https://your-domain.com" \
  --set "NEXT_PUBLIC_SITE_NAME=Your Blog" \
  --set "R2_BUCKET=boxcar-media" \
  --set "R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com" \
  --set "R2_ACCESS_KEY_ID=..." \
  --set "R2_SECRET_ACCESS_KEY=..." \
  --set "R2_PUBLIC_URL=https://media.your-domain.com"

# 4. Add a custom domain
railway domain
```

The `Dockerfile` is multi-stage and produces a Next.js build with the full `node_modules` tree intact (so the Payload CLI is available for migrations). `railway.json` tells Railway to use it, runs `pnpm migrate` as the pre-deploy step, and pings `/healthz` for liveness.

> Note: `NEXT_PUBLIC_SERVER_URL` and `NEXT_PUBLIC_SITE_NAME` are read at build time. If you change them, redeploy.

### GitHub auto-deploy (recommended)

Connect your GitHub fork via the **Railway GitHub App** and pushes to `main` will auto-deploy. If you do that, don't also run `railway up` afterwards or you'll trigger a duplicate build. Reserve `railway up` for emergency deploys that bypass git.

## Project layout

```
src/
├── access/                 # Reusable Payload access helpers
├── app/
│   ├── (frontend)/         # Public site (homepage, posts, pages)
│   ├── (payload)/          # Admin UI + REST/GraphQL routes
│   └── healthz/            # Railway healthcheck endpoint
├── collections/            # Posts, Pages, Media, Categories, Tags, Comments, Users
├── components/             # Shared UI (header, footer, theme toggle, etc.)
├── fields/                 # Reusable field generators (slug, legacy)
└── payload.config.ts
scripts/
└── migrate-wordpress.ts    # Optional WP → Payload migration (stub)
```

## Customising the brand

A few places hold the default `Boxcar` / `boxcar` strings — search and replace to make it yours:

- `src/components/site-header.tsx` — header wordmark
- `src/components/site-footer.tsx` — footer copyright
- `src/app/(frontend)/layout.tsx` — `<title>` / description metadata
- `src/app/(frontend)/posts/[slug]/page.tsx` and `pages/[slug]/page.tsx` — per-page title suffix
- `src/payload.config.ts` — admin title suffix (`Boxcar Admin`) and SEO `siteName` default
- `package.json` — `name` and `description`

For the SEO plugin's title generation, you can also set `NEXT_PUBLIC_SITE_NAME` in `.env` to override `"Boxcar"` without touching code.

## Optional: WordPress migration

The `Posts`, `Pages`, `Media`, `Categories`, `Tags`, and `Comments` collections all carry a `legacy` group with `wpId` and `wpUrl`. The migration script (stub at `scripts/migrate-wordpress.ts`) is set up to:

1. Pull from `<wp_source>/wp-json/wp/v2/...`
2. Re-upload media to R2 and rewrite URLs in post bodies
3. Create Payload docs preserving slugs, populating `legacy.wpId` / `legacy.wpUrl`
4. Use the populated `legacy.wpUrl` values to seed the Redirects plugin so old WP permalinks 301 to their new homes

If you're not migrating from WordPress, you can ignore the script and leave the `legacy` group empty (or remove it from `src/fields/legacy.ts` and the collections that import it).

## License

MIT.
