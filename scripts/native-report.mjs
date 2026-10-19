// Maestro emits one JUnit testsuite per device. A successful process alone is
// insufficient: every selected flow must have a recorded, unskipped result.
export function nativeReport(xml, expected) {
  const suites = [...xml.matchAll(/<testsuite\b[^>]*>/g)];
  const totals = { tests: 0, failures: 0, errors: 0, skipped: 0 };
  for (const [tag] of suites) {
    for (const [, key, value] of tag.matchAll(
      /\b(tests|failures|errors|skipped)="(\d+)"/g,
    ))
      totals[key] += Number(value);
  }
  const recorded = [...xml.matchAll(/<testcase\b/g)].length;
  totals.failures = Math.max(
    totals.failures,
    [...xml.matchAll(/<failure\b/g)].length,
  );
  totals.errors = Math.max(
    totals.errors,
    [...xml.matchAll(/<error\b/g)].length,
  );
  totals.skipped = Math.max(
    totals.skipped,
    [...xml.matchAll(/<skipped\b/g)].length,
  );
  return {
    ...totals,
    expected,
    recorded,
    complete:
      Number.isInteger(expected) &&
      expected > 0 &&
      suites.length > 0 &&
      totals.tests === expected &&
      recorded === expected &&
      totals.failures === 0 &&
      totals.errors === 0 &&
      totals.skipped === 0,
  };
}
