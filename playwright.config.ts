import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e/web",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  forbidOnly: Boolean(process.env.CI),
  outputDir: "artifacts/playwright",
  reporter: [["list"], ["junit", { outputFile: "artifacts/playwright.xml" }]],
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
