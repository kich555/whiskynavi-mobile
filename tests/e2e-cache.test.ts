import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { digestTree } from "../scripts/e2e-cache.mjs";
it("invalidates cache on edited, added and removed files regardless of timestamp", () => {
  const dir = mkdtempSync(join(tmpdir(), "navi-cache-test-"));
  try {
    writeFileSync(join(dir, "a.ts"), "before");
    const before = digestTree(dir);
    writeFileSync(join(dir, "a.ts"), "after");
    expect(digestTree(dir)).not.toBe(before);
    const edited = digestTree(dir);
    writeFileSync(join(dir, "b.ts"), "new");
    expect(digestTree(dir)).not.toBe(edited);
    rmSync(join(dir, "b.ts"));
    expect(digestTree(dir)).toBe(edited);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
