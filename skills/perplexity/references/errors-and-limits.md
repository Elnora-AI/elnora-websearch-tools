# Perplexity — errors, rate limits, cost

Applies to both endpoints: `POST /chat/completions` and `POST /search`.

## HTTP status codes

| Status | Meaning | What to do |
|---|---|---|
| 200 | Success | Parse `choices[0].message.content` (chat) or `results` (search). |
| 400 | Bad request | Malformed JSON or an invalid field/value (e.g. unknown `model`, bad date format). Fix the body. |
| 401 | Unauthorized | Missing or wrong `PERPLEXITY_API_KEY`. Re-check the key and the `Authorization: Bearer` header. |
| 402 / 403 | Payment / access | Out of prepaid credits, or the key/tier lacks access. Top up credits at `https://console.perplexity.ai`. |
| 429 | Rate limited | You exceeded RPM for the model. Back off and retry with jitter. |
| 500 / 503 | Server error | Transient. Retry with exponential backoff. |

Detecting failure in a pipeline — capture the status separately:

```bash
RESP=$(curl -sS -w '\n%{http_code}' https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"sonar","messages":[{"role":"user","content":"ping"}]}')
CODE=$(printf '%s' "$RESP" | tail -n1)
BODY=$(printf '%s' "$RESP" | sed '$d')
[ "$CODE" = "200" ] || { echo "HTTP $CODE: $BODY" >&2; exit 1; }
```

Error bodies are JSON, typically `{"error": {"message": "...", "type": "...", "code": ...}}`. Read `.error.message`:

```bash
echo "$BODY" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("error",{}).get("message",""))'
```

## Rate limits (Tier 0 — new accounts)

| Model | Requests / minute |
|---|---|
| `sonar` | 50 |
| `sonar-pro` | 50 |
| `sonar-reasoning-pro` | 50 |
| `sonar-deep-research` | 5 |

Tiers rise automatically with cumulative spend, lifting these caps. On a 429, back off (e.g. 1s, 2s, 4s) rather than hammering — deep research hits its 5/min ceiling fastest.

## Cost

Prepaid credits only; a card is required at setup but nothing is charged until you buy credits. Approximate pricing (verify live at `https://docs.perplexity.ai/getting-started/pricing`):

| Model | In / Out per 1M tokens | Extra |
|---|---|---|
| `sonar` | ~$1 / ~$1 | + ~$5 per 1,000 searches |
| `sonar-pro` | ~$3 / ~$15 | + per-search fee; may run several searches per call |
| `sonar-reasoning-pro` | ~$2 / ~$8 | + per-search fee |
| `sonar-deep-research` | ~$2 / ~$8 | + per-search fee + per-citation-token charges (can reach dollars per call) |

Every response carries a `usage` object (`prompt_tokens`, `completion_tokens`, `total_tokens`, and for reasoning/deep-research a `reasoning_tokens` and `cost` breakdown). Log it to track spend:

```bash
echo "$RESP" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("usage",{}))'
```

## Cost discipline

- Default to `sonar`; escalate only when the answer is thin.
- Never auto-run `sonar-deep-research` — it is the only model that can cost dollars per call. See [research.md](research.md).
- `disable_search: true` skips web search entirely (no search fee, no citations) when you only need the model's own knowledge.
