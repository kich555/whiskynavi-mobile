import { readFileSync, readdirSync } from "node:fs";
import { parseAllDocuments } from "yaml";
for (const name of readdirSync("e2e/maestro").filter((name) =>
  name.endsWith(".yaml"),
)) {
  const docs = parseAllDocuments(readFileSync(`e2e/maestro/${name}`, "utf8"));
  if (
    docs.some((doc) => doc.errors.length) ||
    docs.length !== 2 ||
    !Array.isArray(docs[1].toJSON()) ||
    !docs[0].toJSON().appId
  )
    throw new Error(`Invalid Maestro YAML: ${name}`);
  console.log(`Validated Maestro flow: ${name}`);
}
