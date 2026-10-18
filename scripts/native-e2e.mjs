import { spawnSync, spawn } from "node:child_process";
import { readdirSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const platform = process.argv[2] ?? "android";
if (!["android", "ios"].includes(platform))
  throw new Error("Choose android or ios.");
const env = {
  ...process.env,
  APP_VARIANT: "e2e",
  EXPO_PUBLIC_E2E_MODE: "1",
  EXPO_PUBLIC_API_BASE_URL: "http://127.0.0.1:8787",
  CI: "1",
};
function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { stdio: "inherit", env, ...options });
  if (result.error || result.status !== 0)
    throw new Error(
      `${cmd} failed. Check the toolchain and emulator prerequisites in e2e/README.md.`,
    );
}
function installed(command) {
  const result = spawnSync(command, ["--version"], { stdio: "ignore" });
  return !result.error && result.status === 0;
}
if (!installed("maestro"))
  throw new Error("Maestro CLI is required. See e2e/README.md.");
if (platform === "android") {
  if (!installed("adb"))
    throw new Error(
      "Android SDK platform-tools and a running emulator are required.",
    );
  run("adb", ["get-state"]);
} else {
  if (process.platform !== "darwin")
    throw new Error("iOS simulator tests require macOS with full Xcode.");
  run("xcrun", ["simctl", "list", "devices", "booted"]);
}
const existing = await fetch("http://127.0.0.1:8787/health", {
  signal: AbortSignal.timeout(500),
}).catch(() => null);
if (existing)
  throw new Error(
    "Port 8787 is already in use. Stop the existing fixture process first.",
  );
const server = spawn(process.execPath, ["e2e/fixtures/server.mjs"], {
  stdio: "inherit",
  env,
});
let ready = false;
try {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null)
      throw new Error(
        "Fixture server failed to start; port 8787 must be free.",
      );
    try {
      const response = await fetch("http://127.0.0.1:8787/health");
      if (
        response.ok &&
        (await response.json()).environment === "isolated-fixture"
      ) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((done) => setTimeout(done, 250));
  }
  if (!ready) throw new Error("Fixture server not ready.");
  if (platform === "android") {
    run("npx", ["expo", "prebuild", "--platform", "android", "--no-install"]);
    run(
      "./gradlew",
      [
        ":app:assembleRelease",
        "-PreactNativeArchitectures=x86_64,arm64-v8a",
        "--no-daemon",
      ],
      { cwd: resolve("android") },
    );
    run("adb", ["reverse", "tcp:8787", "tcp:8787"]);
    run("adb", [
      "install",
      "-r",
      "android/app/build/outputs/apk/release/app-release.apk",
    ]);
  } else {
    run("npx", ["expo", "prebuild", "--platform", "ios"]);
    run("npx", [
      "expo",
      "run:ios",
      "--configuration",
      "Release",
      "--no-bundler",
    ]);
  }
  mkdirSync("artifacts", { recursive: true });
  const flows = readdirSync("e2e/maestro")
    .filter((name) => name.endsWith(".yaml"))
    .map((name) => `e2e/maestro/${name}`);
  run("maestro", [
    "test",
    "-e",
    "APP_ID=com.whiskynavi.mobile.e2e",
    "--format",
    "JUNIT",
    "--output",
    "artifacts/maestro.xml",
    "--debug-output",
    "artifacts/maestro-debug",
    "--test-output-dir",
    "artifacts/maestro",
    ...flows,
  ]);
} finally {
  server.kill("SIGTERM");
}
