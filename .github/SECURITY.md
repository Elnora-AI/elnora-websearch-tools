# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x.x   | Yes       |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report privately via one of:

- **Email:** [security@elnora.ai](mailto:security@elnora.ai)
- **GitHub Security Advisories:** [Report a vulnerability](https://github.com/Elnora-AI/elnora-websearch-tools/security/advisories/new)

Include as much as you can: a description, steps to reproduce, potential impact, and any suggested fix.

## Response Timeline

- **Acknowledgement:** within 48 hours
- **Initial assessment:** within 5 business days
- **Fix and disclosure:** within 90 days

## Scope

**In scope:**

- The plugin content in this repository (commands, skills, setup scripts) and how it handles API keys
- The key-file convention (`~/.config/elnora-websearch/.env`) and its permission handling
- The CI guards (`scripts/check-no-secrets.mjs`, `scripts/check-json.mjs`) and `scripts/upstream-watch.mjs`

**Out of scope:**

- The vendor CLIs, skills, and APIs this plugin installs and calls (Exa, Tavily, Perplexity, Firecrawl, Valyu) — report to the respective vendor
- Claude Code itself and the `npx skills` installer
- A user's own API keys or account configuration at any provider

## Best Practices for Users

- Keep provider keys in your process environment or in `~/.config/elnora-websearch/.env` with `600` permissions — never in a repository.
- Treat each provider key as a spending credential: set usage limits in the vendor dashboard where available.
- Rotate a key immediately at the vendor's dashboard if you suspect exposure.
