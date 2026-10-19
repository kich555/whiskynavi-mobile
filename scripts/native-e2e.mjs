import { spawnSync, spawn } from "node:child_process";
import {
  readdirSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { digestTree, sourceDigest } from "./e2e-cache.mjs";
const platform = process.argv[2] ?? "android";
if (!["android", "ios"].includes(platform))
  throw new Error("Choose android or ios.");
const buildOnly = process.argv.includes("--build-only");
if (buildOnly && platform !== "android")
  throw new Error("Build-only currently supports Android.");
const buildArch = process.argv
  .find((arg) => arg.startsWith("--arch="))
  ?.split("=")[1];
if (buildOnly && !["x86_64", "arm64-v8a"].includes(buildArch))
  throw new Error("Build-only requires --arch=x86_64 or --arch=arm64-v8a");
const env = {
  ...process.env,
  APP_VARIANT: "e2e",
  EXPO_PUBLIC_E2E_MODE: "1",
  EXPO_PUBLIC_API_BASE_URL: "http://127.0.0.1:8787",
  CI: "1",
  EXPO_NO_DOTENV: "1",
};
let activeChild;
async function run(cmd, args, options = {}) {
  activeChild = spawn(cmd, args, {
    stdio: "inherit",
    env,
    detached: process.platform !== "win32",
    ...options,
  });
  const status = await new Promise((done, reject) => {
    activeChild.on("error", reject);
    activeChild.on("exit", done);
  });
  activeChild = undefined;
  if (status !== 0)
    throw new Error(
      `${cmd} failed. Check the toolchain and emulator prerequisites in e2e/README.md.`,
    );
}
function installed(command) {
  const result = spawnSync(command, ["--version"], { stdio: "ignore" });
  return !result.error && result.status === 0;
}
if (!buildOnly && !installed("maestro"))
  throw new Error("Maestro CLI is required. See e2e/README.md.");
if (platform === "android") {
  if (!buildOnly && !installed("adb"))
    throw new Error(
      "Android SDK platform-tools and a running emulator are required.",
    );
  if (!buildOnly) await run("adb", ["get-state"]);
} else {
  if (process.platform !== "darwin")
    throw new Error("iOS simulator tests require macOS with full Xcode.");
  const devices = spawnSync(
    "xcrun",
    ["simctl", "list", "devices", "booted", "--json"],
    { encoding: "utf8" },
  );
  let available = false;
  try {
    available = Object.values(JSON.parse(devices.stdout).devices)
      .flat()
      .some((device) => device.state === "Booted" && device.isAvailable);
  } catch {}
  if (!available)
    throw new Error("Boot an available iOS simulator before running E2E.");
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
const startedAt = new Date().toISOString();
let success = false;
let interrupted = false;
const interrupt = () => {
  interrupted = true;
  server.kill("SIGTERM");
  if (activeChild) {
    try {
      if (process.platform === "win32") activeChild.kill("SIGTERM");
      else process.kill(-activeChild.pid, "SIGTERM");
    } catch {}
  }
};
process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);
const deadline = setTimeout(interrupt, 50 * 60_000);

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
    const arch = buildOnly
      ? buildArch
      : spawnSync("adb", ["shell", "getprop", "ro.product.cpu.abi"], {
          encoding: "utf8",
        }).stdout?.trim();
    if (!["x86_64", "arm64-v8a"].includes(arch))
      throw new Error("Unsupported emulator architecture");
    mkdirSync("artifacts/native-build", { recursive: true });
    const apk = "artifacts/native-build/app-e2e.apk";
    const stampPath = "artifacts/native-build/stamp.json";
    const input =
      sourceDigest() + arch + digestTree("scripts", ["native-e2e.mjs"]);
    let cached = false;
    try {
      const stamp = JSON.parse(readFileSync(stampPath, "utf8"));
      cached =
        stamp.input === input &&
        stamp.output === digestTree("artifacts/native-build", ["app-e2e.apk"]);
    } catch {}
    if (!cached) {
      await run("npx", [
        "expo",
        "prebuild",
        "--platform",
        "android",
        "--no-install",
      ]);
      await run(
        "./gradlew",
        [
          ":app:assembleRelease",
          `-PreactNativeArchitectures=${arch}`,
          "--build-cache",
          "--max-workers=2",
          "--no-daemon",
        ],
        { cwd: resolve("android") },
      );
      copyFileSync(
        "android/app/build/outputs/apk/release/app-release.apk",
        apk,
      );
      writeFileSync(
        stampPath,
        JSON.stringify({
          input,
          output: digestTree("artifacts/native-build", ["app-e2e.apk"]),
        }),
      );
    } else console.log("Verified unchanged native E2E APK; reusing build.");
    if (!buildOnly) {
      await run("adb", ["reverse", "tcp:8787", "tcp:8787"]);
      await run("adb", ["install", "-r", apk]);
    }
  } else {
    await run("npx", ["expo", "prebuild", "--platform", "ios"]);
    await run("npx", [
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
  if (!buildOnly)
    await run("maestro", [
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
  success = true;
} finally {
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    "artifacts/native-summary.json",
    JSON.stringify(
      {
        platform,
        kind: buildOnly ? "build" : "native-e2e",
        startedAt,
        finishedAt: new Date().toISOString(),
        status: success && !interrupted ? "passed" : "failed",
        sourceFingerprint: sourceDigest(),
      },
      null,
      2,
    ),
  );
  clearTimeout(deadline);
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", interrupt);
  if (platform === "android" && !buildOnly)
    spawnSync("adb", ["reverse", "--remove", "tcp:8787"], { stdio: "ignore" });
  server.kill("SIGTERM");
  if (interrupted) process.exitCode = 1;
}
