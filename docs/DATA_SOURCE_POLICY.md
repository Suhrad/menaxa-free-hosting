# Data Source Exposure Policy

Public code, client traffic, and logs must not expose direct upstream provider identities.

## Rules
- Use only proxy endpoints in application config (for example `UPSTREAM_DATA_BASE_URL`).
- Keep provider URLs and credentials in secret managers only.
- Do not include provider names/URLs in commit messages, public docs, or frontend code.
- Do not print provider URLs in runtime logs.

## Allowed Public Terms
- "upstream feed"
- "external provider"
- "proxy origin"

## Required Guardrails
- Private runbook file is kept out of git (`INTERNAL_RUNBOOK.md`).
- Cloudflare local secret files are gitignored.
- Backend env vars use neutral names (`UPSTREAM_*`).

