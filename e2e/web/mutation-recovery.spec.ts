import { test, expect, login } from "./fixtures";

test("nickname failure preserves the draft and retry persists it", async ({
  page,
}) => {
  await login(page, "/my-page/profile");
  const field = page.getByRole("textbox", { name: "닉네임", exact: true });
  const save = page.getByRole("button", { name: "닉네임 저장", exact: true });
  await field.fill("복구닉네임");
  await page.route("**/api/users/me/nickname", (route) =>
    route.fulfill({ status: 503, json: { message: "프로필 저장 일시 장애" } }),
  );
  await save.click();
  await expect(page.getByRole("alert")).toContainText("프로필 저장 일시 장애");
  await expect(field).toHaveValue("복구닉네임");
  await expect(
    page.getByText("변경사항을 저장했습니다.", { exact: true }),
  ).toHaveCount(0);
  await page.unroute("**/api/users/me/nickname");
  await save.click();
  await expect(
    page.getByText("변경사항을 저장했습니다.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await login(page, "/my-page/profile");
  await expect(field).toHaveValue("복구닉네임");
});

test("failed comment creation preserves text and retry creates exactly one comment", async ({
  page,
}) => {
  await login(page, "/board/community/posts/1");
  const field = page.getByRole("textbox", { name: "댓글 내용", exact: true });
  await field.fill("복구 후 등록한 댓글");
  await page.route("**/posts/1/comments", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 503, json: { message: "댓글 저장 일시 장애" } })
      : route.continue(),
  );
  await page.getByRole("button", { name: "댓글 등록", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("댓글 저장 일시 장애");
  await expect(field).toHaveValue("복구 후 등록한 댓글");
  await page.unroute("**/posts/1/comments");
  await page.getByRole("button", { name: "댓글 등록", exact: true }).click();
  await expect(
    page.getByText("복구 후 등록한 댓글", { exact: true }),
  ).toHaveCount(1);
  await expect(field).toHaveValue("");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await login(page, "/board/community/posts/1");
  await expect(
    page.getByText("복구 후 등록한 댓글", { exact: true }),
  ).toHaveCount(1);
});

test("failed pickup receipt keeps pending status until an explicit retry", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-account", {
    data: { fulfillment: true },
  });
  await login(page, "/my-page/order/1");
  await page.route("**/api/2.0/orders/1/receipt", (route) =>
    route.fulfill({ status: 503, json: { message: "수령 처리 일시 장애" } }),
  );
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "수령 완료", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("수령 처리 일시 장애");
  await expect(page.getByText("수령 대기", { exact: true })).toBeVisible();
  await page.unroute("**/api/2.0/orders/1/receipt");
  await page.getByRole("button", { name: "수령 완료", exact: true }).click();
  await expect(page.getByText("수령완료", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await login(page, "/my-page/order/1");
  await expect(page.getByText("수령완료", { exact: true })).toBeVisible();
});
