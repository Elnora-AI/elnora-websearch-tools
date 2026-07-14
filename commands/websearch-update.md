---
description: Update every installed web search component to its latest official release — provider CLIs, official skills, and a reminder for the plugin itself. Non-interactive; only touches what is installed.
argument-hint: [provider-names to limit scope, e.g. "firecrawl" — omit for all]
allowed-tools: Bash, Read, Glob, Grep
---

# /websearch-update

Bring every installed provider CLI and official skill set to its latest release. Update commands come from `${CLAUDE_PLUGIN_ROOT}/providers.json` — read it if anything below looks stale. Run non-interactively; only stop to ask if a step fails.

**Only touch what is actually installed.** Never install a provider the user hasn't set up — that's `/websearch-setup`'s job.

## Step 1 — Detect installed components and record BEFORE versions

```bash
for c in tvly firecrawl valyu; do command -v "$c" >/dev/null 2>&1 && echo "$c BEFORE: $("$c" --version 2>/dev/null | head -1)" || echo "$c: not installed (skip)"; done
cat skills-lock.json 2>/dev/null
ls .claude/skills/ 2>/dev/null
```

```powershell
foreach ($c in "tvly","firecrawl","valyu") { if (Get-Command $c -ErrorAction SilentlyContinue) { "$c BEFORE: $(& $c --version 2>$null | Select-Object -First 1)" } else { "$c : not installed (skip)" } }
Get-Content skills-lock.json -ErrorAction SilentlyContinue; Get-ChildItem .claude\skills -Name -ErrorAction SilentlyContinue
```

If `$ARGUMENTS` names providers, limit everything below to those.

## Step 2 — Update CLIs (only the installed ones)

**Tavily** (`tvly` present):

```bash
uv tool upgrade tavily-cli || pipx upgrade tavily-cli || python3 -m pip install --user -U tavily-cli
```

```powershell
uv tool upgrade tavily-cli; if (-not $?) { pipx upgrade tavily-cli }; if (-not $?) { python -m pip install --user -U tavily-cli }
```

Use the same installer that installed it (uv tool → pipx → pip, first that succeeds).

**Firecrawl** (`firecrawl` present) — upgrade the CLI, then re-run the vendor's skill installer so the skills match the new CLI:

```bash
npm install -g firecrawl-cli@latest && firecrawl setup skills --agent claude-code
```

Same on Windows.

**Valyu** (`valyu` present):

```bash
valyu upgrade
```

**Exa / Perplexity**: no CLI — nothing to do here. Perplexity's skills are bundled in this plugin and update with it (Step 4).

## Step 3 — Update skills-lock-managed skills

If `skills-lock.json` exists in the project (Exa, Tavily, Valyu official skills are managed there):

```bash
npx skills update
```

Firecrawl's skills are NOT in the lock file — they were refreshed by `firecrawl setup skills --agent claude-code` in Step 2.

## Step 4 — Record AFTER versions and report

Re-run the version checks from Step 1, then present:

| Component | Before | After |
|---|---|---|
| tvly | x.y.z | x.y.z |
| firecrawl | x.y.z | x.y.z |
| valyu | x.y.z | x.y.z |
| skills (lock-managed) | per `npx skills update` output | latest |
| firecrawl skills | — | refreshed with CLI |

Flag anything that failed to update, with the exact error.

Finally, note: the plugin itself (this command, the routing skill, the bundled Perplexity skills) updates via Claude Code's marketplace mechanism — run `/plugin marketplace update` periodically or when a new release is announced.
