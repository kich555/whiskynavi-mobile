import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
const forbidden = [
  "fixture-access",
  "fixture-refresh",
  "rn@example.test",
  "http://127.0.0.1:8787",
];
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await inspect(file);
    else if (/\.(js|hbc|json)$/.test(file)) {
      const buffer = await readFile(file);
      if (forbidden.some((value) => buffer.includes(Buffer.from(value))))
        throw new Error(
          `Test fixture content found in production bundle: ${file}`,
        );
    }
  }
}
await inspect(process.argv[2] ?? "dist");
console.log(
  "Production bundles contain no fixture credentials or fixture API origin.",
);
