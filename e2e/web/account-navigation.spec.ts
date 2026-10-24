import { test, expect, login } from "./fixtures";

const children = [
  { role: "button", label: "주문 내역", section: "orders", ready: "주문 내역" },
  {
    role: "button",
    label: "예약 내역",
    section: "reservations",
    ready: "내 예약 신청",
  },
  {
    role: "link",
    label: "내 이용권 주문",
    section: "ticket-orders",
    ready: "내 이용권 주문",
  },
  {
    role: "button",
    label: "내 정보 수정",
    section: "profile",
    ready: "내 정보 관리",
  },
  {
    role: "button",
    label: "나의 멤버십",
    section: "membership",
    ready: "나의 멤버십",
  },
  {
    role: "button",
    label: "사업자 등록",
    section: "business",
    ready: "사업자 정보",
  },
  {
    role: "button",
    label: "자주 묻는 질문",
    section: "faq",
    ready: "고객 지원",
  },
  { role: "link", label: "1:1 문의", section: "inquiries", ready: "1:1 문의" },
] as const;

for (const child of children) {
  test(`account history: ${child.section} returns to overview and supports forward`, async ({
    page,
  }) => {
    await login(page, "/my-page");
    await page
      .getByRole(child.role, {
        name: child.label,
        exact:
          child.section !== "profile" &&
          child.section !== "membership" &&
          child.section !== "business",
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`/my-page/${child.section}$`));
    await expect(
      page.getByRole("heading", { name: child.ready, exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/my-page$/);
    await expect(
      page.getByText("모바일테스터님", { exact: true }),
    ).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/my-page/${child.section}$`));
    await expect(
      page.getByRole("heading", { name: child.ready, exact: true }),
    ).toBeVisible();
  });
}

test("account history: order detail pops to list then overview", async ({
  page,
}) => {
  await login(page, "/my-page");
  await page.getByRole("button", { name: "주문 내역", exact: true }).click();
  await page.getByRole("link", { name: /위스키 테이스팅 글라스/ }).click();
  await expect(page).toHaveURL(/\/my-page\/order\/1$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/my-page\/orders$/);
  await page.getByRole("link", { name: /위스키 테이스팅 글라스/ }).click();
  await page.getByRole("link", { name: "내 주문 목록", exact: true }).click();
  await expect(page).toHaveURL(/\/my-page\/orders$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/my-page$/);
});

test("account history: legacy tab link keeps overview underneath", async ({
  page,
}) => {
  await page.goto(
    "/sign-in?callbackUrl=" + encodeURIComponent("/my-page?tab=membership"),
  );
  await page
    .getByRole("textbox", { name: "이메일 주소", exact: true })
    .fill("rn@example.test");
  await page.getByLabel("비밀번호", { exact: true }).fill("mobile-e2e-123");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/my-page\/membership$/);
  await expect(
    page.getByRole("heading", { name: "나의 멤버십", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/my-page$/);
  await expect(page.getByText("모바일테스터님", { exact: true })).toBeVisible();
});
