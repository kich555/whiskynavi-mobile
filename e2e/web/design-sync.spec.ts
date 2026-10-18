import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { readFile, mkdir, writeFile } from "node:fs/promises";

test("paired reservation and board visual audit with isolated web source", async ({
  browser,
  request,
}) => {
  test.skip(
    !process.env.COMPARE_WEB_ORIGIN,
    "Optional local web-source comparison; see e2e/README.md",
  );
  test.setTimeout(180000);
  expect(process.env.COMPARE_WEB_ORIGIN).toBe("http://localhost:3101");
  const webDirectory =
    process.env.COMPARE_WEB_DIRECTORY ??
    resolve(tmpdir(), "whiskynavi-visual-web");
  expect(
    await readFile(resolve(webDirectory, ".visual-fixture-only"), "utf8"),
  ).toBe("http://127.0.0.1:8787");
  await request.post("http://127.0.0.1:8787/__test/reset");
  await request.post("http://127.0.0.1:8787/__test/seed-feed", {
    data: { design: true },
  });
  const requireWeb = createRequire(resolve(webDirectory, "package.json"));
  const { encode } = requireWeb("next-auth/jwt");
  const cookie = await encode({
    secret: "whiskynavi-local-visual-fixture-only",
    token: {
      id: "7",
      name: "모바일테스터",
      email: "rn@example.test",
      roles: ["ROLE_USER"],
      accessToken: "fixture-access",
      refreshToken: "fixture-refresh",
      tokenIssuedAt: Date.now(),
    },
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const errors: string[] = [];
  const blocked: string[] = [];
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      [
        "http://localhost:3101",
        "http://127.0.0.1:19006",
        "http://127.0.0.1:8787",
      ].includes(url.origin) ||
      ["data:", "blob:"].includes(url.protocol)
    )
      return route.continue();
    blocked.push(url.origin);
    return route.abort("blockedbyclient");
  });
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: cookie,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.log("Design render error:", error.message);
  });
  const directory = "artifacts/design-sync";
  await mkdir(directory, { recursive: true });
  // Same synthetic account/data; no production API or credentials.
  await page.goto("http://127.0.0.1:19006/sign-in?callbackUrl=%2Freservation");
  await page
    .getByRole("textbox", { name: "이메일 주소", exact: true })
    .fill("rn@example.test");
  await page.getByLabel("비밀번호", { exact: true }).fill("mobile-e2e-123");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/reservation$/);
  const captures = [];
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const target of ["web", "rn"]) {
      const origin =
        target === "web" ? "http://localhost:3101" : "http://127.0.0.1:19006";
      for (const [name, path, ready] of [
        ["reservation-list", "/reservation", "현재 진행 중인 예약"],
        ["reservation-detail", "/reservation/1", "싱글캐스크 예약"],
        ["community-list", "/board/community", "첫 번째 위스키 이야기"],
        [
          "community-detail",
          "/board/community/posts/1",
          "위스키를 함께 알아가는 공간입니다.",
        ],
        ["news-list", "/board/news", "첫 번째 위스키 이야기"],
        ["catalog-list", "/general-items", "위스키 테이스팅 글라스"],
        ["catalog-detail", "/general-items/1", "위스키 테이스팅 글라스"],
        ["ticket-list", "/ticket-products", "위스키 테이스팅 이용권"],
        ["smart-list", "/smart-order", "매장 픽업 위스키"],
      ]) {
        console.log("Visual capture", width, target, path);
        if (target === "rn") {
          await page.goto(
            `${origin}/sign-in?callbackUrl=${encodeURIComponent(path)}`,
          );
          await page
            .getByRole("textbox", { name: "이메일 주소", exact: true })
            .fill("rn@example.test");
          await page
            .getByLabel("비밀번호", { exact: true })
            .fill("mobile-e2e-123");
          await page
            .getByRole("button", { name: "로그인", exact: true })
            .click();
          await expect(page).toHaveURL((url) => url.pathname === path);
        } else {
          await page.goto(origin + path, {
            waitUntil: "domcontentloaded",
            timeout: 90000,
          });
          await page.addStyleTag({
            content: "nextjs-portal{display:none !important}",
          });
        }
        await expect(
          page.getByText(ready, { exact: false }).first(),
        ).toBeVisible({ timeout: 60000 });
        await page.evaluate(() => document.fonts.ready);
        const filename = `${target}-${name}-${width}.png`;
        await page.screenshot({ path: `${directory}/${filename}` });
        captures.push(filename);
        if (target === "rn" && name === "catalog-list") {
          await page.goto(origin + "/shop");
          await expect(page.getByTestId("product-card-1")).toBeVisible();
          await page
            .getByRole("heading", { name: "일반상품", exact: true })
            .waitFor({ state: "visible" });
          await page.evaluate(() => document.fonts.ready);
          const shopFilename = `rn-shop-${width}.png`;
          await page.screenshot({ path: `${directory}/${shopFilename}` });
          captures.push(shopFilename);
        }
        if (name === "reservation-detail") {
          await page
            .getByRole("button", {
              name: target === "rn" ? "예약 신청" : "예약하기",
              exact: true,
            })
            .scrollIntoViewIfNeeded();
          const formFilename = `${target}-reservation-form-${width}.png`;
          await page.screenshot({ path: `${directory}/${formFilename}` });
          captures.push(formFilename);
        }
      }
    }
  }
  await writeFile(
    `${directory}/focused-report.json`,
    JSON.stringify(
      {
        captures,
        widths: [375, 390, 430],
        fixtureOnly: true,
        nativeRuntime: false,
        errors,
        blocked,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  expect(
    blocked.filter((origin) => origin !== "https://va.vercel-scripts.com"),
  ).toEqual([]);
  await context.close();
});
