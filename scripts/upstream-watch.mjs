#!/usr/bin/env node
// Watch the upstream releases this plugin installs (vendor CLIs on npm/PyPI,
// vendor skills repos on GitHub). State lives in one open issue labeled
// "upstream-watch"; on change the issue body is updated and a comment lists
// exactly what moved. Zero dependencies; Node >= 20.
//
// Modes:
//   GITHUB_TOKEN + GITHUB_REPOSITORY set  -> sync the tracking issue
//   otherwise, or with --dry-run          -> print state to stdout
//
// A watch job must never turn CI red: every failure path warns and exits 0.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LABEL = "upstream-watch";
const ISSUE_TITLE = "Upstream release watch";
const DRY_RUN = process.argv.includes("--dry-run");

// Upstream targets, derived from providers.json (official_cli / official_skills).
const TARGETS = {
  npm: ["firecrawl-cli", "@valyu/cli"],
  pypi: ["tavily-cli"],
  github: ["exa-labs/agent-skills", "tavily-ai/skills", "firecrawl/cli", "valyuAI/valyu-cli"],
};

function warn(msg) {
  console.warn(`upstream-watch: WARNING: ${msg}`);
}

async function fetchText(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

async function tryGet(label, fn) {
  try {
    return await fn();
  } catch (err) {
    warn(`${label}: ${err.message}`);
    return null; // null = "could not check this run"; never reported as a change
  }
}

async function collectState() {
  // Sanity: providers.json must still describe the targets we watch.
  const providers = JSON.parse(readFileSync(path.join(ROOT, "providers.json"), "utf8"));
  const blob = JSON.stringify(providers);
  for (const pkg of [...TARGETS.npm, ...TARGETS.pypi]) {
    if (!blob.includes(pkg)) warn(`package "${pkg}" no longer appears in providers.json — update TARGETS?`);
  }

  const ghHeaders = { Accept: "application/vnd.github.sha", "User-Agent": "elnora-websearch-tools-upstream-watch" };
  if (process.env.GITHUB_TOKEN) ghHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const state = { npm: {}, pypi: {}, github: {} };
  await Promise.all([
    ...TARGETS.npm.map(async (pkg) => {
      state.npm[pkg] = await tryGet(`npm ${pkg}`, async () =>
        JSON.parse(await fetchText(`https://registry.npmjs.org/${pkg}/latest`)).version);
    }),
    ...TARGETS.pypi.map(async (pkg) => {
      state.pypi[pkg] = await tryGet(`pypi ${pkg}`, async () =>
        JSON.parse(await fetchText(`https://pypi.org/pypi/${pkg}/json`)).info.version);
    }),
    ...TARGETS.github.map(async (repo) => {
      state.github[repo] = await tryGet(`github ${repo}`, async () =>
        (await fetchText(`https://api.github.com/repos/${repo}/commits/HEAD`, ghHeaders)).trim().slice(0, 12));
    }),
  ]);
  return state;
}

function diffStates(oldState, newState) {
  const changes = [];
  for (const section of Object.keys(newState)) {
    for (const [key, newVal] of Object.entries(newState[section])) {
      if (newVal === null) continue; // fetch failed this run; not a change
      const oldVal = oldState?.[section]?.[key] ?? null;
      if (oldVal !== newVal) changes.push(`${section} ${key}: ${oldVal ?? "(untracked)"} → ${newVal}`);
    }
  }
  return changes;
}

function renderBody(state) {
  const lines = [
    "Latest observed upstream versions of the vendor CLIs and skills this plugin installs.",
    "Maintained automatically by `scripts/upstream-watch.mjs` — do not edit the JSON block by hand.",
    "",
    "```json",
    JSON.stringify(state, null, 2),
    "```",
    "",
    "| Source | Package / repo | Latest |",
    "|---|---|---|",
  ];
  for (const section of Object.keys(state)) {
    for (const [key, val] of Object.entries(state[section])) {
      lines.push(`| ${section} | \`${key}\` | ${val ?? "(unreachable this run)"} |`);
    }
  }
  lines.push("", `_Last checked: ${new Date().toISOString()}_`);
  return lines.join("\n");
}

function parseBody(body) {
  const m = /```json\n([\s\S]*?)\n```/.exec(body ?? "");
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

async function ghApi(pathname, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "User-Agent": "elnora-websearch-tools-upstream-watch",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${method} ${pathname} -> HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function main() {
  const state = await collectState();
  const repo = process.env.GITHUB_REPOSITORY;

  if (DRY_RUN || !process.env.GITHUB_TOKEN || !repo) {
    console.log(JSON.stringify(state, null, 2));
    return;
  }

  const issues = await ghApi(`/repos/${repo}/issues?labels=${LABEL}&state=open&per_page=5`);
  const issue = issues[0];

  if (!issue) {
    const created = await ghApi(`/repos/${repo}/issues`, {
      method: "POST",
      body: { title: ISSUE_TITLE, body: renderBody(state), labels: [LABEL] },
    });
    console.log(`Created tracking issue #${created.number}.`);
    return;
  }

  const oldState = parseBody(issue.body);
  const changes = diffStates(oldState ?? {}, state);
  if (changes.length === 0 && oldState !== null) {
    console.log(`No upstream changes; issue #${issue.number} untouched.`);
    return;
  }

  await ghApi(`/repos/${repo}/issues/${issue.number}`, { method: "PATCH", body: { body: renderBody(state) } });
  await ghApi(`/repos/${repo}/issues/${issue.number}/comments`, {
    method: "POST",
    body: { body: `Upstream changes detected:\n\n${changes.map((c) => `- ${c}`).join("\n")}` },
  });
  console.log(`Updated issue #${issue.number}: ${changes.length} change(s).`);
}

main().catch((err) => {
  warn(`run failed (${err.message}) — exiting 0, watch jobs never redalert CI.`);
  process.exit(0);
});
