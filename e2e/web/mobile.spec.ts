import { test, expect, type Page, type Route } from "@playwright/test";
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

test("menu keyboard selection closes the sheet, including the current route", async ({
  page,
}) => {
  await page.goto("/archive");
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  const item = page
    .getByRole("dialog")
    .getByRole("link", { name: "아카이브", exact: true });
  await item.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "완료", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await page.getByRole("link", { name: "브랜드", exact: true }).click();
  await expect(page).toHaveURL(/\/brand$/);
  await expect(
    page.getByRole("button", { name: "완료", exact: true }),
  ).toHaveCount(0);
});

test("sheet contains keyboard focus and restores its opener", async ({
  page,
}) => {
  await page.goto("/archive");
  const opener = page.getByRole("button", { name: "필터", exact: true });
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("아카이브 필터", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "완료", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(opener).not.toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByText("아카이브 필터", { exact: true })).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("header controls and archive series have comfortable touch bounds", async ({
  page,
}) => {
  await page.goto("/archive");
  for (const label of ["메뉴 열기", "일반상품 장바구니", "WHISKYNAVI"]) {
    const control = page.getByLabel(label, { exact: true });
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(box!.width).toBeGreaterThanOrEqual(48);
  }
});

test("login validates inline, reveals password and keeps values after server rejection", async ({
  page,
}) => {
  await page.goto("/sign-in");
  const email = page.getByRole("textbox", { name: "이메일 주소", exact: true });
  const password = page.getByLabel("비밀번호", { exact: true });
  await email.fill("invalid@");
  await password.fill("incorrect");
  await expect(
    page.getByText("올바른 이메일 주소를 입력해주세요."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "로그인", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "비밀번호 표시", exact: true })
    .click();
  await expect(password).toHaveJSProperty("type", "text");
  await page
    .getByRole("button", { name: "비밀번호 숨기기", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");
  await email.fill("wrong@example.test");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("로그인");
  await expect(email).toHaveValue("wrong@example.test");
  await expect(password).toHaveValue("incorrect");
  await expect(email).toBeFocused();
});

const previewImage =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#252d32"/></svg>',
  );
const bannersResponse = {
  content: [
    {
      id: 1,
      title: "첫 번째 배너",
      link: "/archive",
      backgroundUrl: previewImage,
    },
    {
      id: 2,
      title: "두 번째 배너",
      link: "/brand",
      backgroundUrl: previewImage,
    },
  ],
};

test("home banner pauses and supports explicit previous/next navigation", async ({
  page,
}) => {
  await page.route("**/api/banners?*", (route) =>
    route.fulfill({ json: bannersResponse }),
  );
  await page.goto("/");
  await expect(page.getByText("첫 번째 배너", { exact: true })).toBeVisible();
  await page.clock.install();
  await page.getByRole("button", { name: "배너 일시정지" }).click();
  await page.getByRole("button", { name: "다음 배너", exact: true }).click();
  await expect(page.getByText("두 번째 배너", { exact: true })).toBeVisible();
  await page.clock.fastForward(11000);
  await expect(page.getByText("두 번째 배너", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "이전 배너", exact: true }).click();
  await expect(page.getByText("첫 번째 배너", { exact: true })).toBeVisible();
});

test("reduced motion disables automatic banner changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/banners?*", (route) =>
    route.fulfill({ json: bannersResponse }),
  );
  await page.goto("/");
  await expect(page.getByText("첫 번째 배너", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "배너 자동 재생" }),
  ).toBeDisabled();
  await page.clock.install();
  await page.clock.fastForward(11000);
  await expect(page.getByText("첫 번째 배너", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "다음 배너", exact: true }).click();
  await expect(page.getByText("두 번째 배너", { exact: true })).toBeVisible();
});

test("home keeps arrivals usable when banners fail and retries only the failed section", async ({
  page,
}) => {
  let failed = true;
  let bottleRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/bottles") bottleRequests++;
  });
  await page.route("**/api/banners?*", (route) =>
    failed
      ? route.fulfill({ status: 503, json: { message: "fixture unavailable" } })
      : route.fulfill({ json: bannersResponse }),
  );
  await page.goto("/");
  const card = page.getByRole("link", {
    name: "네이비 싱글캐스크 12",
    exact: true,
  });
  await expect(card).toBeVisible();
  const retry = page.getByRole("button", {
    name: "배너 다시 불러오기",
    exact: true,
  });
  await expect(retry).toBeVisible({ timeout: 15000 });
  const count = bottleRequests;
  failed = false;
  await retry.click();
  await expect(page.getByText("첫 번째 배너", { exact: true })).toBeVisible();
  expect(bottleRequests).toBe(count);
  await card.click();
  await expect(page.getByText("테이스팅 노트", { exact: true })).toBeVisible();
});

test("gallery provides button alternatives and accurate boundary states", async ({
  page,
}) => {
  await page.route("**/api/bottles/1", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      json: {
        ...(await response.json()),
        imgUrl: previewImage,
        imageUrls: [previewImage + "%20"],
      },
    });
  });
  await page.goto("/archive/1");
  const previous = page.getByRole("button", {
    name: "이전 이미지",
    exact: true,
  });
  const next = page.getByRole("button", { name: "다음 이미지", exact: true });
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(page.getByText("2 / 2", { exact: true })).toBeVisible();
  await expect(next).toBeDisabled();
  await previous.click();
  await expect(page.getByText("1 / 2", { exact: true })).toBeVisible();
});

test("font download failure still allows navigation with fallback text", async ({
  page,
}) => {
  await page.route("**/*.ttf", (route) => route.abort("failed"));
  await page.goto("/archive");
  await page
    .getByRole("link", { name: "네이비 싱글캐스크 12", exact: true })
    .click();
  await expect(page.getByText("테이스팅 노트", { exact: true })).toBeVisible();
});

test("font delay keeps content usable or offers a working fallback", async ({
  page,
}) => {
  const held: Route[] = [];
  await page.route("**/*.ttf", (route) => {
    held.push(route);
  });
  await page.goto("/archive", { waitUntil: "domcontentloaded" });
  const fallback = page.getByRole("button", {
    name: "기본 글꼴로 계속하기",
    exact: true,
  });
  const card = page.getByRole("link", {
    name: "네이비 싱글캐스크 12",
    exact: true,
  });
  await expect(fallback.or(card)).toBeVisible({ timeout: 7000 });
  if (await fallback.isVisible()) await fallback.click();
  await card.click();
  await expect(page.getByText("테이스팅 노트", { exact: true })).toBeVisible();
  expect(held.length).toBeGreaterThan(0);
  await Promise.all(held.map((route) => route.abort("failed")));
});

test("home retains banners and navigation when arrivals fail", async ({
  page,
}) => {
  await page.route("**/api/banners?*", (route) =>
    route.fulfill({ json: bannersResponse }),
  );
  await page.route("**/api/bottles?*", (route) =>
    route.fulfill({ status: 503, json: { message: "fixture unavailable" } }),
  );
  await page.goto("/");
  await expect(page.getByText("첫 번째 배너", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "새 제품 다시 불러오기", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "자세히 보기", exact: true }).click();
  await expect(page).toHaveURL(/\/archive$/);
});

test("commerce text and status colors exceed normal text contrast", async ({
  page,
}) => {
  await page.goto("/general-items");
  const card = page.getByTestId("product-card-1");
  await expect(card).toBeVisible();
  for (const target of [
    card.getByText("판매중", { exact: true }),
    card.getByText("상세보기", { exact: true }),
  ]) {
    const contrast = await target.evaluate((element) => {
      const style = getComputedStyle(element);
      const luminance = (color: string) => {
        const values = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            const channel = value / 255;
            return channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;
          });
        return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
      };
      const foreground = luminance(style.color);
      let surface: Element | null = element;
      while (
        surface?.parentElement &&
        getComputedStyle(surface).backgroundColor === "rgba(0, 0, 0, 0)"
      )
        surface = surface.parentElement;
      const background = luminance(getComputedStyle(surface!).backgroundColor);
      return (
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05)
      );
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  }
});

test("filter checkbox selection reaches the API and reset is always available", async ({
  page,
}) => {
  await page.goto("/archive");
  await page.getByRole("button", { name: "필터", exact: true }).click();
  const choice = page.getByRole("checkbox", {
    name: "WhiskyNavi",
    exact: true,
  });
  await expect(choice).toBeVisible();
  const filtered = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname === "/api/2.0/bottles" &&
      new URL(request.url()).searchParams
        .getAll("brand")
        .includes("WhiskyNavi"),
  );
  await choice.click();
  await filtered;
  await expect(choice).toBeChecked();
  await page.getByRole("button", { name: "필터 초기화", exact: true }).click();
  await expect(choice).not.toBeChecked();
  await page.getByRole("button", { name: "완료", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "네이비 싱글캐스크 12", exact: true }),
  ).toBeVisible();
});

test("banner autoplay advances, pauses during keyboard focus and resumes explicitly", async ({
  page,
}) => {
  await page.route("**/api/banners?*", (route) =>
    route.fulfill({ json: bannersResponse }),
  );
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByText("첫 번째 배너", { exact: true })).toBeVisible();
  await page.clock.fastForward(5100);
  await expect(page.getByText("두 번째 배너", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "다음 배너", exact: true }).focus();
  await page.clock.fastForward(5100);
  await expect(page.getByText("두 번째 배너", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "배너 일시정지" }).click();
  await page.getByRole("button", { name: "배너 자동 재생" }).click();
  await page.getByRole("link", { name: "WHISKYNAVI", exact: true }).focus();
  await page.clock.fastForward(5100);
  await expect(page.getByText("첫 번째 배너", { exact: true })).toBeVisible();
});
