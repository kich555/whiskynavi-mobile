import { test, expect, login } from "./fixtures";
import cases from "../route-cases.json";
for (const entry of cases) {
  test(`route: ${entry.route}`, async ({ page, request }) => {
    await request.post("http://127.0.0.1:8787/__test/seed-account");
    if (entry.auth) await login(page, entry.path);
    else await page.goto(entry.path);
    await expect(
      page.getByText(entry.expect, { exact: false }).first(),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    if (entry.route.endsWith("/success")) {
      await page
        .getByRole("button", { name: "결제 승인 확인", exact: true })
        .click();
      await expect(page.getByRole("alert")).toContainText("일치하지 않습니다");
    }
  });
}
