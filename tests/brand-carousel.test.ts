import { expect, it } from "vitest";
import { brandCardPosition } from "../src/lib/brand-carousel";
it("matches the web's center card and projected side-card geometry", () => {
  expect(brandCardPosition(0, 0, 5)).toMatchObject({
    width: 240,
    height: 300,
    x: 0,
    brightness: 1,
    zIndex: 30,
    visible: true,
  });
  const side = brandCardPosition(1, 0, 5);
  expect(side.width).toBeCloseTo((240 * 0.85 * 2000) / 2150);
  expect(side.height).toBeCloseTo((300 * 0.85 * 2000) / 2150);
  expect(side.x).toBeCloseTo((180 * 2000) / 2150);
  expect(side.brightness).toBe(0.6);
});
it("keeps the first and last products beside each other", () => {
  expect(brandCardPosition(4, 0, 5).relative).toBe(-1);
  expect(brandCardPosition(0, 4, 5).relative).toBe(1);
  expect(brandCardPosition(3, 0, 8).visible).toBe(false);
});
it("handles one product and narrow-phone dimensions", () => {
  expect(brandCardPosition(0, 0, 1)).toMatchObject({
    x: 0,
    width: 240,
    height: 300,
  });
  expect(brandCardPosition(0, 0, 3, 198.4).width).toBeCloseTo(198.4);
});
