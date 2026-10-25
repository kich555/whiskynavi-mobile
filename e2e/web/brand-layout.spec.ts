import { test, expect } from "./fixtures";

for (const width of [320, 393, 430]) {
  test(`brand shortcuts keep square cards and full-size centered logos at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/brand");
    const cards = page.locator('[data-testid^="brand-shortcut-"]');
    await expect(cards).toHaveCount(4);
    for (const card of await cards.all()) {
      const image = card.locator("img").first();
      await expect(image).toBeAttached();
      await expect
        .poll(async () => {
          const frame = await card.boundingBox();
          const logo = await image.boundingBox();
          if (!frame || !logo) return false;
          return (
            Math.abs(frame.width - frame.height) < 1 &&
            logo.width > frame.width * 0.66 &&
            logo.height > frame.height * 0.63 &&
            Math.abs(logo.x + logo.width / 2 - (frame.x + frame.width / 2)) <
              1 &&
            Math.abs(logo.y + logo.height / 2 - (frame.y + frame.height / 2)) <
              1
          );
        })
        .toBe(true);
    }
    await page.screenshot({
      path: `artifacts/brand-logo-size-${width}.png`,
      scale: "css",
    });
  });
}
