import { test, expect, login } from "./fixtures";
const cases = [
  {
    name: "archive",
    path: "/archive",
    api: "/api/2.0/bottles",
    ready: "네이비 싱글캐스크 12",
  },
  {
    name: "bottle",
    path: "/archive/1",
    api: "/api/bottles/1",
    ready: "테이스팅 노트",
  },
  {
    name: "products",
    path: "/general-items",
    api: "/api/2.0/general-products",
    ready: "위스키 테이스팅 글라스",
  },
  {
    name: "product",
    path: "/general-items/1",
    api: "/api/2.0/general-products/1",
    ready: "위스키 테이스팅 글라스",
  },
  {
    name: "tickets",
    path: "/ticket-products",
    api: "/api/2.0/ticket-products",
    ready: "위스키 테이스팅 이용권",
  },
  {
    name: "smart catalogue",
    path: "/smart-order",
    api: "/api/2.0/smart-order-products",
    ready: "매장 픽업 위스키",
  },
  {
    name: "post",
    path: "/board/community/posts/1",
    api: "/api/boards/community/posts/1",
    ready: "위스키를 함께 알아가는 공간입니다.",
  },
  {
    name: "board",
    path: "/board/news",
    api: "/api/boards/news/posts",
    ready: "첫 번째 위스키 이야기",
  },
  {
    name: "account",
    path: "/my-page",
    api: "/api/users/me",
    ready: "모바일테스터님",
    auth: true,
  },
  {
    name: "orders",
    path: "/my-page/orders",
    api: "/api/2.0/orders",
    ready: "위스키 테이스팅 글라스",
    auth: true,
  },
  {
    name: "order",
    path: "/my-page/order/1",
    api: "/api/orders/1",
    ready: "주문번호 E2E-ORDER-1",
    auth: true,
  },
  {
    name: "inquiries",
    path: "/my-page/inquiries",
    api: "/api/inquiries",
    ready: "픽업 일정에 대해 문의드립니다",
    auth: true,
  },
  {
    name: "inquiry",
    path: "/my-page/inquiries/1",
    api: "/api/inquiries/1",
    ready: "픽업 가능한 시간을 알려주세요.",
    auth: true,
  },
  {
    name: "reservations",
    path: "/reservation",
    api: "/api/bottles/reservations/notices",
    ready: "싱글캐스크 예약",
    auth: true,
  },
  {
    name: "reservation",
    path: "/reservation/1",
    api: "/api/bottles/reservations/notices/1",
    ready: "싱글캐스크 예약",
    auth: true,
  },
];
for (const entry of cases) {
  test(`failure recovery: ${entry.name}`, async ({ page, request }) => {
    await request.post("http://127.0.0.1:8787/__test/seed-account");
    const pattern = `**${entry.api}{,?*}`;
    await page.route(pattern, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "합성 일시 장애" }),
      }),
    );
    if (entry.auth) await login(page, entry.path);
    else await page.goto(entry.path);
    await expect(page.getByRole("alert").first()).toContainText(
      "합성 일시 장애",
      { timeout: 10_000 },
    );
    await expect(
      page.getByText("표시할 항목이 없습니다.", { exact: true }),
    ).toHaveCount(0);
    await page.unroute(pattern);
    if (entry.auth) await login(page, entry.path);
    else await page.reload();
    await expect(
      page.getByText(entry.ready, { exact: false }).first(),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}
