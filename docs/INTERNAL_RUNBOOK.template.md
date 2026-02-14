# Internal Data Source Runbook (Template)

Purpose: private operational notes for maintainers.  
Do not commit provider identities, credentials, or direct upstream endpoints to public repos.

## 1) Environments
- Production backend URL:
- Production frontend URL:
- Cloudflare Worker URL (`UPSTREAM_DATA_BASE_URL`):

## 2) Secrets (store in secret manager only)
- `UPSTREAM_PROXY_TOKEN`:
- Upstream provider base URL (private):
- Cloudflare account / project:

## 3) Data Refresh Ops
- External feed sync command:
  - `python3 /Users/suhrad/Documents/FINAL/a/backend/external_feed_sync.py`
- Trigger backend cache refresh:
  - `curl -X POST https://<render-service>/refresh/all`

## 4) Validation Checklist
- CVE latest:
  - `curl "https://<render-service>/get-cves?year=<current-year>&page=1&page_size=3"`
- News endpoint:
  - `curl "https://<render-service>/news"`
- Web3 threats endpoint:
  - `curl "https://<render-service>/web3-threats"`

## 5) Incident Response
- If upstream feed is stale:
  - Check Cloudflare Worker status/logs.
  - Rotate `UPSTREAM_PROXY_TOKEN` in Worker + Render.
  - Re-run sync script and refresh caches.
- If memory spikes:
  - Verify `LOW_MEMORY_MODE=true`
  - Verify `PRELOAD_HEAVY_DATA=false`

## 6) Rotation Policy
- Rotate `UPSTREAM_PROXY_TOKEN` every 30 days.
- Rotate any provider/API credentials per provider policy.

## 7) Ownership
- Primary owner:
- Backup owner:
- Escalation channel:

