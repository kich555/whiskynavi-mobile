import { test, expect, login } from "./fixtures";

test("profile nickname survives reload and logout clears protected access", async ({
  page,
}) => {
  await login(page, "/my-page/profile");
  await page
    .getByRole("textbox", { name: "닉네임", exact: true })
    .fill("새닉네임");
  await page.getByRole("button", { name: "닉네임 저장", exact: true }).click();
  await expect(
    page.getByText("변경사항을 저장했습니다.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("button", { name: "마이페이지로 돌아가기", exact: true })
    .click();
  await expect(page.getByText("새닉네임님", { exact: true })).toBeVisible();
  await login(page, "/my-page/profile");
  await expect(
    page.getByRole("textbox", { name: "닉네임", exact: true }),
  ).toHaveValue("새닉네임");
  await page
    .getByRole("button", { name: "마이페이지로 돌아가기", exact: true })
    .click();
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await page.goto("/my-page/inquiries");
  await expect(
    page.getByText("로그인이 필요합니다", { exact: true }),
  ).toBeVisible();
});
test("guest order lookup rejects bad token and recovers with a valid token", async ({
  page,
}) => {
  await page.goto("/orders/guest");
  await page
    .getByRole("textbox", { name: "주문번호", exact: true })
    .fill("E2E-ORDER-1");
  await page
    .getByRole("textbox", { name: "비회원 주문 조회 코드", exact: true })
    .fill("wrong-token");
  await page.getByRole("button", { name: "주문 조회", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("textbox", { name: "비회원 주문 조회 코드", exact: true })
    .fill("fixture-guest");
  await page.getByRole("button", { name: "주문 조회", exact: true }).click();
  await expect(
    page.getByText("주문번호 E2E-ORDER-1", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
test("cart removal survives reload and restores empty state", async ({
  page,
}) => {
  await page.goto("/general-items/1");
  await page
    .getByRole("button", { name: "장바구니 담기", exact: true })
    .click();
  await expect(page.getByText("총 18,000원")).toBeVisible();
  await page
    .getByRole("button", { name: "장바구니에서 삭제", exact: true })
    .click();
  await expect(page.getByText("장바구니가 비어 있습니다.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("장바구니가 비어 있습니다.")).toBeVisible();
});
test("post edit persists and deleting the owned post removes it from list", async ({
  page,
}) => {
  await login(page, "/board/community/posts/1/edit");
  await page
    .getByRole("textbox", { name: "제목", exact: true })
    .fill("수정한 위스키 이야기");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(
    page.getByText("수정한 위스키 이야기", { exact: true }),
  ).toBeVisible();
  await login(page, "/board/community/posts/1");
  await expect(
    page.getByText("수정한 위스키 이야기", { exact: true }),
  ).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "게시글 삭제", exact: true }).click();
  await expect(page).toHaveURL(/\/board\/community$/);
  await expect(
    page.getByText("수정한 위스키 이야기", { exact: true }),
  ).toHaveCount(0);
});
test("inquiry deletion removes its conversation from history", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-account");
  await login(page, "/my-page/inquiries/1");
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "문의 삭제", exact: true }).click();
  await expect(page).toHaveURL(/\/my-page\/inquiries$/);
  await expect(page.getByText("표시할 항목이 없습니다.")).toBeVisible();
  await login(page, "/my-page/inquiries");
  await expect(page.getByText("표시할 항목이 없습니다.")).toBeVisible();
});
test("order cancellation needs a reason and persists the requested status", async ({
  page,
}) => {
  await login(page, "/my-page/order/1");
  await expect(
    page.getByRole("button", { name: "주문 취소 요청", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "취소 요청 사유", exact: true })
    .fill("합성 테스트 취소");
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "주문 취소 요청", exact: true })
    .click();
  await expect(page.getByText("취소 요청", { exact: true })).toBeVisible();
  await login(page, "/my-page/order/1");
  await expect(page.getByText("취소 요청", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "주문 취소 요청", exact: true }),
  ).toHaveCount(0);
});
test("owned comment edit and deletion persist after reload", async ({
  page,
}) => {
  await login(page, "/board/community/posts/1");
  await page
    .getByRole("textbox", { name: "댓글 내용", exact: true })
    .fill("수정할 댓글");
  await page.getByRole("button", { name: "댓글 등록", exact: true }).click();
  await expect(page.getByText("수정할 댓글", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "댓글 수정", exact: true }).click();
  await page
    .getByRole("textbox", { name: "댓글 수정", exact: true })
    .fill("수정된 댓글");
  await page.getByRole("button", { name: "수정 저장", exact: true }).click();
  await expect(page.getByText("수정된 댓글", { exact: true })).toBeVisible();
  await login(page, "/board/community/posts/1");
  await expect(page.getByText("수정된 댓글", { exact: true })).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "댓글 삭제", exact: true }).click();
  await expect(page.getByText("수정된 댓글", { exact: true })).toHaveCount(0);
});

test("profile email verification and password change retain explicit validation", async ({
  page,
}) => {
  await login(page, "/my-page/profile");
  await expect(
    page.getByRole("button", { name: "이메일 변경 저장", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "변경할 이메일", exact: true })
    .fill("updated@example.test");
  await page
    .getByRole("button", { name: "이메일 인증코드 발송", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "인증코드", exact: true })
    .fill("123456");
  await page
    .getByRole("button", { name: "인증코드 확인", exact: true })
    .click();
  await page
    .getByRole("button", { name: "이메일 변경 저장", exact: true })
    .click();
  await expect(
    page.getByText("변경사항을 저장했습니다.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "이메일 인증코드 발송", exact: true }),
  ).toBeDisabled();
  await login(page, "/my-page/profile", {
    email: "updated@example.test",
    password: "mobile-e2e-123",
  });
  await expect(
    page.getByRole("textbox", { name: "변경할 이메일", exact: true }),
  ).toHaveValue("updated@example.test");
  await page
    .getByLabel("현재 비밀번호", { exact: true })
    .fill("mobile-e2e-123");
  await page.getByLabel("새 비밀번호", { exact: true }).fill("changed-e2e-456");
  await expect(
    page.getByRole("button", { name: "비밀번호 변경", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("새 비밀번호 확인", { exact: true })
    .fill("changed-e2e-456");
  await page
    .getByRole("button", { name: "비밀번호 변경", exact: true })
    .click();
  await expect(
    page.getByText("비밀번호를 변경했습니다.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("현재 비밀번호", { exact: true })).toHaveValue(
    "",
  );
  await login(page, "/my-page", {
    email: "updated@example.test",
    password: "changed-e2e-456",
  });
  await expect(page.getByText("모바일테스터님", { exact: true })).toBeVisible();
});
test("reservation cancellation restores the application form", async ({
  page,
}) => {
  await login(page, "/reservation/1");
  await page
    .getByRole("button", { name: "픽업 업장 선택", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "테스트 픽업 매장 · 서울시 테스트로 1",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "예약 신청", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "예약 정보 수정", exact: true }),
  ).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "예약 취소", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "예약 신청", exact: true }),
  ).toBeVisible();
  await login(page, "/reservation/1");
  await expect(
    page.getByRole("button", { name: "예약 신청", exact: true }),
  ).toBeVisible();
});
