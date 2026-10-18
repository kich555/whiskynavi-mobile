const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require("metro-cache");
const path = require("node:path");

const config = getDefaultConfig(__dirname);
const flavor = process.env.APP_VARIANT === "e2e" ? "e2e" : "production";
config.cacheVersion = `whiskynavi-${flavor}-${process.env.EXPO_PUBLIC_API_BASE_URL ?? "default"}`;
config.cacheStores = [
  new FileStore({
    root: path.join(__dirname, "node_modules", ".cache", "metro", flavor),
  }),
];
module.exports = config;
