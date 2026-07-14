#!/usr/bin/env node
// CI guard: no API key values, absolute home paths, stray emails, or Slack IDs
// anywhere in the repo. Zero dependencies; Node >= 20.
//
// Skips itself (it necessarily contains the patterns it hunts for).

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SELF = path.join("scripts", "check-no-secrets.mjs");

const SKIP_DIRS = new Set([".git", "node_modules", "coverage", ".claude"]);
const SKIP_EXT = new Set([".png", ".ico", ".jpg", ".jpeg", ".gif", ".pdf", ".tgz", ".zip", ".woff", ".woff2"]);

// Patterns that indicate a real credential or private detail. Word boundaries
// and minimum lengths keep documented placeholders (YOUR_KEY, <key>, xxx,
// $EXA_API_KEY, PASTE_YOUR_tvly_KEY) from matching: placeholders use
// underscores, angle brackets, or env-var syntax, never a real key's charset.
const RULES = [
  { name: "absolute macOS home path", re: /(?:^|[\s"'`(=:,])\/Users\//m },
  { name: "absolute Linux home path", re: /(?:^|[\s"'`(=:,])\/home\/[A-Za-z]/m },
  { name: "absolute Windows home path", re: /[A-Za-z]:\\+Users\\/ },
  { name: "Tavily API key", re: /\btvly-[A-Za-z0-9]{16,}/ },
  { name: "Firecrawl API key", re: /\bfc-[A-Za-z0-9]{16,}/ },
  { name: "Perplexity API key", re: /\bpplx-[A-Za-z0-9]{16,}/ },
  { name: "sk- style API key", re: /\bsk-[A-Za-z0-9_-]{16,}/ },
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "GitHub token", re: /\bgh[posur]_[A-Za-z0-9]{20,}\b/ },
  { name: "private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "Slack token", re: /\bxox[bapos]-[A-Za-z0-9-]{10,}/ },
  { name: "Slack user ID", re: /\bU0[A-Z0-9]{7,}\b/ },
];

// Only company emails are policed; vendor-doc emails (support@tavily.com etc.)
// are legitimate references.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@elnora\.ai/g;
const EMAIL_ALLOWLIST = new Set([
  "opensource@elnora.ai",
  "security@elnora.ai",
  "conduct@elnora.ai",
]);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(ROOT, full);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) yield* walk(full);
    } else if (!SKIP_EXT.has(path.extname(entry).toLowerCase()) && rel !== SELF) {
      yield { full, rel };
    }
  }
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

const findings = [];
for (const { full, rel } of walk(ROOT)) {
  const text = readFileSync(full, "utf8");
  for (const rule of RULES) {
    const m = rule.re.exec(text);
    if (m) findings.push(`${rel}:${lineOf(text, m.index)}  ${rule.name}`);
  }
  for (const m of text.matchAll(EMAIL_RE)) {
    if (!EMAIL_ALLOWLIST.has(m[0].toLowerCase())) {
      findings.push(`${rel}:${lineOf(text, m.index)}  non-allowlisted @elnora.ai email (${m[0]})`);
    }
  }
}

if (findings.length > 0) {
  console.error("check:secrets FAILED — remove these before committing:\n");
  for (const f of findings) console.error(`  ${f}`);
  process.exit(1);
}
console.log("check:secrets OK — no key values, home paths, stray emails, or Slack IDs found.");
