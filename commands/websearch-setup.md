---
description: Guided setup for web search providers — pick from Exa, Tavily, Perplexity, Firecrawl, Valyu; get keys, install official CLIs and skills, verify each one. Safe to re-run to add providers later.
argument-hint: [provider-names, e.g. "tavily exa" — omit to choose interactively]
allowed-tools: Bash, Read, Glob, Grep, AskUserQuestion
---

# /websearch-setup

Set up one or more web search providers end-to-end: API key, official CLI (where the vendor ships one), official Agent Skills, and a smoke test. Idempotent — re-running skips what's already working and only adds what's missing.

All provider facts (URLs, free tiers, install commands, smoke tests) come from `${CLAUDE_PLUGIN_ROOT}/providers.json`. Read it now — treat it as the source of truth if anything below looks stale.

## Security rules (non-negotiable)

- **Never ask the user to paste an API key into chat. Never echo, print, or log a key or any part of one.** Keys go from the provider's dashboard straight into a terminal prompt the user runs, or the user edits the env file directly.
- When the user runs a hidden-input prompt, tell them: *nothing appears as you type or paste — that's normal; press Enter when done.*
- The env file is `~/.config/elnora-websearch/.env` (`%USERPROFILE%\.config\elnora-websearch\.env` on Windows), permissions 600. Process environment always wins over the file.

## Step 1 — Detect current state

Run these checks (parallel Bash calls are fine), then summarize what's already configured before asking anything:

```bash
# Key presence — report SET/unset only, NEVER values
for v in EXA_API_KEY TAVILY_API_KEY PERPLEXITY_API_KEY FIRECRAWL_API_KEY VALYU_API_KEY; do
  if [ -n "$(eval echo \$$v)" ]; then echo "$v: set (process env)";
  elif grep -qs "^$v=" ~/.config/elnora-websearch/.env; then echo "$v: set (env file)";
  else echo "$v: NOT SET"; fi
done
# CLIs
for c in tvly firecrawl valyu; do command -v "$c" >/dev/null 2>&1 && echo "$c: $("$c" --version 2>/dev/null | head -1)" || echo "$c: not installed"; done
# Official skills in this project
ls .claude/skills/ 2>/dev/null; cat skills-lock.json 2>/dev/null
```

PowerShell equivalents when on Windows:

```powershell
foreach ($v in "EXA_API_KEY","TAVILY_API_KEY","PERPLEXITY_API_KEY","FIRECRAWL_API_KEY","VALYU_API_KEY") {
  if (Get-Item "env:$v" -ErrorAction SilentlyContinue) { "$v : set (process env)" }
  elseif (Select-String -Path "$env:USERPROFILE\.config\elnora-websearch\.env" -Pattern "^$v=" -Quiet -ErrorAction SilentlyContinue) { "$v : set (env file)" }
  else { "$v : NOT SET" }
}
foreach ($c in "tvly","firecrawl","valyu") { if (Get-Command $c -ErrorAction SilentlyContinue) { "$c : $(& $c --version 2>$null | Select-Object -First 1)" } else { "$c : not installed" } }
Get-ChildItem .claude\skills -Name -ErrorAction SilentlyContinue; Get-Content skills-lock.json -ErrorAction SilentlyContinue
```

A provider counts as **done** when its key is set (or keyless mode chosen), its CLI (if any) is on PATH, and its official skills are present. Skip done providers unless the user asks to redo them.

## Step 2 — Choose providers

If `$ARGUMENTS` names providers, set up exactly those. Otherwise use AskUserQuestion with `multiSelect: true`, one option per provider not yet fully set up:

| Option | Description (use this text) |
|---|---|
| Exa | Semantic/neural discovery — find by meaning, find-similar, entity search (companies, people, papers, code). Free: $10 credits on signup, no card (~1,000 searches). |
| Tavily | All-round agent search + extract/crawl/map. Free: 1,000 credits/month recurring, no card. Works keyless too. |
| Perplexity | Synthesized, citation-grounded answers (Sonar models). No free credits — card required, prepaid, nothing charged until you buy credits. |
| Firecrawl | Any URL → clean markdown: JS rendering, anti-bot, crawling, monitoring, search. Free: 1,000 credits/month, no card. Works keyless too. |
| Valyu | Academic/financial/biomedical corpora + deep research with file deliverables (CSV/XLSX/PPTX/DOCX/PDF). Free: $10 credits on signup, no card. |

Tell the user: the free tiers are genuinely free (only Perplexity wants a card), so grabbing all of them and comparing is a reasonable default — but setting up just one is fully supported, and the rest can be added anytime by re-running `/websearch-setup`.

## Step 3 — Per-provider setup

Run the selected providers in the order below. Each follows the same shape: key → CLI → skills → smoke test → **Checkpoint**.

### Key handling (shared pattern)

For each provider that needs a key, walk the user through:

1. Sign up at the provider's signup URL, then open the key page. Offer to open it for them: `open <url>` (macOS) / `xdg-open <url>` (Linux) / `Start-Process <url>` (Windows PowerShell).
2. Tell them exactly what free tier to expect (per-provider details below), so they know signup worked.
3. Have **the user** run this in their own terminal (substitute the right variable name). Input is hidden — nothing appears while typing/pasting:

```bash
umask 077
mkdir -p ~/.config/elnora-websearch
printf 'Paste your EXA_API_KEY (input hidden, nothing will appear): '
read -rs KEY; echo
printf 'EXA_API_KEY=%s\n' "$KEY" >> ~/.config/elnora-websearch/.env
chmod 600 ~/.config/elnora-websearch/.env
unset KEY
```

Windows (PowerShell):

```powershell
$dir = "$env:USERPROFILE\.config\elnora-websearch"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$sec = Read-Host -AsSecureString "Paste your EXA_API_KEY (input hidden)"
$plain = [System.Net.NetworkCredential]::new('', $sec).Password
Add-Content -Path "$dir\.env" -Value "EXA_API_KEY=$plain"
icacls "$dir\.env" /inheritance:r /grant:r "$env:USERNAME:(R,W)" | Out-Null
Remove-Variable sec, plain
```

Alternatively they can edit `~/.config/elnora-websearch/.env` directly — plain `KEY=value` lines, one per line, file mode 600.

Before running any smoke test below, load the file into your shell (process env still wins — only fill unset vars):

```bash
while IFS='=' read -r k v; do [ -n "$k" ] && [ -z "$(eval echo \$$k)" ] && export "$k=$v"; done < ~/.config/elnora-websearch/.env
```

```powershell
Get-Content "$env:USERPROFILE\.config\elnora-websearch\.env" -ErrorAction SilentlyContinue | ForEach-Object {
  $k,$v = $_ -split '=',2
  if ($k -and -not (Get-Item "env:$k" -ErrorAction SilentlyContinue)) { Set-Item "env:$k" $v }
}
```

### Exa

1. **Key** (`EXA_API_KEY`): signup https://dashboard.exa.ai/ → key page https://dashboard.exa.ai/api-keys. Expect $10 free credits, no card (~1,000 searches); adding a payment method later grants an extra $7/month free.
2. **CLI**: none — Exa ships skills only.
3. **Skills**: `npx skills add exa-labs/agent-skills -a claude-code -y` (installs `build-with-exa`, `exa-search`, `exa-contents` into `./.claude/skills/` and records them in `skills-lock.json`).
4. **Smoke test**:
   ```bash
   curl -sS -X POST https://api.exa.ai/search -H "x-api-key: $EXA_API_KEY" -H 'Content-Type: application/json' -d '{"query":"latest developments in battery technology","numResults":1}'
   ```
   Expect JSON with a `results` array. An `{"error": ...}` body or HTTP 401 means the key is wrong — have the user re-check and re-append it.

**Checkpoint: Exa — key set, skills installed, smoke test returned results.**

### Tavily

1. **Keyless option**: `tvly search` and `tvly extract` work with no key under a fair-use cap. Offer try-before-key: install the CLI (step 3) and run the smoke test with no key. Recommend a key anyway — 1,000 free credits/month recurring.
2. **Key** (`TAVILY_API_KEY`): signup https://app.tavily.com → API Keys section on the dashboard home. Keys are prefixed `tvly-`. Expect 1,000 free credits every month, no card.
3. **CLI** (`tvly`, PyPI package `tavily-cli` — the npm package of the same name is a third-party squatter, never install it):
   ```bash
   uv tool install tavily-cli || pipx install tavily-cli || python3 -m pip install --user tavily-cli
   ```
   ```powershell
   uv tool install tavily-cli; if (-not $?) { pipx install tavily-cli }; if (-not $?) { python -m pip install --user tavily-cli }
   ```
   Vendor script fallback (macOS/Linux only): `curl -fsSL https://cli.tavily.com/install.sh | bash`. Verify: `tvly --version`.
4. **Skills**: `npx skills add tavily-ai/skills -a claude-code -y` (tavily-cli, tavily-search, tavily-extract, tavily-crawl, tavily-map, tavily-research, tavily-dynamic-search, tavily-best-practices).
5. **Smoke test**:
   ```bash
   tvly search "what is retrieval augmented generation" --json | head -c 400
   ```
   Expect JSON results, exit 0. Works even without a key (keyless mode) — if the key is set and this fails with an auth error, the key is wrong.

**Checkpoint: Tavily — CLI on PATH, skills installed, smoke test returned results (keyed or keyless).**

### Perplexity

Special case: Perplexity ships no official CLI and no official skills (their official Claude Code plugin is MCP-only), so this plugin bundles its own curl-based skills over the official Sonar API — already present in `skills/perplexity/`, nothing to install. Only the key and smoke test remain.

1. **Key** (`PERPLEXITY_API_KEY`): signup https://console.perplexity.ai — create an API Group first, then the API Keys tab. **The key is shown only once — copy it immediately.** Warn up front: **a credit card is required** at setup (prepaid billing; nothing is charged until they buy credits), and new accounts are **Tier 0**: 50 requests/min on Sonar models, 5 requests/min on `sonar-deep-research`.
2. **Smoke test**:
   ```bash
   curl -sS https://api.perplexity.ai/chat/completions -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H 'Content-Type: application/json' -d '{"model":"sonar","messages":[{"role":"user","content":"In one sentence: what is CRISPR?"}]}'
   ```
   Expect JSON with `choices[0].message.content` plus a citations/search_results field. HTTP 401 = wrong key.

**Checkpoint: Perplexity — key set, smoke test returned a cited answer. Bundled skills active via this plugin.**

### Firecrawl

1. **Keyless option**: search/scrape work keyless at low volume. Offer try-before-key, but a key is preferred — 1,000 free credits/month recurring, no card (scrape = 1 credit/page, search = 2 per 10 results).
2. **Key** (`FIRECRAWL_API_KEY`): signup https://www.firecrawl.dev/signup → https://www.firecrawl.dev/app/api-keys. Or skip the page entirely: after installing the CLI, `firecrawl login --browser` provisions a key without visiting the dashboard.
3. **CLI** (`firecrawl`, npm package `firecrawl-cli` — the npm package named `firecrawl` is the SDK, not the CLI):
   ```bash
   npm install -g firecrawl-cli
   ```
   Same command on Windows. Verify: `firecrawl --version`.
4. **Skills**: `firecrawl setup skills --agent claude-code` (installs the firecrawl skill family via the vendor's own installer).
5. **Smoke test**:
   ```bash
   firecrawl --status
   ```
   Expect version, "Authenticated via FIRECRAWL_API_KEY" (or keyless), and remaining credits.

**Do NOT run `firecrawl setup defaults`** unless the user explicitly asks for it after you explain the trade-off: it makes Firecrawl claim ALL web operations and disables Claude Code's native WebFetch/WebSearch. In this multi-provider bundle the `websearch` routing skill arbitrates instead. Mention it exists as an opt-in extra; default is off.

**Checkpoint: Firecrawl — CLI on PATH, skills installed, `firecrawl --status` shows auth (or keyless) and credits.**

### Valyu

1. **Key** (`VALYU_API_KEY`): signup https://platform.valyu.ai (API keys in the dashboard). Expect $10 free credits on signup, no card ($20 reported with a work-email signup). After installing the CLI, `valyu login` can also store the key for CLI use.
2. **CLI** (`valyu`):
   ```bash
   npm install -g @valyu/cli || curl -fsSL https://get.valyu.ai | bash
   ```
   ```powershell
   npm install -g @valyu/cli; if (-not $?) { irm https://get.valyu.ai/install.ps1 | iex }
   ```
   Verify: `valyu --version`.
3. **Skills**: `npx skills add @valyu/cli -a claude-code -y` (installs `valyu-cli`).
4. **Smoke test**:
   ```bash
   valyu search web "CRISPR base editing review" --json | head -c 400
   ```
   Expect JSON results, exit 0. On auth failures run `valyu doctor`.

**Checkpoint: Valyu — key set, CLI on PATH, skill installed, smoke test returned results.**

## Step 4 — Finish

Present a summary table:

| Provider | Key | CLI | Skills | Smoke test |
|---|---|---|---|---|
| ... | set / env file / keyless / — | version or — | installed / bundled / — | pass / fail / skipped |

Then remind the user:

- `/websearch-status` — health check anytime (`--live` runs smoke tests and credit checks).
- `/websearch-update` — bring every installed CLI and skill to its latest official release.
- Skipped providers can be added anytime by re-running `/websearch-setup`.
- The `websearch` skill routes each search task to the best configured provider automatically.
