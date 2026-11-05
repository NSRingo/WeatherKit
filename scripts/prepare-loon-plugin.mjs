// Copyright 2026 hhhoratioxu. SPDX-License-Identifier: Apache-2.0
// Finalize native parameter types after the shared arguments generator.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../dist/iRingo.WeatherKit.lpx", import.meta.url);
let plugin = await readFile(file, "utf8");
for (const key of ["RequestCache.TTL", "RequestCache.ForecastTTL", "RequestCache.MinutelyTTL", "RequestCache.AlertsTTL", "RequestCache.BudgetMs", "RequestCache.CooldownSeconds"]) {
    const line = plugin.split("\n").find(line => line.startsWith(`${key} = input,`));
    assert.ok(line, `Missing Loon input: ${key}`);
    plugin = plugin.replace(line, line.replace(/(input,"[^"]*",)/, "$1type=string,"));
}
for (const key of ["RequestCache.Diagnostics", "ProviderFallback.Enabled"]) {
    const declaration = `${key} = switch,false,type=boolean,`;
    plugin = plugin.replace(`${key} = switch,false,`, declaration);
    assert.ok(plugin.includes(declaration), `Missing typed switch: ${key}`);
}
const region = plugin.split("\n").find(line => line.startsWith("Region.Fallback = select,"));
assert.ok(region, "Missing Loon region selector");
plugin = plugin.replace(region, region.replace(",tag=", ",type=string,tag="));
await writeFile(file, plugin);
