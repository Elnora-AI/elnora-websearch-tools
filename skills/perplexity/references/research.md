# Perplexity — research

Comprehensive, multi-source investigation with extensive citations. Model: `sonar-deep-research`. For literature reviews, market/competitive research, and due diligence.

Load auth from [../SKILL.md](../SKILL.md) first.

## Cost and latency warning — read before running

`sonar-deep-research` runs many search rounds and reads dozens of pages per call. It is the **slowest and most expensive** Sonar model:

- **Latency: 30–120+ seconds** per call — it blocks for that long. Always dispatch it in a background agent / subagent, or use `stream: true` so the connection stays alive.
- **Cost is high and variable**: token charges plus per-search fees plus per-citation-token charges add up to far more than a `sonar` call. A single deep-research request can cost dollars, not cents.

Do **not** run this automatically or in a loop without an explicit go-ahead. For most questions, `sonar-pro` (via [ask.md](ask.md)) is enough at a fraction of the cost. Escalate to deep research only when a genuinely comprehensive, heavily-cited report is required.

## Deep research call

```bash
curl -sS https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model":"sonar-deep-research",
    "messages":[{"role":"user","content":"State of the electric vehicle charging network in Europe: standards, operators, gaps, 2026 outlook."}],
    "reasoning_effort":"high"
  }'
```

Extract the report and every source:

```bash
# with jq
echo "$RESP" | jq -r '.choices[0].message.content'
echo "$RESP" | jq -r '.search_results[]? | "- \(.title): \(.url)"'
# without jq
echo "$RESP" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["choices"][0]["message"]["content"]);print();[print("-",r["title"]+":",r["url"]) for r in d.get("search_results",[])]'
```

Deep-research output may contain a `<think>` reasoning block like [reason.md](reason.md) — strip it the same way if you only want the report body.

## Avoid the timeout — stream or background

The API call is synchronous; there is no job-ID/poll interface for Sonar deep research. Two ways to survive the wait:

**Stream** so the socket stays open and you see progress:

```bash
curl -sS -N https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"sonar-deep-research","stream":true,"reasoning_effort":"high","messages":[{"role":"user","content":"..."}]}' \
| grep '^data: ' | sed 's/^data: //' | grep -v '^\[DONE\]' \
| python3 -c 'import sys,json;[sys.stdout.write(json.loads(l)["choices"][0]["delta"].get("content","")) for l in sys.stdin if l.strip()]'
```

**Background** (dispatch and collect later) — write the report to a file so the long call does not block the main flow:

```bash
curl -sS --max-time 300 https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"sonar-deep-research","reasoning_effort":"high","messages":[{"role":"user","content":"..."}]}' \
  > research.json
```

Raise `--max-time` (seconds) above the expected latency so curl does not abort a valid long call.

## Request fields

| Field | Notes |
|---|---|
| `model` | `sonar-deep-research`. |
| `reasoning_effort` | `minimal`, `low`, `medium`, `high` — higher = more sources, more cost, more time. |
| `search_mode` | `web` (default), `academic`, `sec`. |
| `search_domain_filter` | Array of domains, max 20 (`-` to exclude). Focus the search to trusted sources. |
| `search_recency_filter` | `hour`, `day`, `week`, `month`, `year`. |
| `search_after_date_filter` / `search_before_date_filter` | `MM/DD/YYYY`. |
| `max_tokens` | Reports are long; raise if truncated (`finish_reason: "length"`). |

## Domain-focused report

```bash
curl -sS --max-time 300 https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H 'Content-Type: application/json' \
  -d '{
    "model":"sonar-deep-research",
    "messages":[{"role":"user","content":"Comprehensive review of open-source vector databases: architecture, benchmarks, licensing."}],
    "search_domain_filter":["github.com","arxiv.org"],
    "reasoning_effort":"high"
  }' > vectordb-review.json
```

## Escalation ladder

1. [search.md](search.md) — get the lay of the land, cheap.
2. [ask.md](ask.md) with `sonar-pro` — thorough answer, still fast/cheap.
3. `sonar-deep-research` (this file) — only when a full cited report is genuinely needed.

## Errors, rate limits, cost

Tier 0 caps deep research at **5 requests/minute**. See [errors-and-limits.md](errors-and-limits.md).
