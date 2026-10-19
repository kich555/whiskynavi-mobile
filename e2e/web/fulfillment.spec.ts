import { test, expect, login } from "./fixtures";

test("pickup receipt requires confirmation and persists completion", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-account", {
    data: { fulfillment: true },
  });
  await login(page, "/my-page/order/1");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "수령 완료", exact: true }).click();
  await expect(page.getByText("수령 대기", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "수령 완료", exact: true }).click();
  await expect(page.getByText("수령완료", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "수령 완료", exact: true }),
  ).toHaveCount(0);
  await login(page, "/my-page/order/1");
  await expect(page.getByText("수령완료", { exact: true })).toBeVisible();
});

test("ticket use requires confirmation and cannot be submitted twice", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-account", {
    data: { fulfillment: true },
  });
  await login(page, "/my-page/ticket-orders/2");
  await expect(
    page.getByText("위스키 테이스팅 이용권 · 이용 가능", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "이용권 사용 완료", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "이용권 사용 완료", exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "이용권 사용 완료", exact: true })
    .click();
  await expect(
    page.getByText("위스키 테이스팅 이용권 · 사용 완료", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "이용권 사용 완료", exact: true }),
  ).toHaveCount(0);
  await login(page, "/my-page/ticket-orders/2");
  await expect(
    page.getByText("위스키 테이스팅 이용권 · 사용 완료", { exact: true }),
  ).toBeVisible();
});

test("ticket usage failure keeps the entitlement available for an explicit retry", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-account", {
    data: { fulfillment: true },
  });
  await page.route("**/api/2.0/orders/entitlements/use", (route) =>
    route.fulfill({ status: 503, json: { message: "이용권 처리 일시 장애" } }),
  );
  await login(page, "/my-page/ticket-orders/2");
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "이용권 사용 완료", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("이용권 처리 일시 장애");
  await expect(
    page.getByText("위스키 테이스팅 이용권 · 이용 가능", { exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/2.0/orders/entitlements/use");
  await page
    .getByRole("button", { name: "이용권 사용 완료", exact: true })
    .click();
  await expect(
    page.getByText("위스키 테이스팅 이용권 · 사용 완료", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
