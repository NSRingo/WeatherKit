// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
let plugin = await readFile(new URL("../dist/iRingo.WeatherKit.lpx", import.meta.url), "utf8");
assert.doesNotMatch(plugin, /RequestCache|ProviderFallback|Region\.Fallback/);
const defaults = new Map([...plugin.matchAll(/^([^=\n]+?)\s*=\s*(?:input|select),("(?:\\.|[^"\\])*")/gm)].map(([, key, value]) => [key.trim(), JSON.parse(value)]));
const original = JSON.parse(await readFile(new URL("../tests/fixtures/upstream-intent.json", import.meta.url), "utf8")).originalArgumentDefaults;
assert.equal(defaults.size, 13);
assert.equal(defaults.get("WeatherAlerts.Language"), "Auto");
for (const [key, value] of Object.entries(original)) assert.equal(defaults.get(key), value);

if (!/^#!loon_version = /m.test(plugin)) plugin = plugin.replace(/^(#!system_version = .+)$/m, "$1\n#!loon_version = 3.5.1(983)");
await writeFile(new URL("../dist/iRingo.WeatherKit.lpx", import.meta.url), plugin);
