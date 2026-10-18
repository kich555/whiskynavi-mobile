import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, callback = "/") {
  await page.goto(`/sign-in?callbackUrl=${encodeURIComponent(callback)}`);
  await page
    .getByRole("textbox", { name: "이메일 주소", exact: true })
    .fill("rn@example.test");
  await page.getByLabel("비밀번호", { exact: true }).fill("mobile-e2e-123");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(
      callback === "/" ? "/$" : callback.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ),
  );
}
const blockedOrigins = new WeakMap<Page, string[]>();
const renderErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ request, context, page }) => {
  const errors: string[] = [];
  renderErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  const blocked: string[] = [];
  blockedOrigins.set(page, blocked);
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      ["http://127.0.0.1:19006", "http://127.0.0.1:8787"].includes(
        url.origin,
      ) ||
      ["data:", "blob:"].includes(url.protocol)
    )
      return route.continue();
    blocked.push(`${route.request().method()} ${url.origin}${url.pathname}`);
    return route.abort("blockedbyclient");
  });
  await request.post("http://127.0.0.1:8787/__test/reset");
});
test.afterEach(async ({ page }) => {
  expect(
    renderErrors.get(page) ?? [],
    "No screen may fail silently during render",
  ).toEqual([]);
  expect(
    blockedOrigins.get(page) ?? [],
    "E2E must never contact non-fixture origins",
  ).toEqual([]);
});
test("archive search, empty state and full page detail", async ({ page }) => {
  await page.goto("/archive");
  await page
    .getByRole("link", { name: "네이비 싱글캐스크 12", exact: true })
    .click();
  await expect(page.getByText("테이스팅 노트", { exact: true })).toBeVisible();
  await expect(
    page.getByText("꿀과 바닐라, 긴 여운의 테스트 위스키입니다."),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "목록으로 돌아가기", exact: true })
    .click();
  await page.getByRole("textbox", { name: "위스키 검색" }).fill("존재하지않음");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.getByText("표시할 항목이 없습니다.")).toBeVisible();
});
test("protected account requires login", async ({ page }) => {
  await page.goto("/my-page/inquiries");
  await expect(
    page.getByText("로그인이 필요합니다", { exact: true }),
  ).toBeVisible();
});
test("invalid login is recoverable", async ({ page }) => {
  await page.goto("/sign-in");
  await page
    .getByRole("textbox", { name: "이메일 주소", exact: true })
    .fill("wrong@example.test");
  await page.getByLabel("비밀번호", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("로그인");
  await expect(
    page.getByRole("button", { name: "로그인", exact: true }),
  ).toBeEnabled();
});
test("credentials login and owned order", async ({ page }) => {
  await login(page, "/my-page/order/1");
  await expect(
    page.getByText("위스키 테이스팅 글라스", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("주문번호 E2E-ORDER-1", { exact: false }),
  ).toBeVisible();
});
test("guest product cart and quantity quote", async ({ page }) => {
  await page.goto("/general-items/1");
  await page
    .getByRole("button", { name: "장바구니 담기", exact: true })
    .click();
  await expect(page.getByText("총 18,000원")).toBeVisible();
  await page.getByRole("button", { name: "수량 늘리기" }).click();
  await expect(page.getByText("총 33,000원")).toBeVisible();
  await page.getByRole("button", { name: "주문서 작성" }).click();
  await expect(
    page.getByRole("textbox", { name: "주문자 이름" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "결제 진행", exact: true }),
  ).toBeDisabled();
});
test("native editor creates post and comment through API", async ({ page }) => {
  await login(page, "/board/community/posts/new");
  await page
    .getByRole("textbox", { name: "제목", exact: true })
    .fill("모바일 회귀 게시글");
  await page
    .getByRole("textbox", { name: "내용", exact: true })
    .fill("RN 에디터에서 작성한 내용");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page).toHaveURL(/\/board\/community\/posts\/2$/);
  await expect(
    page.getByText("RN 에디터에서 작성한 내용", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "댓글 내용", exact: true })
    .fill("첫 번째 댓글");
  await page.getByRole("button", { name: "댓글 등록", exact: true }).click();
  await expect(page.getByText("첫 번째 댓글", { exact: true })).toBeVisible();
});
test("inquiry conversation supports creation and followup", async ({
  page,
}) => {
  await login(page, "/my-page/inquiries/new");
  await page
    .getByRole("textbox", { name: "제목", exact: true })
    .fill("배송 문의");
  await page
    .getByRole("textbox", { name: "내용", exact: true })
    .fill("배송 일정이 궁금합니다.");
  await page.getByRole("button", { name: "문의 등록", exact: true }).click();
  await expect(page).toHaveURL(/\/my-page\/inquiries\/1$/);
  await expect(
    page.getByText("배송 일정이 궁금합니다.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "내용", exact: true })
    .fill("추가 문의입니다.");
  await page.getByRole("button", { name: "추가 메시지 보내기" }).click();
  await expect(
    page.getByText("추가 문의입니다.", { exact: true }),
  ).toBeVisible();
});
test("NICE and payment callbacks cannot complete forged requests", async ({
  page,
}) => {
  await page.goto(
    "/nice/callback?niceSessionId=forged&web_transaction_id=forged",
  );
  await expect(
    page.getByText("진행 중인 인증 화면으로 돌아가 주세요.", { exact: false }),
  ).toBeVisible();
  await page.goto(
    "/orders/payment/success?orderId=forged&amount=1&paymentKey=forged",
  );
  await page
    .getByRole("button", { name: "결제 승인 확인", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("일치하지 않습니다");
});
test("archive API outage exposes retry without empty success", async ({
  page,
}) => {
  await page.route("**/api/2.0/bottles?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "일시적인 서버 오류입니다." }),
    }),
  );
  await page.goto("/archive");
  await expect(page.getByRole("alert")).toContainText("서버 오류");
  await expect(
    page.getByRole("button", { name: "다시 불러오기" }),
  ).toBeVisible();
});
test("public catalogue and account visual smoke", async ({ page }) => {
  for (const path of [
    "/",
    "/archive",
    "/general-items",
    "/ticket-products",
    "/smart-order",
    "/brand",
    "/about",
    "/terms",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("Unmatched Route");
  }
  await page.goto("/archive");
  await expect(
    page.getByRole("link", { name: "네이비 싱글캐스크 12", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/archive-mobile-web.png",
    fullPage: true,
  });
});

test("reservation uses a chosen pickup location and stores the application", async ({
  page,
  request,
}) => {
  await login(page, "/reservation/1");
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
  expect(
    (await (await request.get("http://127.0.0.1:8787/__test/state")).json())
      .applications,
  ).toBe(1);
});
test("password recovery has a real two-stage fixture roundtrip", async ({
  page,
}) => {
  await page.goto("/find-password");
  await page
    .getByRole("textbox", { name: "이메일 주소", exact: true })
    .fill("rn@example.test");
  await page
    .getByRole("button", { name: "인증코드 발송", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "인증코드", exact: true })
    .fill("123456");
  await page
    .getByRole("button", { name: "확인 및 비밀번호 초기화", exact: true })
    .click();
  await expect(
    page.getByText("임시 비밀번호를 이메일로 발송했습니다.", { exact: true }),
  ).toBeVisible();
});

test("unknown routes offer a native recovery screen", async ({ page }) => {
  await page.goto("/unavailable-route");
  await expect(
    page.getByText("화면을 찾을 수 없습니다", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "홈으로 돌아가기", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
});

test("network guard aborts non-fixture requests before they leave the browser", async ({
  page,
}) => {
  await page.goto("/");
  const rejected = await page.evaluate(() =>
    fetch("https://example.invalid/e2e-guard-canary").then(
      () => false,
      () => true,
    ),
  );
  expect(rejected).toBe(true);
  expect(blockedOrigins.get(page)).toEqual([
    "GET https://example.invalid/e2e-guard-canary",
  ]);
  blockedOrigins.get(page)!.length = 0;
});

for (const screen of [
  { name: "archive", path: "/archive", ready: "아카이브" },
  { name: "sign-in", path: "/sign-in", ready: "이메일 주소" },
  {
    name: "about",
    path: "/about",
    ready: "대한민국 최초의 독립 병입 브랜드, 위스키내비",
  },
]) {
  test(`visual regression: ${screen.name}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(screen.path);
    await expect(
      page.getByText(screen.ready, { exact: true }).first(),
    ).toBeVisible();
    if (screen.name === "archive") {
      await expect(
        page.getByRole("link", { name: "네이비 싱글캐스크 12", exact: true }),
      ).toBeVisible();
    }
    await page.evaluate(() => document.fonts.ready);
    await page
      .locator("img")
      .evaluateAll((images) =>
        Promise.all(
          images.map((image) =>
            image instanceof HTMLImageElement
              ? image.decode().catch(() => {})
              : Promise.resolve(),
          ),
        ),
      );
    await expect(page).toHaveScreenshot(`${screen.name}-mobile.png`, {
      animations: "disabled",
      maxDiffPixelRatio: 0.015,
      scale: "css",
    });
  });
}

for (const width of [320, 430]) {
  test(`archive remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/archive");
    const card = page.getByRole("link", {
      name: "네이비 싱글캐스크 12",
      exact: true,
    });
    await expect(card).toBeVisible();
    const bounds = await card.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(15);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width - 15);
    await expect(
      page.getByRole("button", { name: "필터", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "필터", exact: true }).click();
    await expect(
      page.getByText("아카이브 필터", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "완료", exact: true }).click();
    await expect(card).toBeVisible();
  });
}

test("archive sorting uses an explicit bottom sheet selection", async ({
  page,
}) => {
  await page.goto("/archive");
  await expect(
    page.getByRole("link", { name: "네이비 싱글캐스크 12", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "병입순", exact: true }).click();
  await expect(page.getByText("정렬 기준", { exact: true })).toBeVisible();
  const sorted = page.waitForRequest(
    (request) =>
      request.url().includes("/api/2.0/bottles?") &&
      new URL(request.url()).searchParams.get("sort") === "NAME",
  );
  await page.getByRole("button", { name: "이름순", exact: true }).click();
  await sorted;
  await expect(page.getByText("정렬 기준", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "이름순", exact: true }),
  ).toBeVisible();
});

test("catalogue sale badge stays inside its two-column card", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/general-items");
  const card = page.getByTestId("product-card-1");
  await expect(card).toBeVisible();
  const badge = card.getByText("판매중", { exact: true });
  await expect(badge).toBeVisible();
  const outer = await card.boundingBox();
  const inner = await badge.boundingBox();
  expect(inner!.x + inner!.width).toBeLessThanOrEqual(
    outer!.x + outer!.width - 15,
  );
});
