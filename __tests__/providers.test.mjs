// providers.json schema and consistency — the file is the single source of
// truth for every provider fact, so its shape is contract-tested.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(path.join(ROOT, "providers.json"), "utf8"));
const providers = data.providers;
const EXPECTED = ["exa", "tavily", "perplexity", "firecrawl", "valyu"];

test("exactly the five providers", () => {
  assert.deepEqual(Object.keys(providers).sort(), EXPECTED.slice().sort());
});

test("env_file convention present with posix + windows paths and precedence", () => {
  assert.match(data.env_file.posix, /^~\/\.config\/elnora-websearch\/\.env$/);
  assert.ok(data.env_file.windows.includes("%USERPROFILE%"));
  assert.match(data.env_file.precedence, /environment wins/i);
});

for (const id of EXPECTED) {
  const p = providers[id];

  test(`${id}: required fields present and non-empty`, () => {
    for (const field of ["name", "site", "best_for", "env_var", "api_base"]) {
      assert.ok(typeof p[field] === "string" && p[field].length > 0, `${id}.${field}`);
    }
    for (const field of ["signup", "free_tier"]) {
      assert.ok(typeof p.keys?.[field] === "string" && p.keys[field].length > 0, `${id}.keys.${field}`);
    }
    assert.ok(typeof p.smoke_test?.posix === "string" && p.smoke_test.posix.length > 0, `${id}.smoke_test.posix`);
    assert.ok(typeof p.smoke_test?.expect === "string" && p.smoke_test.expect.length > 0, `${id}.smoke_test.expect`);
  });

  test(`${id}: env_var matches ^[A-Z0-9_]+_API_KEY$`, () => {
    assert.match(p.env_var, /^[A-Z0-9_]+_API_KEY$/);
  });

  test(`${id}: every URL is https`, () => {
    const stack = [[id, p]];
    while (stack.length) {
      const [where, node] = stack.pop();
      if (typeof node === "string") {
        assert.ok(!node.includes("http://"), `${where} contains non-https URL: ${node}`);
      } else if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) stack.push([`${where}.${k}`, v]);
      }
    }
    for (const url of [p.site, p.api_base, p.keys.signup]) assert.match(url, /^https:\/\//);
  });

  test(`${id}: official_cli, when present, has install/update commands`, () => {
    if (p.official_cli === null) return;
    for (const field of ["bin", "package", "repo", "install_posix", "install_windows", "update", "version_check"]) {
      assert.ok(
        typeof p.official_cli[field] === "string" && p.official_cli[field].length > 0,
        `${id}.official_cli.${field}`
      );
    }
  });

  test(`${id}: official_skills, when present, has install/update commands`, () => {
    if (p.official_skills === null) return;
    for (const field of ["source", "source_url", "install", "update"]) {
      assert.ok(
        typeof p.official_skills[field] === "string" && p.official_skills[field].length > 0,
        `${id}.official_skills.${field}`
      );
    }
    assert.ok(Array.isArray(p.official_skills.names) && p.official_skills.names.length > 0, `${id}.official_skills.names`);
  });
}

test("perplexity is the only provider without official skills, and it documents the bundled replacement", () => {
  assert.equal(providers.perplexity.official_skills, null);
  assert.match(providers.perplexity.bundled_skills_note, /skills\/perplexity/);
  for (const id of EXPECTED.filter((x) => x !== "perplexity")) {
    assert.notEqual(providers[id].official_skills, null, `${id} has official skills`);
  }
});

test("smoke tests never embed a literal key (env-var references only)", () => {
  for (const id of EXPECTED) {
    const cmd = providers[id].smoke_test.posix;
    assert.ok(!/\b(tvly|fc|pplx|sk)-[A-Za-z0-9]{16,}/.test(cmd), `${id} smoke test has no literal key`);
  }
});
