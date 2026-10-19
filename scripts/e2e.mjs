import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
const [mode = "full", ...extra] = process.argv.slice(2);
const plans = {
  full: [],
  coverage: [],
  routes: ["routes.spec.ts"],
  smoke: [
    "--grep",
    "archive search|credentials login|guest product cart|native editor creates|reservation uses|network guard",
  ],
  stability: ["--repeat-each=3"],
};
if (!(mode in plans))
  throw new Error("Choose full, smoke, routes, stability, or coverage.");
const lock = resolve(".e2e-run.lock");
try {
  mkdirSync(lock);
} catch {
  throw new Error(
    "Another local E2E run owns .e2e-run.lock. Wait for it to finish. After a crashed process, inspect owner.json before removing the stale lock.",
  );
}
writeFileSync(
  `${lock}/owner.json`,
  JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
);
const child = spawn(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", ...plans[mode], ...extra],
  {
    stdio: "inherit",
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      E2E_CODE_COVERAGE: mode === "coverage" ? "1" : "0",
      E2E_REQUIRE_FULL:
        (mode === "full" || mode === "stability" || mode === "coverage") &&
        !extra.length
          ? "1"
          : "0",
    },
  },
);
const terminate = (signal) => {
  try {
    if (process.platform === "win32") child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch {}
};
const onSignal = () => terminate("SIGTERM");
process.once("SIGINT", onSignal);
process.once("SIGTERM", onSignal);
const timeout = setTimeout(() => terminate("SIGTERM"), 660_000);
try {
  const code = await new Promise((done, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => done(code ?? 1));
  });
  process.exitCode = Number(code);
  if (
    process.exitCode === 0 &&
    (mode === "full" || mode === "stability" || mode === "coverage") &&
    !extra.length
  ) {
    const report = JSON.parse(
      readFileSync("artifacts/e2e-summary.json", "utf8"),
    );
    if (!report.complete) process.exitCode = 1;
  }
} finally {
  clearTimeout(timeout);
  process.removeListener("SIGINT", onSignal);
  process.removeListener("SIGTERM", onSignal);
  rmSync(lock, { recursive: true, force: true });
}
