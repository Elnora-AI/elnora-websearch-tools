# elnora-websearch-tools

**One plugin that gives your agents comprehensive web search from five providers' official tooling — Exa, Tavily, Perplexity, Firecrawl, and Valyu. Install any subset, and one command keeps every CLI and skill on the vendors' latest releases. Nothing is vendored or forked: setup installs each vendor's own CLI and Agent Skills from their official channels, so you get updates straight from them.**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![CI](https://github.com/Elnora-AI/elnora-websearch-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/Elnora-AI/elnora-websearch-tools/actions/workflows/ci.yml)
[![Release Please](https://github.com/Elnora-AI/elnora-websearch-tools/actions/workflows/release-please.yml/badge.svg)](https://github.com/Elnora-AI/elnora-websearch-tools/actions/workflows/release-please.yml)

---

## What you can do in your first ten minutes

- **"Search the web for X"** — the `websearch` routing skill picks the right provider for the task instead of defaulting to whichever tool shouts loudest.
- **Find pages by meaning** — Exa's neural search: find-similar to a URL, entity search for companies, people, papers, and code.
- **Turn any URL into clean markdown** — Firecrawl scrapes JS-heavy pages, maps sites, and crawls whole domains.
- **Get a cited answer, not ten links** — Perplexity's Sonar models search, reason, and answer in one call.
- **Search, extract, and crawl on a real recurring free tier** — Tavily gives 1,000 free API credits every month, and `tvly search` even works keyless.
- **Ground knowledge work in real corpora** — Valyu searches SEC filings, arXiv/PubMed, clinical trials, and patents, with async deep research that produces file deliverables.
- **Collect every free tier in one sitting** — `/websearch-setup` walks each provider's signup, saves the keys safely, installs the official tooling, and smoke-tests everything.

## Install

Run the two install commands **one at a time** (paste the first, hit enter, wait, then the second):

```
/plugin marketplace add Elnora-AI/elnora-websearch-tools
```

```
/plugin install websearch@elnora-websearch-tools
```

Then run the guided setup:

```
/websearch-setup
```

`/websearch-setup` asks which providers you want (all five are optional and independent), walks you through getting each key, saves them to `~/.config/elnora-websearch/.env` (mode 0600), installs each vendor's official CLI and skills, and smoke-tests every provider you chose.

> **Installing via an AI agent?** Point it at [`INSTALL_FOR_AGENTS.md`](INSTALL_FOR_AGENTS.md) — a gated runbook with per-provider checkpoints, failure interpretations, and a handoff summary.

### Using Codex, Cursor, or another agent

The plugin and slash commands are Claude Code sugar; everything underneath is vendor-official CLIs plus `curl`. Drop [`AGENTS.md`](AGENTS.md) at your project root and any agent gets the same dispatch table and conventions.

## The providers

These are the **vendors' own CLIs and skills**, installed from their official channels (npm, PyPI, their install scripts, their skills repos) — never redistributed by this repo. When a vendor ships an update, `/websearch-update` pulls it directly from them.

| Provider | Best for | Free tier | Official CLI | Official skills |
|---|---|---|---|---|
| [Exa](https://exa.ai) | Semantic/neural discovery: find pages by meaning, find-similar to a URL, entity search for companies, people, research papers, and code | $10 credits on signup, no card (~1,000 searches); +$7/month with a payment method on file | — (REST API) | [`exa-labs/agent-skills`](https://github.com/exa-labs/agent-skills) |
| [Tavily](https://tavily.com) | All-round agent web search plus first-party extract, crawl, and site-map; LLM-optimized snippets | 1,000 API credits **every month**, recurring, no card; `tvly search`/`extract` work keyless under a fair-use cap | [`tvly`](https://github.com/tavily-ai/tavily-cli) (PyPI `tavily-cli`) | [`tavily-ai/skills`](https://github.com/tavily-ai/skills) |
| [Perplexity](https://www.perplexity.ai) | Synthesized, citation-grounded answers: Sonar models search, reason, and answer in one call | No free API credits — prepaid billing, card required at setup, nothing charged until you buy credits | — (REST API) | None upstream — this plugin bundles its own ([`skills/perplexity/`](skills/perplexity/)) |
| [Firecrawl](https://www.firecrawl.dev) | Any URL → clean LLM-ready markdown: JS rendering, anti-bot handling, site mapping, crawling, change monitoring, plus web search | 1,000 credits/month, recurring, no card; keyless mode at low volume | [`firecrawl`](https://github.com/firecrawl/cli) (npm `firecrawl-cli`) | Installed by the CLI itself (`firecrawl setup skills`) |
| [Valyu](https://www.valyu.ai) | Citation-grounded knowledge work: SEC filings, M&A due diligence, arXiv/PubMed/bioRxiv, clinical trials, patents; async deep research with CSV/XLSX/PPTX/DOCX/PDF deliverables | $10 credits on signup, no card ($20 reported with a work email) | [`valyu`](https://github.com/valyuAI/valyu-cli) (npm `@valyu/cli`) | `valyu-cli` (bundled in the npm package) |

Every provider is opt-in. Install one, or collect all five free tiers — the routing skill only routes to what you configured.

## What you get

### Slash commands

| Command | Does |
|---|---|
| `/websearch-setup` | Guided per-provider setup: keys, official CLIs, official skills, smoke tests |
| `/websearch-status [--live]` | Which providers are configured; `--live` fires one real call per provider |
| `/websearch-update` | Update every installed vendor CLI and skill to the vendors' latest releases |

### Skills

| Skill | Origin | Does |
|---|---|---|
| `websearch` (router) | this plugin | Picks the right provider per task; arbiter when providers' own skills overlap |
| `perplexity` | this plugin | Curl-based skills over the official Sonar API (Perplexity ships no CLI or skills) |
| Exa skills (`exa-search`, `exa-contents`, `build-with-exa`) | vendor, via `npx skills add exa-labs/agent-skills` | Search, contents, and build guidance from Exa |
| Tavily skills (`tavily-search`, `-extract`, `-crawl`, `-map`, `-research`, …) | vendor, via `npx skills add tavily-ai/skills` | Full Tavily surface |
| Firecrawl skills (`firecrawl-scrape`, `-search`, `-crawl`, `-map`, …) | vendor, via `firecrawl setup skills --agent claude-code` | Full Firecrawl surface |
| `valyu-cli` | vendor, via `npx skills add @valyu/cli` | Valyu search, answers, extraction, deep research |

Vendor skills land in your **project's** `.claude/skills/` with a `skills-lock.json`; this plugin's own skills ship with the plugin.

## How updates work

Three layers, three mechanisms:

- **Vendor CLIs and skills** — run `/websearch-update`. CLIs update through each vendor's own updater (`uv tool upgrade tavily-cli`, `npm install -g firecrawl-cli@latest`, `valyu upgrade`); skills through `npx skills update` and `firecrawl setup skills --agent claude-code`. You are always on the vendors' latest releases.
- **This plugin** — `/plugin marketplace update elnora-websearch-tools`.
- **This repo** — an upstream-watch workflow tracks the vendor CLIs and skill repos this plugin installs (Exa, Tavily, Firecrawl, Valyu — Perplexity ships neither) and updates a tracking issue whenever one of them publishes a new release, so the facts in [`providers.json`](providers.json) can be re-checked.

## Configuration

One env file, five variables, plain `KEY=value` lines:

| Variable | Provider |
|---|---|
| `EXA_API_KEY` | Exa |
| `TAVILY_API_KEY` | Tavily |
| `PERPLEXITY_API_KEY` | Perplexity |
| `FIRECRAWL_API_KEY` | Firecrawl |
| `VALYU_API_KEY` | Valyu |

Location: `~/.config/elnora-websearch/.env` on macOS/Linux, `%USERPROFILE%\.config\elnora-websearch\.env` on Windows. Created with `umask 077` / mode 0600 by setup. **Precedence:** the process environment always wins — the file is only read to fill variables that are unset. Every provider is optional; unset variables simply leave that provider unconfigured (Tavily and Firecrawl still work keyless at low volume).

## Safety

Read [`SAFETY.md`](SAFETY.md). In short: nothing leaves your machine except HTTPS calls to the five providers' APIs and their official install channels; keys live in one 0600 file and are never echoed by any command or skill; this repo redistributes **no** vendor code — setup installs the vendors' own tooling from their own channels, at your request.

## Part of the Elnora family

elnora-websearch-tools is one of a family of universal, config-driven Claude Code tools from [Elnora AI](https://github.com/Elnora-AI). Each works 100% standalone; install more than one and they chain.

- [**knowledge-vault**](https://github.com/Elnora-AI/knowledge-vault) — your Obsidian vault as first-class agent memory. **Chain:** research a topic with the router, then `/note` files the sourced summary into your vault with frontmatter and cross-links — searches become permanent knowledge.
- [**elnora-google-workspace**](https://github.com/Elnora-AI/elnora-google-workspace) — Gmail, Calendar, Drive, Docs as a CLI + plugin. **Chain:** enrich a meeting prep with Exa company search and a Perplexity briefing, then `gw docs create` turns it into a shareable Google Doc.
- [**elnora-slack**](https://github.com/Elnora-AI/elnora-slack) — the full Slack Web API as an agent-friendly CLI. **Chain:** answer a teammate's question in a thread with a Perplexity-cited answer, posted through the draft-and-approve gate.
- [**elnora-linear**](https://github.com/Elnora-AI/elnora-linear) — Linear issue management for Claude Code. **Chain:** triage a bug report by Firecrawl-scraping the linked docs and attaching the relevant excerpt to the Linear issue.
- [**elnora-whatsapp**](https://github.com/Elnora-AI/elnora-whatsapp) — WhatsApp bridge for agents. **Chain:** a scheduled agent runs a Tavily news search each morning and sends the digest to your WhatsApp.
- [**elnora-merit-aktiva**](https://github.com/Elnora-AI/elnora-merit-aktiva) — Merit Aktiva accounting as a CLI + plugin. **Chain:** verify a new counterparty before invoicing — Valyu pulls the registry and filings context while Merit creates the customer record.

Every tool follows the same contract: one-line install, nothing hardcoded, your config drives everything. Browse the whole family on the [Elnora-AI org profile](https://github.com/Elnora-AI).

## Contributing

PRs welcome — see [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md). All provider facts live in [`providers.json`](providers.json); change them there, never inline. Dev checks: `npm test`, `npm run check:secrets`, `npm run check:json`.

## License

[Apache-2.0](LICENSE). Maintained by [Elnora AI](https://github.com/Elnora-AI). The vendor CLIs and skills that setup installs are licensed by their respective vendors — see [`SAFETY.md`](SAFETY.md#third-party-code-plainly).
