import { test, expect, login } from "./fixtures";

test("nested reply survives login, supports editing and can be deleted independently", async ({
  page,
  request,
}) => {
  await login(page, "/board/community/posts/1");
  await page
    .getByRole("textbox", { name: "댓글 내용", exact: true })
    .fill("부모 댓글");
  await page.getByRole("button", { name: "댓글 등록", exact: true }).click();
  await expect(page.getByText("부모 댓글", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "답글 쓰기", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "답글 등록", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "답글", exact: true })
    .fill("중첩 답글");
  await page.getByRole("button", { name: "답글 등록", exact: true }).click();
  await expect(page.getByText("중첩 답글", { exact: true })).toBeVisible();
  const tree = await (
    await request.get(
      "http://127.0.0.1:8787/api/boards/community/posts/1/comments",
    )
  ).json();
  expect(tree).toHaveLength(1);
  expect(tree[0].replies).toMatchObject([
    { content: "중첩 답글", parentCommentId: tree[0].id },
  ]);
  await login(page, "/board/community/posts/1");
  await expect(page.getByText("중첩 답글", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "댓글 수정", exact: true })
    .nth(1)
    .click();
  await page
    .getByRole("textbox", { name: "댓글 수정", exact: true })
    .fill("수정한 답글");
  await page.getByRole("button", { name: "수정 저장", exact: true }).click();
  await expect(page.getByText("수정한 답글", { exact: true })).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "댓글 삭제", exact: true })
    .nth(1)
    .click();
  await expect(page.getByText("수정한 답글", { exact: true })).toHaveCount(0);
  await expect(page.getByText("부모 댓글", { exact: true })).toBeVisible();
});
