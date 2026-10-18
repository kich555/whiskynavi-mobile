import { comparisonApiOrigin } from "./visual-config.mjs";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const directory = "artifacts/design-sync";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
  serviceWorkers: "block",
});
const blocked = [];
await context.route("**/*", (route) => {
  const request = route.request();
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
    blocked.push({
      method: request.method(),
      origin: new URL(request.url()).origin,
    });
    return route.abort("blockedbyclient");
  }
  return route.continue();
});
const routes = [
  { name: "home", path: "/", ready: "NEW ARRIVALS" },
  { name: "archive", path: "/archive", ready: "아카이브" },
  { name: "archive-detail", path: "", ready: "테이스팅 노트" },
  { name: "sign-in", path: "/sign-in", ready: "이메일 주소" },
  { name: "brand", path: "/brand", ready: "브랜드" },
  {
    name: "about",
    path: "/about",
    ready: "대한민국 최초의 독립 병입 브랜드, 위스키내비",
  },
  { name: "general-items", path: "/general-items", ready: "일반상품" },
  { name: "reservation", path: "/reservation", ready: "예약하기" },
];
const errors = [];
let screenshots = 0;
try {
  for (const route of routes) {
    for (const [label, origin] of [
      ["web", "http://localhost:3100"],
      ["rn", "http://localhost:8082"],
    ]) {
      const page = await context.newPage();
      page.on("pageerror", (error) =>
        errors.push({
          screen: route.name,
          target: label,
          message: error.message,
        }),
      );
      await page.goto(origin + route.path, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await page
        .getByText(route.ready, { exact: false })
        .filter({ visible: true })
        .first()
        .waitFor({ state: "visible", timeout: 30000 });
      if (route.name === "archive" || route.name === "home")
        await page
          .locator('a[href^="/archive/"]')
          .first()
          .waitFor({ state: "attached", timeout: 30000 });
      if (route.name === "general-items") {
        if (label === "rn")
          await page
            .getByTestId(/^product-card-/)
            .first()
            .waitFor({ state: "visible", timeout: 30000 });
        else
          await page
            .locator("article")
            .first()
            .waitFor({ state: "visible", timeout: 30000 });
      }
      if (route.name === "archive" && label === "web")
        routes.find((item) => item.name === "archive-detail").path = await page
          .locator('a[href^="/archive/"]')
          .first()
          .getAttribute("href");
      await page.evaluate(() => document.fonts.ready);
      await page.locator("img").evaluateAll((images) =>
        Promise.all(
          images
            .filter((image) => {
              const rect = image.getBoundingClientRect();
              return (
                rect.width > 0 && rect.top < innerHeight && rect.bottom > 0
              );
            })
            .map((image) => image.decode().catch(() => {})),
        ),
      );
      await page.screenshot({
        path: `${directory}/${label}-${route.name}.png`,
        animations: "disabled",
      });
      screenshots++;
      if (label === "rn" && route.name === "archive") {
        await page.getByRole("button", { name: "필터", exact: true }).click();
        await page.getByRole("dialog").waitFor({ state: "visible" });
        await page.screenshot({
          path: `${directory}/rn-archive-filter.png`,
          animations: "disabled",
        });
        screenshots++;
        const firstChoice = page.getByRole("checkbox").first();
        if (await firstChoice.count()) {
          await firstChoice.click();
          await page.screenshot({
            path: `${directory}/rn-archive-filter-selected.png`,
            animations: "disabled",
          });
          screenshots++;
        }
      }
      if (label === "rn" && route.name === "sign-in") {
        await page
          .getByRole("textbox", { name: "이메일 주소", exact: true })
          .fill("preview@");
        await page.getByLabel("비밀번호", { exact: true }).focus();
        await page
          .getByText("올바른 이메일 주소를 입력해주세요.")
          .waitFor({ state: "visible" });
        await page.screenshot({
          path: `${directory}/rn-sign-in-error.png`,
          animations: "disabled",
        });
        screenshots++;
      }
      console.log(`${label}: ${route.path}`);
      await page.close();
    }
  }
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(
      {
        viewport: { width: 390, height: 844 },
        web: "http://localhost:3100",
        rn: "http://localhost:8082",
        api: comparisonApiOrigin(),
        routes: routes.map((r) => r.path),
        blocked,
        errors,
        nativeRuntime: false,
      },
      null,
      2,
    ),
  );
  await writeFile(
    `${directory}/index.html`,
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>WhiskyNavi 디자인 비교</title><style>body{background:#1d2429;color:white;font:14px system-ui;margin:24px}section{margin:32px 0}main{display:flex;gap:24px;flex-wrap:wrap}figure{margin:0}img{width:390px;max-width:100%;border:1px solid #ffffff30}figcaption{padding:12px 0}</style><h1>웹 모바일 / React Native 미리보기</h1><p>390 × 844 · 동일한 개발 API · 조회 전용 · 실제 기기 캡처 아님</p>${routes.map((r) => `<section><h2>${r.path}</h2><main>${["web", "rn"].map((label) => `<figure><figcaption>${label === "web" ? "웹 모바일" : "RN 웹 미리보기"}</figcaption><img src="${label}-${r.name}.png" alt="${label} ${r.path}"></figure>`).join("")}</main></section>`).join("")}`,
  );
  console.log(
    JSON.stringify({
      screenshots,
      blockedRequests: blocked.length,
      pageErrors: errors.length,
      report: `${directory}/index.html`,
    }),
  );
  if (errors.length) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
