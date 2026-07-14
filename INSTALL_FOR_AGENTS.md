# INSTALL_FOR_AGENTS.md — `websearch` setup

A gated runbook for an AI agent installing websearch capability for a user. Do the steps **in order**. Stop at each checkpoint for the user to act or confirm — you cannot sign up for an API key on their behalf. Never paste a key into chat; never echo a key. If a step fails, use the failure interpretations and Troubleshooting before proceeding; if still stuck, stop and report.

All five providers are **optional and independent**. Steps 4a–4e are each fully self-contained — do only the ones the user chose, in any order.

If you have a browser tool (Chrome DevTools MCP, Playwright, …), **offer to drive** every signup/dashboard page: "I can open and walk this page for you, or you can do it and tell me when it's done." Never type a key into a page or read one off the screen into chat.

---

## Step 0 — Prerequisites

Confirm, in one pass:

```sh
node --version    # need >= 20 (npx skills and the npm-based CLIs require it)
npm --version
```

Windows / PowerShell: same commands.

- **Node.js >= 20 + npm** — required (skills installer, Firecrawl CLI, Valyu CLI).
- **Python 3.10+** — required **only if the user chooses Tavily** (its CLI is on PyPI). Check with `python3 --version` (macOS/Linux) or `python --version` (Windows).
- **git is NOT required.**
- Network access to npmjs.com, pypi.org, github.com, and the five provider domains.

**Checkpoint:** Node >= 20 confirmed. If missing or older, have the user install Node 20+ before continuing.

---

## Step 1 — Add the marketplace

Run, as a Claude Code slash command:

```
/plugin marketplace add Elnora-AI/elnora-websearch-tools
```

**Checkpoint:** the marketplace `elnora-websearch-tools` appears in `/plugin`. If not, stop.

---

## Step 2 — Install the plugin

```
/plugin install websearch@elnora-websearch-tools
```

**Checkpoint:** `/plugin` lists `websearch` as enabled, and `/websearch-setup`, `/websearch-status`, `/websearch-update` show up as available commands. If not, stop.

---

## Step 3 — Provider selection

Ask the user which providers to set up. Present the table and **encourage collecting every free tier** — four of the five cost nothing to activate, and the routing skill gets better with each provider it can route to. A one-provider minimal install is fully supported: if the user wants exactly one all-rounder, Tavily is the default suggestion (strongest recurring free tier, works keyless before a key exists).

| Provider | What you get free | Card needed? |
|---|---|---|
| Exa | $10 credits on signup (~1,000 searches); +$7/month if a payment method is on file | No |
| Tavily | 1,000 API credits **every month**, recurring; keyless fair-use mode even without a key | No |
| Perplexity | Nothing free — prepaid credits; nothing charged until you buy credits | Yes (at setup) |
| Firecrawl | 1,000 credits/month, recurring (scrape = 1/page, search = 2 per 10 results); keyless low-volume mode | No |
| Valyu | $10 credits on signup ($20 reported with a work-email signup) | No |

**Checkpoint:** the user has named their subset. Do only those provider steps below.

> **Hidden-paste note (applies to every key-saving block below):** when the user pastes a key at a hidden terminal prompt they will see **nothing** — no characters, no dots. That is hidden input working, not a bug. Paste once, press Enter. In the `printf`/`Add-Content` blocks below, the user replaces the `PASTE_YOUR_…` placeholder themselves — the key must never pass through the chat.

---

## Step 4a — Exa (skip unless chosen)

Semantic/neural search. No CLI — REST API + official vendor skills.

### Get the key

1. Sign up at [https://dashboard.exa.ai/](https://dashboard.exa.ai/) *(offer to drive)*. Free: $10 credits, no card.
2. Open [https://dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys) — a table of keys with a **Create key** button; the new key is shown once with a copy icon.
3. The user copies the key. **Do not have them paste it into chat.**

### Save the key

macOS / Linux:

```sh
mkdir -p ~/.config/elnora-websearch
umask 077
printf 'EXA_API_KEY=%s\n' 'PASTE_YOUR_EXA_KEY' >> ~/.config/elnora-websearch/.env
chmod 600 ~/.config/elnora-websearch/.env
```

Windows / PowerShell:

```powershell
$dir = "$env:USERPROFILE\.config\elnora-websearch"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Add-Content "$dir\.env" "EXA_API_KEY=PASTE_YOUR_EXA_KEY"
```

Alternatively export `EXA_API_KEY` as an environment variable — the environment always wins over the file.

### Install the official skills

From the project directory (writes to the project's `.claude/skills/` + `skills-lock.json`):

```sh
npx skills add exa-labs/agent-skills -a claude-code -y
```

Installs `build-with-exa`, `exa-search`, `exa-contents` — Exa's own skills from Exa's own repo.

### Smoke test

```sh
curl -sS -X POST https://api.exa.ai/search -H "x-api-key: $EXA_API_KEY" -H 'Content-Type: application/json' -d '{"query":"latest developments in battery technology","numResults":1}'
```

(PowerShell: same `curl.exe` command with `"x-api-key: $env:EXA_API_KEY"`; source the env file variable first if it is not exported.)

Expected: JSON with a `results` array containing one hit.

Failures:
- HTTP 401 or an `{"error": ...}` body → the key is wrong or was pasted with whitespace; re-copy from the dashboard.
- `curl: (6)` / `(7)` / timeout → network or proxy problem, not the key. See Troubleshooting.
- Empty `results` → the key works; nothing to fix.

**Checkpoint:** the smoke test returned a `results` array.

---

## Step 4b — Tavily (skip unless chosen)

All-round search + extract/crawl/map. Python CLI (`tvly`) + official vendor skills. Works keyless before the key exists — but get the key, the free tier is recurring.

### Get the key

1. Sign up at [https://app.tavily.com](https://app.tavily.com) *(offer to drive)*. Free: 1,000 credits/month, recurring, no card.
2. The key is on the dashboard home, in the **API Keys** section — keys are prefixed `tvly-`, with a copy button.

### Save the key

macOS / Linux:

```sh
mkdir -p ~/.config/elnora-websearch
umask 077
printf 'TAVILY_API_KEY=%s\n' 'PASTE_YOUR_tvly_KEY' >> ~/.config/elnora-websearch/.env
chmod 600 ~/.config/elnora-websearch/.env
```

Windows / PowerShell:

```powershell
$dir = "$env:USERPROFILE\.config\elnora-websearch"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Add-Content "$dir\.env" "TAVILY_API_KEY=PASTE_YOUR_tvly_KEY"
```

### Install the official CLI

The CLI is `tavily-cli` on **PyPI**. The npm package of the same name is a **third-party squatter — never install it**. Fallback chain, first hit wins:

macOS / Linux:

```sh
uv tool install tavily-cli || pipx install tavily-cli || python3 -m pip install --user tavily-cli
```

(Vendor's own installer script as a last resort: `curl -fsSL https://cli.tavily.com/install.sh | bash`)

Windows / PowerShell:

```powershell
uv tool install tavily-cli; if (-not $?) { pipx install tavily-cli }; if (-not $?) { python -m pip install --user tavily-cli }
```

Verify: `tvly --version` prints a version.

### Install the official skills

```sh
npx skills add tavily-ai/skills -a claude-code -y
```

Installs Tavily's own skills (`tavily-search`, `tavily-extract`, `tavily-crawl`, `tavily-map`, `tavily-research`, and more) from Tavily's own repo (MIT).

### Smoke test

```sh
tvly search "what is retrieval augmented generation" --json | head -c 400
```

(PowerShell: `tvly search "what is retrieval augmented generation" --json` — omit the `head`.)

Expected: JSON with results, exit code 0. **Note:** this works even without a key (keyless fair-use mode), so a passing test does not by itself prove the key is loaded — an auth error message in the output does prove the key is wrong.

Failures:
- `command not found` / not recognized → the pip/pipx/uv bin dir is not on PATH. See Troubleshooting.
- Auth/401-style error in output → key mispasted; re-check the `.env` line starts `TAVILY_API_KEY=tvly-`.
- Network errors → proxy; see Troubleshooting.

**Checkpoint:** `tvly --version` works and the search returned JSON results.

---

## Step 4c — Perplexity (skip unless chosen)

Citation-grounded answers via the Sonar API. Perplexity ships **no official CLI and no official skills** (their official Claude Code plugin is MCP-only), so this plugin bundles its own curl-based skills over the official API — [`skills/perplexity/`](skills/perplexity/). Nothing extra to install.

### Get the key

1. Sign up at [https://console.perplexity.ai](https://console.perplexity.ai) *(offer to drive)*.
2. **Warn the user first:** there are no free API credits. Billing is prepaid — a credit card is required at setup, but **nothing is charged until they buy credits**. New accounts are Tier 0: 50 requests/min on Sonar models, 5/min on `sonar-deep-research`.
3. In the console: create an **API Group** first, then open the **API Keys** tab and create a key. **The key is shown only once** — copy it immediately.

### Save the key

macOS / Linux:

```sh
mkdir -p ~/.config/elnora-websearch
umask 077
printf 'PERPLEXITY_API_KEY=%s\n' 'PASTE_YOUR_PPLX_KEY' >> ~/.config/elnora-websearch/.env
chmod 600 ~/.config/elnora-websearch/.env
```

Windows / PowerShell:

```powershell
$dir = "$env:USERPROFILE\.config\elnora-websearch"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Add-Content "$dir\.env" "PERPLEXITY_API_KEY=PASTE_YOUR_PPLX_KEY"
```

### Smoke test

```sh
curl -sS https://api.perplexity.ai/chat/completions -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H 'Content-Type: application/json' -d '{"model":"sonar","messages":[{"role":"user","content":"In one sentence: what is CRISPR?"}]}'
```

Expected: JSON with `choices[0].message.content` and a `citations`/`search_results` field.

Failures:
- HTTP 401 → key wrong, revoked, or the `Bearer ` prefix got mangled.
- HTTP 402 / a billing error → the account has no credits yet; the user must buy credits in the console.
- HTTP 429 → Tier 0 rate limit; wait a minute and retry.
- Network errors → proxy; see Troubleshooting.

**Checkpoint:** the smoke test returned an answer with citations.

---

## Step 4d — Firecrawl (skip unless chosen)

URL → clean markdown, crawling, site maps, plus search. npm CLI (`firecrawl`) whose own installer also installs the official skills.

### Get the key

1. Sign up at [https://www.firecrawl.dev/signup](https://www.firecrawl.dev/signup) *(offer to drive)*. Free: 1,000 credits/month, recurring, no card.
2. Keys live at [https://www.firecrawl.dev/app/api-keys](https://www.firecrawl.dev/app/api-keys) — a keys table with a **Create API key** button.
3. Alternative that skips the dashboard entirely: after installing the CLI below, `firecrawl login --browser` opens the browser and provisions a key into the CLI's own auth store.

### Save the key

(Skip if the user chose `firecrawl login --browser`.)

macOS / Linux:

```sh
mkdir -p ~/.config/elnora-websearch
umask 077
printf 'FIRECRAWL_API_KEY=%s\n' 'PASTE_YOUR_FC_KEY' >> ~/.config/elnora-websearch/.env
chmod 600 ~/.config/elnora-websearch/.env
```

Windows / PowerShell:

```powershell
$dir = "$env:USERPROFILE\.config\elnora-websearch"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Add-Content "$dir\.env" "FIRECRAWL_API_KEY=PASTE_YOUR_FC_KEY"
```

### Install the official CLI

The CLI package is `firecrawl-cli` — the npm package named `firecrawl` is the SDK, not the CLI:

```sh
npm install -g firecrawl-cli
```

(Same command on Windows.) Verify: `firecrawl --version`.

### Install the official skills

Firecrawl's CLI installs its own skills:

```sh
firecrawl setup skills --agent claude-code
```

Installs the vendor's skill set (`firecrawl`, `firecrawl-scrape`, `firecrawl-search`, `firecrawl-crawl`, `firecrawl-map`, and more).

**Never run `firecrawl setup defaults`** unless the user explicitly wants Firecrawl to own **every** web operation — it claims all web tasks and displaces the other providers. In this bundle, the `websearch` routing skill is the arbiter.

### Smoke test

```sh
firecrawl --status
```

Expected: version, `Authenticated via FIRECRAWL_API_KEY` (or a keyless notice), and remaining credits.

Failures:
- `command not found` → npm global bin dir not on PATH; see Troubleshooting.
- Shows keyless when a key was saved → the env var is not loaded in this shell; export it or restart the session.
- Auth error → key mispasted; re-copy.

**Checkpoint:** `firecrawl --status` shows authenticated (or the user knowingly chose keyless) and the skills were installed.

---

## Step 4e — Valyu (skip unless chosen)

Proprietary/academic/financial/biomedical corpora + deep research with deliverables. npm CLI (`valyu`) + official vendor skill.

### Get the key

1. Sign up at [https://platform.valyu.ai](https://platform.valyu.ai) *(offer to drive)*. Free: $10 credits, no card ($20 reported with a work-email signup).
2. API keys are in the platform dashboard. Alternative: after installing the CLI, `valyu login` stores a key for the CLI itself.

### Save the key

macOS / Linux:

```sh
mkdir -p ~/.config/elnora-websearch
umask 077
printf 'VALYU_API_KEY=%s\n' 'PASTE_YOUR_VALYU_KEY' >> ~/.config/elnora-websearch/.env
chmod 600 ~/.config/elnora-websearch/.env
```

Windows / PowerShell:

```powershell
$dir = "$env:USERPROFILE\.config\elnora-websearch"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Add-Content "$dir\.env" "VALYU_API_KEY=PASTE_YOUR_VALYU_KEY"
```

### Install the official CLI

macOS / Linux (fallback chain):

```sh
npm install -g @valyu/cli || curl -fsSL https://get.valyu.ai | bash
```

Windows / PowerShell:

```powershell
npm install -g @valyu/cli; if (-not $?) { irm https://get.valyu.ai/install.ps1 | iex }
```

Verify: `valyu --version`.

### Install the official skill

```sh
npx skills add @valyu/cli -a claude-code -y
```

Installs `valyu-cli` — the vendor's skill, bundled in their npm package (MIT).

### Smoke test

```sh
valyu search web "CRISPR base editing review" --json | head -c 400
```

(PowerShell: omit the `head`.)

Expected: JSON results, exit code 0.

Failures:
- `command not found` → npm global bin dir not on PATH; see Troubleshooting.
- Auth error → run `valyu doctor` — it diagnoses auth problems and names the fix.
- Network errors → proxy; see Troubleshooting.

**Checkpoint:** the search returned JSON results.

---

## Step 5 — Verify everything

```
/websearch-status --live
```

This fires one real (cheapest possible) call per configured provider. Interpret:

- **configured + live OK** — done for that provider.
- **configured + live FAIL** — the key is present but rejected: re-do that provider's key step; for Perplexity also consider missing credits, for Valyu run `valyu doctor`.
- **not configured** — the env var is absent from both the environment and `~/.config/elnora-websearch/.env`; expected for providers the user skipped. Tavily/Firecrawl may still report keyless operation.

**Checkpoint:** every provider the user chose reports live OK.

---

## Troubleshooting

- **`command not found` after `npm install -g`** — the npm global bin dir is not on PATH. Find it with `npm prefix -g` (`npm bin -g` was removed in npm 9): the bin dir is `$(npm prefix -g)/bin` on macOS/Linux and the prefix path itself on Windows. Add it to PATH, restart the shell, retry.
- **`uv` and `pipx` both missing (Tavily)** — fall back to `python3 -m pip install --user tavily-cli` (Windows: `python -m pip install --user tavily-cli`), then make sure pip's user bin dir (`python3 -m site --user-base` + `/bin`, or `%APPDATA%\Python\...\Scripts` on Windows) is on PATH.
- **`npx skills` fails immediately** — it requires Node >= 20. `node --version`, upgrade if older.
- **Firecrawl dashboard signup is a hassle** — `firecrawl login --browser` provisions a key without visiting the key page.
- **Windows: `irm ... | iex` blocked** — PowerShell execution policy. Run in an elevated or user-scoped session: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, then retry the installer, or use the npm install path instead.
- **Corporate proxy** — npm/pip/curl all need the proxy set: `HTTPS_PROXY`/`HTTP_PROXY` env vars, plus `npm config set proxy`/`https-proxy` and pip's `--proxy`. TLS-intercepting proxies may also need the corporate CA (`NODE_EXTRA_CA_CERTS`, `REQUESTS_CA_BUNDLE`).
- **A smoke test fails with connection errors but the key looks right** — test plain connectivity first (`curl -sS https://api.tavily.com` etc.); if that fails it is network, not credentials.

---

## Completion checklist

- [ ] Node >= 20 confirmed (and Python 3.10+ if Tavily chosen)
- [ ] Marketplace added; `websearch` plugin installed and enabled
- [ ] User chose their provider subset (free tiers offered)
- [ ] For each chosen provider: key saved to `~/.config/elnora-websearch/.env` (0600, never through chat), official CLI installed (where one exists), official skills installed, smoke test passed
- [ ] `firecrawl setup defaults` was **not** run (unless explicitly requested)
- [ ] `/websearch-status --live` green for every chosen provider
- [ ] No key was ever echoed, logged, or pasted into chat

---

## Handoff summary

Report to the user:

1. **What's installed** — which providers are live, which CLIs (`tvly`, `firecrawl`, `valyu`) and which skill sets (vendor skills in the project's `.claude/skills/`, plus the plugin's `websearch` router and `perplexity` skills).
2. **What each provider is for** — one line each: Exa = semantic discovery/find-similar/entity search; Tavily = all-round search + extract/crawl/map; Perplexity = cited synthesized answers; Firecrawl = URL → markdown, crawling, site maps; Valyu = SEC/academic/biomedical corpora + deep research with file deliverables.
3. **What was skipped and how to add it later** — name the skipped providers and that a re-run of `/websearch-setup` (or the matching Step 4x above) adds any of them at any time.
4. **Maintenance** — `/websearch-update` keeps every vendor CLI and skill on the vendors' latest releases; `/websearch-status --live` re-verifies keys.
