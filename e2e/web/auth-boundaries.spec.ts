import { test, expect, login } from "./fixtures";

test("expired access token refreshes once and preserves the account screen", async ({
  page,
}) => {
  let attempts = 0;
  let refreshes = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/auth/refresh") refreshes++;
  });
  await page.route("**/api/users/me", (route) => {
    attempts++;
    return attempts === 1
      ? route.fulfill({ status: 401, json: { message: "expired" } })
      : route.fallback();
  });
  await login(page, "/my-page");
  await expect(page.getByText("모바일테스터님", { exact: true })).toBeVisible();
  expect(attempts).toBe(2);
  expect(refreshes).toBe(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

for (const status of [400, 401]) {
  test(`invalid refresh ${status} revokes protected access`, async ({
    page,
  }) => {
    await page.route("**/api/users/me", (route) =>
      route.fulfill({ status: 401, json: {} }),
    );
    await page.route("**/api/auth/refresh", (route) =>
      route.fulfill({ status, json: {} }),
    );
    await login(page, "/my-page");
    await expect(
      page.getByText("로그인이 필요합니다", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("모바일테스터님", { exact: true })).toHaveCount(
      0,
    );
  });
}

test("forbidden profile shows a permission error without attempting token refresh", async ({
  page,
}) => {
  let refreshes = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/auth/refresh") refreshes++;
  });
  await page.route("**/api/users/me", (route) =>
    route.fulfill({ status: 403, json: {} }),
  );
  await login(page, "/my-page");
  await expect(page.getByRole("alert").first()).toContainText(
    "이 기능을 이용할 권한이 없습니다.",
  );
  expect(refreshes).toBe(0);
  await expect(
    page.getByText("로그인이 필요합니다", { exact: true }),
  ).toHaveCount(0);
});

test("login never trusts a successful response without credentials", async ({
  page,
}) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({ status: 200, json: {} }),
  );
  await page.goto("/sign-in");
  await page
    .getByRole("textbox", { name: "이메일 주소", exact: true })
    .fill("rn@example.test");
  await page.getByLabel("비밀번호", { exact: true }).fill("mobile-e2e-123");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "로그인 응답에 인증 정보가 없습니다.",
  );
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("NICE session failure remains recoverable without opening an external provider", async ({
  page,
}) => {
  await page.goto("/sign-up");
  await page
    .getByRole("button", { name: "본인인증 시작", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "테스트에서는 외부 본인인증을 실행하지 않습니다.",
  );
  await expect(page).toHaveURL(/\/sign-up$/);
  await expect(
    page.getByRole("button", { name: "본인인증 시작", exact: true }),
  ).toBeEnabled();
});
