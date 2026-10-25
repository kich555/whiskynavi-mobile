import { test, expect } from "./fixtures";
for (const width of [320, 393, 430]) {
  test(`brand carousel matches the mobile web hierarchy and loops at ${width}px`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 852 });
    const original = await (
      await request.get("http://127.0.0.1:8787/api/bottles")
    ).json();
    const bottles = [1, 2, 3, 4, 5].map((id) => ({
      ...original.content[0],
      id,
      name: `캐러셀 제품 ${id}`,
      series: "Single Cask",
      imgUrl:
        "data:image/svg+xml," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="240"><rect width="180" height="240" fill="#e9e2d3"/><rect x="14" y="14" width="152" height="212" fill="#303b3f"/><text x="90" y="92" text-anchor="middle" fill="white" font-size="14">WHISKYNAVI</text><text x="90" y="145" text-anchor="middle" fill="white" font-size="42">${id}</text></svg>`,
        ),
    }));
    await page.route("**/api/bottles?*", (route) =>
      route.fulfill({
        json: { content: bottles, page: { totalPages: 1, totalElements: 5 } },
      }),
    );
    await page.goto("/brand");
    const carousel = page.getByTestId("brand-carousel-위스키내비");
    await expect(carousel).toBeVisible();
    const stage = carousel.getByTestId("brand-carousel-stage");
    await stage.scrollIntoViewIfNeeded();
    const center = carousel.getByTestId("brand-carousel-center");
    const selected = (i: number) =>
      carousel.getByRole("tab", { name: `${i}번째 제품 보기`, exact: true });
    const settle = async (i: number) => {
      await expect(selected(i)).toHaveAttribute("aria-selected", "true");
      await expect(
        center.getByRole("link", {
          name: `캐러셀 제품 ${i} 상세 보기`,
          exact: true,
        }),
      ).toBeVisible();
      await expect
        .poll(async () => {
          const frame = await center.boundingBox();
          return Math.abs(frame!.width - Math.min(240, width * 0.62));
        })
        .toBeLessThan(1);
      await page.waitForTimeout(750);
      const stageFrame = (await stage.boundingBox())!;
      const cardFrame = (await center.boundingBox())!;
      expect(
        Math.abs(
          cardFrame.x -
            (stageFrame.x + (stageFrame.width - cardFrame.width) / 2),
        ),
      ).toBeLessThan(1);
    };
    await settle(1);
    const c = (await center.boundingBox())!;
    const left = (await carousel
      .getByRole("button", { name: "캐러셀 제품 5 가운데로 보기", exact: true })
      .boundingBox())!;
    const right = (await carousel
      .getByRole("button", { name: "캐러셀 제품 2 가운데로 보기", exact: true })
      .boundingBox())!;
    expect(left.x).toBeLessThan(c.x);
    expect(right.x).toBeGreaterThan(c.x);
    expect(left.width).toBeLessThan(c.width);
    expect(right.width).toBeLessThan(c.width);
    await page.screenshot({
      path: `artifacts/brand-carousel-after-${width}.png`,
      scale: "css",
    });
    await carousel
      .getByRole("button", { name: "캐러셀 제품 2 가운데로 보기", exact: true })
      .click({
        position: {
          x: Math.min(
            (await stage.boundingBox())!.x +
              (await stage.boundingBox())!.width -
              8 -
              right.x,
            right.width - 8,
          ),
          y: right.height / 2,
        },
      });
    await settle(2);
    const cdp = await page.context().newCDPSession(page);
    const swipe = async (next: boolean) => {
      const b = (await stage.boundingBox())!;
      const from = b.x + b.width * (next ? 0.85 : 0.15),
        to = b.x + b.width * (next ? 0.15 : 0.85),
        y = b.y + b.height / 2;
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
    await swipe(true);
    await settle(3);
    await swipe(false);
    await settle(2);
    await selected(5).click();
    await settle(5);
    await swipe(true);
    await settle(1);
    await swipe(false);
    await settle(5);
    await selected(1).click();
    await settle(1);
    await center
      .getByRole("button", { name: "캐러셀 제품 1 이미지 확대", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "확대 이미지 닫기", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "확대 이미지 닫기", exact: true })
      .click();
    await center
      .getByRole("link", { name: "캐러셀 제품 1 상세 보기", exact: true })
      .click();
    await expect(page).toHaveURL(/\/archive\/1$/);
    await page.goBack();
    await expect(selected(1)).toHaveAttribute("aria-selected", "true");
  });
}
