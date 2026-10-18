import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const webProject = resolve(process.argv[2] ?? "../whiskynavi");
const source = await readFile(resolve(webProject, "src/apis/generated/api.ts"));
await mkdir("src/apis/generated", { recursive: true });
await writeFile("src/apis/generated/api.ts", source);
await writeFile(
  "api-provenance.json",
  JSON.stringify(
    {
      sourceRepository: "whiskynavi",
      sourceFile: "src/apis/generated/api.ts",
      sha256: createHash("sha256").update(source).digest("hex"),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "API contract copied unchanged. Run typecheck, test and E2E before committing.",
);
