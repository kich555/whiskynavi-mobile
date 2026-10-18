import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
export function comparisonApiOrigin() {
  const webRoot = process.env.WHISKYNAVI_WEB_DIR ?? resolve("../whiskynavi");
  let value = "https://api.whiskynavi.com";
  for (const name of [
    ".env",
    ".env.development",
    ".env.local",
    ".env.development.local",
  ]) {
    try {
      value =
        parseEnv(readFileSync(resolve(webRoot, name), "utf8"))
          .NEXT_PUBLIC_API_BASE_URL ?? value;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  value =
    process.env.VISUAL_API_ORIGIN ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    value;
  const url = new URL(value);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Comparison API must use HTTPS or loopback HTTP.");
  return url.origin;
}
