---
name: perplexity
description: >
  Web-grounded Q&A with citations via Perplexity's Sonar API. Use when the user
  says "ask perplexity", "get an AI answer with citations", "web-grounded
  answer", "answer with sources", "reason about" / "compare" / "evaluate
  tradeoffs" over live web data, or "deep research" / "literature review" /
  "comprehensive investigation". The Sonar models search, synthesize, and cite
  in a single call — reach for this over raw result lists when you want a
  written answer backed by sources. Bundled curl-based skill (Perplexity ships
  no official CLI or Agent Skills).
---

# Perplexity (Sonar API)

Perplexity's Sonar models search the web, synthesize an answer, and return citations in one HTTP call. This skill talks to the official API at `https://api.perplexity.ai` directly with `curl` — no CLI to install. Every recipe shows a `jq` command and a `python3 -c` fallback, because `jq` may be absent.

## Auth

The key lives in `PERPLEXITY_API_KEY`. Process environment always wins; the shared env file only fills it when unset.

**bash / zsh:**

```bash
[ -f ~/.config/elnora-websearch/.env ] && while IFS='=' read -r k v; do [ -n "$k" ] && [ -z "$(eval echo \$$k)" ] && export "$k=$v"; done < ~/.config/elnora-websearch/.env
```

**PowerShell:**

```powershell
Get-Content "$env:USERPROFILE\.config\elnora-websearch\.env" -ErrorAction SilentlyContinue | ForEach-Object {
  $k,$v = $_ -split '=',2
  if ($k -and -not (Get-Item "env:$k" -ErrorAction SilentlyContinue)) { Set-Item "env:$k" $v }
}
```

No key yet: create one at `https://console.perplexity.ai` (create an API Group first, then the API Keys tab — the key is shown only once). Billing is prepaid credits; a card is required at setup but nothing is charged until you buy credits. New accounts are Tier 0.

## Router — which recipe

| User intent | Recipe | Model | Reference |
|---|---|---|---|
| Find URLs / sources / recent news, raw ranked results | search | (Search API, no LLM) | [references/search.md](references/search.md) |
| Quick synthesized answer with citations | search | `sonar` | [references/search.md](references/search.md) |
| General Q&A, pick depth vs speed | ask | `sonar` / `sonar-pro` | [references/ask.md](references/ask.md) |
| Compare, analyze, evaluate tradeoffs (chain-of-thought) | reason | `sonar-reasoning-pro` | [references/reason.md](references/reason.md) |
| Literature review, market/competitive research, due diligence | research | `sonar-deep-research` | [references/research.md](references/research.md) |
| HTTP errors, rate limits, cost | — | — | [references/errors-and-limits.md](references/errors-and-limits.md) |

Start cheap (`sonar`), escalate only when the answer lacks depth. Deep research is expensive and slow — read [references/research.md](references/research.md) before running it.

## Models

| Model | Speed | RPM (Tier 0) | Best for |
|---|---|---|---|
| `sonar` | 2–5s | 50 | Quick facts, URLs, current events |
| `sonar-pro` | 5–15s | 50 | Complex queries, more citations, multi-step search |
| `sonar-reasoning-pro` | 10–30s | 50 | Comparisons, technical analysis (emits chain-of-thought) |
| `sonar-deep-research` | 30–120s+ | 5 | Literature reviews, comprehensive reports |

Approximate token pricing (verify at `https://docs.perplexity.ai/getting-started/pricing`): `sonar` ~$1/$1 per 1M in/out; `sonar-pro` ~$3/$15; `sonar-reasoning-pro` ~$2/$8; `sonar-deep-research` ~$2/$8 plus per-search and per-citation-token charges. All Sonar calls add a per-request search fee (~$5 per 1,000 searches); `sonar-pro` and deep research may run several searches per call.

## Endpoints

- **Chat completions** (all Sonar models): `POST https://api.perplexity.ai/chat/completions` — OpenAI-compatible body.
- **Search API** (raw ranked results, no LLM synthesis): `POST https://api.perplexity.ai/search`.

## The one call to remember

```bash
curl -sS https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"sonar","messages":[{"role":"user","content":"What is quantum error correction?"}]}'
```

Extract the answer and its sources:

```bash
# with jq
RESP=$(curl -sS https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"sonar","messages":[{"role":"user","content":"What is quantum error correction?"}]}')
echo "$RESP" | jq -r '.choices[0].message.content'
echo "$RESP" | jq -r '.search_results[]? | "\(.title) — \(.url)"'

# without jq
echo "$RESP" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["choices"][0]["message"]["content"])'
```

Response shape (fields the recipes rely on):

```json
{
  "id": "...",
  "model": "sonar",
  "choices": [{"index":0,"finish_reason":"stop","message":{"role":"assistant","content":"answer text"}}],
  "citations": ["https://source1.com", "https://source2.com"],
  "search_results": [{"title":"...","url":"https://...","snippet":"...","date":"2026-01-01"}],
  "usage": {"prompt_tokens":50,"completion_tokens":200,"total_tokens":250}
}
```

`citations` is a flat URL list; `search_results` carries the same URLs with title/snippet/date. Prefer `search_results` when you need titles. Both may be empty when the model answers without searching.

## Cross-platform note

All `curl` recipes run as-is in bash/zsh and in PowerShell 7+ (`curl` is not aliased there when `curl.exe` is on PATH; if `curl` resolves to `Invoke-WebRequest`, call `curl.exe`). On Windows PowerShell 5.1, use `curl.exe` explicitly and single-quote the JSON with escaped inner quotes, or pipe the body from a file.
