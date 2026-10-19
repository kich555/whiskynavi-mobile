import { availableParallelism } from "node:os";
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e/web",
  testIgnore: process.env.COMPARE_WEB_ORIGIN ? [] : ["**/design-sync.spec.ts"],
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  fullyParallel: true,
  workers: process.env.CI ? Math.min(4, availableParallelism()) : 4,
  retries: 0,
  failOnFlakyTests: true,
  globalTimeout: 600_000,
  timeout: 30_000,
  forbidOnly: Boolean(process.env.CI),
  outputDir: "artifacts/playwright",
  reporter: [
    ["./e2e/reporter.mjs"],
    ["list"],
    ["junit", { outputFile: "artifacts/playwright.xml" }],
    ["json", { outputFile: "artifacts/playwright.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:19006",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile-web-preview",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [
    {
      command: "node e2e/fixtures/server.mjs",
      url: "http://127.0.0.1:8787/health",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "node scripts/web-e2e.mjs",
      url: "http://127.0.0.1:19006",
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
