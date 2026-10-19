import { test, expect, login } from "./fixtures";

test("ordinary members cannot see moderation controls", async ({ page }) => {
  await login(page, "/board/community/posts/1");
  await expect(page.getByTestId("post-original")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "게시글 관리", exact: true }),
  ).toHaveCount(0);
});

test("administrator changes the classification and sees it after a fresh login", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-admin");
  await login(page, "/board/community/posts/1");
  await page.getByRole("button", { name: "게시글 관리", exact: true }).click();
  await page.getByRole("button", { name: "후기", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await login(page, "/board/community");
  await expect(page.getByTestId("board-row-1")).toContainText("후기");
});

test("administrator deletion requires a reason and confirmation", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-admin");
  await login(page, "/board/community/posts/1");
  await page.getByRole("button", { name: "게시글 관리", exact: true }).click();
  const remove = page.getByRole("button", {
    name: "관리자 권한으로 삭제",
    exact: true,
  });
  await expect(remove).toBeDisabled();
  await page
    .getByRole("textbox", { name: "관리자 삭제 사유", exact: true })
    .fill("합성 테스트 운영 정책 위반");
  page.once("dialog", (dialog) => dialog.dismiss());
  await remove.click();
  await expect(remove).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await remove.click();
  await expect(page).toHaveURL(/\/board\/community$/);
  await expect(page.getByTestId("board-row-1")).toHaveCount(0);
  await login(page, "/board/community");
  await expect(page.getByTestId("board-row-1")).toHaveCount(0);
});
