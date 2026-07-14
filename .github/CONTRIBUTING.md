# Contributing

Thanks for helping improve elnora-websearch-tools. This is a universal Claude Code plugin — contributions must keep it that way.

## Ground rules

1. **Official tooling only.** This plugin installs each provider's own CLI and Agent Skills via the vendor's own installer. Never vendor or redistribute a provider's code or skills into this repo (the only exception is our own Perplexity skills, because Perplexity ships none).
2. **providers.json is the single source of truth.** Every provider fact — env var names, key URLs, free tiers, install/update commands, smoke tests — lives there. Docs, commands, and skills derive from it; never contradict it. Changing a provider fact means changing `providers.json` first.
3. **No secrets, ever.** No API key values, no absolute home paths, no personal data. Keys belong in the process environment or `~/.config/elnora-websearch/.env`. The CI guard `scripts/check-no-secrets.mjs` enforces this and will fail your PR otherwise.
4. **Cross-platform.** Everything must work on macOS, Linux, and Windows. Where instructions differ, provide both bash and PowerShell variants.
5. **Zero dependencies.** Scripts and tests are plain Node >= 20 ESM (`node:test`, `fetch`, `node:fs`). Do not add npm dependencies.

## Development

```sh
npm test                  # node --test __tests__/
npm run check:secrets     # secret / path / email guard
npm run check:json        # manifest + providers.json validation
npm run upstream:watch -- --dry-run   # print upstream version state
```

## Pull requests

- Use a [Conventional Commit](https://www.conventionalcommits.org/) PR title (`feat:`, `fix:`, `docs:`, `chore:`, ...). CI lints this.
- Keep changes surgical and focused. Update docs when behavior changes.
- Fill in the PR checklist.

## Reporting security issues

See [SECURITY.md](SECURITY.md) — do not open a public issue for vulnerabilities.
