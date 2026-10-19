import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";
const cli = resolve("scripts/e2e.mjs");
it("refuses concurrent execution without removing the active owner's lock", () => {
  const cwd = mkdtempSync(join(tmpdir(), "navi-e2e-lock-"));
  try {
    mkdirSync(join(cwd, ".e2e-run.lock"));
    writeFileSync(join(cwd, ".e2e-run.lock/owner.json"), "owner-canary");
    const result = spawnSync(process.execPath, [cli, "full"], {
      cwd,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Another local E2E run owns");
    expect(readFileSync(join(cwd, ".e2e-run.lock/owner.json"), "utf8")).toBe(
      "owner-canary",
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
it("rejects unknown CLI modes before creating a lock or starting services", () => {
  const cwd = mkdtempSync(join(tmpdir(), "navi-e2e-invalid-"));
  try {
    const result = spawnSync(process.execPath, [cli, "unsupported"], {
      cwd,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(existsSync(join(cwd, ".e2e-run.lock"))).toBe(false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
