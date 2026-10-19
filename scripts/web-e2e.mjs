import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { digestTree, sourceDigest } from "./e2e-cache.mjs";
const stampPath = ".e2e-dist-cache.json";
const fingerprint = sourceDigest();
let valid = false;
try {
  const stamp = JSON.parse(await readFile(stampPath, "utf8"));
  valid =
    stamp.input === fingerprint && stamp.output === digestTree(".e2e-dist");
} catch {
  /* A missing or corrupt cache is rebuilt. */
}
if (!valid) {
  const child = spawn(
    "npx",
    ["expo", "export", "--platform", "web", "--output-dir", ".e2e-dist"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        CI: "1",
        EXPO_NO_DOTENV: "1",
        APP_VARIANT: "e2e",
        EXPO_PUBLIC_E2E_MODE: "1",
        EXPO_PUBLIC_API_BASE_URL: "http://127.0.0.1:8787",
      },
    },
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.once(signal, () => child.kill(signal));
  const code = await new Promise((done, reject) => {
    child.on("exit", done);
    child.on("error", reject);
  });
  if (code !== 0) process.exit(code ?? 1);
  await writeFile(
    stampPath,
    JSON.stringify({ input: fingerprint, output: digestTree(".e2e-dist") }),
  );
} else console.log("Verified unchanged E2E bundle; reusing export.");
if (process.argv.includes("--build-only")) process.exit(0);
const root = resolve(".e2e-dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  try {
    let file = resolve(
      root,
      "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
    );
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      if (!(await stat(file)).isFile()) file = resolve(root, "index.html");
    } catch {
      file = resolve(root, "index.html");
    }
    res.setHeader(
      "Content-Type",
      types[extname(file)] ?? "application/octet-stream",
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(500);
    res.end("Preview unavailable");
  }
});
server.listen(19006, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
