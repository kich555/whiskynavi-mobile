import { spawnSync } from "node:child_process";
const platform = process.argv[2] ?? "android";
if (!["android", "ios"].includes(platform))
  throw new Error("Choose android or ios.");
const available = (command, args) => {
  const result = spawnSync(command, args, { stdio: "pipe" });
  return !result.error && result.status === 0;
};
const checks = {
  node: Number(process.versions.node.split(".")[0]) >= 22,
  maestro: available("maestro", ["--version"]),
  java: available("java", ["-version"]),
  ...(platform === "android"
    ? {
        androidSdk: Boolean(
          process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT,
        ),
        adb: available("adb", ["version"]),
        runningEmulator: available("adb", ["get-state"]),
      }
    : {
        macOS: process.platform === "darwin",
        xcode: available("xcrun", ["simctl", "list", "devices", "booted"]),
      }),
};
console.log(
  JSON.stringify(
    { platform, ready: Object.values(checks).every(Boolean), checks },
    null,
    2,
  ),
);
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
