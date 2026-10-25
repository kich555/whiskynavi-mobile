import { test, expect, login } from "./fixtures";

test("five destination navigation uses brand reservation and news defaults and preserves sections", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-feed", {
    data: {},
  });
  await login(page, "/");
  const bottom = page.getByRole("tablist", { name: "하단 메뉴", exact: true });
  await expect(bottom.getByRole("tab")).toHaveCount(5);
  await bottom.getByRole("tab", { name: "아카이브", exact: true }).click();
  await expect(page).toHaveURL(/\/brand$/);
  await expect(
    page.getByRole("heading", { name: "브랜드", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/navigation-brands.png",
    scale: "css",
  });
  const archive = page.getByRole("tablist", {
    name: "아카이브 메뉴",
    exact: true,
  });
  await expect(
    archive.getByRole("tab", { name: "브랜드", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await archive.getByRole("tab", { name: "아카이브", exact: true }).click();
  await expect(page).toHaveURL(/\/archive$/);
  await page
    .getByRole("textbox", { name: "위스키 검색", exact: true })
    .fill("기억할 검색어");
  await expect(
    page.getByRole("link", { name: "네이비 싱글캐스크 12", exact: true }),
  ).toBeVisible();
  const archiveList = page.getByTestId("infinite-list");
  await page.getByRole("textbox", { name: "위스키 검색", exact: true }).blur();
  // RN Web exposes an imperative scrollTo({ y }) on this node, so use DOM scrollTop.
  await archiveList.evaluate((el) => {
    el.scrollTop = 220;
  });
  await expect
    .poll(() => archiveList.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(150);
  await bottom.getByRole("tab", { name: "스토어", exact: true }).click();
  await expect(page).toHaveURL(/\/reservation$/);
  await expect(
    page.getByRole("heading", { name: "예약하기", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/navigation-reservations.png",
    scale: "css",
  });
  const store = page.getByRole("tablist", { name: "스토어 메뉴", exact: true });
  await expect(
    store.getByRole("tab", { name: "예약", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await store.getByRole("tab", { name: "상품", exact: true }).click();
  await page.getByRole("button", { name: "이용권", exact: true }).click();
  await expect(
    page.getByText("위스키 테이스팅 이용권", { exact: false }).first(),
  ).toBeVisible();
  await bottom.getByRole("tab", { name: "커뮤니티", exact: true }).click();
  await expect(page).toHaveURL(/\/board\/news$/);
  const community = page.getByRole("tablist", {
    name: "커뮤니티 메뉴",
    exact: true,
  });
  await expect(
    community.getByRole("tab", { name: "소식", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(community.getByRole("tab")).toHaveCount(3);
  await expect(
    community.getByRole("tab", { name: "공지", exact: true }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/\/board\/news$/);
  await bottom.getByRole("tab", { name: "아카이브", exact: true }).click();
  await expect(page).toHaveURL(/\/archive$/);
  await expect(
    page.getByRole("textbox", { name: "위스키 검색", exact: true }),
  ).toHaveValue("기억할 검색어");
  await expect
    .poll(() =>
      page
        .locator('[data-testid="infinite-list"]:visible')
        .evaluate((el) => el.scrollTop),
    )
    .toBeGreaterThan(150);
  await bottom.getByRole("tab", { name: "스토어", exact: true }).click();
  await expect(page).toHaveURL(/\/shop(?:\?|$)/);
  await expect(
    page.getByText("위스키 테이스팅 이용권", { exact: false }).first(),
  ).toBeVisible();
  await bottom.getByRole("tab", { name: "커뮤니티", exact: true }).click();
  await expect(page).toHaveURL(/\/board\/news$/);
  await expect(
    bottom.getByRole("tab", { name: "커뮤니티", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.screenshot({
    path: "artifacts/navigation-news.png",
    scale: "css",
  });
});

test("global notice failure and empty states remain separate and recover", async ({
  page,
}) => {
  let mode = "error";
  await page.route("**/api/boards/announcements/global?*", async (route) => {
    if (mode === "error")
      return route.fulfill({
        status: 503,
        json: { message: "공지 조회 실패" },
      });
    if (mode === "empty")
      return route.fulfill({
        json: { content: [], page: { totalPages: 0, totalElements: 0 } },
      });
    return route.continue();
  });
  await page.goto("/notices");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByText("등록된 공지가 없습니다.", { exact: true }),
  ).toHaveCount(0);
  mode = "empty";
  await page
    .getByRole("button", { name: "다시 불러오기", exact: true })
    .click();
  await expect(
    page.getByText("등록된 공지가 없습니다.", { exact: true }),
  ).toBeVisible();
  mode = "normal";
  await page.goto("/notices");
  await expect(page.getByTestId("notice-row-81")).toBeVisible();
});

for (const [path, channel, id] of [
  ["/general-items", "general", 1],
  ["/ticket-products", "ticket", 2],
  ["/smart-order", "smart", 3],
] as const) {
  test(`legacy catalogue ${path} opens inside the store with the correct channel`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/shop\\?channel=${channel}$`));
    await expect(page.getByTestId(`product-card-${id}`)).toBeVisible();
    await expect(
      page
        .getByRole("tablist", { name: "스토어 메뉴", exact: true })
        .getByRole("tab", { name: "상품", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page
        .getByRole("tablist", { name: "하단 메뉴", exact: true })
        .getByRole("tab", { name: "스토어", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

test("global and board notices keep their own detail endpoints", async ({
  page,
}) => {
  await page.route("**/api/boards/community/announcements?*", (route) =>
    route.fulfill({
      json: {
        content: [
          { id: 81, scope: "GLOBAL", pinned: true, title: "서비스 이용 안내" },
          { id: 80, scope: "BOARD", pinned: true, title: "게시판 이용 안내" },
        ],
        page: { totalPages: 1, totalElements: 2 },
      },
    }),
  );
  await page.goto("/board/community");
  await page
    .getByRole("link", { name: "공지 · 서비스 이용 안내", exact: true })
    .click();
  await expect(page).toHaveURL(/\/notices\/81$/);
  await expect(
    page.getByText("위스키내비 서비스 운영 공지입니다.", { exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/board\/community$/);
  await page
    .getByRole("link", { name: "공지 · 게시판 이용 안내", exact: true })
    .click();
  await expect(page).toHaveURL(/\/board\/community\/announcements\/80$/);
  await expect(
    page.getByText("위스키를 함께 알아가는 공간입니다.", { exact: true }),
  ).toBeVisible();
});

test("global notices paginate without losing earlier rows", async ({
  page,
}) => {
  const items = Array.from({ length: 25 }, (_, i) => ({
    id: 100 + i,
    title: `운영 공지 ${i + 1}`,
    scope: "GLOBAL",
    createdAt: "2026-10-01T00:00:00Z",
  }));
  await page.route("**/api/boards/announcements/global?*", (route) => {
    const pageIndex = Number(
      new URL(route.request().url()).searchParams.get("page") ?? 0,
    );
    return route.fulfill({
      json: {
        content: items.slice(pageIndex * 20, pageIndex * 20 + 20),
        page: { totalPages: 2, totalElements: 25 },
      },
    });
  });
  await page.goto("/notices");
  await expect(page.getByTestId("notice-row-100")).toBeVisible();
  await page
    .getByRole("button", { name: "더 보기", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(page.getByTestId("notice-row-124")).toBeAttached();
  await page
    .getByTestId("infinite-list")
    .evaluate((el) => el.scrollTo({ top: 0 }));
  await expect(page.getByTestId("notice-row-100")).toBeVisible();
});

for (const width of [320, 390, 430, 844]) {
  test(`community story tab retains search and reader history at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
    await page.goto("/board/news");
    const menu = page.getByRole("tablist", {
      name: "커뮤니티 메뉴",
      exact: true,
    });
    await expect(menu.getByRole("tab")).toHaveCount(3);
    const story = menu.getByRole("tab", { name: "스토리", exact: true });
    await story.click();
    await expect(page).toHaveURL(/\/stories$/);
    await expect(story).toHaveAttribute("aria-selected", "true");
    const bottom = page.getByRole("tablist", {
      name: "하단 메뉴",
      exact: true,
    });
    await expect(
      bottom.getByRole("tab", { name: "커뮤니티", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    for (const tab of await menu.getByRole("tab").all()) {
      const box = await tab.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(48);
      expect(box!.width).toBeGreaterThanOrEqual(48);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    const search = page.getByRole("textbox", {
      name: "제목과 소개로 검색",
      exact: true,
    });
    await search.fill("화요");
    await expect(
      page.getByText("화요는 위스키일까?", { exact: true }),
    ).toBeVisible();
    await search.blur();
    await page.screenshot({
      path: `artifacts/community-story-${width}.png`,
      scale: "css",
    });
    await page.getByText("화요는 위스키일까?", { exact: true }).click();
    await expect(page).toHaveURL(/\/stories\/hwayo-whisky$/);
    await expect(
      page.getByRole("heading", { name: "화요는 위스키일까?", exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(search).toHaveValue("화요");
    await menu.getByRole("tab", { name: "소식", exact: true }).click();
    await story.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/stories$/);
    await expect(search).toHaveValue("화요");
    await bottom.getByRole("tab", { name: "홈", exact: true }).click();
    await bottom.getByRole("tab", { name: "커뮤니티", exact: true }).click();
    await expect(page).toHaveURL(/\/stories$/);
    await expect(search).toHaveValue("화요");
  });
}
