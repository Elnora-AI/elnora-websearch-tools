#!/usr/bin/env node
// CI guard: manifests parse, agree with each other, and providers.json holds
// the full schema for exactly the five providers. Zero dependencies; Node >= 20.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (msg) => errors.push(msg);

function loadJson(rel) {
  try {
    return JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));
  } catch (err) {
    fail(`${rel}: does not parse as JSON (${err.message})`);
    return null;
  }
}

const plugin = loadJson(".claude-plugin/plugin.json");
const marketplace = loadJson(".claude-plugin/marketplace.json");
const providers = loadJson("providers.json");
const manifest = loadJson(".release-please-manifest.json");

// --- plugin.json / marketplace.json / release-please manifest agreement ---
if (plugin && marketplace && manifest) {
  if (plugin.name !== "websearch") fail(`plugin.json: name must be "websearch", got "${plugin.name}"`);
  const entry = marketplace.plugins?.[0];
  if (!entry) fail("marketplace.json: plugins[0] missing");
  else {
    if (entry.name !== "websearch") fail(`marketplace.json: plugins[0].name must be "websearch", got "${entry.name}"`);
    if (entry.source !== "./") fail(`marketplace.json: plugins[0].source must be "./", got "${entry.source}"`);
    const versions = {
      ".claude-plugin/plugin.json": plugin.version,
      ".claude-plugin/marketplace.json": entry.version,
      ".release-please-manifest.json": manifest["."],
    };
    const distinct = new Set(Object.values(versions));
    if (distinct.size !== 1 || distinct.has(undefined)) {
      fail(`version mismatch: ${JSON.stringify(versions)}`);
    }
  }
}

// --- providers.json schema ---
const EXPECTED = ["exa", "tavily", "perplexity", "firecrawl", "valyu"];
if (providers) {
  const keys = Object.keys(providers.providers ?? {});
  if (keys.slice().sort().join(",") !== EXPECTED.slice().sort().join(",")) {
    fail(`providers.json: expected exactly ${EXPECTED.join(", ")}; got ${keys.join(", ") || "(none)"}`);
  }
  for (const [id, p] of Object.entries(providers.providers ?? {})) {
    for (const field of ["name", "site", "best_for", "env_var", "api_base"]) {
      if (typeof p[field] !== "string" || p[field].length === 0) fail(`providers.${id}.${field}: missing or empty`);
    }
    for (const field of ["signup", "free_tier"]) {
      if (typeof p.keys?.[field] !== "string" || p.keys[field].length === 0) fail(`providers.${id}.keys.${field}: missing or empty`);
    }
    for (const field of ["posix", "expect"]) {
      if (typeof p.smoke_test?.[field] !== "string" || p.smoke_test[field].length === 0) fail(`providers.${id}.smoke_test.${field}: missing or empty`);
    }
    if (typeof p.env_var === "string" && !/^[A-Z0-9_]+_API_KEY$/.test(p.env_var)) {
      fail(`providers.${id}.env_var: "${p.env_var}" does not match ^[A-Z0-9_]+_API_KEY$`);
    }
    for (const [field, url] of [["site", p.site], ["api_base", p.api_base], ["keys.signup", p.keys?.signup]]) {
      if (typeof url === "string" && !url.startsWith("https://")) fail(`providers.${id}.${field}: URL must be https, got "${url}"`);
    }
  }
  // No plain-http URL anywhere in the file.
  const stack = [["providers.json", providers]];
  while (stack.length) {
    const [where, node] = stack.pop();
    if (typeof node === "string") {
      if (node.includes("http://")) fail(`${where}: contains a non-https URL`);
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) stack.push([`${where}.${k}`, v]);
    }
  }
}

if (errors.length > 0) {
  console.error("check:json FAILED:\n");
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log("check:json OK — manifests consistent, providers.json valid.");
