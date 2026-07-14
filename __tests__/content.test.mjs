// Docs and plugin content stay consistent with providers.json — every env var
// documented, install one-liners correct, frontmatter valid.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const providers = JSON.parse(readFileSync(path.join(ROOT, "providers.json"), "utf8")).providers;
const readDoc = (rel) => readFileSync(path.join(ROOT, rel), "utf8"); // throws if the doc is missing — that is a failure

// Minimal frontmatter parser: leading --- block, `key: value` lines, with
// support for folded/literal block scalars (`key: >` / `key: |`).
function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/.exec(text);
  if (!m) return null;
  const fields = {};
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    let value = kv[2].trim();
    if (value === ">" || value === "|" || value === ">-" || value === "|-" || value === "") {
      const block = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) block.push(lines[++i].trim());
      value = block.join(" ");
    }
    fields[kv[1]] = value;
  }
  return fields;
}

test("every provider env var appears in README.md", () => {
  const readme = readDoc("README.md");
  for (const p of Object.values(providers)) {
    assert.ok(readme.includes(p.env_var), `README.md mentions ${p.env_var}`);
  }
});

test("every provider env var appears in INSTALL_FOR_AGENTS.md", () => {
  const doc = readDoc("INSTALL_FOR_AGENTS.md");
  for (const p of Object.values(providers)) {
    assert.ok(doc.includes(p.env_var), `INSTALL_FOR_AGENTS.md mentions ${p.env_var}`);
  }
});

test("README has both install one-liners with correct marketplace/plugin names", () => {
  const readme = readDoc("README.md");
  assert.ok(
    readme.includes("/plugin marketplace add Elnora-AI/elnora-websearch-tools"),
    "marketplace add one-liner"
  );
  assert.ok(readme.includes("/plugin install websearch@elnora-websearch-tools"), "plugin install one-liner");
});

test("every command file has valid frontmatter with a description", () => {
  const dir = path.join(ROOT, "commands");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  assert.ok(files.length >= 3, "setup/status/update commands exist");
  for (const f of files) {
    const fm = parseFrontmatter(readFileSync(path.join(dir, f), "utf8"));
    assert.ok(fm, `${f}: has a frontmatter block`);
    assert.ok(fm.description?.length > 0, `${f}: frontmatter has description`);
  }
});

test("every SKILL.md has valid frontmatter with name + description <= 1024 chars", () => {
  const skillsDir = path.join(ROOT, "skills");
  const skillFiles = readdirSync(skillsDir)
    .map((d) => path.join(skillsDir, d, "SKILL.md"))
    .filter((f) => existsSync(f));
  assert.ok(skillFiles.length >= 2, "websearch + perplexity skills exist");
  for (const f of skillFiles) {
    const rel = path.relative(ROOT, f);
    const fm = parseFrontmatter(readFileSync(f, "utf8"));
    assert.ok(fm, `${rel}: has a frontmatter block`);
    assert.ok(fm.name?.length > 0, `${rel}: frontmatter has name`);
    assert.ok(fm.description?.length > 0, `${rel}: frontmatter has description`);
    assert.ok(fm.description.length <= 1024, `${rel}: description ${fm.description.length} chars (max 1024)`);
  }
});

test("docs point keys at the env-file convention, never at committed files", () => {
  for (const rel of ["README.md", "INSTALL_FOR_AGENTS.md"]) {
    const doc = readDoc(rel);
    assert.ok(doc.includes("~/.config/elnora-websearch/.env"), `${rel} documents the key file location`);
  }
});
