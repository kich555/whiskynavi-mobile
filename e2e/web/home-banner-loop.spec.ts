import { test, expect } from "./fixtures";
const banners = [1, 2, 3].map((id) => ({
  id,
  title: `순환 배너 ${id}`,
  link: "/archive",
  backgroundUrl:
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="${["#33444d", "#66583c", "#433747"][id - 1]}"/></svg>`,
    ),
}));

test("home banners swipe through both boundaries repeatedly and preserve the selected banner on resize", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/banners?*", (route) =>
    route.fulfill({ json: { content: banners } }),
  );
  await page.goto("/");
  const pager = page.getByTestId("home-banner-scroll");
  const selected = (i: number) =>
    page.getByRole("button", { name: `${i}번째 배너 보기`, exact: true });
  const settled = async (i: number) => {
    await expect(selected(i)).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() =>
        pager.evaluate(
          (el, page) => Math.abs(el.scrollLeft - el.clientWidth * page),
          i,
        ),
      )
      .toBeLessThan(1);
    await expect(page.getByTestId("active-home-banner")).toHaveCount(1);
    await expect(page.getByTestId("active-home-banner")).toContainText(
      `순환 배너 ${i}`,
    );
  };
  await settled(1);
  const cdp = await page.context().newCDPSession(page);
  const swipe = async (next: boolean) => {
    const box = (await pager.boundingBox())!;
    const from = box.x + box.width * (next ? 0.85 : 0.15);
    const to = box.x + box.width * (next ? 0.15 : 0.85);
    const y = box.y + 80;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: from, y }],
    });
    for (let n = 1; n <= 10; n++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: from + ((to - from) * n) / 10, y }],
      });
      await page.waitForTimeout(25);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  };
  for (const i of [2, 3, 1, 2]) {
    await swipe(true);
    await settled(i);
  }
  for (const i of [1, 3, 2, 1]) {
    await swipe(false);
    await settled(i);
  }
  await selected(3).click();
  await settled(3);
  await page.setViewportSize({ width: 430, height: 932 });
  await settled(3);
  await swipe(true);
  await settled(1);
  await page.screenshot({
    path: "artifacts/home-banner-infinite.png",
    scale: "css",
  });
});

for (const count of [0, 1]) {
  test(`home banner keeps a non-looping fallback for ${count} banners`, async ({
    page,
  }) => {
    await page.route("**/api/banners?*", (route) =>
      route.fulfill({ json: { content: banners.slice(0, count) } }),
    );
    await page.goto("/");
    const banner = page.getByTestId("home-banner");
    await expect(page.getByTestId("active-home-banner")).toContainText(
      count ? "순환 배너 1" : "위스키를 탐험하는 새로운 방법",
    );
    await expect(
      banner.getByRole("button", { name: /번째 배너 보기/ }),
    ).toHaveCount(0);
    await expect
      .poll(() =>
        page
          .getByTestId("home-banner-scroll")
          .evaluate((el) => el.scrollWidth - el.clientWidth),
      )
      .toBeLessThanOrEqual(1);
  });
}
