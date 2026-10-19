import { test, expect, login } from "./fixtures";
import type { Page, Route } from "@playwright/test";
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
for (const [path, content] of [
  ["/", "NEW ARRIVALS"],
  ["/archive", "아카이브"],
  ["/general-items", "위스키 테이스팅 글라스"],
  ["/ticket-products", "위스키 테이스팅 이용권"],
  ["/smart-order", "매장 픽업 위스키"],
  ["/brand", "Single Cask"],
  ["/about", "위스키내비"],
  ["/terms", "이용약관"],
]) {
  test(`public content smoke: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(
      page.getByText(content, { exact: false }).first(),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("Unmatched Route");
  });
}
test("archive visual smoke capture", async ({ page }) => {
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
  await page
    .getByRole("button", { name: "예약 정보 수정", exact: true })
    .click();
  await page.getByRole("button", { name: "수량 늘리기", exact: true }).click();
  await page
    .getByRole("button", { name: "변경사항 저장", exact: true })
    .click();
  await expect(page.getByText("신청 수량 2병", { exact: false })).toBeVisible();
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
  blockedOrigins,
}) => {
  await page.goto("/");
  const rejected = await page.evaluate(() =>
    fetch("https://example.invalid/e2e-guard-canary").then(
      () => false,
      () => true,
    ),
  );
  expect(rejected).toBe(true);
  expect(blockedOrigins).toEqual([
    "GET https://example.invalid/e2e-guard-canary",
  ]);
  blockedOrigins.length = 0;
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

test("catalogue sale badge stays inside its mobile card", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/general-items");
  const card = page.getByTestId("product-card-1");
  await expect(card).toBeVisible();
  const badge = card.getByText("판매중", { exact: true });
  await expect(badge).toBeVisible();
  const outer = await card.boundingBox();
  const inner = await badge.boundingBox();
  expect(inner!.x + inner!.width).toBeLessThanOrEqual(
    outer!.x + outer!.width - 11,
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

test("glass checkbox rows retain keyboard consent and checkout validation", async ({
  page,
}) => {
  await page.goto("/general-items/1");
  await page
    .getByRole("button", { name: "장바구니 담기", exact: true })
    .click();
  await page.getByRole("button", { name: "주문서 작성", exact: true }).click();
  const consent = page.getByRole("checkbox", {
    name: "주문 정보와 판매·환불 정책을 확인하고 동의합니다.",
    exact: true,
  });
  await expect(consent).not.toBeChecked();
  await consent.focus();
  await page.keyboard.press("Space");
  await expect(consent).toBeChecked();
  await page.keyboard.press("Space");
  await expect(consent).not.toBeChecked();
  const bounds = await consent.boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(48);
  await expect(
    page.getByRole("button", { name: "결제 진행", exact: true }),
  ).toBeDisabled();
});

test("visual regression: glass filter selection", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/archive");
  await page.getByRole("button", { name: "필터", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const choice = page.getByRole("checkbox", {
    name: "WhiskyNavi",
    exact: true,
  });
  await choice.click();
  await expect(choice).toBeChecked();
  await page.getByRole("button", { name: "완료", exact: true }).focus();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("filter-selected-mobile.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.015,
    scale: "css",
  });
});

test("community infinite scroll appends, ends, and resets on search", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-feed", { data: {} });
  await page.goto("/board/community");
  const list = page.getByTestId("infinite-list");
  await expect(page.getByTestId("board-row-1")).toBeVisible();
  const box = await page.getByTestId("board-row-1").boundingBox();
  expect(box!.height).toBeLessThan(110);
  for (const id of [21, 45]) {
    if (id === 45) {
      await expect(page.getByTestId("board-row-40")).toBeAttached();
      await list.evaluate((el) => el.scrollTo({ top: 0 }));
      await expect(page.getByTestId("board-row-1")).toBeVisible();
    }
    await page
      .getByRole("button", { name: "더 보기", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(page.getByTestId(`board-row-${id}`)).toBeAttached();
  }
  await expect(page.getByText("모두 확인했어요")).toBeVisible();
  const state = await (
    await request.get("http://127.0.0.1:8787/__test/state")
  ).json();
  const pages = state.requests
    .filter((r: { path: string }) => r.path === "/api/boards/community/posts")
    .map((r: { query: string }) => new URLSearchParams(r.query).get("page"));
  expect(pages).toEqual(["0", "1", "2"]);
  await list.evaluate((el) => el.scrollTo({ top: 0 }));
  await page.getByRole("textbox", { name: "게시글 검색" }).fill("첫 번째");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.getByTestId("board-row-1")).toBeVisible();
  await expect(page.getByTestId("board-row-21")).toHaveCount(0);
});
test("failed next page keeps loaded community rows and can retry", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-feed", { data: {} });
  let failed = true;
  let attempts = 0;
  await page.route("**/api/boards/community/posts?*", async (route) => {
    if (new URL(route.request().url()).searchParams.get("page") === "1") {
      attempts++;
      if (failed)
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "추가 목록을 불러오지 못했습니다." }),
        });
    }
    return route.continue();
  });
  await page.goto("/board/community");
  await expect(page.getByTestId("board-row-1")).toBeVisible();
  const list = page.getByTestId("infinite-list");
  await page
    .getByRole("button", { name: "더 보기", exact: true })
    .scrollIntoViewIfNeeded();
  const retry = page.getByRole("button", {
    name: "추가 목록 다시 불러오기",
    exact: true,
  });
  await expect(retry).toBeVisible();
  expect(attempts).toBe(1);
  await list.evaluate((el) => el.scrollTo({ top: 0 }));
  await expect(page.getByTestId("board-row-1")).toBeVisible();
  failed = false;
  await retry.click();
  await expect(page.getByTestId("board-row-21")).toBeAttached();
  expect(attempts).toBe(2);
});
test("archive grid appends another page without losing the first item", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-feed", { data: {} });
  await page.goto("/archive");
  const list = page.getByTestId("infinite-list");
  await expect(
    page.getByRole("link", { name: "네이비 싱글캐스크 12", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "더 보기", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("link", { name: "싱글캐스크 위스키 21", exact: true }),
  ).toBeAttached();
  await list.evaluate((el) => el.scrollTo({ top: 0 }));
  await expect(
    page.getByRole("link", { name: "네이비 싱글캐스크 12", exact: true }),
  ).toBeVisible();
});
test("post body and comments have distinct visual sections", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-feed", {
    data: { design: true },
  });
  await page.goto("/board/community/posts/1");
  await expect(page.getByTestId("post-original")).toContainText(
    "위스키를 함께 알아가는 공간입니다.",
  );
  await expect(page.getByTestId("comments-section")).toContainText("댓글 3");
  const original = await page.getByTestId("post-original").boundingBox();
  const comments = await page.getByTestId("comments-section").boundingBox();
  expect(comments!.y).toBeGreaterThanOrEqual(
    original!.y + original!.height + 16,
  );
  await page.screenshot({
    path: "artifacts/design-sync/rn-community-detail.png",
  });
  await page.goto("/board/news");
  await page.getByRole("button", { name: "공지사항", exact: true }).click();
  await expect(page.getByTestId("board-row-80")).toContainText(
    "커뮤니티 이용 안내",
  );
  await page.getByTestId("board-row-80").click();
  await expect(page.getByTestId("post-original")).toBeVisible();
  await expect(page.getByTestId("comments-section")).toHaveCount(0);
});

test("community and news switch inside one screen with a moving tab indicator", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-feed", {
    data: { design: true },
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/board/community");
  const community = page.getByRole("tab", { name: "커뮤니티", exact: true });
  const news = page.getByRole("tab", { name: "소식", exact: true });
  await expect(community).toHaveAttribute("aria-selected", "true");
  await page.evaluate(() => document.fonts.ready);
  const indicator = page.getByTestId("board-tab-indicator");
  const initial = (await indicator.boundingBox())!.x;
  const url = page.url();
  await news.click();
  await expect(news).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(url);
  await expect
    .poll(async () => Math.round((await indicator.boundingBox())!.x))
    .toBe(Math.round((await news.boundingBox())!.x));
  expect((await indicator.boundingBox())!.x).toBeGreaterThan(initial + 30);
  await expect(
    page.getByRole("link", { name: "글쓰기", exact: true }),
  ).toHaveAttribute("href", "/board/news/posts/new");
  await community.click();
  await expect(community).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(url);
  await expect
    .poll(async () => Math.round((await indicator.boundingBox())!.x))
    .toBe(Math.round((await community.boundingBox())!.x));
});
test("board tab switching also works with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/board/news");
  const url = page.url();
  await page.getByRole("tab", { name: "커뮤니티", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "커뮤니티", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(url);
});

test("shopping tab opens products and changes channels without navigation", async ({
  page,
}) => {
  await page.goto("/shop");
  const url = page.url();
  await expect(page.getByTestId("product-card-1")).toBeVisible();
  await page.getByRole("button", { name: "이용권", exact: true }).click();
  await expect(page.getByTestId("product-card-2")).toBeVisible();
  await expect(page).toHaveURL(url);
  await page.getByRole("button", { name: "스마트오더", exact: true }).click();
  await expect(page.getByTestId("product-card-3")).toBeVisible();
  await expect(
    page.getByText("19세 미만은 주류를 구매할 수 없습니다.", { exact: false }),
  ).toBeVisible();
  await expect(page).toHaveURL(url);
});
test("mobile catalogue follows the web two-column layout and loads more", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-feed", { data: {} });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/general-items");
  const first = page.getByTestId("product-card-1");
  await expect(first).toBeVisible();
  expect((await first.boundingBox())!.width).toBeGreaterThan(150);
  expect((await first.boundingBox())!.width).toBeLessThan(180);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId("product-card-20")).toBeAttached();
  await page
    .getByRole("button", { name: "더 보기", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(page.getByTestId("product-card-21")).toBeAttached();
  await page
    .getByTestId("infinite-list")
    .evaluate((el) => el.scrollTo({ top: 0 }));
  await expect(first).toBeVisible();
});
test("editor blank paragraphs occupy one body line in post and archive", async ({
  page,
}) => {
  const description =
    "<div><p>빈줄 앞 문단</p><p><span><br></span></p><p>빈줄 뒤 문단</p><p>문단 안 첫줄<br>문단 안 둘째줄</p></div>";
  await page.route("**/api/boards/community/posts/1", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 1,
        title: "본문 여백 검증",
        authorNickname: "테스터",
        content: description,
      }),
    });
  });
  await page.route("**/api/bottles/1", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: 1, name: "본문 여백 검증 보틀", description }),
    }),
  );
  for (const path of ["/board/community/posts/1", "/archive/1"]) {
    await page.goto(path);
    const before = page.getByText("빈줄 앞 문단", { exact: true });
    await expect(before).toBeVisible();
    const a = await before.boundingBox();
    const b = await page
      .getByText("빈줄 뒤 문단", { exact: true })
      .boundingBox();
    const blank = await page.getByTestId("rich-empty-line").boundingBox();
    expect(blank!.height).toBeCloseTo(22, 0);
    expect(b!.y - a!.y - a!.height).toBeCloseTo(blank!.height, 0);
  }
});

test("account overview groups history and settings without a wall of forms", async ({
  page,
}) => {
  await login(page, "/my-page");
  await expect(page.getByText("모바일테스터님", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "닉네임", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "주문 내역", exact: true }).click();
  await expect(
    page.getByText("위스키 테이스팅 글라스", { exact: false }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "마이페이지로 돌아가기", exact: true })
    .click();
  await page.getByRole("button", { name: "예약 내역", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "내 예약 신청", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "마이페이지로 돌아가기", exact: true })
    .click();
  await page
    .getByRole("button", { name: "내 정보 수정", exact: false })
    .click();
  await expect(
    page.getByRole("textbox", { name: "닉네임", exact: true }),
  ).toHaveValue("모바일테스터");
  await page
    .getByRole("button", { name: "마이페이지로 돌아가기", exact: true })
    .click();
  await page.getByRole("button", { name: "나의 멤버십", exact: false }).click();
  await expect(page.getByText("미가입", { exact: true }).first()).toBeVisible();
  await page
    .getByRole("button", { name: "마이페이지로 돌아가기", exact: true })
    .click();
  await page.getByRole("button", { name: "사업자 등록", exact: false }).click();
  await expect(
    page.getByRole("heading", { name: "사업자 등록 신청", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "마이페이지로 돌아가기", exact: true })
    .click();
  await page.getByRole("link", { name: "1:1 문의", exact: true }).click();
  await expect(page).toHaveURL(/my-page\/inquiries$/);
});

test("shopping cards prioritize thumbnails and purchase actions share one row", async ({
  page,
}) => {
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/general-items");
    const card = page.getByTestId("product-card-1");
    await expect(card).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const bounds = (await card.boundingBox())!;
    const image = (await page.getByTestId("product-image-1").boundingBox())!;
    expect(image.width / bounds.width).toBeGreaterThan(0.94);
    expect(bounds.height / bounds.width).toBeLessThan(2.1);
    await card.click();
    await expect(page).toHaveURL(/general-items\/1$/);
    const cart = page.getByRole("button", {
      name: "장바구니 담기",
      exact: true,
    });
    const order = page.getByRole("button", {
      name: "바로 주문하기",
      exact: true,
    });
    await cart.scrollIntoViewIfNeeded();
    const a = (await cart.boundingBox())!,
      b = (await order.boundingBox())!;
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    expect(b.x - (a.x + a.width)).toBeGreaterThanOrEqual(8);
    expect(a.height).toBeGreaterThanOrEqual(48);
    expect(a.height).toBeLessThanOrEqual(50);
    await expect(cart.locator("svg")).toHaveCount(1);
    await expect(order.locator("svg")).toHaveCount(1);
  }
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/general-items/1");
  const cart = page.getByRole("button", { name: "장바구니 담기", exact: true });
  await cart.scrollIntoViewIfNeeded();
  const a = (await cart.boundingBox())!,
    b = (await page
      .getByRole("button", { name: "바로 주문하기", exact: true })
      .boundingBox())!;
  expect(b.y).toBeGreaterThanOrEqual(a.y + a.height + 8);
});

async function holdApi(
  page: Page,
  path: string,
  select: (route: Route) => boolean = () => true,
) {
  let resume!: () => void;
  const gate = new Promise<void>((resolve) => {
    resume = resolve;
  });
  let failure: number | undefined;
  const pending: Promise<void>[] = [];
  const matcher = new RegExp(`^http://127\\.0\\.0\\.1:8787${path}(?:\\?|$)`);
  const handler = (route: Route) => {
    if (route.request().method() !== "GET" || !select(route))
      return route.fallback();
    const operation = (async () => {
      await gate;
      if (failure)
        await route.fulfill({
          status: failure,
          contentType: "application/json",
          body: JSON.stringify({ message: "잠시 후 다시 시도해 주세요." }),
        });
      else await route.fallback();
    })();
    pending.push(operation);
    return operation;
  };
  await page.route(matcher, handler);
  return async (status?: number) => {
    failure = status;
    resume();
    await Promise.all(pending);
    failure = undefined;
  };
}

for (const entry of [
  {
    name: "home banner",
    path: "/",
    api: "/api/banners",
    variant: "hero",
    ready: "위스키를 탐험하는 새로운 방법",
  },
  {
    name: "archive grid",
    path: "/archive",
    api: "/api/2.0/bottles",
    variant: "cards",
    ready: "네이비 싱글캐스크 12",
  },
  {
    name: "shop grid",
    path: "/shop",
    api: "/api/2.0/general-products",
    variant: "cards",
    ready: "위스키 테이스팅 글라스",
  },
  {
    name: "tickets",
    path: "/ticket-products",
    api: "/api/2.0/ticket-products",
    variant: "cards",
    ready: "위스키 테이스팅 이용권",
  },
  {
    name: "smart order",
    path: "/smart-order",
    api: "/api/2.0/smart-order-products",
    variant: "cards",
    ready: "매장 픽업 위스키",
  },
  {
    name: "bottle detail",
    path: "/archive/1",
    api: "/api/bottles/1",
    variant: "detail",
    ready: "테이스팅 노트",
  },
  {
    name: "product detail",
    path: "/general-items/1",
    api: "/api/2.0/general-products/1",
    variant: "detail",
    ready: "위스키 테이스팅 글라스",
  },
  {
    name: "reservation grid",
    path: "/reservation",
    api: "/api/bottles/reservations/notices",
    variant: "cards",
    ready: "싱글캐스크 예약",
    auth: true,
  },
  {
    name: "reservation detail",
    path: "/reservation/1",
    api: "/api/bottles/reservations/notices/1",
    variant: "detail",
    ready: "싱글캐스크 예약",
    auth: true,
  },
  {
    name: "community",
    path: "/board/community",
    api: "/api/boards/community/posts",
    variant: "rows",
    ready: "첫 번째 위스키 이야기",
  },
  {
    name: "post detail",
    path: "/board/community/posts/1",
    api: "/api/boards/community/posts/1",
    variant: "article",
    ready: "위스키를 함께 알아가는 공간입니다.",
  },
  {
    name: "announcement",
    path: "/board/news/announcements/80",
    api: "/api/boards/news/announcements/80",
    variant: "article",
    ready: "위스키를 함께 알아가는 공간입니다.",
  },
  {
    name: "post editor",
    path: "/board/community/posts/1/edit",
    api: "/api/boards/community/posts/1",
    variant: "form",
    ready: "게시글 수정",
    auth: true,
  },
  {
    name: "account",
    path: "/my-page",
    api: "/api/users/me",
    variant: "account",
    ready: "모바일테스터님",
    auth: true,
  },
  {
    name: "order history",
    path: "/my-page?tab=orders",
    api: "/api/2.0/orders",
    variant: "rows",
    ready: "위스키 테이스팅 글라스",
    auth: true,
  },
  {
    name: "reservation history",
    path: "/my-page?tab=reservations",
    api: "/api/bottles/reservations/applications/me",
    variant: "rows",
    ready: "싱글캐스크 예약",
    auth: true,
  },
  {
    name: "business",
    path: "/my-page?tab=business",
    api: "/api/users/businesses/applications/me/overview",
    variant: "form",
    ready: "사업장명",
    auth: true,
  },
  {
    name: "order detail",
    path: "/my-page/order/1",
    api: "/api/orders/1",
    variant: "article",
    ready: "주문번호 E2E-ORDER-1",
    auth: true,
  },
  {
    name: "inquiry list",
    path: "/my-page/inquiries",
    api: "/api/inquiries",
    variant: "rows",
    ready: "픽업 일정에 대해 문의드립니다",
    auth: true,
  },
  {
    name: "inquiry detail",
    path: "/my-page/inquiries/1",
    api: "/api/inquiries/1",
    variant: "article",
    ready: "픽업 가능한 시간을 알려주세요.",
    auth: true,
  },
  {
    name: "brand series",
    path: "/brand",
    api: "/api/bottles/brand-series",
    variant: "rows",
    ready: "네이비 싱글캐스크 12",
  },
  {
    name: "checkout",
    path: "/general-items/delivery-order?saleId=1",
    api: "/api/2.0/general-products/1",
    variant: "form",
    ready: "주문자 이름",
  },
  {
    name: "cart",
    path: "/general-items/cart",
    api: "/api/carts/current",
    variant: "rows",
    ready: "장바구니가 비어 있습니다.",
  },
]) {
  test(`skeleton: ${entry.name} resolves to content`, async ({
    page,
    request,
  }) => {
    await request.post("http://127.0.0.1:8787/__test/seed-account");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const release = await holdApi(page, entry.api);
    if (entry.auth) await login(page, entry.path);
    else await page.goto(entry.path);
    const skeleton = page.getByTestId(`skeleton-${entry.variant}`).first();
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute("aria-busy", "true");
    await expect(
      skeleton.locator("button, input, a, [tabindex='0']"),
    ).toHaveCount(0);
    if (entry.name === "cart")
      await expect(
        page.getByText("장바구니가 비어 있습니다.", { exact: true }),
      ).toHaveCount(0);
    if (entry.name === "post detail")
      await expect(page.getByTestId("comments-section")).toHaveCount(0);
    if (["shop grid", "account", "post detail"].includes(entry.name)) {
      await page.screenshot({
        scale: "css",
        path: `artifacts/skeleton-${entry.variant}.png`,
      });
    }
    await release();
    await expect(page.getByTestId(`skeleton-${entry.variant}`)).toHaveCount(0);
    await expect(
      page.getByText(entry.ready, { exact: false }).first(),
    ).toBeVisible();
  });
}

test("skeleton respects reduced motion and transitions to failure with retry", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const release = await holdApi(page, "/api/2.0/general-products");
  await page.goto("/general-items");
  const shapes = page
    .getByTestId("skeleton-cards")
    .getByTestId("skeleton-shapes");
  await expect(shapes).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(() => shapes.evaluate((el) => Number(getComputedStyle(el).opacity)))
    .toBeLessThan(0.9);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(shapes).toHaveCSS("opacity", "1");
  await release(503);
  await expect(page.getByTestId("skeleton-cards")).toHaveCount(0);
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("button", { name: "다시 불러오기", exact: true })
    .click();
  await expect(page.getByTestId("product-card-1")).toBeVisible();
});

test("account child pages retain context and grouped information", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-account");
  await login(page, "/my-page?tab=orders");
  await page.getByRole("link", { name: /위스키 테이스팅 글라스/ }).click();
  await expect(
    page.getByRole("heading", { name: "주문 정보", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "결제 정보", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "배송·수령 정보", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "내 주문 목록", exact: true }).click();
  await page
    .getByRole("button", { name: "마이페이지로 돌아가기", exact: true })
    .click();
  await page.getByRole("button", { name: "예약 내역", exact: true }).click();
  await expect(page.getByText("예약 확정", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /싱글캐스크 예약/ }).click();
  await expect(
    page.getByRole("heading", { name: "예약 공고 확인", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "내 예약 목록으로", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "마이페이지로 돌아가기", exact: true })
    .click();
  await page.getByRole("button", { name: "나의 멤버십", exact: false }).click();
  await expect(page.getByText("가입됨", { exact: true })).toBeVisible();
  await expect(page.getByText("미가입", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "마이페이지로 돌아가기", exact: true })
    .click();
  await page
    .getByRole("button", { name: "자주 묻는 질문", exact: true })
    .click();
  const faq = page.getByRole("button", {
    name: "배송은 얼마나 걸리나요?",
    exact: true,
  });
  await faq.click();
  await expect(faq).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText("사전 예약 후 제품이 통관되면", { exact: false }),
  ).toBeVisible();
});

test("next-page skeleton preserves loaded products and ends after append", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/__test/seed-feed", { data: {} });
  await page.goto("/general-items");
  await expect(page.getByTestId("product-card-1")).toBeVisible();
  const release = await holdApi(
    page,
    "/api/2.0/general-products",
    (route) => new URL(route.request().url()).searchParams.get("page") === "1",
  );
  await page
    .getByRole("button", { name: "더 보기", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(page.getByTestId("skeleton-inline")).toBeVisible();
  await expect(page.getByTestId("product-card-1")).toBeAttached();
  await expect(page.getByTestId("skeleton-cards")).toHaveCount(0);
  await release();
  await expect(page.getByTestId("product-card-21")).toBeAttached();
  await expect(page.getByTestId("skeleton-inline")).toHaveCount(0);
});

test("cart refetch retains existing rows while quantities update", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:8787/api/2.0/carts/items/batch", {
    data: { items: [{ generalProductId: 1, quantity: 1 }] },
  });
  await page.goto("/general-items/cart");
  await expect(
    page.getByRole("link", { name: "위스키 테이스팅 글라스", exact: true }),
  ).toBeVisible();
  const release = await holdApi(page, "/api/carts/current");
  await page.getByRole("button", { name: "수량 늘리기", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "위스키 테이스팅 글라스", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("skeleton-rows")).toHaveCount(0);
  await release();
  await expect(page.getByText("2개", { exact: true })).toBeVisible();
});

for (const outcome of ["loaded", "failed"]) {
  test(`remote photo skeleton clears when image ${outcome}`, async ({
    page,
    request,
  }) => {
    const product = await (
      await request.get("http://127.0.0.1:8787/api/2.0/general-products/1")
    ).json();
    const imageUrl = "http://127.0.0.1:8787/__test/photo.png";
    await page.route("**/api/2.0/general-products/1", (route) =>
      route.fulfill({ json: { ...product, imageUrl } }),
    );
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    await page.route(imageUrl, async (route) => {
      await gate;
      if (outcome === "failed") return route.abort("failed");
      return route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
          "base64",
        ),
      });
    });
    await page.goto("/general-items/1");
    await expect(page.getByTestId("skeleton-media")).toBeVisible();
    finish();
    await expect(page.getByTestId("skeleton-media")).toHaveCount(0);
    if (outcome === "failed")
      await expect(
        page.getByLabel("위스키 테이스팅 글라스 이미지 없음", { exact: true }),
      ).toBeVisible();
    else
      await expect(
        page.getByRole("img", { name: "위스키 테이스팅 글라스", exact: true }),
      ).toBeVisible();
  });
}

for (const viewport of [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 844, height: 390 },
]) {
  for (const [name, path, heading] of [
    ["ticket-orders", "/my-page/ticket-orders", "내 이용권 주문"],
    ["ticket-detail", "/my-page/ticket-orders/2", "주문 정보"],
    ["reservation-detail", "/my-page/reservations/1", "예약 공고 확인"],
    ["inquiry-detail", "/my-page/inquiries/1", "픽업 일정에 대해 문의드립니다"],
    ["orders", "/my-page?tab=orders", "주문 내역"],
    ["reservations", "/my-page?tab=reservations", "내 예약 신청"],
    ["membership", "/my-page?tab=membership", "나의 멤버십"],
    ["profile", "/my-page?tab=profile", "내 정보 관리"],
    ["business", "/my-page?tab=business", "사업자 정보"],
    ["help", "/my-page?tab=faq", "고객 지원"],
    ["order-detail", "/my-page/order/1", "주문 정보"],
    ["inquiries", "/my-page/inquiries", "1:1 문의"],
  ]) {
    test(`account child layout: ${name} at ${viewport.width}x${viewport.height}`, async ({
      page,
      request,
    }) => {
      await request.post("http://127.0.0.1:8787/__test/seed-account");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize(viewport);
      await login(page, path);
      await expect(
        page.getByRole("heading", { name: heading, exact: true }).first(),
      ).toBeVisible();
      await expect(page.getByTestId("skeleton-account")).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (viewport.width === 390 || viewport.width === 430)
        await page.screenshot({
          scale: "css",
          path: `artifacts/account-${name}-${viewport.width}.png`,
        });
    });
  }
}
