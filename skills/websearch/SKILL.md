---
name: websearch
description: >
  Routes any web task to the best-fitting search provider (Exa, Tavily, Perplexity,
  Firecrawl, Valyu). Use when the user asks to "search the web", "look up online",
  "find information", "research", "deep research", "scrape a page", "extract content
  from a URL", "crawl a website", "find papers", "find companies", "find people",
  "fact-check", "get a cited answer", "monitor a page", or asks meta-questions like
  "which search tool should I use", "what web search do we have", "compare search
  providers", or when multiple web providers could serve the same request and one
  must be chosen.
---

# Web Search Router

Five providers, one decision. This skill picks the provider; the provider's own skill or CLI does the work. Load the provider's skill after routing — it has the exact syntax.

## Routing table

| Task intent | Provider | Use |
|---|---|---|
| Semantic/neural search — find by meaning, not keywords | Exa | `exa-search` skill |
| Find pages similar to a URL; entity discovery (companies, people, papers, code) | Exa | `exa-search` / `build-with-exa` skills |
| Get contents/text of result URLs from an Exa search | Exa | `exa-contents` skill |
| General web search, news, quick lookups | Tavily | `tvly search` (`tavily-search` skill) |
| Extract clean content from 1-20 known URLs | Tavily | `tvly extract` (`tavily-extract` skill) |
| Crawl or map a site's structure | Tavily | `tvly crawl` / `tvly map` skills |
| Synthesized, citation-grounded answer; comparative reasoning; "just answer the question" | Perplexity | bundled Perplexity skills (this plugin, Sonar API) |
| Deep-research report, multi-source synthesis | Perplexity (`sonar-deep-research`) or Tavily research; Valyu when a file deliverable is wanted | respective skill |
| Heavy scraping: JS rendering, anti-bot, screenshots, page interaction, change monitoring | Firecrawl | `firecrawl` CLI + skill family |
| Whole-site crawl into LLM-ready markdown | Firecrawl | `firecrawl crawl` |
| Academic literature (arXiv, PubMed, bioRxiv), clinical trials, patents | Valyu | `valyu search` (`valyu-cli` skill) |
| Financial/SEC filings, M&A due diligence, GTM/ICP account research | Valyu | `valyu-cli` skill |
| Research with deliverables (CSV/XLSX/PPTX/DOCX/PDF) | Valyu | `valyu deepresearch` (`valyu-cli` skill) |

## Availability check and fallbacks

Before routing, verify the chosen provider is usable (cheap checks, never print key values):

```bash
[ -n "$EXA_API_KEY" ] || grep -qs '^EXA_API_KEY=' ~/.config/elnora-websearch/.env   # same pattern per provider
command -v tvly >/dev/null; command -v firecrawl >/dev/null; command -v valyu >/dev/null
```

Keys live in `~/.config/elnora-websearch/.env` (`%USERPROFILE%\.config\elnora-websearch\.env` on Windows); process env wins over the file. If the first-choice provider isn't configured, fall back in this order:

- **Semantic search** (Exa missing) → Tavily search → Perplexity search-grounded answer
- **General search / extract** (Tavily missing) → Tavily **works keyless** at fair-use volume, so try it anyway → Firecrawl (also has a keyless mode) → Exa
- **Cited answer** (Perplexity missing) → Exa answer-style search + you synthesize → Tavily
- **Scrape/crawl** (Firecrawl missing) → Tavily extract/crawl → Firecrawl keyless for low volume
- **Academic/financial** (Valyu missing) → Exa (papers, filings via neural search) → Perplexity deep research

If nothing is configured at all: Tavily and Firecrawl still work keyless for basic search/extract; for anything more, point the user at `/websearch-setup`.

## Choosing between providers

Exa finds things by meaning (best discovery); Tavily is the pragmatic all-rounder with the strongest recurring free tier and first-party extract/crawl/map; Perplexity doesn't return links, it returns an answer with citations (best when the user wants a conclusion, not a reading list); Firecrawl turns hostile or JS-heavy pages into clean markdown and handles crawling, interaction, and monitoring; Valyu covers corpora the open web doesn't (SEC filings, clinical trials, patents, licensed academic content) and produces file deliverables. Prefer the **cheapest adequate tool**: a keyless Tavily search beats spending Valyu credits on a general question; one Firecrawl scrape beats a full crawl.

| Provider | Free tier | Card? | Keyless mode |
|---|---|---|---|
| Exa | $10 credits on signup (~1,000 searches); +$7/month with payment method on file | No | No |
| Tavily | 1,000 credits/month, recurring | No | Yes (search + extract, fair-use) |
| Perplexity | None — prepaid credits; nothing charged until you buy | Yes | No |
| Firecrawl | 1,000 credits/month, recurring | No | Yes (search/scrape, low volume) |
| Valyu | $10 credits on signup ($20 with work email) | No | No |

## Conflict arbitration

Firecrawl's umbrella skill claims **all** web tasks ("replaces WebFetch and WebSearch"). In this multi-provider bundle, **this router is the arbiter**: when several providers could serve a request, route by the table above, preferring the cheapest adequate tool — do not let Firecrawl's self-description win by default. Firecrawl gets the job when the task actually needs its strengths (JS rendering, anti-bot, site crawling, interaction, monitoring). Never suggest `firecrawl setup defaults` unless the user explicitly wants Firecrawl to own every web operation.

## Not set up yet?

If no provider is configured, run `/websearch-setup` — it walks through key signup (four of five free tiers need no credit card), installs each vendor's official CLI and skills, and verifies with smoke tests. `/websearch-status` shows current health; `/websearch-update` keeps everything on the latest official releases.
