# Pixelcraft — Deployment Guide

## Architecture

| Layer | What it is | Where it runs |
|---|---|---|
| Frontend | Vite + React SPA (`src/`, output `dist/`) | Vercel / Netlify / any static host |
| Backend | Dependency-free Node HTTP server (`backend/index.js`) | Render / Railway / Fly.io / VPS |
| Data | Local IndexedDB in the browser | User's device (see production caveat) |
| Secrets | `backend/.env` only | Backend host — never in the frontend build |

The browser never contains AI or OAuth secrets. Frontend calls use `src/lib/api.ts`:
- `VITE_API_BASE_URL` set → absolute backend origin, e.g. `https://pixelcraft-api.onrender.com/api/ai/chat`.
- `VITE_API_BASE_URL` empty → relative `/api/...`, handled by the Vite dev proxy locally.

---

## 1. Verify the build

From the `PixelCraft` directory:

```bash
npm install
npm run build          # runs: tsc --noEmit && vite build
npm run preview        # optional: serve dist/ locally
```

Expected: `dist/index.html`, `dist/assets/*`, no TypeScript errors. Chunk-size and
`INEFFECTIVE_DYNAMIC_IMPORT` messages are non-blocking warnings, not errors.

---

## 2. Environment variables

### Frontend — root `.env` (copy from `.env.example`)

| Variable | Required | Example | Notes |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes in production (unless you add an `/api` rewrite) | `https://pixelcraft-api.onrender.com` | Origin only — no trailing slash, no `/api` path. Values prefixed `VITE_` are public in the bundle. |
| `BACKEND_PROXY_TARGET` | Dev only | `http://localhost:3001` | Read by `vite.config.ts` for the local `/api` proxy. Not exposed to the browser. |

### Backend — `backend/.env` (copy from `backend/.env.example`)

| Variable | Required | Example | Notes |
|---|---|---|---|
| `BACKEND_PORT` or `PORT` | Yes | `3001` | Platforms such as Render inject `PORT`; the server supports both. |
| `HOST` | No | `0.0.0.0` | Bind address; default is `0.0.0.0`. |
| `APP_URL` | Yes in production | `https://pixelcraft.vercel.app` | Frontend origin, no trailing slash. |
| `CORS_ORIGIN` | Yes in production | `https://pixelcraft.vercel.app` | Must exactly match the browser origin. |
| `OAUTH_REDIRECT_URI` | Only for OAuth | `https://pixelcraft.vercel.app/auth/callback` | Defaults to `APP_URL/auth/callback`. |
| `CROSS_ORIGIN_RESOURCE_POLICY` | Yes when using `VITE_API_BASE_URL` | `cross-origin` | Use `same-origin` only with a same-origin `/api` rewrite. |
| `GEMINI_API_KEY` | Optional (free) | `AIza...` | **Free tier** — enables Gemini text chat and audio transcription. Get it at `https://aistudio.google.com/api-keys`. |
| `OPENAI_API_KEY` | Optional | `sk-...` | Enables OpenAI chat/image/transcription. Image generation needs this key. |
| `ANTHROPIC_API_KEY` | Optional | `sk-ant-...` | Enables Anthropic chat. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | — | Enables Google sign-in. |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` / `MICROSOFT_TENANT` | Optional | — | Enables Microsoft sign-in. |
| `APPLE_CLIENT_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` | Optional | — | Enables Apple sign-in. |

Without AI keys the AI features return an honest "provider not configured" error.
Without OAuth values the provider buttons show a disabled state.

---

## 3. Deploy the backend (Render example)

1. Push the repo to GitHub/GitLab.
2. Render → **New Web Service** → connect the repo.
3. **Root Directory:** `PixelCraft` (if the repo root contains that folder).
4. **Runtime:** Node 20+.
5. **Build Command:** `echo "backend needs no build"` — the backend has zero npm
   dependencies, so a full `npm install` only wastes build minutes on the free plan.
   (`npm install` also works, just much slower.)
6. **Start Command:** `npm run start:server` (equivalent to `node backend/index.js`).
7. **Health Check Path:** `/health`.
8. Add the backend variables from the table above under **Environment**. Set
   `APP_URL` and `CORS_ORIGIN` to the frontend URL you are about to deploy.
9. Deploy, then confirm `https://<your-service>.onrender.com/health` returns `{"ok":true}`.

Equivalents:
- **Railway:** `railway up` in `PixelCraft`, set Start Command `npm run start:server`, add the same variables. Railway injects `PORT`.
- **VPS / pm2:** `npm install && PORT=3001 pm2 start backend/index.js --name pixelcraft-api`.
- Terminate TLS at the platform proxy; the Node server speaks plain HTTP.

---

## 4. Deploy the frontend — Vercel

1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory:** `PixelCraft`, **Framework Preset:** Vite.
3. Build Command `npm run build`, Output Directory `dist` (already in `vercel.json`).
4. Add `VITE_API_BASE_URL=https://<your-backend-origin>` in **Environment Variables**.
5. Deploy. `vercel.json` supplies the SPA fallback for routes like `/workspace` and `/account`
   while leaving `/api/*` alone.
6. Redeploy whenever `VITE_API_BASE_URL` changes — Vite embeds it at build time.

### Alternative: same-origin `/api` rewrite on Vercel

If you prefer no cross-origin calls, leave `VITE_API_BASE_URL` empty and add this
**before** the existing SPA rewrite in `vercel.json` (replace the URL):

```json
{ "source": "/api/:path*", "destination": "https://<your-backend-origin>/api/:path*" }
```

Then set `CROSS_ORIGIN_RESOURCE_POLICY=same-origin` on the backend.

---

## 5. Deploy the frontend — Netlify

1. Netlify → **Add new site → Import an existing project**.
2. **Base directory:** `PixelCraft`. `netlify.toml` sets build `npm run build`, publish `dist`, Node 20.
3. Add environment variable `VITE_API_BASE_URL=https://<your-backend-origin>`.
4. Deploy. `netlify.toml` rewrites client-side routes to `index.html`.

### Alternative: same-origin `/api` proxy on Netlify

Leave `VITE_API_BASE_URL` empty and insert this **above** the catch-all redirect in
`netlify.toml`:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://<your-backend-origin>/api/:splat"
  status = 200
```

---

## 6. OAuth provider setup for production

The redirect URI is derived from `APP_URL`, so update each provider console with the
production URL (local `localhost` entries no longer apply):

- Google: Authorized redirect URI → `https://<frontend-origin>/auth/callback`
- Microsoft: Web Redirect URI → `https://<frontend-origin>/auth/callback`
- Apple: Return URL → `https://<frontend-origin>/auth/callback`

Set `OAUTH_REDIRECT_URI` explicitly only if the callback lives on a different origin.
Restart/redeploy the backend after any env change — `.env` is read once at startup.

---

## 7. Post-deploy verification

```bash
curl https://<backend>/health
# {"ok":true}

curl -i -H 'Origin: https://<frontend-origin>' https://<backend>/api/auth/config
# Look for: HTTP/2 200, access-control-allow-origin, and the provider list.

curl -i https://<frontend-origin>/workspace
# Should serve index.html (SPA fallback), not 404.
```

In the browser: open the frontend, register/log in, run a build, then open DevTools →
Network and confirm AI/OAuth calls point to the configured backend origin (or to
`/api/...` if you used a rewrite). Check that no secret appears in any request or bundle.

---

## 8. Production caveats (important)

- **Auth is local-only.** Accounts, sessions, projects and media live in browser
  IndexedDB. They are scoped to one browser profile on one device and are cleared if
  the user clears site data. This is fine for a local/demo studio, but a real
  multi-device product needs server-side auth (Argon2/bcrypt, database, httpOnly
  signed sessions) and server-side storage.
- Per-user data scoping uses `ownerId`; legacy items without `ownerId` remain visible
  by design so existing local data is not lost.
- The backend rate limiter is per client IP; behind a proxy you may want to tune it
  or trust a forwarded-header value.
- Video export uses FFmpeg.wasm in the browser; large projects need a generous
  client memory budget. When the encoder is unavailable the app exports project JSON.
- Keep `backend/.env` out of git (`.gitignore` already covers it). Only `.env.example`
  files should be committed.
