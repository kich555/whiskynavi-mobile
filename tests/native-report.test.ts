import { expect, test } from "vitest";
import { nativeReport } from "../scripts/native-report.mjs";
const report = (result = "", attributes = 'tests="1" failures="0"') =>
  `<testsuites><testsuite name="device" ${attributes}><testcase name="flow">${result}</testcase></testsuite></testsuites>`;
test("native completion requires every planned flow", () => {
  expect(nativeReport(report(), 1).complete).toBe(true);
  expect(nativeReport(report(), 2).complete).toBe(false);
  expect(nativeReport("", 0).complete).toBe(false);
  expect(nativeReport('<testsuite tests="1"/>', 1).complete).toBe(false);
});
test.each(["failure", "error", "skipped"])(
  "native %s cannot be reported as successful",
  (tag) => {
    expect(nativeReport(report(`<${tag}>reason</${tag}>`), 1).complete).toBe(
      false,
    );
  },
);
test("native aggregate failure also fails a report without detailed nodes", () => {
  expect(nativeReport(report("", 'tests="1" failures="1"'), 1).complete).toBe(
    false,
  );
});
