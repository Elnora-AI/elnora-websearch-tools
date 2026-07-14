---
description: Read-only health check across all five web search providers — key presence, CLI versions, installed skills. Pass --live to also run smoke tests and credit checks.
argument-hint: [--live]
allowed-tools: Bash, Read, Glob, Grep
---

# /websearch-status

Report the health of every provider in the bundle. Read-only: no installs, no config changes, and **never print an API key or any part of one** — presence only.

Provider facts (env vars, smoke tests) live in `${CLAUDE_PLUGIN_ROOT}/providers.json`.

## Step 1 — Collect state (always)

Run in parallel where possible:

```bash
# Key presence — SET/unset only, never values. Process env wins over the file.
for v in EXA_API_KEY TAVILY_API_KEY PERPLEXITY_API_KEY FIRECRAWL_API_KEY VALYU_API_KEY; do
  if [ -n "$(eval echo \$$v)" ]; then echo "$v: set (process env)";
  elif grep -qs "^$v=" ~/.config/elnora-websearch/.env; then echo "$v: set (env file)";
  else echo "$v: NOT SET"; fi
done
# CLIs + versions
for c in tvly firecrawl valyu; do command -v "$c" >/dev/null 2>&1 && echo "$c: $("$c" --version 2>/dev/null | head -1)" || echo "$c: not installed"; done
# Official skills in this project
ls .claude/skills/ 2>/dev/null; cat skills-lock.json 2>/dev/null
```

```powershell
foreach ($v in "EXA_API_KEY","TAVILY_API_KEY","PERPLEXITY_API_KEY","FIRECRAWL_API_KEY","VALYU_API_KEY") {
  if (Get-Item "env:$v" -ErrorAction SilentlyContinue) { "$v : set (process env)" }
  elseif (Select-String -Path "$env:USERPROFILE\.config\elnora-websearch\.env" -Pattern "^$v=" -Quiet -ErrorAction SilentlyContinue) { "$v : set (env file)" }
  else { "$v : NOT SET" }
}
foreach ($c in "tvly","firecrawl","valyu") { if (Get-Command $c -ErrorAction SilentlyContinue) { "$c : $(& $c --version 2>$null | Select-Object -First 1)" } else { "$c : not installed" } }
Get-ChildItem .claude\skills -Name -ErrorAction SilentlyContinue; Get-Content skills-lock.json -ErrorAction SilentlyContinue
```

Skill presence per provider:

- Exa: `exa-search` / `exa-contents` / `build-with-exa` in `.claude/skills/` or `skills-lock.json`
- Tavily: `tavily-*` skills in `.claude/skills/` or `skills-lock.json`
- Perplexity: bundled in this plugin (`skills/perplexity/`) — always present, mark "bundled"
- Firecrawl: `firecrawl*` skills in `.claude/skills/` (installed by `firecrawl setup skills`, not lock-managed)
- Valyu: `valyu-cli` in `.claude/skills/` or `skills-lock.json`

## Step 2 — Live checks (only with `--live`)

If `$ARGUMENTS` contains `--live`, first load the env file into the shell (unset vars only — process env wins):

```bash
while IFS='=' read -r k v; do [ -n "$k" ] && [ -z "$(eval echo \$$k)" ] && export "$k=$v"; done < ~/.config/elnora-websearch/.env
```

Then run each configured provider's smoke test and credit check. Skip providers with no key and no keyless mode.

| Provider | Smoke test | Credit check |
|---|---|---|
| Exa | `curl -sS -X POST https://api.exa.ai/search -H "x-api-key: $EXA_API_KEY" -H 'Content-Type: application/json' -d '{"query":"latest developments in battery technology","numResults":1}'` | — (dashboard only) |
| Tavily | `tvly search "what is retrieval augmented generation" --json \| head -c 400` (works keyless) | `tvly usage` |
| Perplexity | `curl -sS https://api.perplexity.ai/chat/completions -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H 'Content-Type: application/json' -d '{"model":"sonar","messages":[{"role":"user","content":"In one sentence: what is CRISPR?"}]}'` | — (console only) |
| Firecrawl | `firecrawl --status` (works keyless) | included in `--status` output |
| Valyu | `valyu search web "CRISPR base editing review" --json \| head -c 400` | `valyu account` (on auth failure: `valyu doctor`) |

Interpretation: HTTP 401 or an auth error = bad/expired key. Exa error body `{"error": ...}` = bad key. Tavily/Firecrawl succeeding without a key = keyless fair-use mode, note it as such.

## Step 3 — Report

| Provider | Key | CLI | Skills | Live check |
|---|---|---|---|---|
| Exa | set / NOT SET | — (no CLI) | installed / missing | pass / fail / skipped |
| Tavily | set / NOT SET / keyless | version / not installed | installed / missing | pass (+credits) / fail |
| Perplexity | set / NOT SET | — (no CLI) | bundled | pass / fail / skipped |
| Firecrawl | set / NOT SET / keyless | version / not installed | installed / missing | pass (+credits) / fail |
| Valyu | set / NOT SET | version / not installed | installed / missing | pass / fail / skipped |

Close with one line per bucket:

- **Usable right now**: providers whose key is set (or keyless mode works) AND required tooling is present.
- **Partially set up**: something missing — name the missing piece and the fix (`/websearch-setup` for installs/keys, `/websearch-update` for stale components).
- **Not set up**: point at `/websearch-setup`.
