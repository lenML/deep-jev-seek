import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(resolve(root, "src/app.ts"), "utf8");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

assert.equal(pkg.name, "@lenml/jevseek-server");
assert.equal(pkg.dependencies["@lenml/jevseek"], "workspace:*");

for (const route of ["/", "/healthz", "/v1/models", "/v1/systemone"]) {
  assert.ok(app.includes(`pathname === "${route}"`), `missing route ${route}`);
}

for (const contract of [
  "Authorization",
  "DEEPSEEK_API_KEY",
  "jev-latest",
  "jev-preview",
  "DEEPSEEK_MODEL",
  "deepseek-flash",
  "access-control-allow-origin",
  "payload_too_large",
  "invalid_json",
  "server.stop(true)",
]) {
  assert.ok(app.includes(contract), `missing contract ${contract}`);
}

console.log("server static contract checks passed");
