# Deploy Menaxa For Free (Vercel + Render)

## 1) Create a clean git repo from this `a/` folder

```bash
cd /Users/suhrad/Documents/FINAL/a
git init
git add .
git commit -m "Prepare deploy (Vercel + Render)"
```

Push this repo to GitHub.

## 2) Deploy backend (FastAPI) on Render Free

1. In Render, click **New +** -> **Blueprint**.
2. Connect the GitHub repo you pushed.
3. Render will read `render.yaml` and create `menaxa-api`.
4. Wait for deploy to finish and copy backend URL:
   `https://<your-render-service>.onrender.com`

## 3) Deploy frontend (Next.js) on Vercel Hobby

1. In Vercel, click **Add New...** -> **Project**.
2. Import the same GitHub repo.
3. Set **Root Directory** to `a`.
4. Add env var:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://<your-render-service>.onrender.com`
5. Deploy.

## 4) Redeploy frontend if backend URL changes

If Render URL changes, update `NEXT_PUBLIC_API_BASE_URL` in Vercel and redeploy.

## 5) Optional health check

After both deploy:
- Open frontend URL and verify pages load.
- Confirm backend API responds:

```bash
curl https://<your-render-service>.onrender.com/news
```

## 6) Hide upstream provider with Cloudflare Worker proxy (recommended)

This keeps the real data source out of your app/network logs.

```bash
cd /Users/suhrad/Documents/FINAL/a/cloudflare/upstream-proxy
npx wrangler login
npx wrangler secret put ORIGIN_BASE_URL
# Paste real upstream base URL when prompted (example: https://data.cybermonit.com)
npx wrangler secret put UPSTREAM_PROXY_TOKEN
# Paste a long random token
npx wrangler deploy
```

After deploy, note the Worker URL (example: `https://menaxa-upstream-proxy.<subdomain>.workers.dev`) and set these on Render:

- `UPSTREAM_DATA_BASE_URL=https://<your-worker-domain>`
- `UPSTREAM_PROXY_TOKEN=<same-token-you-set-in-worker-secret>`

Then redeploy Render.
