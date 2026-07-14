# Perplexity — reason

Step-by-step, chain-of-thought analysis grounded in current web data. Model: `sonar-reasoning-pro`. Use for comparisons, technical evaluations, and multi-factor decisions — not for plain fact lookups.

Load auth from [../SKILL.md](../SKILL.md) first.

## Reason through a question

```bash
RESP=$(curl -sS https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model":"sonar-reasoning-pro",
    "messages":[{"role":"user","content":"Compare PostgreSQL and MySQL for a high-write analytics workload."}],
    "reasoning_effort":"high"
  }')
```

## The `<think>` block

`sonar-reasoning-pro` prepends its chain-of-thought inside a `<think>...</think>` block before the final answer, all in `choices[0].message.content`. Strip it when you only want the conclusion:

```bash
# with jq + sed (remove the think block)
echo "$RESP" | jq -r '.choices[0].message.content' | sed '/<think>/,/<\/think>/d'
# without jq (python strips it in one pass)
echo "$RESP" | python3 -c 'import sys,json,re;c=json.load(sys.stdin)["choices"][0]["message"]["content"];print(re.sub(r"<think>.*?</think>","",c,flags=re.S).strip())'
```

Keep the `<think>` block when you want to show the reasoning trail; drop it for a clean deliverable.

## Request fields

| Field | Notes |
|---|---|
| `model` | `sonar-reasoning-pro`. |
| `reasoning_effort` | `minimal`, `low`, `medium`, `high` — more effort, deeper reasoning, higher cost/latency. |
| `search_mode` | `web` (default), `academic`, `sec`. |
| `search_domain_filter` | Array of domains, max 20 (`-` to exclude). |
| `search_recency_filter` | `hour`, `day`, `week`, `month`, `year`. |
| `search_after_date_filter` / `search_before_date_filter` | `MM/DD/YYYY`. |
| `temperature` | 0–2. |
| `max_tokens` | Reasoning output can be long — raise this if the answer truncates (`finish_reason: "length"`). |

## Domain-restricted analysis

```bash
curl -sS https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H 'Content-Type: application/json' \
  -d '{
    "model":"sonar-reasoning-pro",
    "messages":[{"role":"user","content":"Evaluate the tradeoffs of monorepos vs polyrepos for a 50-engineer org."}],
    "search_domain_filter":["martinfowler.com","github.blog"],
    "reasoning_effort":"high"
  }'
```

## Two-step pipeline (search → reason)

```bash
# 1. gather context cheaply
CTX=$(curl -sS https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"sonar","messages":[{"role":"user","content":"Current state of WebAssembly outside the browser"}]}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["choices"][0]["message"]["content"])')

# 2. reason over it
curl -sS https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H 'Content-Type: application/json' \
  -d "$(python3 -c 'import json,sys;print(json.dumps({"model":"sonar-reasoning-pro","messages":[{"role":"user","content":"Given this context, where is server-side WASM most likely to win first?\n\n"+sys.argv[1]}]}))' "$CTX")"
```

## When NOT to use reason

- Fact lookup / URLs → [search.md](search.md)
- Plain Q&A → [ask.md](ask.md)
- Comprehensive multi-source report → [research.md](research.md)
