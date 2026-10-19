import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";

async function productOptions(page: Page, saleStatus = "OPEN") {
  await page.route("**/api/2.0/general-products/1", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: {
        ...(await response.json()),
        saleStatus,
        options: {
          name: "구성",
          required: true,
          values: [
            {
              id: 11,
              label: "선물 포장",
              additionalPrice: 5000,
              availableQuantity: 2,
            },
            {
              id: 12,
              label: "품절 구성",
              additionalPrice: 1000,
              availableQuantity: 0,
            },
          ],
        },
      },
    });
  });
}

test("required product options enforce stock and carry the selected price into checkout", async ({
  page,
}) => {
  await productOptions(page);
  await page.goto("/general-items/1");
  await expect(
    page.getByRole("button", { name: "장바구니 담기", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "옵션 선택", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "품절 구성 (+1,000원)", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "선물 포장 (+5,000원)", exact: true })
    .click();
  await page.getByRole("button", { name: "수량 늘리기", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "수량 늘리기", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "바로 주문하기", exact: true })
    .click();
  await expect(page).toHaveURL(/quantity=2&optionId=11/);
  await expect(page.getByText("총 43,000원", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "결제 진행", exact: true }),
  ).toBeDisabled();
});

for (const [name, query] of [
  ["negative quantity", "quantity=-1&optionId=11"],
  ["fractional quantity", "quantity=1.5&optionId=11"],
  ["missing required option", "quantity=1"],
  ["unknown option", "quantity=1&optionId=999"],
  ["option stock exceeded", "quantity=3&optionId=11"],
  [
    "duplicate option selections",
    `selections=${encodeURIComponent(
      JSON.stringify([
        { quantity: 1, optionId: 11 },
        { quantity: 1, optionId: 11 },
      ]),
    )}`,
  ],
]) {
  test(`checkout rejects a forged selection: ${name}`, async ({ page }) => {
    await productOptions(page);
    await page.goto(`/general-items/delivery-order?saleId=1&${query}`);
    await expect(page.getByRole("alert")).toContainText(
      /주문 수량·옵션이 올바르지 않습니다|판매 상태·수량·옵션을 다시 확인해 주세요/,
    );
    await expect(
      page.getByRole("button", { name: "결제 진행", exact: true }),
    ).toBeDisabled();
  });
}

test("sold-out products cannot be purchased through a direct checkout URL", async ({
  page,
}) => {
  await productOptions(page, "SOLD_OUT");
  await page.goto("/general-items/1");
  await expect(
    page.getByRole("button", { name: "장바구니 담기", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "현재 주문할 수 없습니다", exact: true }),
  ).toBeDisabled();
  await page.goto(
    "/general-items/delivery-order?saleId=1&quantity=1&optionId=11",
  );
  await expect(page.getByRole("alert")).toContainText(
    "판매 상태·수량·옵션을 다시 확인해 주세요.",
  );
  await expect(
    page.getByRole("button", { name: "결제 진행", exact: true }),
  ).toBeDisabled();
});
