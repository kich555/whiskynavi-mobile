import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { MCR } from "monocart-coverage-reports";
const sourcePath = (path) => {
  if (path.includes("node_modules/")) return path;
  const index = path.indexOf("src/");
  return index >= 0 ? path.slice(index) : path;
};
export function browserCoverage() {
  return MCR({
    name: "WhiskyNavi RN browser execution coverage",
    outputDir: "artifacts/browser-coverage",
    reports: ["v8", "console-summary", "json-summary"],
    entryFilter: (entry) =>
      entry.url.startsWith("http://127.0.0.1:19006/_expo/") &&
      entry.url.endsWith(".js"),
    sourceFilter: (path) =>
      !path.includes("node_modules/") &&
      /\.tsx?$/.test(path) &&
      sourcePath(path).startsWith("src/") &&
      !sourcePath(path).startsWith("src/apis/generated/"),
    sourcePath,
    all: {
      dir: "src",
      filter: {
        "**/apis/generated/**": false,
        "**/*.d.ts": false,
        "**/*.ts": true,
        "**/*.tsx": true,
      },
      transformer: async (entry) => {
        const filename = fileURLToPath(entry.url);
        const result = ts.transpileModule(entry.source, {
          fileName: filename,
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
            sourceMap: true,
            inlineSources: true,
          },
        });
        entry.source = result.outputText;
        entry.sourceMap = JSON.parse(result.sourceMapText);
        entry.sourceMap.sources = [relative(process.cwd(), filename)];
      },
    },
  });
}
export async function collectBrowserCoverage(page) {
  const data = await page.coverage.stopJSCoverage();
  const entries = data.filter(
    (entry) =>
      entry.url.startsWith("http://127.0.0.1:19006/_expo/") &&
      entry.url.endsWith(".js"),
  );
  if (!entries.length) throw new Error("No application coverage collected");
  for (const entry of entries) {
    const path = resolve(
      ".e2e-dist",
      "." + new URL(entry.url).pathname + ".map",
    );
    entry.sourceMap = JSON.parse(readFileSync(path, "utf8"));
  }
  await browserCoverage().add(entries);
}
