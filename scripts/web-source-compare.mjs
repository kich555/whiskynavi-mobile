import { cp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
const mobile = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(mobile, "../whiskynavi");
const destination =
  process.env.COMPARE_WEB_DIRECTORY ??
  resolve(tmpdir(), "whiskynavi-visual-web");
await mkdir(destination, { recursive: true });
// Explicit allowlist: never copy .env, credentials, git state or test output.
for (const name of [
  "src",
  "public",
  "package.json",
  "tsconfig.json",
  "postcss.config.mjs",
  "next-env.d.ts",
  "next.config.ts",
  "tailwind.config.ts",
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
]) {
  await cp(resolve(source, name), resolve(destination, name), {
    recursive: true,
  });
}
try {
  await symlink(
    resolve(source, "node_modules"),
    resolve(destination, "node_modules"),
    "dir",
  );
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}
await writeFile(
  resolve(destination, ".visual-fixture-only"),
  "http://127.0.0.1:8787",
);
// No inherited service credentials or .env files. This server is only for local fixtures.
const env = Object.fromEntries(
  ["PATH", "HOME", "TMPDIR", "LANG", "SYSTEMROOT"]
    .filter((key) => process.env[key])
    .map((key) => [key, process.env[key]]),
);
Object.assign(env, {
  NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8787",
  NEXTAUTH_URL: "http://localhost:3101",
  NEXTAUTH_SECRET: "whiskynavi-local-visual-fixture-only",
});
const requireWeb = createRequire(resolve(source, "package.json"));
await readFile(resolve(destination, ".visual-fixture-only"));
console.log(`Isolated web source: ${destination}`);
console.log(
  `Next terminal: COMPARE_WEB_DIRECTORY='${destination}' COMPARE_WEB_ORIGIN=http://localhost:3101 npm run test:e2e:web`,
);
const child = spawn(
  process.execPath,
  [
    requireWeb.resolve("next/dist/bin/next"),
    "dev",
    destination,
    "--webpack",
    "--port",
    "3101",
  ],
  { cwd: destination, env, stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
