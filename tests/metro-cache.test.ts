import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const configSource = readFileSync(
  new URL("../metro.config.js", import.meta.url),
  "utf8",
);
const temporaryRoots: string[] = [];
function workspace() {
  const directory = mkdtempSync(path.join(tmpdir(), "whiskynavi-metro-test-"));
  temporaryRoots.push(directory);
  return directory;
}
function loadConfig(
  project: string,
  temporary: string,
  environment: Record<string, string> = {},
) {
  const module = {
    exports: {} as {
      cacheVersion: string;
      cacheStores: {
        set: (key: Buffer, value: unknown) => Promise<void>;
        get: (key: Buffer) => Promise<unknown>;
      }[];
    },
  };
  const scopedRequire = (name: string) => {
    // Expo's unrelated resolver defaults are outside this cache/install regression.
    if (name === "expo/metro-config") return { getDefaultConfig: () => ({}) };
    if (name === "node:os")
      return { ...require(name), tmpdir: () => temporary };
    return require(name);
  };
  new Function(
    "require",
    "module",
    "exports",
    "__dirname",
    "process",
    configSource,
  )(scopedRequire, module, module.exports, project, { env: environment });
  return module.exports;
}
afterEach(() => {
  for (const directory of temporaryRoots.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
describe("Metro cache and dependency installation", () => {
  it("keeps live Metro cache intact when npm ci cleans the dependency tree", async () => {
    const root = workspace();
    const config = loadConfig(root, path.join(root, "os-cache"));
    const key = Buffer.from("02aabbcc", "hex");
    const value = { transformed: "cached development module" };
    await config.cacheStores[0].set(key, value);
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "metro-install-regression",
        version: "1.0.0",
        private: true,
      }),
    );
    writeFileSync(
      path.join(root, "package-lock.json"),
      JSON.stringify({
        name: "metro-install-regression",
        version: "1.0.0",
        lockfileVersion: 3,
        packages: {
          "": { name: "metro-install-regression", version: "1.0.0" },
        },
      }),
    );
    execFileSync(
      "npm",
      ["ci", "--ignore-scripts", "--offline", "--no-audit", "--no-fund"],
      { cwd: root, stdio: "pipe" },
    );
    expect(await config.cacheStores[0].get(key)).toEqual(value);
    await config.cacheStores[0].set(key, {
      transformed: "server still writes",
    });
    expect(await config.cacheStores[0].get(key)).toEqual({
      transformed: "server still writes",
    });
  });
  it("isolates projects and E2E cache without removing API-origin invalidation", async () => {
    const root = workspace();
    const cache = path.join(root, "os-cache");
    const normal = loadConfig(path.join(root, "normal"), cache);
    const otherProject = loadConfig(path.join(root, "other"), cache);
    const e2e = loadConfig(path.join(root, "normal"), cache, {
      APP_VARIANT: "e2e",
      EXPO_PUBLIC_API_BASE_URL: "http://127.0.0.1:8787",
    });
    const differentApi = loadConfig(path.join(root, "normal"), cache, {
      EXPO_PUBLIC_API_BASE_URL: "https://api.example.test",
    });
    const key = Buffer.from("02aabbcc", "hex");
    await normal.cacheStores[0].set(key, "production");
    expect(await e2e.cacheStores[0].get(key)).toBeNull();
    expect(await otherProject.cacheStores[0].get(key)).toBeNull();
    expect(normal.cacheVersion).not.toEqual(e2e.cacheVersion);
    expect(normal.cacheVersion).not.toEqual(differentApi.cacheVersion);
  });
});
