import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/apis/generated/**"],
      reporter: ["text-summary", "json-summary", "json", "html"],
      reportsDirectory: "artifacts/unit-coverage",
      // Keep proven business/security policies at full coverage as tests evolve.
      // Other app files remain in the report; this is not a whole-app 100% claim.
      thresholds: {
        "src/features/account/constants.ts": { 100: true, perFile: true },
        "src/features/reservation/policy.ts": { 100: true, perFile: true },
        "src/lib/callback-policy.ts": { 100: true, perFile: true },
        "src/lib/external-app-url.ts": { 100: true, perFile: true },
        "src/lib/provider-flow.ts": { 100: true, perFile: true },
      },
    },
  },
});
