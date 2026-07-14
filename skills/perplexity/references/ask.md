# Perplexity — ask

General-purpose web-grounded Q&A over the chat completions endpoint, with full control over model, filters, and system prompt. Start with `sonar`; escalate to `sonar-pro` when the answer lacks depth or citations.

Load auth from [../SKILL.md](../SKILL.md) first.

## Basic ask

```bash
curl -sS https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"sonar","messages":[{"role":"user","content":"How does HTTP/3 differ from HTTP/2?"}]}'
```

Extract answer + citations:

```bash
# with jq
echo "$RESP" | jq -r '.choices[0].message.content'
echo "$RESP" | jq -r '.search_results[]? | "\(.title) — \(.url)"'
# without jq
echo "$RESP" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["choices"][0]["message"]["content"]);[print(r["title"],"—",r["url"]) for r in d.get("search_results",[])]'
```

## Model selection

| Need | Model |
|---|---|
| Quick factual answer, single search pass | `sonar` |
| Thorough answer, multiple searches, more citations | `sonar-pro` |
| Step-by-step reasoning | `sonar-reasoning-pro` → [reason.md](reason.md) |
| Comprehensive report | `sonar-deep-research` → [research.md](research.md) |

Escalate model, don't retry blindly:

```bash
# 1. cheap first
-d '{"model":"sonar","messages":[{"role":"user","content":"Explain lattice-based cryptography"}]}'
# 2. if shallow, escalate
-d '{"model":"sonar-pro","messages":[{"role":"user","content":"Explain lattice-based cryptography"}]}'
```

## Request fields (chat completions)

| Field | Notes |
|---|---|
| `model` | `sonar`, `sonar-pro`, `sonar-reasoning-pro`, `sonar-deep-research`. |
| `messages` | OpenAI-style array. A `system` message steers tone/format; the last `user` message is the query. |
| `search_mode` | `web` (default), `academic`, `sec`. |
| `search_domain_filter` | Array of domains, max 20. Prefix `-` to exclude. |
| `search_recency_filter` | `hour`, `day`, `week`, `month`, `year`. |
| `search_after_date_filter` / `search_before_date_filter` | `MM/DD/YYYY` publication bounds. |
| `search_language_filter` | Array of ISO 639-1 codes. |
| `max_tokens` | Cap on completion tokens (0–128000). |
| `temperature` | 0–2. Lower is more deterministic. |
| `top_p` | 0–1, nucleus sampling. |
| `return_related_questions` | `true` adds `related_questions` to the response. |
| `disable_search` | `true` answers from the model alone (no web, no citations). |
| `response_format` | `{"type":"json_schema","json_schema":{...}}` to force structured JSON output. |
| `stream` | `true` for SSE streaming (see below). |

## System prompt + domain filter

```bash
curl -sS https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H 'Content-Type: application/json' \
  -d '{
    "model":"sonar-pro",
    "messages":[
      {"role":"system","content":"Answer in three bullet points, cite every claim."},
      {"role":"user","content":"What are the main tradeoffs of serverless architectures?"}
    ],
    "search_domain_filter":["aws.amazon.com","martinfowler.com"]
  }'
```

## Structured JSON output

```bash
-d '{
  "model":"sonar",
  "messages":[{"role":"user","content":"List the three largest cities in Japan by population."}],
  "response_format":{
    "type":"json_schema",
    "json_schema":{"schema":{"type":"object","properties":{"cities":{"type":"array","items":{"type":"string"}}},"required":["cities"]}}
  }
}'
```

The JSON payload arrives as a string in `choices[0].message.content`; parse it a second time.

## Streaming

Set `"stream": true`. The response is Server-Sent Events: lines beginning `data: ` carry a JSON chunk whose token is at `choices[0].delta.content`; the stream ends with `data: [DONE]`.

```bash
curl -sS -N https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"sonar","stream":true,"messages":[{"role":"user","content":"Summarize the CAP theorem."}]}' \
| grep '^data: ' | sed 's/^data: //' | grep -v '^\[DONE\]' \
| python3 -c 'import sys,json;[sys.stdout.write(json.loads(l)["choices"][0]["delta"].get("content","")) for l in sys.stdin if l.strip()]'
```

For non-interactive agent use, prefer non-streaming — it is simpler to parse and gives you `citations`/`search_results` in one object.

## When NOT to use ask

- You just want URLs → [search.md](search.md)
- Tradeoff analysis / comparison → [reason.md](reason.md)
- Multi-source deep report → [research.md](research.md)
