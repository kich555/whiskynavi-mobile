import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
export function digestTree(root, entries = readdirSync(root)) {
  const hash = createHash("sha256");
  const visit = (relative) => {
    const path = join(root, relative);
    hash.update(relative);
    if (!existsSync(path)) {
      hash.update("missing");
      return;
    }
    if (statSync(path).isDirectory()) {
      for (const name of readdirSync(path).sort()) visit(join(relative, name));
    } else hash.update(readFileSync(path));
  };
  for (const entry of [...entries].sort()) visit(entry);
  return hash.digest("hex");
}
export function sourceDigest() {
  return (
    digestTree(process.cwd(), [
      "src",
      "assets",
      "public",
      "package.json",
      "package-lock.json",
      "app.json",
      "app.config.ts",
      "metro.config.js",
      "babel.config.js",
      "tsconfig.json",
      "scripts/web-e2e.mjs",
      "scripts/e2e-cache.mjs",
    ]) + `-${process.version}-${process.platform}-${process.arch}`
  );
}
