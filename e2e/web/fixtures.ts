import { randomUUID } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";
export const test = base.extend({
  extraHTTPHeaders: async ({}, use) => {
    await use({ "X-E2E-Test-Id": randomUUID() });
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
});
export { expect };

export async function login(page: Page, callback = "/") {
  await page.goto(`/sign-in?callbackUrl=${encodeURIComponent(callback)}`);
  await page
    .getByRole("textbox", { name: "이메일 주소", exact: true })
    .fill("rn@example.test");
  await page.getByLabel("비밀번호", { exact: true }).fill("mobile-e2e-123");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(
      callback === "/" ? "/$" : callback.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ),
  );
}

export const blockedOrigins = new WeakMap<Page, string[]>();
const renderErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ request, context, page }) => {
  const errors: string[] = [];
  renderErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  const blocked: string[] = [];
  blockedOrigins.set(page, blocked);
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      ["http://127.0.0.1:19006", "http://127.0.0.1:8787"].includes(
        url.origin,
      ) ||
      ["data:", "blob:"].includes(url.protocol)
    )
      return route.continue();
    blocked.push(`${route.request().method()} ${url.origin}${url.pathname}`);
    return route.abort("blockedbyclient");
  });
  await request.post("http://127.0.0.1:8787/__test/reset");
});
test.afterEach(async ({ page }) => {
  expect(
    renderErrors.get(page) ?? [],
    "No screen may fail silently during render",
  ).toEqual([]);
  expect(
    blockedOrigins.get(page) ?? [],
    "E2E must never contact non-fixture origins",
  ).toEqual([]);
});
