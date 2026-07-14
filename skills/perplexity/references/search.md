# Perplexity — search

Quick web search. Two paths:

1. **Search API** (`/search`) — raw ranked results (title, URL, snippet, date). No LLM, cheaper and faster. Use when you want sources/URLs, not prose.
2. **Sonar chat** (`model: sonar`) — a short synthesized answer with citations. Use when you want a written answer.

Load auth from [../SKILL.md](../SKILL.md) first.

## Path 1 — Search API (raw results)

```bash
curl -sS https://api.perplexity.ai/search \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"query":"latest developments in solid-state batteries","max_results":5}'
```

Response:

```json
{
  "id": "...",
  "results": [
    {"title":"...","url":"https://...","snippet":"...","date":"2026-01-10","last_updated":"2026-02-01"}
  ],
  "server_time": "..."
}
```

Extract the URLs:

```bash
# with jq
echo "$RESP" | jq -r '.results[] | "\(.title)\n  \(.url)"'
# without jq
echo "$RESP" | python3 -c 'import sys,json;[print(r["title"]+"\n  "+r["url"]) for r in json.load(sys.stdin)["results"]]'
```

### Search API fields

| Field | Notes |
|---|---|
| `query` | Required. String, or an array of strings for multi-query. |
| `max_results` | 1–20, default 10. |
| `max_tokens_per_page` | Cap extracted tokens per result page. |
| `search_context_size` | `low`, `medium`, `high` — how much page text to pull. |
| `search_domain_filter` | Array of domains, max 20. Prefix a domain with `-` to exclude it. |
| `search_recency_filter` | `hour`, `day`, `week`, `month`, `year`. |
| `search_after_date_filter` / `search_before_date_filter` | Publication date bounds, `MM/DD/YYYY`. |
| `last_updated_after_filter` / `last_updated_before_filter` | Last-modified bounds, `MM/DD/YYYY`. |
| `country` | ISO 3166-1 alpha-2 (e.g. `US`, `DE`). |
| `search_language_filter` | Array of ISO 639-1 codes (e.g. `["en"]`). |

## Path 2 — Sonar chat (synthesized answer)

```bash
curl -sS https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model":"sonar",
    "messages":[{"role":"user","content":"What changed in the EU AI Act enforcement timeline this year?"}],
    "search_recency_filter":"month"
  }'
```

Pull the answer plus sources:

```bash
# with jq
echo "$RESP" | jq -r '.choices[0].message.content'
echo "$RESP" | jq -r '.citations[]?'
# without jq
echo "$RESP" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["choices"][0]["message"]["content"]);print("\n".join(d.get("citations",[])))'
```

### Domain-restricted, recent search

```bash
curl -sS https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H 'Content-Type: application/json' \
  -d '{
    "model":"sonar",
    "messages":[{"role":"user","content":"Recent benchmarks comparing Rust and Go for web servers"}],
    "search_domain_filter":["github.com","arstechnica.com"],
    "search_recency_filter":"month"
  }'
```

### Academic mode

```bash
-d '{"model":"sonar","search_mode":"academic","messages":[{"role":"user","content":"Recent survey papers on retrieval-augmented generation"}]}'
```

`search_mode` accepts `web` (default), `academic`, `sec`.

## When NOT to use search

- Comparisons / tradeoff analysis → [reason.md](reason.md)
- Multi-source reports → [research.md](research.md)
- Errors, rate limits, cost → [errors-and-limits.md](errors-and-limits.md)
