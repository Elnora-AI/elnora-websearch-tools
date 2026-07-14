// Manifest invariants: the marketplace, plugin, release-please manifest, and
// providers.json parse and agree. Mirrors scripts/check-json.mjs as unit tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");
const json = (rel) => JSON.parse(read(rel));

test("all manifests parse as JSON", () => {
  for (const rel of [
    ".claude-plugin/plugin.json",
    ".claude-plugin/marketplace.json",
    "providers.json",
    ".release-please-manifest.json",
    "release-please-config.json",
    "package.json",
  ]) {
    assert.doesNotThrow(() => json(rel), `${rel} must parse`);
  }
});

test("plugin is named websearch with source ./", () => {
  const plugin = json(".claude-plugin/plugin.json");
  const marketplace = json(".claude-plugin/marketplace.json");
  assert.equal(plugin.name, "websearch");
  assert.equal(marketplace.plugins.length, 1, "single-plugin marketplace");
  assert.equal(marketplace.plugins[0].name, "websearch");
  assert.equal(marketplace.plugins[0].source, "./");
});

test("version identical across plugin.json, marketplace.json, release-please manifest", () => {
  const plugin = json(".claude-plugin/plugin.json");
  const marketplace = json(".claude-plugin/marketplace.json");
  const manifest = json(".release-please-manifest.json");
  assert.ok(plugin.version, "plugin.json has a version");
  assert.equal(marketplace.plugins[0].version, plugin.version);
  assert.equal(manifest["."], plugin.version);
});

test("release-please config bumps both .claude-plugin manifests", () => {
  const config = json("release-please-config.json");
  const pkg = config.packages["."];
  assert.equal(pkg["release-type"], "node");
  assert.equal(pkg["package-name"], "@elnora-ai/websearch-tools");
  const paths = (pkg["extra-files"] ?? []).map((f) => f.path);
  assert.ok(paths.includes(".claude-plugin/plugin.json"));
  assert.ok(paths.includes(".claude-plugin/marketplace.json"));
});

test("package.json is private, zero-dependency, node >= 20", () => {
  const pkg = json("package.json");
  assert.equal(pkg.private, true);
  assert.equal(pkg.name, "@elnora-ai/websearch-tools");
  assert.equal(pkg.dependencies, undefined, "no dependencies");
  assert.equal(pkg.devDependencies, undefined, "no devDependencies");
  assert.match(pkg.engines.node, />=\s*20/);
});

test("guard scripts run clean against the repo", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  for (const script of ["scripts/check-json.mjs", "scripts/check-no-secrets.mjs"]) {
    await assert.doesNotReject(
      run(process.execPath, [path.join(ROOT, script)], { cwd: ROOT }),
      `${script} must exit 0`
    );
  }
});
