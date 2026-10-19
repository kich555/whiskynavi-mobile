import { checkpointNavigations } from "./navigation-coverage";
import { randomUUID } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";
export const test = base.extend<{ blockedOrigins: string[]; safety: void }>({
  extraHTTPHeaders: async ({}, use) => {
    await use({ "X-E2E-Test-Id": randomUUID() });
  },
  blockedOrigins: async ({}, use) => {
    await use([]);
  },
  request: async ({ playwright, extraHTTPHeaders }, use) => {
    const client = await playwright.request.newContext({ extraHTTPHeaders });
    try {
      await use(client);
    } finally {
      const result = await client.post("http://127.0.0.1:8787/__test/dispose");
      expect(result.ok(), "fixture cleanup must finish").toBe(true);
      await client.dispose();
    }
  },
  safety: [
    async ({ context, page, request, blockedOrigins }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (
          ["http://127.0.0.1:19006", "http://127.0.0.1:8787"].includes(
            url.origin,
          ) ||
          ["data:", "blob:"].includes(url.protocol)
        )
          return route.continue();
        blockedOrigins.push(
          `${route.request().method()} ${url.origin}${url.pathname}`,
        );
        return route.abort("blockedbyclient");
      });
      expect(
        (await request.post("http://127.0.0.1:8787/__test/reset")).ok(),
      ).toBe(true);
      let stopCoverage: (() => Promise<void>) | undefined;
      if (process.env.E2E_CODE_COVERAGE === "1") {
        const { collectBrowserCoverage } =
          await import("../../scripts/browser-coverage.mjs");
        await page.coverage.startJSCoverage({ resetOnNavigation: false });
        const restore = checkpointNavigations(page, async () => {
          await collectBrowserCoverage(page);
          await page.coverage.startJSCoverage({ resetOnNavigation: false });
        });
        stopCoverage = async () => {
          restore();
          await collectBrowserCoverage(page);
        };
      }
      await use();
      await stopCoverage?.();
      const state = await (
        await request.get("http://127.0.0.1:8787/__test/state")
      ).json();
      expect(
        state.unhandled,
        "Every application API needs an explicit fixture contract",
      ).toEqual([]);
      expect(errors, "No screen may fail silently during render").toEqual([]);
      expect(
        blockedOrigins,
        "E2E must never contact non-fixture origins",
      ).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
export async function login(
  page: Page,
  callback = "/",
  credentials = { email: "rn@example.test", password: "mobile-e2e-123" },
) {
  await page.goto(`/sign-in?callbackUrl=${encodeURIComponent(callback)}`);
  await page
    .getByRole("textbox", { name: "이메일 주소", exact: true })
    .fill(credentials.email);
  await page.getByLabel("비밀번호", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(
      callback === "/" ? "/$" : callback.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ),
  );
}
