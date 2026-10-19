import { expect, it } from "vitest";
import { summarize } from "../scripts/e2e-report.mjs";
it("fails closed for unexecuted routes, skipped cases and recovered retries", () => {
  const expected = ["/", "/archive"];
  expect(
    summarize(expected, [{ title: "route: /", status: "passed", retry: 0 }])
      .complete,
  ).toBe(false);
  expect(
    summarize(expected, [
      { title: "route: /", status: "passed", retry: 0 },
      { title: "route: /archive", status: "passed", retry: 1 },
    ]).complete,
  ).toBe(false);
  expect(
    summarize(expected, [
      { title: "route: /", status: "passed", retry: 0 },
      { title: "route: /archive", status: "skipped", retry: 0 },
    ]).complete,
  ).toBe(false);
  const report = summarize(
    expected,
    expected.map((route) => ({
      title: `route: ${route}`,
      status: "passed",
      retry: 0,
    })),
  );
  expect(report.complete).toBe(true);
  expect(report.routeCoveragePercent).toBe(100);
});
