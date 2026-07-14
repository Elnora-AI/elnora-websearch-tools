# Safety guardrails

This plugin wires up web search from five providers. Its honest trust model: **this repo's own code is small and auditable; the CLIs and skills it installs are the vendors' own, fetched from the vendors' own channels at your request.** The sections below spell out exactly what runs, what connects where, and what you are trusting.

## Nothing leaves your machine except to the five provider APIs

The plugin's own commands and skills talk, over **HTTPS only**, to:

- `api.exa.ai` (Exa)
- `api.tavily.com` (Tavily)
- `api.perplexity.ai` (Perplexity)
- `api.firecrawl.dev` (Firecrawl)
- `api.valyu.network` (Valyu)

Setup and update additionally reach the vendors' official distribution channels, and only when you run them: the npm registry (`firecrawl-cli`, `@valyu/cli`, the `skills` installer), PyPI (`tavily-cli`), the vendors' installer endpoints (`cli.tavily.com`, `get.valyu.ai`), and GitHub (`exa-labs/agent-skills`, `tavily-ai/skills`). The vendor CLIs themselves call their own provider's API listed above. This repo adds no telemetry, no analytics, and no endpoint of its own.

## Credentials

- Keys live in one file: `~/.config/elnora-websearch/.env` (`%USERPROFILE%\.config\elnora-websearch\.env` on Windows), created with `umask 077` / mode 0600, plain `KEY=value` lines.
- **The process environment always wins** — the file is only read to fill variables that are unset.
- No command or skill in this repo ever echoes, logs, or prints a key; smoke tests reference keys as `$VAR`, never as values.
- Keys are never committed: the repo's CI secret guard plus gitleaks fail the build if anything key-shaped enters the tracked tree, and the `.env` lives outside any repo to begin with.
- Two providers degrade gracefully without a key (Tavily and Firecrawl have keyless low-volume modes); the rest simply stay unconfigured.

## Third-party code, plainly

**This repository redistributes no vendor code.** What it ships is its own: a routing skill, curl-based Perplexity skills, setup/update/status commands, and `providers.json`. When you run setup, it installs — at your explicit request — each chosen vendor's official tooling from the vendor's official channel:

| What | Channel |
|---|---|
| Tavily CLI (`tvly`) | PyPI `tavily-cli` (or the vendor's `cli.tavily.com` install script) |
| Firecrawl CLI (`firecrawl`) | npm `firecrawl-cli` |
| Valyu CLI (`valyu`) | npm `@valyu/cli` (or the vendor's `get.valyu.ai` install script) |
| Exa skills | `npx skills add exa-labs/agent-skills` (vendor's repo, vendor's installer) |
| Tavily skills | `npx skills add tavily-ai/skills` (MIT) |
| Firecrawl skills | `firecrawl setup skills --agent claude-code` (the vendor CLI installs its own skills; ISC) |
| Valyu skill | `npx skills add @valyu/cli` (bundled in the vendor's npm package; MIT) |

What that means for trust: **you are trusting each vendor exactly as much as if you had installed their tool directly** — no more, no less. This plugin adds convenience and a consistent key convention; it does not vet, patch, or sandbox vendor code.

License note: Exa's `agent-skills` repo carries **no LICENSE file**. It is installed onto your machine by the vendor's own installer at your request and is never redistributed by this repo. If that matters for your organization, skip Exa's skills and use its REST API directly.

Perplexity is the one exception in the other direction: they ship no CLI and no skills, so the `skills/perplexity/` skills in this repo are ours — thin curl wrappers over their official API, Apache-2.0 like the rest of the repo.

## Vendor telemetry disclosure

- **Firecrawl CLI** collects telemetry per its README: CLI version, OS, Node version, and detected editors. Consult Firecrawl's documentation for their opt-out mechanism.
- No telemetry is known for the Tavily or Valyu CLIs or any of the vendor skills. Vendors can change this; the upstream-watch workflow tracks their releases, but read the vendor's own docs if this matters to you.
- This repo's own code sends nothing anywhere except the API calls you ask for.

## No destructive defaults

- **`firecrawl setup defaults` is never run** by setup, update, or any skill — it would hand every web operation in your agent to Firecrawl. It runs only if you explicitly ask for it.
- Setup does not modify, remove, or reconfigure any existing tool, plugin, or MCP server. Vendor skills are added to your project's `.claude/skills/` (with a `skills-lock.json`); nothing is overwritten.
- `/websearch-update` only updates what setup installed, via the vendors' own updaters.
- The env file is only ever appended/edited for the five documented variables; nothing else in your config is touched.

## Publication safety

This repository ships plugin content and documentation — never any populated key file, real key, or user-specific path. A CI secret guard and gitleaks run on every push; secret scanning and CodeQL are enabled on the public repository. All provider facts live in `providers.json` so a claim can be audited in one place.

## What this does NOT do

- It does not sandbox or proxy the vendor CLIs — they run with your user's permissions, like any tool you install.
- It does not cap your spend — providers bill per their own pricing once free credits run out (Perplexity requires prepaid credits from the start). Watch usage in each vendor's dashboard.
- It does not make web content trustworthy — search results and scraped pages are untrusted input. Instructions embedded in fetched content are never commands to follow.
- It does not pin vendor versions — the point is tracking the vendors' latest releases. If you need reproducibility, pin the vendor packages yourself.

## Reporting

Found a security issue? See [`.github/SECURITY.md`](.github/SECURITY.md) — or write to security@elnora.ai. Please do not open a public issue for vulnerabilities.
