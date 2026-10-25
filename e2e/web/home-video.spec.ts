import { test, expect } from "./fixtures";

for (const width of [320, 390, 430]) {
  test(`home video uses a thumbnail and inline player at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/api/kv-stores/youtube_embed_url", (route) =>
      route.fulfill({
        json: {
          key: "youtube_embed_url",
          value: "https://youtu.be/M7lc1UVf-VE",
        },
      }),
    );
    await page.route("https://i.ytimg.com/**", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#303e44"/><text x="36" y="175" fill="white" font-size="30">YouTube fixture</text></svg>',
      }),
    );
    let playerRequests = 0;
    await page.route("https://www.youtube.com/embed/**", (route) => {
      playerRequests++;
      return route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: '<html><body style="margin:0;background:#111;color:white"><button aria-label="합성 영상 일시정지">재생 중 · 테스트 플레이어</button></body></html>',
      });
    });
    await page.goto("/");
    const play = page.getByRole("button", {
      name: "위스키내비 대표 영상 재생",
      exact: true,
    });
    await play.scrollIntoViewIfNeeded();
    await expect(play).toBeVisible();
    expect(playerRequests).toBe(0);
    await expect(page.getByTestId("home-youtube-player")).toHaveCount(0);
    if (width === 390)
      await page.screenshot({
        path: "artifacts/home-video-thumbnail.png",
        scale: "css",
      });
    await play.click();
    const player = page.getByTestId("home-youtube-player");
    await expect(player).toBeVisible();
    await expect(player).toHaveAttribute(
      "src",
      /embed\/M7lc1UVf-VE\?autoplay=1&playsinline=1/,
    );
    expect((await player.boundingBox())!.height).toBeGreaterThanOrEqual(200);
    await expect(
      page
        .frameLocator('[data-testid="home-youtube-player"]')
        .getByRole("button", { name: "합성 영상 일시정지" }),
    ).toBeVisible();
    if (width === 390)
      await page.screenshot({
        path: "artifacts/home-video-playing.png",
        scale: "css",
      });
    await page
      .getByRole("button", { name: "영상 재생 닫기", exact: true })
      .click();
    await expect(player).toHaveCount(0);
    await expect(play).toBeVisible();
    await play.click();
    await expect(player).toBeVisible();
    const bottom = page.getByRole("tablist", {
      name: "하단 메뉴",
      exact: true,
    });
    await bottom.getByRole("tab", { name: "커뮤니티", exact: true }).click();
    await bottom.getByRole("tab", { name: "홈", exact: true }).click();
    await expect(player).toHaveCount(0);
    await expect(play).toBeVisible();
  });
}

test("invalid or empty home video URLs do not create a broken player", async ({
  page,
}) => {
  let value = "https://evil.test/embed/M7lc1UVf-VE";
  await page.route("**/api/kv-stores/youtube_embed_url", (route) =>
    route.fulfill({ json: { value } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "회사소개", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("home-video-thumbnail")).toHaveCount(0);
  value = "";
  await page.reload();
  await expect(
    page.getByRole("link", { name: "회사소개", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("home-video-thumbnail")).toHaveCount(0);
});
