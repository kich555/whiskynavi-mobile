const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require("metro-cache");
const path = require("node:path");
const os = require("node:os");
const { createHash } = require("node:crypto");

const config = getDefaultConfig(__dirname);
const flavor = process.env.APP_VARIANT === "e2e" ? "e2e" : "production";
config.cacheVersion = `whiskynavi-${flavor}-${process.env.EXPO_PUBLIC_API_BASE_URL ?? "default"}`;
const projectKey = createHash("sha256")
  .update(path.resolve(__dirname))
  .digest("hex")
  .slice(0, 16);
// npm ci removes node_modules; a live Metro cache must not be stored there.
config.cacheStores = [
  new FileStore({
    root: path.join(os.tmpdir(), "whiskynavi-metro", projectKey, flavor),
  }),
];
module.exports = config;
