<!-- PR title must be a Conventional Commit, e.g. "feat: add provider usage command" -->

## What & why

<!-- What does this change and why? -->

## Checklist

- [ ] `npm test` passes on your OS
- [ ] `npm run check:secrets` passes (no key values, home paths, or personal data)
- [ ] `npm run check:json` passes (manifests + providers.json valid and consistent)
- [ ] Provider facts changed in `providers.json` first; docs/commands/skills derived from it
- [ ] No vendor code or skills vendored into this repo (installs go through the vendor's own installer)
- [ ] Instructions that differ per OS include both bash and PowerShell variants
